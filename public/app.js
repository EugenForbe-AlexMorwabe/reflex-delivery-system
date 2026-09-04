/*Reflex Delivery System — Corrected Dashboard app.js
Corrected deployable version of the actual dashboard public/app.js. This version sends the lowercase status values expected by the server API and matches the WhatsApp manual-override workflow.
Dashboard workflow
•	Pending → Assign rider
•	Failed → Assign rider
•	Assigned → 📦 Mark picked up / ❌ Mark not picked
•	Picked Up → ✅ Mark delivered / ❌ Mark not delivered
•	Delivered → no action
API status values
The dashboard sends picked_up, delivered, and failed to the server. Failure actions also send the notes Not picked and Not delivered.
Complete app.js*/

'use strict';

console.log('🔥 REFLEX APP.JS LOADED - NEW VERSION 🔥');

/*
========================================================
REFLEX DELIVERY SYSTEM
public/app.js
========================================================
*/


/* ======================================================
   GLOBAL STATE
====================================================== */

let selectedDeliveryId = null;
let selectedRiderId = null;


/* ======================================================
   START APPLICATION
====================================================== */

document.addEventListener('DOMContentLoaded', function () {

  console.log('Reflex dashboard starting...');

  setupDeliveryForm();
  setupMainModal();
  setupRefreshButton();
  setupAssignModal();

  loadDashboard();

});


/* ======================================================
   LOAD DASHBOARD
====================================================== */

async function loadDashboard() {

  try {

    const response = await fetch('/api/dashboard', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });


    const data = await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        data.details ||
        `Dashboard request failed: ${response.status}`
      );

    }


    console.log('Dashboard data:', data);


    renderStats(data.counts || {});

    renderDeliveries(data.deliveries || []);

    renderRiders(data.riders || []);


  } catch (error) {

    console.error(
      'Dashboard request failed:',
      error
    );


    renderDashboardError(
      error.message
    );

  }

}


/* ======================================================
   DASHBOARD ERROR
====================================================== */

function renderDashboardError(message) {

  const queue =
    document.getElementById('queue');

  const riders =
    document.getElementById('riders');


  if (queue) {

    queue.innerHTML = `

      <div class="empty-state">

        <strong>
          Unable to load deliveries
        </strong>

        <span>
          ${escapeHtml(message)}
        </span>

      </div>

    `;

  }


  if (riders) {

    riders.innerHTML = `

      <div class="empty-state">

        <strong>
          Unable to load riders
        </strong>

        <span>
          ${escapeHtml(message)}
        </span>

      </div>

    `;

  }

}


/* ======================================================
   STATS
====================================================== */

function renderStats(counts) {

  const stats =
    document.getElementById('stats');


  if (!stats) {

    console.warn(
      'Stats container #stats not found.'
    );

    return;

  }


  const pending =
    getStatusCount(
      counts,
      'Pending'
    );


  const assigned =
    getStatusCount(
      counts,
      'Assigned'
    );


  const pickedUp =
    getStatusCount(
      counts,
      'Picked Up'
    );


  const delivered =
    getStatusCount(
      counts,
      'Delivered'
    );


  stats.innerHTML = `

    <div class="stat">

      <b>
        ${pending}
      </b>

      <span>
        Pending
      </span>

      <small>
        Requests waiting for assignment
      </small>

    </div>


    <div class="stat">

      <b>
        ${assigned}
      </b>

      <span>
        Assigned
      </span>

      <small>
        Riders assigned
      </small>

    </div>


    <div class="stat">

      <b>
        ${pickedUp}
      </b>

      <span>
        Picked Up
      </span>

      <small>
        Orders on the road
      </small>

    </div>


    <div class="stat">

      <b>
        ${delivered}
      </b>

      <span>
        Delivered
      </span>

      <small>
        Completed deliveries
      </small>

    </div>

  `;

}


/* ======================================================
   GET STATUS COUNT
====================================================== */

function getStatusCount(
  counts,
  requestedStatus
) {

  if (
    !counts ||
    typeof counts !== 'object'
  ) {

    return 0;

  }


  const key =
    Object.keys(counts).find(
      function (item) {

        return (
          String(item)
            .trim()
            .toLowerCase() ===
          String(requestedStatus)
            .trim()
            .toLowerCase()
        );

      }
    );


  if (!key) {

    return 0;

  }


  return Number(
    counts[key]
  ) || 0;

}


/* ======================================================
   DELIVERY LIST
====================================================== */

function renderDeliveries(
  deliveries
) {

  const queue =
    document.getElementById('queue');


  if (!queue) {

    console.warn(
      'Delivery queue #queue not found.'
    );

    return;

  }


  if (
    !Array.isArray(deliveries) ||
    deliveries.length === 0
  ) {

    queue.innerHTML = `

      <div class="empty-state">

        <strong>
          No deliveries yet
        </strong>

        <span>
          Create a delivery request
          to see it here.
        </span>

      </div>

    `;

    return;

  }


  queue.innerHTML =
    deliveries
      .map(renderDelivery)
      .join('');

}


/* ======================================================
   DELIVERY CARD
====================================================== */

function renderDelivery(
  delivery
) {

  const deliveryId =
    delivery.id || '';


  const deliveryCode =
    delivery.delivery_code ||
    'No code';


  const customerName =
    delivery.customer_name ||
    'Unknown customer';


  const customerPhone =
    delivery.customer_phone ||
    '';


  const address =
    delivery.delivery_address ||
    'No address';


  const item =
    delivery.item_description ||
    'No item description';


  const status =
    normalizeStatus(
      delivery.status
    );


  const riderName =
    delivery.rider &&
    delivery.rider.name
      ? delivery.rider.name
      : 'Unassigned';


  let actions = '';


  /* --------------------------------------------------
     PENDING / FAILED
  -------------------------------------------------- */

  if (
    status === 'Pending' ||
    status === 'Failed'
  ) {

    actions = `

      <div class="actions">

        <button
          type="button"
          onclick="showAssignRider('${escapeAttribute(deliveryId)}')"
        >
          Assign rider
        </button>

      </div>

    `;

  }


  /* --------------------------------------------------
     ASSIGNED
  -------------------------------------------------- */

  if (status === 'Assigned') {

    actions = `

      <div class="actions">

        <button
          type="button"
          onclick="updateDeliveryStatus(
            '${escapeAttribute(deliveryId)}',
            'picked_up'
          )"
        >
          📦 Mark picked up
        </button>

        <button
          type="button"
          onclick="updateDeliveryStatus(
            '${escapeAttribute(deliveryId)}',
            'failed',
            'Not picked'
          )"
        >
          ❌ Mark not picked
        </button>

      </div>

    `;

  }


  /* --------------------------------------------------
     PICKED UP
  -------------------------------------------------- */

  if (status === 'Picked Up') {

    actions = `

      <div class="actions">

        <button
          type="button"
          onclick="updateDeliveryStatus(
            '${escapeAttribute(deliveryId)}',
            'delivered'
          )"
        >
          ✅ Mark delivered
        </button>

        <button
          type="button"
          onclick="updateDeliveryStatus(
            '${escapeAttribute(deliveryId)}',
            'failed',
            'Not delivered'
          )"
        >
          ❌ Mark not delivered
        </button>

      </div>

    `;

  }


  return `

    <div class="delivery">

      <div class="row">

        <div>

          <strong>
            ${escapeHtml(deliveryCode)}
          </strong>

          <div class="muted">
            ${escapeHtml(customerName)}
          </div>

        </div>


        <span class="pill">
          ${escapeHtml(status)}
        </span>

      </div>


      <div
        class="muted"
        style="margin-top:8px"
      >
        ${escapeHtml(address)}
      </div>


      <div
        class="muted"
        style="margin-top:5px"
      >
        Item:
        ${escapeHtml(item)}
      </div>


      ${
        customerPhone
          ? `

            <div
              class="muted"
              style="margin-top:5px"
            >
              Phone:
              ${escapeHtml(customerPhone)}
            </div>

          `
          : ''
      }


      <div
        class="muted"
        style="margin-top:5px"
      >
        Rider:

        <strong>
          ${escapeHtml(riderName)}
        </strong>

      </div>


      ${actions}

    </div>

  `;

}


/* ======================================================
   NORMALIZE DELIVERY STATUS
====================================================== */

function normalizeStatus(status) {

  const value =
    String(status || '')
      .trim()
      .toLowerCase();


  if (value === 'pending') {

    return 'Pending';

  }


  if (value === 'assigned') {

    return 'Assigned';

  }


  if (
    value === 'picked up' ||
    value === 'picked_up' ||
    value === 'pickedup'
  ) {

    return 'Picked Up';

  }


  if (value === 'delivered') {

    return 'Delivered';

  }


  if (value === 'failed') {

    return 'Failed';

  }


  return status || 'Pending';

}


/* ======================================================
   RIDERS
====================================================== */

function renderRiders(
  riders
) {

  const container =
    document.getElementById('riders');


  if (!container) {

    console.warn(
      'Riders container #riders not found.'
    );

    return;

  }


  if (
    !Array.isArray(riders) ||
    riders.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <strong>
          No riders found
        </strong>

        <span>
          Add riders in Supabase.
        </span>

      </div>

    `;

    return;

  }


  container.innerHTML =
    riders
      .map(renderRider)
      .join('');

}


/* ======================================================
   RIDER CARD

   IMPORTANT:
   Your database uses:

       status = available
       status = busy

   NOT:

       is_available
====================================================== */

function renderRider(
  rider
) {

  const name =
    rider.name ||
    'Unnamed Rider';


  const phone =
    rider.phone ||
    'No phone';


  const vehicle =
    rider.vehicle ||
    'Motorcycle';


  const riderStatus =
    String(
      rider.status || ''
    )
      .trim()
      .toLowerCase();


  const available =
    riderStatus === 'available';


  const statusLabel =
    available
      ? 'Available'
      : 'Busy';


  const statusClass =
    available
      ? 'available'
      : 'busy';


  return `

    <div class="rider-card">

      <div class="rider-avatar">

        ${escapeHtml(
          getInitials(name)
        )}

      </div>


      <div class="rider-info">

        <div class="rider-top">

          <strong>
            ${escapeHtml(name)}
          </strong>


          <span
            class="rider-status ${statusClass}"
          >

            <i></i>

            ${statusLabel}

          </span>

        </div>


        <div class="rider-details">

          <span>
            ${escapeHtml(vehicle)}
          </span>

          <span>
            ${escapeHtml(phone)}
          </span>

        </div>

      </div>

    </div>

  `;

}


/* ======================================================
   CREATE DELIVERY FORM
====================================================== */

function setupDeliveryForm() {

  const form =
    document.getElementById('form');


  if (!form) {

    console.warn(
      'Delivery form #form not found.'
    );

    return;

  }


  form.addEventListener(
    'submit',
    async function (event) {

      event.preventDefault();


      const submitButton =
        form.querySelector(
          'button[type="submit"]'
        );


      if (submitButton) {

        submitButton.disabled =
          true;

        submitButton.textContent =
          'Creating...';

      }


      const formData =
        new FormData(form);


      const payload = {

        customer_name:
          String(
            formData.get(
              'customer_name'
            ) || ''
          ).trim(),


        customer_phone:
          String(
            formData.get(
              'customer_phone'
            ) || ''
          ).trim(),


        delivery_address:
          String(
            formData.get(
              'delivery_address'
            ) || ''
          ).trim(),


        item_description:
          String(
            formData.get(
              'item_description'
            ) || ''
          ).trim(),


        retailer_name:
          String(
            formData.get(
              'retailer_name'
            ) ||
            'Demo Retailer'
          ).trim()

      };


      try {

        const response =
          await fetch(
            '/api/deliveries',
            {

              method: 'POST',

              headers: {

                'Content-Type':
                  'application/json',

                'Accept':
                  'application/json'

              },

              body:
                JSON.stringify(payload)

            }
          );


        const text =
          await response.text();


        let data = {};


        try {

          data =
            text
              ? JSON.parse(text)
              : {};

        } catch (_) {

          data = {};

        }


        if (!response.ok) {

          throw new Error(
            data.error ||
            data.details ||
            `Create delivery failed: HTTP ${response.status}`
          );

        }


        console.log(
          'Delivery created:',
          data
        );


        form.reset();


        const retailerInput =
          form.querySelector(
            '[name="retailer_name"]'
          );


        if (retailerInput) {

          retailerInput.value =
            'Demo Retailer';

        }


        closeMainModal();


        await loadDashboard();


      } catch (error) {

        console.error(
          'CREATE DELIVERY ERROR:',
          error
        );


        alert(
          'CREATE DELIVERY ERROR\n\n' +
          error.message
        );


      } finally {

        if (submitButton) {

          submitButton.disabled =
            false;

          submitButton.textContent =
            'Create delivery';

        }

      }

    }
  );

}


/* ======================================================
   MAIN MODAL
====================================================== */

function setupMainModal() {

  const modal =
    document.getElementById('modal');


  if (!modal) {

    return;

  }


  modal.addEventListener(
    'click',
    function (event) {

      if (
        event.target === modal
      ) {

        closeMainModal();

      }

    }
  );

}


function openMainModal() {

  const modal =
    document.getElementById('modal');


  if (!modal) {

    return;

  }


  modal.style.display =
    'flex';

}


function closeMainModal() {

  const modal =
    document.getElementById('modal');


  if (!modal) {

    return;

  }


  modal.style.display =
    'none';

}


/*
Keep compatibility with the existing HTML
if it calls openModal()/closeModal().
*/

function openModal() {

  openMainModal();

}


function closeModal() {

  closeMainModal();

}


/* ======================================================
   REFRESH
====================================================== */

function setupRefreshButton() {

  const buttons =
    document.querySelectorAll(
      'button'
    );


  buttons.forEach(
    function (button) {

      const text =
        button.textContent
          .trim()
          .toLowerCase();


      if (text !== 'refresh') {

        return;

      }


      button.addEventListener(
        'click',
        async function () {

          const originalText =
            button.textContent;


          button.disabled =
            true;


          button.textContent =
            'Refreshing...';


          try {

            await loadDashboard();

          } finally {

            button.disabled =
              false;

            button.textContent =
              originalText;

          }

        }
      );

    }
  );

}


/* ======================================================
   ASSIGN RIDER MODAL
====================================================== */

function setupAssignModal() {
  if (document.getElementById('assign-modal')) {
    return;
  }

  const modal = document.createElement('div');

  modal.id = 'assign-modal';
  modal.className = 'modal';
  modal.style.display = 'none';

  modal.innerHTML = `
    <div
      class="modal-card"
      style="
        max-width:500px;
        width:calc(100% - 32px);
      "
    >

      <button
        type="button"
        class="close"
        id="close-assign-modal"
        aria-label="Close"
      >
        ×
      </button>

      <div
        style="
          width:44px;
          height:44px;
          border-radius:12px;
          display:grid;
          place-items:center;
          background:#eff6ff;
          color:#2563eb;
          margin-bottom:14px;
          font-size:20px;
        "
      >
        🏍
      </div>

      <div class="eyebrow">
        DISPATCH
      </div>

      <h2>
        Assign rider
      </h2>

      <p class="modal-subtitle">
        Choose an available rider for this delivery.
      </p>

      <div
        id="assign-delivery-summary"
        style="
          margin-top:16px;
          padding:13px 14px;
          border:1px solid #e5e7eb;
          border-radius:10px;
          background:#f8fafc;
        "
      >
      </div>

      <div
        id="assign-riders"
        style="
          display:grid;
          gap:8px;
          margin-top:14px;
          max-height:280px;
          overflow-y:auto;
        "
      >
      </div>

      <div
        id="assign-error"
        style="
          display:none;
          margin-top:12px;
          padding:10px 12px;
          border-radius:9px;
          background:#fef2f2;
          color:#b91c1c;
          font-size:11px;
        "
      >
      </div>

      <button
        type="button"
        id="confirm-assign-btn"
        class="primary submit-btn"
        disabled
        style="
          margin-top:16px;
          width:100%;
        "
      >
        Assign rider
      </button>

    </div>
  `;

  document.body.appendChild(modal);


  /* Close button */

  const closeButton =
    document.getElementById('close-assign-modal');

  if (closeButton) {
    closeButton.addEventListener(
      'click',
      function () {
        closeAssignModal();
      }
    );
  }


  /* Confirm assignment button */

  document.addEventListener('click', function (event) {

  const button =
    event.target.closest('#confirm-assign-btn');

  if (!button) {
    return;
  }

  console.log('🔥 ASSIGN BUTTON CLICK DETECTED 🔥');

  event.preventDefault();
  event.stopPropagation();

  confirmAssignRider();

});


  /* Close when clicking outside */

  modal.addEventListener(
    'click',
    function (event) {

      if (event.target === modal) {
        closeAssignModal();
      }

    }
  );
}

/* ======================================================
   SHOW ASSIGN RIDER MODAL
====================================================== */

async function showAssignRider(
  deliveryId
) {

  console.log(
    'Opening assignment for delivery:',
    deliveryId
  );


  selectedDeliveryId =
    deliveryId;


  selectedRiderId =
    null;


  setupAssignModal();


  const modal =
    document.getElementById(
      'assign-modal'
    );


  const ridersContainer =
    document.getElementById(
      'assign-riders'
    );


  const summary =
    document.getElementById(
      'assign-delivery-summary'
    );


  const errorBox =
    document.getElementById(
      'assign-error'
    );


const confirmButton =
  document.getElementById('confirm-assign-btn');

if (confirmButton) {

  confirmButton.disabled = false;

  confirmButton.removeAttribute('disabled');

  confirmButton.style.pointerEvents = 'auto';

  confirmButton.style.cursor = 'pointer';

  console.log(
    'Assign button enabled'
  );

}


  if (!modal) {

    console.error(
      'Assign modal not found.'
    );

    return;

  }


  if (errorBox) {

    errorBox.style.display =
      'none';

    errorBox.textContent =
      '';

  }


  if (confirmButton) {

    confirmButton.disabled =
      true;

    confirmButton.textContent =
      'Assign rider';

  }


  if (ridersContainer) {

    ridersContainer.innerHTML = `

      <div class="empty-state">

        <strong>
          Loading riders...
        </strong>

        <span>
          Please wait.
        </span>

      </div>

    `;

  }


  modal.style.display =
    'flex';


  try {

    const response =
      await fetch(
        '/api/dashboard',
        {

          method: 'GET',

          headers: {
            'Accept':
              'application/json'
          },

          cache: 'no-store'

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        data.details ||
        `Unable to load riders: HTTP ${response.status}`
      );

    }


    const deliveries =
      Array.isArray(
        data.deliveries
      )
        ? data.deliveries
        : [];


    const riders =
      Array.isArray(
        data.riders
      )
        ? data.riders
        : [];


    const delivery =
      deliveries.find(
        function (item) {

          return (
            String(item.id) ===
            String(deliveryId)
          );

        }
      );


    /* --------------------------------------------------
       DELIVERY SUMMARY
    -------------------------------------------------- */

    if (summary) {

      if (delivery) {

        summary.innerHTML = `

          <strong
            style="
              display:block;
              color:#0f172a;
              font-size:12px;
            "
          >
            ${escapeHtml(
              delivery.delivery_code ||
              'Delivery'
            )}
          </strong>


          <span
            style="
              display:block;
              margin-top:5px;
              color:#64748b;
              font-size:11px;
            "
          >
            ${escapeHtml(
              delivery.customer_name ||
              'Customer'
            )}

            ·

            ${escapeHtml(
              delivery.delivery_address ||
              'No address'
            )}

          </span>

        `;

      }

    }


    /*
    ======================================================
    THIS IS THE IMPORTANT FIX

    Your Supabase table has:

        riders.status

    with values:

        available
        busy

    Therefore:

        status === "available"

    means the rider can be assigned.
    ======================================================
    */


    const availableRiders =
      riders.filter(
        function (rider) {

          return String(
            rider.status || ''
          )
            .trim()
            .toLowerCase() ===
            'available';

        }
      );


    console.log(
      'All riders:',
      riders
    );


    console.log(
      'Available riders:',
      availableRiders
    );


    renderAssignRiders(
      availableRiders
    );


  } catch (error) {

    console.error(
      'Unable to load riders:',
      error
    );


    if (ridersContainer) {

      ridersContainer.innerHTML = `

        <div class="empty-state">

          <strong>
            Unable to load riders
          </strong>

          <span>
            ${escapeHtml(
              error.message
            )}
          </span>

        </div>

      `;

    }

  }

}


/* ======================================================
   RENDER ASSIGNMENT RIDERS
====================================================== */

function renderAssignRiders(
  riders
) {

  const container =
    document.getElementById(
      'assign-riders'
    );


  if (!container) {

    return;

  }


  if (
    !Array.isArray(riders) ||
    riders.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <strong>
          No available riders
        </strong>

        <span>
          All riders are currently busy.
        </span>

      </div>

    `;

    return;

  }


  container.innerHTML =
    riders
      .map(
        function (rider) {

          const name =
            rider.name ||
            'Unnamed Rider';


          const phone =
            rider.phone ||
            'No phone';


          const vehicle =
            rider.vehicle ||
            'Motorcycle';


          return `

            <button
              type="button"
              class="assign-rider-option"
              onclick="selectRider(
                '${escapeAttribute(rider.id)}',
                this
              )"
              style="
                width:100%;
                display:flex;
                align-items:center;
                gap:12px;
                padding:12px;
                border:1px solid #e5e7eb;
                border-radius:11px;
                background:#fff;
                cursor:pointer;
                text-align:left;
              "
            >

              <span
                style="
                  width:40px;
                  height:40px;
                  flex:0 0 40px;
                  border-radius:10px;
                  display:grid;
                  place-items:center;
                  background:#eff6ff;
                  color:#2563eb;
                  font-size:11px;
                  font-weight:800;
                "
              >
                ${escapeHtml(
                  getInitials(name)
                )}
              </span>


              <span
                style="
                  min-width:0;
                  flex:1;
                "
              >

                <span
                  style="
                    display:block;
                    color:#0f172a;
                    font-size:12px;
                    font-weight:800;
                  "
                >
                  ${escapeHtml(name)}
                </span>


                <span
                  style="
                    display:block;
                    color:#64748b;
                    font-size:10px;
                    margin-top:4px;
                  "
                >
                  ${escapeHtml(vehicle)}

                  ·

                  ${escapeHtml(phone)}

                </span>

              </span>


              <span
                class="assign-check"
                style="
                  width:21px;
                  height:21px;
                  flex:0 0 21px;
                  border:1px solid #cbd5e1;
                  border-radius:50%;
                  display:grid;
                  place-items:center;
                  color:transparent;
                  font-size:11px;
                  font-weight:800;
                "
              >
                ✓
              </span>

            </button>

          `;

        }
      )
      .join('');

}


/* ======================================================
   SELECT RIDER
====================================================== */

function selectRider(
  riderId,
  element
) {

  console.log(
    'RIDER SELECTED:',
    riderId
  );


  selectedRiderId =
    riderId;


  const buttons =
    document.querySelectorAll(
      '#assign-riders .assign-rider-option'
    );


  buttons.forEach(
    function (button) {

      button.style.borderColor =
        '#e5e7eb';

      button.style.background =
        '#fff';


      const check =
        button.querySelector(
          '.assign-check'
        );


      if (check) {

        check.style.background =
          '#fff';

        check.style.borderColor =
          '#cbd5e1';

        check.style.color =
          'transparent';

      }

    }
  );


  if (element) {

    element.style.borderColor =
      '#2563eb';

    element.style.background =
      '#eff6ff';


    const check =
      element.querySelector(
        '.assign-check'
      );


    if (check) {

      check.style.background =
        '#2563eb';

      check.style.borderColor =
        '#2563eb';

      check.style.color =
        '#fff';

    }

  }


  const confirmButton =
    document.getElementById(
      'confirm-assign-btn'
    );


  if (confirmButton) {

    confirmButton.disabled =
      false;

    confirmButton.removeAttribute(
      'disabled'
    );

    confirmButton.style.pointerEvents =
      'auto';

    confirmButton.style.cursor =
      'pointer';

  }


  console.log(
    'Selected rider ID:',
    selectedRiderId
  );

}
/* ======================================================
   CONFIRM ASSIGNMENT
====================================================== */

async function confirmAssignRider() {

  console.log('==============================');
  console.log('STARTING RIDER ASSIGNMENT');
  console.log(
    'Delivery:',
    selectedDeliveryId
  );
  console.log(
    'Rider:',
    selectedRiderId
  );
  console.log('==============================');


  if (!selectedDeliveryId) {

    alert(
      'ERROR: No delivery selected.'
    );

    return;

  }


  if (!selectedRiderId) {

    alert(
      'ERROR: Please select a rider.'
    );

    return;

  }


  const button =
    document.getElementById(
      'confirm-assign-btn'
    );


  const errorBox =
    document.getElementById(
      'assign-error'
    );


  if (button) {

    button.disabled = true;

    button.textContent =
      'Assigning...';

  }


  if (errorBox) {

    errorBox.style.display =
      'none';

    errorBox.textContent =
      '';

  }


  try {

    const url =
      `/api/deliveries/${encodeURIComponent(
        selectedDeliveryId
      )}/assign`;


    const payload = {
      rider_id: selectedRiderId
    };


    console.log(
      'POST:',
      url
    );

    console.log(
      'PAYLOAD:',
      payload
    );


    const response =
      await fetch(
        url,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            'Accept':
              'application/json'
          },

          body:
            JSON.stringify(payload)
        }
      );


    console.log(
      'HTTP STATUS:',
      response.status
    );


    const responseText =
      await response.text();


    console.log(
      'SERVER RESPONSE:',
      responseText
    );


    let data = {};


    if (responseText) {

      try {

        data =
          JSON.parse(
            responseText
          );

      } catch (parseError) {

        console.error(
          'JSON parsing error:',
          parseError
        );

        throw new Error(
          `Server returned HTTP ${response.status}: ${responseText}`
        );

      }

    }


    if (!response.ok) {

      throw new Error(
        data.error ||
        data.details ||
        `Assignment failed with HTTP ${response.status}`
      );

    }


    console.log(
      '================================'
    );

    console.log(
      'RIDER ASSIGNMENT SUCCESSFUL'
    );

    console.log(
      data
    );

    console.log(
      '================================'
    );


    closeAssignModal();


    await loadDashboard();


  } catch (error) {

    console.error(
      '================================'
    );

    console.error(
      'RIDER ASSIGNMENT FAILED'
    );

    console.error(
      error
    );

    console.error(
      '================================'
    );


    if (errorBox) {

      errorBox.textContent =
        error.message ||
        'Unable to assign rider.';

      errorBox.style.display =
        'block';

    } else {

      alert(
        'RIDER ASSIGNMENT FAILED\n\n' +
        (
          error.message ||
          'Unable to assign rider.'
        )
      );

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        'Assign rider';

    }

  }

}


/* ======================================================
   CLOSE ASSIGN MODAL
====================================================== */

function closeAssignModal() {

  const modal =
    document.getElementById(
      'assign-modal'
    );


  if (modal) {

    modal.style.display =
      'none';

  }


  selectedDeliveryId =
    null;


  selectedRiderId =
    null;

}


/* ======================================================
   UPDATE DELIVERY STATUS
====================================================== */

async function updateDeliveryStatus(
  deliveryId,
  status,
  note = null
) {

  const confirmed =
    window.confirm(
      `Change delivery status to "${status}"?`
    );


  if (!confirmed) {

    return;

  }


  try {

    const response =
      await fetch(
        `/api/deliveries/${encodeURIComponent(
          deliveryId
        )}/status`,
        {

          method: 'POST',

          headers: {

            'Content-Type':
              'application/json',

            'Accept':
              'application/json'

          },

          body:
            JSON.stringify({
              status: status,
              note: note
            })

        }
      );


    const text =
      await response.text();


    let data = {};


    try {

      data =
        text
          ? JSON.parse(text)
          : {};

    } catch (_) {

      data = {};

    }


    if (!response.ok) {

      throw new Error(
        data.error ||
        data.details ||
        `Status update failed: HTTP ${response.status}`
      );

    }


    console.log(
      'Delivery status updated:',
      data
    );


    await loadDashboard();


  } catch (error) {

    console.error(
      'STATUS UPDATE ERROR:',
      error
    );


    alert(
      'STATUS UPDATE ERROR\n\n' +
      error.message
    );

  }

}


/* ======================================================
   INITIALS
====================================================== */

function getInitials(
  name
) {

  const parts =
    String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  if (
    parts.length === 0
  ) {

    return 'R';

  }


  if (
    parts.length === 1
  ) {

    return parts[0]
      .substring(0, 2)
      .toUpperCase();

  }


  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();

}


/* ======================================================
   HTML ESCAPE
====================================================== */

function escapeHtml(
  value
) {

  return String(
    value == null
      ? ''
      : value
  )

    .replace(
      /&/g,
      '&amp;'
    )

    .replace(
      /</g,
      '&lt;'
    )

    .replace(
      />/g,
      '&gt;'
    )

    .replace(
      /"/g,
      '&quot;'
    )

    .replace(
      /'/g,
      '&#039;'
    );

}


/* ======================================================
   ATTRIBUTE ESCAPE
====================================================== */

function escapeAttribute(
  value
) {

  return String(
    value == null
      ? ''
      : value
  )

    .replace(
      /\\/g,
      '\\\\'
    )

    .replace(
      /'/g,
      "\\'"
    );

}


/* ======================================================
   ESC KEY
====================================================== */

document.addEventListener(
  'keydown',
  function (event) {

    if (
      event.key === 'Escape'
    ) {

      closeAssignModal();

      closeMainModal();

    }

  }
);


/* ======================================================
   GLOBAL FUNCTIONS
======================================================

   These are important because the HTML buttons use
   onclick="..." handlers.
====================================================== */

window.loadDashboard =
  loadDashboard;


/*
Compatibility with existing code
*/

window.load =
  loadDashboard;


window.openModal =
  openModal;


window.closeModal =
  closeModal;


window.openMainModal =
  openMainModal;


window.closeMainModal =
  closeMainModal;


window.showAssignRider =
  showAssignRider;


window.closeAssignModal =
  closeAssignModal;


window.selectRider =
  selectRider;


window.confirmAssignRider =
  confirmAssignRider;


window.assignRider =
  confirmAssignRider;


window.updateDeliveryStatus =
  updateDeliveryStatus;


/*
Compatibility if existing HTML calls updateStatus()
*/

window.updateStatus =
  updateDeliveryStatus;
document.addEventListener('click', function (event) {

  const button =
    event.target.closest('#confirm-assign-btn');

  if (!button) {
    return;
  }

  console.log('🔥 ASSIGN BUTTON CLICK DETECTED 🔥');

  event.preventDefault();
  event.stopPropagation();

  confirmAssignRider();

});

