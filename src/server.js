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

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);


/* =========================================================
   APP
========================================================= */

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  express.json()
);

app.use(
  morgan('tiny')
);

app.use(
  express.static(
    path.join(
      __dirname,
      '..',
      'public'
    )
  )
);


/* =========================================================
   DELIVERY VALIDATION
========================================================= */

const deliverySchema =
  z.object({

    customer_name:
      z.string()
        .trim()
        .min(2),

    customer_phone:
      z.string()
        .trim()
        .min(9),

    delivery_address:
      z.string()
        .trim()
        .min(3),

    item_description:
      z.string()
        .trim()
        .min(2),

    retailer_name:
      z.string()
        .trim()
        .min(2)
        .default('Demo Retailer')

  });


/* =========================================================
   STATUS VALUES

   IMPORTANT:
   These are the database-friendly values.

   The frontend can display:
   pending    -> Pending
   assigned   -> Assigned
   picked_up  -> Picked Up
   delivered  -> Delivered
   failed     -> Failed
========================================================= */

const STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  FAILED: 'failed'
};


/* =========================================================
   GENERATE DELIVERY CODE
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

    const {
      error
    } =
      await supabase
        .from('delivery_events')
        .insert({

          delivery_id:
            deliveryId,

          status:
            status,

          source:
            source,

          note:
            note

        });


    if (error) {

      console.error(
        'EVENT RECORD ERROR:',
        error.message
      );

    }

    return {
      error
    };

  } catch (error) {

    console.error(
      'EVENT ERROR:',
      error
    );

    return {
      error
    };

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

      service:
        'reflex',

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

      const [
        deliveriesResult,
        ridersResult
      ] =
        await Promise.all([

          supabase
            .from('deliveries')
            .select(
              `
                *,
                rider:riders(
                  id,
                  name,
                  phone,
                  vehicle,
                  status,
                  is_available
                )
              `
            )
            .order(
              'created_at',
              {
                ascending: false
              }
            ),

          supabase
            .from('riders')
            .select('*')
            .order(
              'name',
              {
                ascending: true
              }
            )

        ]);


      const {
        data: deliveries,
        error: deliveryError
      } =
        deliveriesResult;


      const {
        data: riders,
        error: riderError
      } =
        ridersResult;


      if (
        deliveryError ||
        riderError
      ) {

        console.error(
          'DASHBOARD SUPABASE ERROR:',
          deliveryError ||
          riderError
        );


        return res
          .status(500)
          .json({

            error:
              deliveryError?.message ||
              riderError?.message ||
              'Unable to load dashboard'

          });

      }


      const safeDeliveries =
        Array.isArray(
          deliveries
        )
          ? deliveries
          : [];


      const safeRiders =
        Array.isArray(
          riders
        )
          ? riders
          : [];


      /*
      -----------------------------------------
      COUNT DELIVERY STATUSES
      -----------------------------------------
      */

      const counts = {};


      safeDeliveries.forEach(
        (delivery) => {

          const status =
            delivery.status ||
            STATUS.PENDING;


          counts[status] =
            (
              counts[status] ||
              0
            ) + 1;

        }
      );


      console.log(
        'DASHBOARD:',
        {
          deliveries:
            safeDeliveries.length,

          riders:
            safeRiders.length,

          counts
        }
      );


      return res.json({

        deliveries:
          safeDeliveries,

        riders:
          safeRiders,

        counts:
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
              parsed.error
                .issues
                .map(
                  (issue) =>
                    issue.message
                )
                .join(', ')

          });

      }


      const payload = {

        ...parsed.data,

        delivery_code:
          generateDeliveryCode(),

        status:
          STATUS.PENDING

      };


      console.log(
        'CREATING DELIVERY:',
        payload
      );


      const {
        data,
        error
      } =
        await supabase
          .from('deliveries')
          .insert(
            payload
          )
          .select()
          .single();


      if (error) {

        console.error(
          'CREATE DELIVERY SUPABASE ERROR:',
          error
        );


        return res
          .status(500)
          .json({

            error:
              error.message

          });

      }


      /*
      -----------------------------------------
      RECORD EVENT
      -----------------------------------------
      */

      await recordEvent(
        data.id,
        STATUS.PENDING,
        'whatsapp'
      );


      return res
        .status(201)
        .json(data);


    } catch (error) {

      console.error(
        'CREATE DELIVERY ERROR:',
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
            z.string()
              .uuid()

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


      /*
      -----------------------------------------
      GET RIDER
      -----------------------------------------
      */

      const {
        data: rider,
        error: riderError
      } =
        await supabase
          .from('riders')
          .select('*')
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


      /*
      -----------------------------------------
      CHECK RIDER AVAILABILITY

      We accept either:
        status = available

      OR:
        is_available = true
      -----------------------------------------
      */

      const riderAvailable =
        String(
          rider.status || ''
        )
          .trim()
          .toLowerCase() ===
          'available' ||
        rider.is_available === true;


      if (!riderAvailable) {

        return res
          .status(400)
          .json({

            error:
              'Rider is not available'

          });

      }


      /*
      -----------------------------------------
      UPDATE DELIVERY

      IMPORTANT:
      status = "assigned"
      -----------------------------------------
      */

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
          .select(
            `
              *,
              rider:riders(*)
            `
          )
          .single();


      if (deliveryError) {

        console.error(
          'ASSIGN DELIVERY SUPABASE ERROR:',
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


      /*
      -----------------------------------------
      RECORD EVENT
      -----------------------------------------
      */

      await recordEvent(

        delivery.id,

        STATUS.ASSIGNED,

        'dashboard',

        `Assigned to ${rider.name}`

      );


      /*
      -----------------------------------------
      MARK RIDER BUSY
      -----------------------------------------
      */

      const riderUpdate =
        await supabase
          .from('riders')
          .update({

            status:
              'busy',

            is_available:
              false

          })
          .eq(
            'id',
            rider.id
          );


      if (
        riderUpdate.error
      ) {

        console.error(
          'RIDER STATUS UPDATE ERROR:',
          riderUpdate.error
        );

      }


      /*
      -----------------------------------------
      SEND SMS
      -----------------------------------------
      */

      try {

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
          'SMS sent to:',
          rider.phone
        );


      } catch (error) {

        console.error(
          'SMS ERROR:',
          error.message
        );

        /*
        SMS failure does NOT cancel
        the rider assignment.
        */

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

const statusSchema =
  z.object({

    status:
      z.enum([

        STATUS.PICKED_UP,

        STATUS.DELIVERED,

        STATUS.FAILED

      ]),

    note:
      z.string()
        .optional()

  });


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

        status:
          status

      };


      if (
        status ===
        STATUS.PICKED_UP
      ) {

        fields.picked_up_at =
          now;

      }


      if (
        status ===
        STATUS.DELIVERED
      ) {

        fields.delivered_at =
          now;

      }


      if (
        status ===
        STATUS.FAILED
      ) {

        fields.failed_at =
          now;

      }


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
          .select(
            `
              *,
              rider:riders(*)
            `
          )
          .single();


      if (error) {

        console.error(
          'STATUS UPDATE SUPABASE ERROR:',
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


      /*
      -----------------------------------------
      EVENT
      -----------------------------------------
      */

      await recordEvent(

        data.id,

        status,

        'sms',

        parsed.data.note ||
          null

      );


      /*
      -----------------------------------------
      IF COMPLETED OR FAILED,
      MAKE RIDER AVAILABLE AGAIN
      -----------------------------------------
      */

      if (
        status ===
          STATUS.DELIVERED ||
        status ===
          STATUS.FAILED
      ) {

        if (
          data.rider_id
        ) {

          const riderUpdate =
            await supabase
              .from('riders')
              .update({

                status:
                  'available',

                is_available:
                  true

              })
              .eq(
                'id',
                data.rider_id
              );


          if (
            riderUpdate.error
          ) {

            console.error(
              'RIDER AVAILABILITY ERROR:',
              riderUpdate.error
            );

          }

        }

      }


      return res.json(
        data
      );


    } catch (error) {

      console.error(
        'STATUS UPDATE ERROR:',
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

      mode ===
        'subscribe' &&

      token ===
        process.env
          .WHATSAPP_VERIFY_TOKEN

    ) {

      return res
        .status(200)
        .send(
          challenge
        );

    }


    return res
      .sendStatus(403);

  }
);


/* =========================================================
   WHATSAPP WEBHOOK
========================================================= */

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
      --------------------------------------------------
      MVP WEBHOOK

      Meta may retry webhook requests.
      We acknowledge them safely.

      Full WhatsApp message parsing will be
      added in the WhatsApp integration phase.
      --------------------------------------------------
      */


      return res
        .sendStatus(200);


    } catch (error) {

      console.error(
        'WHATSAPP WEBHOOK ERROR:',
        error
      );


      return res
        .sendStatus(200);

    }

  }
);


/* =========================================================
   404 API HANDLER
========================================================= */

app.use(
  '/api',
  (_req, res) => {

    res
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
IMPORTANT:

Do NOT use:

    app.get('*', ...)

because newer Express/path-to-regexp versions
throw:

    Missing parameter name at index 1: *

Instead use a final middleware.
*/

app.use(
  (req, res, next) => {

    if (
      req.path.startsWith('/api/')
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
   ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    _req,
    res,
    _next
  ) => {

    console.error(
      'UNHANDLED SERVER ERROR:',
      error
    );


    res
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
    process.env.PORT ||
    10000
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
