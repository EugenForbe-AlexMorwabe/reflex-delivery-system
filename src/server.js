```javascript
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
// VALIDATION
// ============================================

const deliverySchema = z.object({
  customer_name: z.string().min(2),
  customer_phone: z.string().min(9),
  delivery_address: z.string().min(3),
  item_description: z.string().min(2),
  retailer_name: z
    .string()
    .min(2)
    .default('Demo Retailer')
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
      status,
      source,
      note
    });
}


// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'reflex',
    time: new Date().toISOString()
  });
});


// ============================================
// DASHBOARD
// ============================================

app.get('/api/dashboard', async (_req, res) => {
  try {
    const [
      {
        data: deliveries,
        error: deliveriesError
      },
      {
        data: riders,
        error: ridersError
      }
    ] = await Promise.all([
      supabase
        .from('deliveries')
        .select(
          '*, rider:riders(id,name,phone,vehicle,is_available)'
        )
        .order('created_at', {
          ascending: false
        }),

      supabase
        .from('riders')
        .select('*')
        .order('name')
    ]);

    if (deliveriesError || ridersError) {
      return res.status(500).json({
        error:
          deliveriesError?.message ||
          ridersError?.message ||
          'Unable to load dashboard'
      });
    }

    const counts = deliveries.reduce(
      (result, delivery) => {
        result[delivery.status] =
          (result[delivery.status] || 0) + 1;

        return result;
      },
      {}
    );

    res.json({
      deliveries,
      riders,
      counts
    });
  } catch (error) {
    console.error(
      'Dashboard error:',
      error
    );

    res.status(500).json({
      error: 'Unable to load dashboard'
    });
  }
});


// ============================================
// CREATE DELIVERY
// ============================================

app.post('/api/deliveries', async (req, res) => {
  try {
    const parsed =
      deliverySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues
          .map(issue => issue.message)
          .join(', ')
      });
    }

    const payload = {
      ...parsed.data,
      delivery_code: code()
    };

    const {
      data,
      error
    } = await supabase
      .from('deliveries')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error(
        'Create delivery error:',
        error
      );

      return res.status(500).json({
        error: error.message
      });
    }

    await recordEvent(
      data.id,
      'Pending',
      'whatsapp'
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
  async (req, res) => {
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
      const {
        data: rider,
        error: riderError
      } = await supabase
        .from('riders')
        .select('*')
        .eq(
          'id',
          parsed.data.rider_id
        )
        .single();

      if (riderError || !rider) {
        return res.status(404).json({
          error: 'Rider not found'
        });
      }

      // Assign rider
      const {
        data: delivery,
        error
      } = await supabase
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

      if (error) {
        console.error(
          'Assign rider error:',
          error
        );

        return res.status(500).json({
          error: error.message
        });
      }

// Record event
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
            `Reflex delivery ${delivery.delivery_code}\n` +
            `Pickup for: ${delivery.item_description}\n` +
            `Customer: ${delivery.customer_name}\n` +
            `Location: ${delivery.delivery_address}\n` +
            `Reply PICKED ${delivery.delivery_code} when collected.`
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
  async (req, res) => {
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

      const {
        data,
        error
      } = await supabase
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

      if (error) {
        console.error(
          'Status update error:',
          error
        );

        return res.status(500).json({
          error: error.message
        });
      }

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
// WHATSAPP WEBHOOK
// ============================================

// Meta verification
app.get(
  '/api/whatsapp/webhook',
  (req, res) => {
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

    res.sendStatus(403);
  }
);


// WhatsApp inbound messages
app.post(
  '/api/whatsapp/webhook',
  async (req, res) => {
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
       * Production implementation will:
       *
       * 1. Read the WhatsApp sender
       * 2. Read the retailer message
       * 3. Extract customer details
       * 4. Validate the information
       * 5. Create a delivery
       * 6. Send confirmation back to retailer
       */

      res.sendStatus(200);
    } catch (error) {
      console.error(
        'WhatsApp webhook error:',
        error
      );

      // Always acknowledge Meta webhook requests
      res.sendStatus(200);
    }
  }
);


// ============================================
// 404 API HANDLER + FRONTEND FALLBACK
// ============================================
//
// IMPORTANT:
//
// Do NOT use:
//
// app.get('*', ...)
//
// Current Express/router versions reject
// the "*" route pattern.
//
// app.use() is used instead and is placed
// AFTER all API routes.
//

app.use((req, res) => {
  // Unknown API endpoint
  if (
    req.path.startsWith('/api/')
  ) {
    return res.status(404).json({
      error: 'Not found'
    });
  }

  // Frontend fallback
  res.sendFile(
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
  () => {
    console.log(
      `Reflex listening on 0.0.0.0:${port}`
    );
  }
);
```
