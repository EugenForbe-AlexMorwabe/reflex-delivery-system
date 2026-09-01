
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { supabase } from './db.js';
import { sendSms } from './sms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();


// ============================================
// MIDDLEWARE
// ============================================

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(express.json());
app.use(morgan('tiny'));


// ============================================
// STATIC FRONTEND
// ============================================

app.use(
  express.static(
    path.join(__dirname, '..', 'public')
  )
);


// ============================================
// DELIVERY VALIDATION
// ============================================

const deliverySchema = z.object({
  customer_name: z.string().min(2),
  customer_phone: z.string().min(9),
  delivery_address: z.string().min(3),
  item_description: z.string().min(2),
  retailer_name: z.string().min(2).default('Demo Retailer')
});


// ============================================
// DELIVERY CODE
// ============================================

function code() {
  return 'RFX-' +
    Date.now().toString(36).toUpperCase() +
    '-' +
    Math.floor(Math.random() * 900 + 100);
}


// ============================================
// RECORD DELIVERY EVENT
// ============================================

async function recordEvent(
  deliveryId,
  status,
  source = 'dashboard',
  note = null
) {
  return supabase
    .from('delivery_events')
    .insert({
      delivery_id: deliveryId,
      status: status,
      source: source,
      note: note
    });
}


// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', function (_req, res) {
  res.json({
    ok: true,
    service: 'reflex',
    time: new Date().toISOString()
  });
});


// ============================================
// DASHBOARD
// ============================================

app.get('/api/dashboard', async (req, res) => {
  try {
    console.log('Loading dashboard data...');

    // Get deliveries
    const {
      data: deliveries,
      error: deliveryError
    } = await supabase
      .from('deliveries')
      .select('*')
      .order('created_at', {
        ascending: false
      });

    if (deliveryError) {
      console.error(
        'DELIVERIES QUERY ERROR:',
        deliveryError
      );

      return res.status(500).json({
        error: 'Unable to load deliveries',
        details: deliveryError.message
      });
    }

    // Get riders separately
    const {
      data: riders,
      error: riderError
    } = await supabase
      .from('riders')
      .select('*')
      .order('name', {
        ascending: true
      });

    if (riderError) {
      console.error(
        'RIDERS QUERY ERROR:',
        riderError
      );

      return res.status(500).json({
        error: 'Unable to load riders',
        details: riderError.message
      });
    }

    // Attach rider information to each delivery
    const riderMap = new Map(
      (riders || []).map(function (rider) {
        return [
          rider.id,
          rider
        ];
      })
    );

    const enrichedDeliveries =
      (deliveries || []).map(function (delivery) {
        return {
          ...delivery,
          rider:
            delivery.rider_id
              ? riderMap.get(
                  delivery.rider_id
                ) || null
              : null
        };
      });

    // Calculate status counts
    const counts =
      enrichedDeliveries.reduce(
        function (result, delivery) {
          const status =
            delivery.status || 'Pending';

          result[status] =
            (result[status] || 0) + 1;

          return result;
        },
        {}
      );

    console.log(
      `Dashboard loaded: ${enrichedDeliveries.length} deliveries, ${riders.length} riders`
    );

    return res.json({
      deliveries: enrichedDeliveries,
      riders: riders || [],
      counts: counts
    });

  } catch (error) {
    console.error(
      'DASHBOARD ERROR:',
      error
    );

    return res.status(500).json({
      error: 'Unable to load dashboard',
      details:
        error.message ||
        'Unknown server error'
    });
  }
});

// ============================================
// CREATE DELIVERY
// ============================================

app.post('/api/deliveries', async function (req, res) {
  try {
    const parsed =
      deliverySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues
          .map(function (issue) {
            return issue.message;
          })
          .join(', ')
      });
    }

    const payload = {
      ...parsed.data,
      delivery_code: code()
    };

    const result = await supabase
      .from('deliveries')
      .insert(payload)
      .select()
      .single();

    if (result.error) {
      console.error(
        'Create delivery error:',
        result.error
      );

      return res.status(500).json({
        error: result.error.message
      });
    }

    const data = result.data;

    await recordEvent(
      data.id,
      'Pending',
      'whatsapp',
      null
    );

    res.status(201).json(data);

  } catch (error) {
    console.error(
      'Create delivery error:',
      error
    );

    res.status(500).json({
      error: 'Unable to create delivery'
    });
  }
});


// ============================================
// ASSIGN RIDER
// ============================================

app.post(
  '/api/deliveries/:id/assign',
  async function (req, res) {
    try {
      const schema = z.object({
        rider_id: z.string().uuid()
      });

      const parsed =
        schema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Valid rider_id is required'
        });
      }

      // Find rider
      const riderResult = await supabase
        .from('riders')
        .select('*')
        .eq(
          'id',
          parsed.data.rider_id
        )
        .single();

      if (
        riderResult.error ||
        !riderResult.data
      ) {
        return res.status(404).json({
          error: 'Rider not found'
        });
      }

      const rider = riderResult.data;

      // Update delivery
      const deliveryResult =
        await supabase
          .from('deliveries')
          .update({
            rider_id: rider.id,
            status: 'Assigned',
            assigned_at:
              new Date().toISOString()
          })
          .eq(
            'id',
            req.params.id
          )
          .select()
          .single();

      if (deliveryResult.error) {
        console.error(
          'Assign rider error:',
          deliveryResult.error
        );

        return res.status(500).json({
          error:
            deliveryResult.error.message
        });
      }

      const delivery =
        deliveryResult.data;

      // Record assignment event
      await recordEvent(
        delivery.id,
        'Assigned',
        'dashboard',
        'Assigned to ' + rider.name
      );

      // Send SMS
      try {
        await sendSms({
          to: rider.phone,
          message:
            'Reflex delivery ' +
            delivery.delivery_code +
            '\n' +
            'Pickup for: ' +
            delivery.item_description +
            '\n' +
            'Customer: ' +
            delivery.customer_name +
            '\n' +
            'Location: ' +
            delivery.delivery_address +
            '\n' +
            'Reply PICKED ' +
            delivery.delivery_code +
            ' when collected.'
        });
      } catch (error) {
        console.error(
          'SMS error:',
          error.message
        );
      }

      res.json(delivery);

    } catch (error) {
      console.error(
        'Assign rider error:',
        error
      );

      res.status(500).json({
        error: 'Unable to assign rider'
      });
    }
  }
);


// ============================================
// UPDATE DELIVERY STATUS
// ============================================

const statusSchema = z.object({
  status: z.enum([
    'Picked Up',
    'Delivered',
    'Failed'
  ]),
  note: z.string().optional()
});


app.post(
  '/api/deliveries/:id/status',
  async function (req, res) {
    try {
      const parsed =
        statusSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error:
            'Status must be Picked Up, Delivered, or Failed'
        });
      }

      const now =
        new Date().toISOString();

      const fields = {
        status: parsed.data.status
      };

      if (
        parsed.data.status === 'Picked Up'
      ) {
        fields.picked_up_at = now;
      }

      if (
        parsed.data.status === 'Delivered'
      ) {
        fields.delivered_at = now;
      }

      if (
        parsed.data.status === 'Failed'
      ) {
        fields.failed_at = now;
      }

      const result =
        await supabase
          .from('deliveries')
          .update(fields)
          .eq(
            'id',
            req.params.id
          )
          .select(
            '*, rider:riders(*)'
          )
          .single();

      if (result.error) {
        console.error(
          'Status update error:',
          result.error
        );

        return res.status(500).json({
          error: result.error.message
        });
      }

      const data = result.data;

      await recordEvent(
        data.id,
        data.status,
        'sms',
        parsed.data.note || null
      );

      res.json(data);

    } catch (error) {
      console.error(
        'Status update error:',
        error
      );

      res.status(500).json({
        error: 'Unable to update delivery status'
      });
    }
  }
);


// ============================================
// WHATSAPP WEBHOOK VERIFICATION
// ============================================

app.get(
  '/api/whatsapp/webhook',
  function (req, res) {
    const mode =
      req.query['hub.mode'];

    const token =
      req.query['hub.verify_token'];

    const challenge =
      req.query['hub.challenge'];

    if (
      mode === 'subscribe' &&
      token ===
        process.env.WHATSAPP_VERIFY_TOKEN
    ) {
      return res
        .status(200)
        .send(challenge);
    }

    return res.sendStatus(403);
  }
);


// ============================================
// WHATSAPP WEBHOOK
// ============================================

app.post(
  '/api/whatsapp/webhook',
  async function (req, res) {
    try {
      console.log(
        'WhatsApp webhook received'
      );

      console.log(
        JSON.stringify(
          req.body,
          null,
          2
        )
      );

      /*
       * Production implementation:
       *
       * 1. Read WhatsApp sender
       * 2. Read retailer message
       * 3. Extract delivery details
       * 4. Validate the information
       * 5. Create delivery
       * 6. Send confirmation
       */

      return res.sendStatus(200);

    } catch (error) {
      console.error(
        'WhatsApp webhook error:',
        error
      );

      return res.sendStatus(200);
    }
  }
);


// ============================================
// API 404 + FRONTEND FALLBACK
// ============================================
//
// IMPORTANT:
// We intentionally do NOT use:
//
// app.get('*', ...)
//
// because newer Express/router versions
// reject that wildcard syntax.
//

app.use(function (req, res) {
  if (
    req.path.startsWith('/api/')
  ) {
    return res.status(404).json({
      error: 'Not found'
    });
  }

  return res.sendFile(
    path.join(
      __dirname,
      '..',
      'public',
      'index.html'
    )
  );
});


// ============================================
// START SERVER
// ============================================

const port = Number(
  process.env.PORT || 10000
);

app.listen(
  port,
  '0.0.0.0',
  function () {
    console.log(
      'Reflex listening on 0.0.0.0:' +
      port
    );
  }
);
