import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { supabase } from './db.js';
import { sendSms } from './sms.js';


/* =========================================================
   PATHS
========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/* =========================================================
   EXPRESS
========================================================= */

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(express.json());
app.use(morgan('tiny'));

app.use(
  express.static(
    path.join(__dirname, '..', 'public')
  )
);


/* =========================================================
   DELIVERY STATUSES
========================================================= */

const STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  FAILED: 'failed'
};


/* =========================================================
   DELIVERY VALIDATION
========================================================= */

const deliverySchema = z.object({

  customer_name: z
    .string()
    .trim()
    .min(2),

  customer_phone: z
    .string()
    .trim()
    .min(9),

  delivery_address: z
    .string()
    .trim()
    .min(3),

  item_description: z
    .string()
    .trim()
    .min(2),

  retailer_name: z
    .string()
    .trim()
    .min(2)
    .default('Demo Retailer')

});


/* =========================================================
   STATUS VALIDATION
========================================================= */

const statusSchema = z.object({

  status: z.enum([
    STATUS.PICKED_UP,
    STATUS.DELIVERED,
    STATUS.FAILED
  ]),

  note: z
    .string()
    .optional()

});


/* =========================================================
   DELIVERY CODE GENERATOR
========================================================= */

function generateDeliveryCode() {

  const timestamp =
    Date.now()
      .toString(36)
      .toUpperCase();

  const random =
    Math.floor(
      Math.random() * 900 + 100
    );

  return `RFX-${timestamp}-${random}`;

}


/* =========================================================
   RECORD DELIVERY EVENT
========================================================= */

async function recordEvent(
  deliveryId,
  status,
  source = 'dashboard',
  note = null
) {

  try {

    const { error } =
      await supabase
        .from('delivery_events')
        .insert({

          delivery_id: deliveryId,

          status: status,

          source: source,

          note: note

        });


    if (error) {

      console.error(
        'EVENT RECORD ERROR:',
        error.message
      );

    }

    return { error };

  } catch (error) {

    console.error(
      'EVENT ERROR:',
      error
    );

    return { error };

  }

}


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  '/api/health',
  (_req, res) => {

    res.json({

      ok: true,

      service: 'reflex',

      time:
        new Date()
          .toISOString()

    });

  }
);


/* =========================================================
   DASHBOARD
========================================================= */

app.get(
  '/api/dashboard',
  async (_req, res) => {

    try {

      /*
       * IMPORTANT:
       *
       * riders table contains:
       *
       * id
       * name
       * phone
       * status
       *
       * There is NO vehicle column.
       * There is NO is_available column.
       */

      const deliveriesPromise =
        supabase
          .from('deliveries')
          .select(`
            *,
            rider:riders(
              id,
              name,
              phone,
              status
            )
          `)
          .order(
            'created_at',
            {
              ascending: false
            }
          );


      const ridersPromise =
        supabase
          .from('riders')
          .select(`
            id,
            name,
            phone,
            status
          `)
          .order(
            'name',
            {
              ascending: true
            }
          );


      const [
        deliveriesResult,
        ridersResult
      ] =
        await Promise.all([
          deliveriesPromise,
          ridersPromise
        ]);


      /* -----------------------------------------
         DELIVERY ERROR
      ----------------------------------------- */

      if (
        deliveriesResult.error
      ) {

        console.error(
          'DELIVERIES QUERY ERROR:',
          deliveriesResult.error
        );

        return res
          .status(500)
          .json({

            error:
              deliveriesResult.error.message

          });

      }


      /* -----------------------------------------
         RIDER ERROR
      ----------------------------------------- */

      if (
        ridersResult.error
      ) {

        console.error(
          'RIDERS QUERY ERROR:',
          ridersResult.error
        );

        return res
          .status(500)
          .json({

            error:
              ridersResult.error.message

          });

      }


      const deliveries =
        deliveriesResult.data || [];


      const riders =
        ridersResult.data || [];


      /* -----------------------------------------
         COUNTS
      ----------------------------------------- */

      const counts = {

        pending: 0,

        assigned: 0,

        picked_up: 0,

        delivered: 0,

        failed: 0

      };


      deliveries.forEach(
        (delivery) => {

          const status =
            String(
              delivery.status || ''
            )
              .trim()
              .toLowerCase();


          if (
            Object.prototype
              .hasOwnProperty
              .call(
                counts,
                status
              )
          ) {

            counts[status]++;

          }

        }
      );


      console.log(
        'DASHBOARD:',
        {
          deliveries:
            deliveries.length,

          riders:
            riders.length,

          counts
        }
      );


      return res.json({

        deliveries,

        riders,

        counts

      });


    } catch (error) {

      console.error(
        'DASHBOARD ERROR:',
        error
      );


      return res
        .status(500)
        .json({

          error:
            'Unable to load dashboard'

        });

    }

  }
);


/* =========================================================
   CREATE DELIVERY
========================================================= */

app.post(
  '/api/deliveries',
  async (req, res) => {

    try {

      const parsed =
        deliverySchema.safeParse(
          req.body
        );


      if (
        !parsed.success
      ) {

        return res
          .status(400)
          .json({

            error:
              parsed.error.issues
                .map(
                  issue =>
                    issue.message
                )
                .join(', ')

          });

      }


      const payload = {

        retailer_name:
          parsed.data
            .retailer_name,

        customer_name:
          parsed.data
            .customer_name,

        customer_phone:
          parsed.data
            .customer_phone,

        delivery_address:
          parsed.data
            .delivery_address,

        item_description:
          parsed.data
            .item_description,

        delivery_code:
          generateDeliveryCode(),

        status:
          STATUS.PENDING

      };


      console.log(
        'CREATE DELIVERY:',
        payload
      );


      const {
        data,
        error
      } =
        await supabase
          .from('deliveries')
          .insert(payload)
          .select()
          .single();


      if (error) {

        console.error(
          'CREATE DELIVERY ERROR:',
          error
        );


        return res
          .status(500)
          .json({

            error:
              error.message

          });

      }


      await recordEvent(
        data.id,
        STATUS.PENDING,
        'dashboard',
        'Delivery created'
      );


      return res
        .status(201)
        .json(data);


    } catch (error) {

      console.error(
        'CREATE DELIVERY EXCEPTION:',
        error
      );


      return res
        .status(500)
        .json({

          error:
            'Unable to create delivery'

        });

    }

  }
);


/* =========================================================
   ASSIGN RIDER
========================================================= */

app.post(
  '/api/deliveries/:id/assign',
  async (req, res) => {

    try {

      const schema =
        z.object({

          rider_id:
            z.string().uuid()

        });


      const parsed =
        schema.safeParse(
          req.body
        );


      if (
        !parsed.success
      ) {

        return res
          .status(400)
          .json({

            error:
              'Valid rider_id is required'

          });

      }


      const deliveryId =
        req.params.id;


      const riderId =
        parsed.data.rider_id;


      console.log(
        'ASSIGN RIDER REQUEST:',
        {
          deliveryId,
          riderId
        }
      );


      /* -----------------------------------------
         GET RIDER
      ----------------------------------------- */

      const {
        data: rider,
        error: riderError
      } =
        await supabase
          .from('riders')
          .select(`
            id,
            name,
            phone,
            status
          `)
          .eq(
            'id',
            riderId
          )
          .single();


      if (riderError) {

        console.error(
          'RIDER LOOKUP ERROR:',
          riderError
        );


        return res
          .status(500)
          .json({

            error:
              riderError.message

          });

      }


      if (!rider) {

        return res
          .status(404)
          .json({

            error:
              'Rider not found'

          });

      }


      /* -----------------------------------------
         CHECK RIDER STATUS
      ----------------------------------------- */

      const riderStatus =
        String(
          rider.status || ''
        )
          .trim()
          .toLowerCase();


      if (
        riderStatus &&
        riderStatus !== 'available'
      ) {

        return res
          .status(400)
          .json({

            error:
              `Rider ${rider.name} is currently ${rider.status}`

          });

      }


      /* -----------------------------------------
         ASSIGN DELIVERY
      ----------------------------------------- */

      const {
        data: delivery,
        error: deliveryError
      } =
        await supabase
          .from('deliveries')
          .update({

            rider_id:
              rider.id,

            status:
              STATUS.ASSIGNED,

            assigned_at:
              new Date()
                .toISOString()

          })
          .eq(
            'id',
            deliveryId
          )
          .select(`
            *,
            rider:riders(
              id,
              name,
              phone,
              status
            )
          `)
          .single();


      if (deliveryError) {

        console.error(
          'DELIVERY ASSIGNMENT ERROR:',
          deliveryError
        );


        return res
          .status(500)
          .json({

            error:
              deliveryError.message

          });

      }


      if (!delivery) {

        return res
          .status(404)
          .json({

            error:
              'Delivery not found'

          });

      }


      /* -----------------------------------------
         RECORD ASSIGNMENT
      ----------------------------------------- */

      await recordEvent(

        delivery.id,

        STATUS.ASSIGNED,

        'dashboard',

        `Assigned to ${rider.name}`

      );


      /* -----------------------------------------
         MARK RIDER BUSY
      ----------------------------------------- */

      const {
        error: riderUpdateError
      } =
        await supabase
          .from('riders')
          .update({

            status:
              'busy'

          })
          .eq(
            'id',
            rider.id
          );


      if (
        riderUpdateError
      ) {

        console.error(
          'RIDER BUSY UPDATE ERROR:',
          riderUpdateError
        );

      }


      /* -----------------------------------------
         SEND SMS
      ----------------------------------------- */

      try {

        if (
          rider.phone
        ) {

          await sendSms({

            to:
              rider.phone,

            message:
              `Reflex delivery ${delivery.delivery_code}\n` +
              `Pickup for: ${delivery.item_description}\n` +
              `Customer: ${delivery.customer_name}\n` +
              `Location: ${delivery.delivery_address}\n` +
              `Reply PICKED ${delivery.delivery_code} when collected.`

          });


          console.log(
            'ASSIGNMENT SMS SENT'
          );

        } else {

          console.log(
            'Rider has no phone number. SMS skipped.'
          );

        }

      } catch (error) {

        /*
         * Do NOT fail the assignment if SMS
         * happens to fail.
         */

        console.error(
          'SMS ERROR:',
          error.message
        );

      }


      return res.json(
        delivery
      );


    } catch (error) {

      console.error(
        'ASSIGN RIDER ERROR:',
        error
      );


      return res
        .status(500)
        .json({

          error:
            'Unable to assign rider'

        });

    }

  }
);


/* =========================================================
   UPDATE DELIVERY STATUS
========================================================= */

app.post(
  '/api/deliveries/:id/status',
  async (req, res) => {

    try {

      const parsed =
        statusSchema.safeParse(
          req.body
        );


      if (
        !parsed.success
      ) {

        return res
          .status(400)
          .json({

            error:
              'Status must be picked_up, delivered, or failed'

          });

      }


      const status =
        parsed.data.status;


      const now =
        new Date()
          .toISOString();


      const fields = {

        status

      };


      /* -----------------------------------------
         PICKED UP
      ----------------------------------------- */

      if (
        status ===
        STATUS.PICKED_UP
      ) {

        fields.picked_up_at =
          now;

      }


      /* -----------------------------------------
         DELIVERED
      ----------------------------------------- */

      if (
        status ===
        STATUS.DELIVERED
      ) {

        fields.delivered_at =
          now;

      }


      /* -----------------------------------------
         FAILED
      ----------------------------------------- */

      if (
        status ===
        STATUS.FAILED
      ) {

        /*
         * Your deliveries schema does NOT show
         * a failed_at column.
         *
         * Therefore we only update status.
         */

      }


      /* -----------------------------------------
         UPDATE DELIVERY
      ----------------------------------------- */

      const {
        data,
        error
      } =
        await supabase
          .from('deliveries')
          .update(fields)
          .eq(
            'id',
            req.params.id
          )
          .select(`
            *,
            rider:riders(
              id,
              name,
              phone,
              status
            )
          `)
          .single();


      if (error) {

        console.error(
          'STATUS UPDATE ERROR:',
          error
        );


        return res
          .status(500)
          .json({

            error:
              error.message

          });

      }


      if (!data) {

        return res
          .status(404)
          .json({

            error:
              'Delivery not found'

          });

      }


      /* -----------------------------------------
         RECORD EVENT
      ----------------------------------------- */

      await recordEvent(

        data.id,

        status,

        'dashboard',

        parsed.data.note || null

      );


      /* -----------------------------------------
         FREE RIDER
      ----------------------------------------- */

      if (
        status ===
          STATUS.DELIVERED ||
        status ===
          STATUS.FAILED
      ) {

        if (
          data.rider_id
        ) {

          const {
            error: riderError
          } =
            await supabase
              .from('riders')
              .update({

                status:
                  'available'

              })
              .eq(
                'id',
                data.rider_id
              );


          if (
            riderError
          ) {

            console.error(
              'RIDER AVAILABILITY ERROR:',
              riderError
            );

          }

        }

      }


      return res.json(
        data
      );


    } catch (error) {

      console.error(
        'STATUS UPDATE EXCEPTION:',
        error
      );


      return res
        .status(500)
        .json({

          error:
            'Unable to update delivery status'

        });

    }

  }
);


/* =========================================================
   WHATSAPP WEBHOOK VERIFICATION
========================================================= */

app.get(
  '/api/whatsapp/webhook',
  (req, res) => {

    const mode =
      req.query[
        'hub.mode'
      ];

    const token =
      req.query[
        'hub.verify_token'
      ];

    const challenge =
      req.query[
        'hub.challenge'
      ];


    if (
      mode === 'subscribe' &&
      token ===
        process.env.WHATSAPP_VERIFY_TOKEN
    ) {

      return res
        .status(200)
        .send(challenge);

    }


    return res
      .sendStatus(403);

  }
);


/* =========================================================
   WHATSAPP INBOUND WEBHOOK - DIAGNOSTIC
========================================================= */

app.post(
  '/api/whatsapp/webhook',
  async (req, res) => {

    console.log('');
    console.log('========================================');
    console.log('WHATSAPP WEBHOOK HIT');
    console.log('========================================');

    console.log(
      'METHOD:',
      req.method
    );

    console.log(
      'CONTENT-TYPE:',
      req.headers['content-type']
    );

    console.log(
      'USER-AGENT:',
      req.headers['user-agent']
    );

    console.log(
      'BODY:',
      JSON.stringify(
        req.body,
        null,
        2
      )
    );

    console.log('========================================');
    console.log('');

    /*
     * Always acknowledge Meta.
     */

    return res
      .status(200)
      .send('EVENT_RECEIVED');

  }
);


/* =========================================================
   API 404
========================================================= */

app.use(
  '/api',
  (_req, res) => {

    return res
      .status(404)
      .json({

        error:
          'API endpoint not found'

      });

  }
);


/* =========================================================
   FRONTEND FALLBACK
========================================================= */

/*
 * IMPORTANT:
 *
 * Do NOT use:
 *
 * app.get('*', ...)
 *
 * Newer Express versions can throw:
 *
 * PathError: Missing parameter name at index 1: *
 *
 * This middleware safely serves index.html
 * for frontend routes.
 */

app.use(
  (req, res, next) => {

    if (
      req.path.startsWith('/api')
    ) {

      return next();

    }


    return res.sendFile(
      path.join(
        __dirname,
        '..',
        'public',
        'index.html'
      )
    );

  }
);


/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    _req,
    res,
    _next
  ) => {

    console.error(
      'UNHANDLED ERROR:',
      error
    );


    return res
      .status(500)
      .json({

        error:
          'Internal server error'

      });

  }
);


/* =========================================================
   START SERVER
========================================================= */

const port =
  Number(
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
