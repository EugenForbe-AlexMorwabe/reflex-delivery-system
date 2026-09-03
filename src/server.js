
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
   PRIVACY POLICY
========================================================= */

app.get('/privacy', (req, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
      >

      <title>Reflex Delivery - Privacy Policy</title>

      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 850px;
          margin: 0 auto;
          padding: 40px 20px;
          line-height: 1.7;
          color: #172033;
          background: #f7f9fc;
        }

        .container {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
        }

        h1 {
          margin-top: 0;
        }

        h2 {
          margin-top: 32px;
        }

        .updated {
          color: #667085;
          font-size: 14px;
        }
      </style>
    </head>

    <body>
      <div class="container">

        <h1>Reflex Delivery Privacy Policy</h1>

        <p class="updated">
          Last updated: September 2026
        </p>

        <p>
          Reflex Delivery is a delivery management platform that
          helps businesses manage delivery requests, customers,
          riders and delivery communications.
        </p>

        <h2>Information We Collect</h2>

        <p>
          We may collect information required to provide delivery
          services, including customer names, phone numbers,
          delivery addresses, delivery details and rider information.
        </p>

        <h2>How We Use Information</h2>

        <p>
          Information is used to create and manage deliveries,
          assign riders, communicate delivery information and
          provide the delivery management service.
        </p>

        <h2>WhatsApp Communications</h2>

        <p>
          Reflex Delivery may use the WhatsApp Business Platform
          to receive and send messages relating to delivery
          requests and delivery operations.
        </p>

        <h2>Information Sharing</h2>

        <p>
          Information may be shared with authorized delivery
          personnel when necessary to complete a delivery.
        </p>

        <h2>Data Security</h2>

        <p>
          We take reasonable measures to protect information
          handled through the Reflex Delivery platform.
        </p>

        <h2>Data Retention</h2>

        <p>
          Information is retained only for as long as reasonably
          necessary to operate the service and maintain delivery
          records.
        </p>

        <h2>Your Rights</h2>

        <p>
          If you have questions about information handled by
          Reflex Delivery or would like to request deletion of
          information, please contact the Reflex Delivery
          service administrator.
        </p>

        <h2>Contact</h2>

        <p>
          For privacy-related questions, please contact the
          Reflex Delivery service administrator.
        </p>

      </div>
    </body>
    </html>
  `);
});

/* =========================================================
   TERMS OF SERVICE
========================================================= */

app.get('/terms', (req, res) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Terms of Service - Reflex Delivery System</title>

      <style>
        body {
          margin: 0;
          padding: 40px 20px;
          font-family: Arial, sans-serif;
          background: #f5f7fb;
          color: #172033;
          line-height: 1.7;
        }

        .container {
          max-width: 850px;
          margin: 0 auto;
          background: #ffffff;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.06);
        }

        h1 {
          margin-top: 0;
          color: #0f172a;
        }

        h2 {
          margin-top: 30px;
          color: #1e293b;
        }

        p, li {
          color: #475569;
        }

        .brand {
          color: #2563eb;
          font-weight: bold;
        }

        .updated {
          font-size: 14px;
          color: #64748b;
        }
      </style>
    </head>

    <body>
      <div class="container">

        <h1>Terms of Service</h1>

        <p class="updated">
          Last updated: ${new Date().toISOString().split('T')[0]}
        </p>

        <p>
          Welcome to <span class="brand">Reflex Delivery System</span>.
          These Terms of Service govern your use of the Reflex Delivery
          System platform and related services.
        </p>

        <h2>1. Use of the Service</h2>

        <p>
          Reflex Delivery System provides tools for managing delivery
          requests, assigning riders, tracking delivery status, and
          communicating with customers through supported messaging
          channels.
        </p>

        <p>
          You agree to use the service only for lawful business and
          delivery-related purposes.
        </p>

        <h2>2. User Responsibilities</h2>

        <p>
          Users are responsible for ensuring that information entered
          into the system is accurate and that they have the appropriate
          permission to use customer and delivery information.
        </p>

        <h2>3. WhatsApp Communications</h2>

        <p>
          Where WhatsApp messaging is enabled, messages may be sent and
          received through Meta's WhatsApp Business Platform. Your use of
          WhatsApp is also subject to Meta and WhatsApp's applicable
          terms and policies.
        </p>

        <h2>4. Delivery Information</h2>

        <p>
          Reflex Delivery System is a software platform for managing
          delivery operations. Users remain responsible for the actual
          delivery services, riders, customers, goods, addresses, and
          transactions managed through the platform.
        </p>

        <h2>5. Availability</h2>

        <p>
          We aim to keep the service available and reliable, but we do
          not guarantee uninterrupted or error-free operation.
        </p>

        <h2>6. Limitation of Liability</h2>

        <p>
          To the extent permitted by applicable law, Reflex Delivery
          System is not responsible for losses resulting from inaccurate
          information supplied by users, delivery operations conducted
          by third parties, or interruptions caused by external services.
        </p>

        <h2>7. Changes to These Terms</h2>

        <p>
          These Terms may be updated from time to time. Continued use of
          the service after changes are posted constitutes acceptance of
          the updated Terms.
        </p>

        <h2>8. Contact</h2>

        <p>
          For questions regarding these Terms of Service, please contact
          the Reflex Delivery System administrator through the contact
          information associated with the application.
        </p>

      </div>
    </body>
    </html>
  `);
});

/* =========================================================
   USER DATA DELETION
========================================================= */

app.get('/data-deletion', (req, res) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Data Deletion - Reflex Delivery System</title>

      <style>
        body {
          margin: 0;
          padding: 40px 20px;
          font-family: Arial, sans-serif;
          background: #f5f7fb;
          color: #172033;
          line-height: 1.7;
        }

        .container {
          max-width: 850px;
          margin: 0 auto;
          background: #ffffff;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.06);
        }

        h1 {
          margin-top: 0;
          color: #0f172a;
        }

        h2 {
          margin-top: 30px;
          color: #1e293b;
        }

        p, li {
          color: #475569;
        }

        .brand {
          color: #2563eb;
          font-weight: bold;
        }

        .notice {
          background: #eff6ff;
          border-left: 4px solid #2563eb;
          padding: 15px 18px;
          margin: 25px 0;
        }

        .updated {
          font-size: 14px;
          color: #64748b;
        }
      </style>
    </head>

    <body>
      <div class="container">

        <h1>User Data Deletion</h1>

        <p class="updated">
          Last updated: ${new Date().toISOString().split('T')[0]}
        </p>

        <p>
          <span class="brand">Reflex Delivery System</span>
          respects users' rights regarding their personal information.
        </p>

        <h2>How to Request Data Deletion</h2>

        <p>
          If you would like your personal information associated with
          Reflex Delivery System to be deleted, contact the application
          administrator and request deletion of your data.
        </p>

        <div class="notice">
          <strong>Deletion request</strong><br>
          Please provide the WhatsApp phone number or other identifying
          information associated with your account so that the appropriate
          data can be located.
        </div>

        <h2>What Happens After a Request</h2>

        <p>
          After receiving a valid deletion request, the administrator
          will review the request and identify information that can be
          deleted in accordance with applicable legal, operational, and
          record-keeping requirements.
        </p>

        <h2>Information That May Be Deleted</h2>

        <ul>
          <li>Personal contact information</li>
          <li>WhatsApp-related customer information</li>
          <li>User-provided profile information</li>
          <li>Other personal information associated with the request</li>
        </ul>

        <h2>Information That May Need to Be Retained</h2>

        <p>
          Certain information may need to be retained where required by
          law, legitimate business records, fraud prevention,
          accounting, dispute resolution, or other applicable
          requirements.
        </p>

        <h2>Contact</h2>

        <p>
          To submit a deletion request, contact the Reflex Delivery
          System administrator using the contact information associated
          with the application.
        </p>

      </div>
    </body>
    </html>
  `);
});
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
   WHATSAPP SEND MESSAGE
========================================================= */

async function sendWhatsAppMessage(to, message) {
  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID;

  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId) {
    throw new Error(
      'WHATSAPP_PHONE_NUMBER_ID is missing'
    );
  }

  if (!accessToken) {
    throw new Error(
      'WHATSAPP_ACCESS_TOKEN is missing'
    );
  }

  const response = await fetch(
    `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
    {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        messaging_product: 'whatsapp',

        recipient_type: 'individual',

        to: to,

        type: 'text',

        text: {
          preview_url: false,
          body: message
        }
      })
    }
  );

  const result = await response.json();

  console.log(
    'WhatsApp send response:',
    JSON.stringify(result, null, 2)
  );

  if (!response.ok) {
    throw new Error(
      result?.error?.message ||
      'WhatsApp message failed'
    );
  }

  return result;
}
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
   WHATSAPP INBOUND WEBHOOK
========================================================= */

app.post(
  '/api/whatsapp/webhook',
  async (req, res) => {

    console.log('');
    console.log('========================================');
    console.log('WHATSAPP WEBHOOK HIT');
    console.log('========================================');

    try {

      const body = req.body;

      console.log(
        'Incoming WhatsApp payload:',
        JSON.stringify(
          body,
          null,
          2
        )
      );

      const entries =
        body?.entry || [];

      for (const entry of entries) {

        const changes =
          entry?.changes || [];

        for (const change of changes) {

          const value =
            change?.value;

          const messages =
            value?.messages || [];

          for (const message of messages) {

            /*
             * We only handle text messages
             * for this first test.
             */

            if (
              message?.type !== 'text'
            ) {
              console.log(
                'Ignoring non-text WhatsApp message:',
                message?.type
              );

              continue;
            }

            const from =
              message?.from;

            const text =
              message?.text?.body?.trim();

            console.log(
              'WhatsApp sender:',
              from
            );

            console.log(
              'WhatsApp message:',
              text
            );

            if (
              !from ||
              !text
            ) {
              console.log(
                'Missing sender or message text'
              );

              continue;
            }

            /*
             * FIRST REFLEX RESPONSE
             */

            const reply =
              `👋 Welcome to Reflex Delivery!\n\n` +
              `Let's create a delivery.\n\n` +
              `Please enter the customer's name.`;

            try {

              await sendWhatsAppMessage(
                from,
                reply
              );

              console.log(
                'WhatsApp reply sent successfully to:',
                from
              );

            } catch (smsError) {

              console.error(
                'WhatsApp send error:',
                smsError.message
              );

            }
          }
        }
      }

      console.log(
        '========================================'
      );

      return res
        .status(200)
        .send('EVENT_RECEIVED');

    } catch (error) {

      console.error(
        'WHATSAPP WEBHOOK ERROR:',
        error
      );

      /*
       * Still acknowledge Meta.
       */

      return res
        .status(200)
        .send('EVENT_RECEIVED');
    }
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
