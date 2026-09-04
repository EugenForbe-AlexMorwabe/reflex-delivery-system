Reflex Delivery System — server.js (Picked Up Update)
Based on server_fixed_copy_NEXT_DELIVERY_READY_RIDER_NOTIFICATION_EVENT_FIX.docx. Adds rider WhatsApp PICKED command handling while preserving existing delivery, assignment, event, and WhatsApp flows.
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

          notes: note

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

      const assignmentEvent = await recordEvent(

        delivery.id,

        STATUS.ASSIGNED,

        'dashboard',

        `Assigned to ${rider.name}`

      );

      if (assignmentEvent?.error) {
        console.error(
          'ASSIGNMENT EVENT FAILED:',
          assignmentEvent.error
        );
      } else {
        console.log(
          'ASSIGNMENT EVENT RECORDED:',
          delivery.id
        );
      }


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
         SEND RIDER WHATSAPP NOTIFICATION
      ----------------------------------------- */

      try {

        if (rider.phone) {

          const riderWhatsAppPhone =
            normalizePhone(rider.phone);

          console.log(
            'RIDER WHATSAPP NOTIFICATION:',
            {
              rider: rider.name,
              phone: riderWhatsAppPhone,
              deliveryCode: delivery.delivery_code
            }
          );

          await sendWhatsAppMessage(
            riderWhatsAppPhone,
            `🛵 *New Reflex Delivery Assignment*\n\n` +
            `🆔 Delivery Code: *${delivery.delivery_code}*\n` +
            `👤 Customer: ${delivery.customer_name}\n` +
            `📱 Customer Phone: ${delivery.customer_phone}\n` +
            `📍 Delivery Location: ${delivery.delivery_address}\n` +
            `📦 Item: ${delivery.item_description}\n` +
            `📌 Status: *ASSIGNED*\n\n` +
            `Please collect the delivery and update Reflex when you have picked it up.`
          );

          console.log(
            'RIDER WHATSAPP NOTIFICATION SENT'
          );

        } else {

          console.log(
            'Rider has no phone number. WhatsApp notification skipped.'
          );

        }

      } catch (error) {

        console.error(
          'RIDER WHATSAPP NOTIFICATION ERROR:',
          error.message
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
   WHATSAPP CONVERSATION STATE
========================================================= */

const whatsappSessions = new Map();

function normalizePhone(phone) {
  const value = String(phone || '').replace(/\D/g, '');
  if (value.startsWith('254')) return value;
  if (value.startsWith('0') && value.length === 10) return `254${value.slice(1)}`;
  return value;
}

function resetWhatsAppSession(phone) {
  const key = normalizePhone(phone);
  const session = { state: 'customer_name', data: {} };
  whatsappSessions.set(key, session);
  return session;
}

function isStartCommand(text) {
  return ['hi', 'hello', 'hey', 'start', 'menu'].includes(String(text || '').trim().toLowerCase());
}

function isCancelCommand(text) {
  return ['cancel', 'stop', 'quit', 'exit'].includes(String(text || '').trim().toLowerCase());
}

function isYes(text) {
  return ['yes', 'y', 'confirm', 'confirmed'].includes(String(text || '').trim().toLowerCase());
}

function isNo(text) {
  return ['no', 'n'].includes(String(text || '').trim().toLowerCase());
}

/* =========================================================
   WHATSAPP INBOUND WEBHOOK
========================================================= */

app.post('/api/whatsapp/webhook', async (req, res) => {
  console.log('');
  console.log('========================================');
  console.log('WHATSAPP WEBHOOK HIT');
  console.log('========================================');

  try {
    const body = req.body;
    console.log('Incoming WhatsApp payload:', JSON.stringify(body, null, 2));

    for (const entry of body?.entry || []) {
      for (const change of entry?.changes || []) {
        for (const message of change?.value?.messages || []) {
          if (message?.type !== 'text') {
            console.log('Ignoring non-text WhatsApp message:', message?.type);
            continue;
          }

          const from = normalizePhone(message?.from);
          const text = message?.text?.body?.trim();

          console.log('WhatsApp sender:', from);
          console.log('WhatsApp message:', text);

          if (!from || !text) continue;

          try {
            /* -----------------------------------------
               RIDER PICKED-UP COMMAND
            ----------------------------------------- */

            const pickedCommand =
              text.match(/^PICKED\s+(.+)$/i);

            if (pickedCommand) {
              const deliveryCode =
                pickedCommand[1].trim();

              console.log(
                'RIDER PICKED COMMAND:',
                {
                  riderPhone: from,
                  deliveryCode
                }
              );

              const {
                data: delivery,
                error: deliveryLookupError
              } = await supabase
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
                .eq('delivery_code', deliveryCode)
                .single();

              if (deliveryLookupError || !delivery) {
                console.error(
                  'RIDER PICKED DELIVERY LOOKUP ERROR:',
                  deliveryLookupError
                );

                await sendWhatsAppMessage(
                  from,
                  `⚠️ I couldn't find delivery *${deliveryCode}*.\n\nPlease check the delivery code and try again.`
                );
                continue;
              }

              if (!delivery.rider) {
                await sendWhatsAppMessage(
                  from,
                  `⚠️ Delivery *${deliveryCode}* has not been assigned to a rider yet.`
                );
                continue;
              }

              if (
                normalizePhone(delivery.rider.phone) !== from
              ) {
                console.error(
                  'RIDER PICKED PHONE MISMATCH:',
                  {
                    deliveryCode,
                    riderPhone: from,
                    assignedRiderPhone: normalizePhone(
                      delivery.rider.phone
                    )
                  }
                );

                await sendWhatsAppMessage(
                  from,
                  `⚠️ This delivery is assigned to another rider.`
                );
                continue;
              }

              if (delivery.status !== STATUS.ASSIGNED) {
                await sendWhatsAppMessage(
                  from,
                  `ℹ️ Delivery *${deliveryCode}* is currently *${String(
                    delivery.status || ''
                  ).toUpperCase()}*.\n\nOnly an assigned delivery can be marked as picked up.`
                );
                continue;
              }

              const pickedUpAt =
                new Date().toISOString();

              const {
                data: updatedDelivery,
                error: pickupUpdateError
              } = await supabase
                .from('deliveries')
                .update({
                  status: STATUS.PICKED_UP,
                  picked_up_at: pickedUpAt
                })
                .eq('id', delivery.id)
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

              if (pickupUpdateError || !updatedDelivery) {
                console.error(
                  'RIDER PICKED UPDATE ERROR:',
                  pickupUpdateError
                );

                await sendWhatsAppMessage(
                  from,
                  `⚠️ I couldn't mark delivery *${deliveryCode}* as picked up.\n\nPlease try again.`
                );
                continue;
              }

              const pickupEvent =
                await recordEvent(
                  updatedDelivery.id,
                  STATUS.PICKED_UP,
                  'whatsapp',
                  `Picked up by ${delivery.rider.name}`
                );

              if (pickupEvent.error) {
                console.error(
                  'PICKED-UP EVENT FAILED:',
                  pickupEvent.error
                );

                await supabase
                  .from('deliveries')
                  .update({
                    status: STATUS.ASSIGNED,
                    picked_up_at: null
                  })
                  .eq('id', delivery.id);

                await sendWhatsAppMessage(
                  from,
                  `⚠️ The pickup could not be completed because the delivery event could not be recorded.\n\nPlease try again.`
                );
                continue;
              }

              console.log(
                'RIDER PICKED-UP EVENT RECORDED:',
                updatedDelivery.id
              );

              await sendWhatsAppMessage(
                from,
                `✅ *Delivery Picked Up*\n\n` +
                `🆔 Delivery Code: *${deliveryCode}*\n` +
                `👤 Customer: ${updatedDelivery.customer_name}\n` +
                `📍 Location: ${updatedDelivery.delivery_address}\n` +
                `📦 Item: ${updatedDelivery.item_description}\n` +
                `📌 Status: *PICKED UP*\n\n` +
                `Please proceed to the delivery location and update Reflex when the delivery is completed.`
              );

              continue;
            }

            let session = whatsappSessions.get(from);

            if (!session || isStartCommand(text)) {
              session = resetWhatsAppSession(from);
              await sendWhatsAppMessage(from,
                `👋 Welcome to Reflex Delivery!\n\n` +
                `Let's create a delivery.\n\n` +
                `Please enter the customer's name.`
              );
              continue;
            }

            if (isCancelCommand(text)) {
              resetWhatsAppSession(from);
              await sendWhatsAppMessage(from,
                `❌ Delivery creation cancelled.\n\nSend *Hi* whenever you want to create a new delivery.`
              );
              continue;
            }

            switch (session.state) {
              case 'customer_name':
                if (text.length < 2) {
                  await sendWhatsAppMessage(from, `Please enter a valid customer's name.`);
                  break;
                }
                session.data.customer_name = text;
                session.state = 'customer_phone';
                await sendWhatsAppMessage(from, `Thanks! 👍\n\nPlease enter the customer's phone number.`);
                break;

              case 'customer_phone': {
                const phone = normalizePhone(text);
                if (phone.length < 9) {
                  await sendWhatsAppMessage(from, `Please enter a valid phone number, for example *0712345678*.`);
                  break;
                }
                session.data.customer_phone = phone;
                session.state = 'delivery_address';
                await sendWhatsAppMessage(from, `Got it. 📍\n\nPlease enter the delivery address or location.`);
                break;
              }

              case 'delivery_address':
                if (text.length < 3) {
                  await sendWhatsAppMessage(from, `Please enter a more complete delivery address.`);
                  break;
                }
                session.data.delivery_address = text;
                session.state = 'item_description';
                await sendWhatsAppMessage(from, `Perfect. 📦\n\nWhat item is being delivered?`);
                break;

              case 'item_description': {
                if (text.length < 2) {
                  await sendWhatsAppMessage(from, `Please enter a short description of the item.`);
                  break;
                }
                session.data.item_description = text;
                session.state = 'confirmation';
                const d = session.data;
                await sendWhatsAppMessage(from,
                  `📋 *Delivery Summary*\n\n` +
                  `👤 Customer: ${d.customer_name}\n` +
                  `📱 Phone: ${d.customer_phone}\n` +
                  `📍 Address: ${d.delivery_address}\n` +
                  `📦 Item: ${d.item_description}\n\n` +
                  `Reply *YES* to create this delivery.\nReply *NO* to cancel.`
                );
                break;
              }

              case 'confirmation': {
                if (isNo(text)) {
                  resetWhatsAppSession(from);
                  await sendWhatsAppMessage(from, `❌ Delivery cancelled.\n\nSend *Hi* to start again.`);
                  break;
                }

                if (!isYes(text)) {
                  await sendWhatsAppMessage(from, `Please reply *YES* to create the delivery or *NO* to cancel.`);
                  break;
                }

                const d = session.data;
                const payload = {
                  retailer_name: 'WhatsApp Retailer',
                  customer_name: d.customer_name,
                  customer_phone: d.customer_phone,
                  delivery_address: d.delivery_address,
                  item_description: d.item_description,
                  delivery_code: generateDeliveryCode(),
                  status: STATUS.PENDING
                };

                console.log('WHATSAPP CREATE DELIVERY:', payload);

                const { data: delivery, error: deliveryError } = await supabase
                  .from('deliveries')
                  .insert(payload)
                  .select()
                  .single();

                if (deliveryError) {
                  console.error('WHATSAPP CREATE DELIVERY ERROR:', deliveryError);
                  await sendWhatsAppMessage(from,
                    `⚠️ I couldn't create the delivery right now.\n\nPlease try again in a moment.`
                  );
                  break;
                }

                await recordEvent(
                  delivery.id,
                  STATUS.PENDING,
                  'whatsapp',
                  'Delivery created through WhatsApp'
                );

                resetWhatsAppSession(from);

                await sendWhatsAppMessage(from,
                  `✅ *Delivery created successfully!*\n\n` +
                  `🆔 Delivery Code: *${delivery.delivery_code}*\n` +
                  `👤 Customer: ${delivery.customer_name}\n` +
                  `📱 Phone: ${delivery.customer_phone}\n` +
                  `📍 Address: ${delivery.delivery_address}\n` +
                  `📦 Item: ${delivery.item_description}\n` +
                  `📌 Status: *PENDING*\n\n` +
                  `The delivery is now in the Reflex dashboard.`
                );

                // The delivery has been posted successfully. The session was
                // already reset above, so the sender is ready for a new request.
                await sendWhatsAppMessage(from,
                  `🙏 *Thank you for trusting us with your deliveries!*\n\n` +
                  `🔄 Reflex is ready for your next delivery request.\n` +
                  `When you're ready, send *Hi* to begin your next transaction.`
                );
                break;
              }

              default:
                resetWhatsAppSession(from);
                await sendWhatsAppMessage(from, `Let's start a new delivery.\n\nPlease enter the customer's name.`);
                break;
            }
          } catch (conversationError) {
            console.error('WHATSAPP CONVERSATION ERROR:', conversationError);
            try {
              await sendWhatsAppMessage(from,
                `⚠️ Something went wrong while processing that message.\n\nPlease send *Hi* to start a new delivery.`
              );
            } catch (sendError) {
              console.error('WHATSAPP ERROR RESPONSE FAILED:', sendError);
            }
          }
        }
      }
    }

    console.log('========================================');
    return res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('WHATSAPP WEBHOOK ERROR:', error);
    return res.status(200).send('EVENT_RECEIVED');
  }
});

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
