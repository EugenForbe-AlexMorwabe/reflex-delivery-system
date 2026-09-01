'use strict';

/*
====================================================
REFLEX DELIVERY SYSTEM
Frontend Dashboard
====================================================
*/


/* ==================================================
   GLOBAL STATE
================================================== */

let selectedRiderId = null;
let selectedDeliveryId = null;


/* ==================================================
   INITIALIZE
================================================== */

document.addEventListener('DOMContentLoaded', function () {

  console.log('Reflex dashboard starting...');

  setupDeliveryForm();
  setupModal();
  setupAssignModal();
  setupRefreshButton();

  load();

});


/* ==================================================
   LOAD DASHBOARD
================================================== */

async function load() {

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
        data.details ||
        data.error ||
        `Dashboard request failed: ${response.status}`
      );

    }

    console.log('Dashboard loaded:', data);

    renderStats(data.counts || {});

    renderDeliveries(
      data.deliveries || []
    );

    renderRiders(
      data.riders || []
    );

  } catch (error) {

    console.error(
      'Dashboard loading error:',
      error
    );

    renderDashboardError(
      error.message
    );

  }

}


/* ==================================================
   DASHBOARD ERROR
================================================== */

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


/* ==================================================
   STATISTICS
================================================== */

function renderStats(counts) {

  const stats =
    document.getElementById('stats');

  if (!stats) {

    console.error(
      'Element #stats not found'
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

    ${statCard(
      pending,
      'Pending',
      'Requests waiting for assignment'
    )}

    ${statCard(
      assigned,
      'Assigned',
      'Riders assigned'
    )}

    ${statCard(
      pickedUp,
      'Picked Up',
      'Orders on the road'
    )}

    ${statCard(
      delivered,
      'Delivered',
      'Completed deliveries'
    )}

  `;

}


/* ==================================================
   STATUS COUNT
================================================== */

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

  const matchingKey =
    Object.keys(counts).find(
      function (key) {

        return (
          String(key)
            .trim()
            .toLowerCase() ===
          requestedStatus
            .trim()
            .toLowerCase()
        );

      }
    );

  if (!matchingKey) {

    return 0;

  }

  return Number(
    counts[matchingKey]
  ) || 0;

}


/* ==================================================
   STAT CARD
================================================== */

function statCard(
  number,
  label,
  description
) {

  return `
    <div class="stat">

      <b>
        ${number}
      </b>

      <span>
        ${escapeHtml(label)}
      </span>

      <small>
        ${escapeHtml(description)}
      </small>

    </div>
  `;

}


/* ==================================================
   DELIVERY QUEUE
================================================== */

function renderDeliveries(
  deliveries
) {

  const container =
    document.getElementById('queue');

  if (!container) {

    console.error(
      'Element #queue not found'
    );

    return;

  }

  if (
    !Array.isArray(deliveries) ||
    deliveries.length === 0
  ) {

    container.innerHTML = `
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

  container.innerHTML =
    deliveries
      .map(
        renderDelivery
      )
      .join('');

}


/* ==================================================
   DELIVERY CARD
================================================== */

function renderDelivery(
  delivery
) {

  const code =
    delivery.delivery_code ||
    'Delivery';

  const customer =
    delivery.customer_name ||
    'Unknown customer';

  const address =
    delivery.delivery_address ||
    'No address';

  const item =
    delivery.item_description ||
    'Item not specified';

  const status =
    normalizeStatus(
      delivery.status ||
      'Pending'
    );

  const rider =
    delivery.rider &&
    delivery.rider.name
      ? delivery.rider.name
      : 'Unassigned';

  const phone =
    delivery.customer_phone ||
    '';

  let actions = '';


  /* ----------------------------------------------
     PENDING
  ---------------------------------------------- */

  if (status === 'Pending') {

    actions = `
      <div class="actions">

        <button
          type="button"
          onclick="showAssignRider(
            '${escapeAttribute(delivery.id)}'
          )"
        >
          Assign rider
        </button>

      </div>
    `;

  }


  /* ----------------------------------------------
     ASSIGNED
  ---------------------------------------------- */

  else if (status === 'Assigned') {

    actions = `
      <div class="actions">

        <button
          type="button"
          onclick="updateStatus(
            '${escapeAttribute(delivery.id)}',
            'Picked Up'
          )"
        >
          Mark picked up
        </button>

      </div>
    `;

  }


  /* ----------------------------------------------
     PICKED UP
  ---------------------------------------------- */

  else if (status === 'Picked Up') {

    actions = `
      <div class="actions">

        <button
          type="button"
          onclick="updateStatus(
            '${escapeAttribute(delivery.id)}',
            'Delivered'
          )"
        >
          Mark delivered
        </button>

        <button
          type="button"
          onclick="updateStatus(
            '${escapeAttribute(delivery.id)}',
            'Failed'
          )"
        >
          Mark failed
        </button>

      </div>
    `;

  }


  return `

    <div class="delivery">

      <div class="row">

        <div>

          <strong>
            ${escapeHtml(code)}
          </strong>

          <div class="muted">
            ${escapeHtml(customer)}
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
        phone
          ? `
            <div
              class="muted"
              style="margin-top:5px"
            >
              Phone:
              ${escapeHtml(phone)}
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
          ${escapeHtml(rider)}
        </strong>
      </div>


      ${actions}

    </div>

  `;

}


/* ==================================================
   NORMALIZE STATUS
================================================== */

function normalizeStatus(
  status
) {

  const value =
    String(status || '')
      .trim()
      .toLowerCase();

  switch (value) {

    case 'pending':
      return 'Pending';

    case 'assigned':
      return 'Assigned';

    case 'picked up':
    case 'picked_up':
    case 'pickedup':
      return 'Picked Up';

    case 'delivered':
      return 'Delivered';

    case 'failed':
      return 'Failed';

    default:
      return status || 'Pending';

  }

}


/* ==================================================
   RIDERS
================================================== */

function renderRiders(
  riders
) {

  const container =
    document.getElementById('riders');

  if (!container) {

    console.error(
      'Element #riders not found'
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
          Add riders in Supabase
          to see them here.
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


/* ==================================================
   RIDER CARD
================================================== */

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

  const available =
    rider.is_available === true ||
    rider.is_available === 'true';

  const status =
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

            ${status}

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


/* ==================================================
   CREATE DELIVERY FORM
================================================== */

function setupDeliveryForm() {

  const form =
    document.getElementById('form');

  if (!form) {

    console.warn(
      'Delivery form #form not found'
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

        submitButton.disabled = true;

        submitButton.textContent =
          'Creating...';

      }

      const formData =
        new FormData(form);

      const payload = {

        customer_name:
          formData.get(
            'customer_name'
          ),

        customer_phone:
          formData.get(
            'customer_phone'
          ),

        delivery_address:
          formData.get(
            'delivery_address'
          ),

        item_description:
          formData.get(
            'item_description'
          ),

        retailer_name:
          formData.get(
            'retailer_name'
          ) ||
          'Demo Retailer'

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
                JSON.stringify(
                  payload
                )

            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            data.details ||
            'Unable to create delivery'
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


        closeModal();

        await load();


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


/* ==================================================
   MAIN MODAL
================================================== */

function setupModal() {

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

        closeModal();

      }

    }
  );

}


function openModal() {

  const modal =
    document.getElementById('modal');

  if (!modal) {
    return;
  }

  modal.style.display = 'flex';

}


function closeModal() {

  const modal =
    document.getElementById('modal');

  if (!modal) {
    return;
  }

  modal.style.display = 'none';

}


/* ==================================================
   REFRESH BUTTON
================================================== */

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

      if (text === 'refresh') {

        button.addEventListener(
          'click',
          async function () {

            button.disabled = true;

            const originalText =
              button.textContent;

            button.textContent =
              'Refreshing...';

            try {

              await load();

            } finally {

              button.disabled =
                false;

              button.textContent =
                originalText;

            }

          }
        );

      }

    }
  );

}


/* ==================================================
   ASSIGN RIDER MODAL
================================================== */

function setupAssignModal() {

  /*
    Create the assignment modal dynamically.

    This means you do NOT need to edit
    index.html for rider assignment.
  */

  if (
    document.getElementById(
      'assign-modal'
    )
  ) {

    return;

  }


  const modal =
    document.createElement('div');

  modal.id =
    'assign-modal';

  modal.className =
    'modal';

  modal.style.display =
    'none';


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


      <p
        class="modal-subtitle"
      >
        Choose an available rider
        for this delivery.
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


  document.body.appendChild(
    modal
  );


  const closeButton =
    document.getElementById(
      'close-assign-modal'
    );

  if (closeButton) {

    closeButton.addEventListener(
      'click',
      closeAssignModal
    );

  }


  modal.addEventListener(
    'click',
    function (event) {

      if (
        event.target === modal
      ) {

        closeAssignModal();

      }

    }
  );


  const confirmButton =
    document.getElementById(
      'confirm-assign-btn'
    );

  if (confirmButton) {

    confirmButton.addEventListener(
      'click',
      confirmAssignRider
    );

  }

}


/* ==================================================
   OPEN ASSIGN RIDER
================================================== */

async function showAssignRider(
  deliveryId
) {

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
    document.getElementById(
      'confirm-assign-btn'
    );


  if (!modal) {

    console.error(
      'Assign modal could not be created'
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
        data.details ||
        data.error ||
        'Unable to load riders'
      );

    }


    const delivery =
      (data.deliveries || [])
        .find(
          function (item) {

            return String(item.id) ===
              String(deliveryId);

          }
        );


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

      } else {

        summary.innerHTML = `
          <span
            style="
              color:#64748b;
              font-size:11px;
            "
          >
            Select an available rider.
          </span>
        `;

      }

    }


    const availableRiders =
      (data.riders || [])
        .filter(
          function (rider) {

            return (
              rider.is_available === true ||
              rider.is_available === 'true'
            );

          }
        );


    renderAssignRiders(
      availableRiders
    );


  } catch (error) {

    console.error(
      'Load riders for assignment error:',
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


/* ==================================================
   RENDER ASSIGNMENT RIDERS
================================================== */

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
              data-rider-id="${escapeAttribute(
                rider.id
              )}"
              onclick="selectRider(
                '${escapeAttribute(
                  rider.id
                )}',
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


/* ==================================================
   SELECT RIDER
================================================== */

function selectRider(
  riderId,
  element
) {

  selectedRiderId =
    riderId;


  const buttons =
    document.querySelectorAll(
      '#assign-riders button'
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

  }

}


/* ==================================================
   CLOSE ASSIGN MODAL
================================================== */

function closeAssignModal() {

  const modal =
    document.getElementById(
      'assign-modal'
    );


  if (modal) {

    modal.style.display =
      'none';

  }


  selectedRiderId =
    null;

  selectedDeliveryId =
    null;

}


/* ==================================================
   CONFIRM RIDER ASSIGNMENT
================================================== */

async function confirmAssignRider() {

  if (
    !selectedDeliveryId ||
    !selectedRiderId
  ) {

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


  if (errorBox) {

    errorBox.style.display =
      'none';

    errorBox.textContent =
      '';

  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      'Assigning rider...';

  }


  try {

    const response =
      await fetch(
        `/api/deliveries/${encodeURIComponent(
          selectedDeliveryId
        )}/assign`,
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
              rider_id:
                selectedRiderId
            })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        data.details ||
        'Unable to assign rider'
      );

    }


    console.log(
      'Rider assigned:',
      data
    );


    closeAssignModal();


    await load();


  } catch (error) {

    console.error(
      'Assign rider error:',
      error
    );


    if (errorBox) {

      errorBox.textContent =
        error.message;

      errorBox.style.display =
        'block';

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        'Assign rider';

    }

  }

}


/* ==================================================
   UPDATE DELIVERY STATUS
================================================== */

async function updateStatus(
  deliveryId,
  status
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
              status: status
            })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        data.details ||
        'Unable to update delivery status'
      );

    }


    console.log(
      'Delivery status updated:',
      data
    );


    await load();


  } catch (error) {

    console.error(
      'Status update error:',
      error
    );


    alert(
      'Unable to update delivery:\n\n' +
      error.message
    );

  }

}


/* ==================================================
   GET INITIALS
================================================== */

function getInitials(
  name
) {

  const parts =
    String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  if (parts.length === 0) {

    return 'R';

  }


  if (parts.length === 1) {

    return parts[0]
      .substring(0, 2)
      .toUpperCase();

  }


  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();

}


/* ==================================================
   HTML ESCAPING
================================================== */

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


/* ==================================================
   ATTRIBUTE ESCAPING
================================================== */

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


/* ==================================================
   ESCAPE KEY
================================================== */

document.addEventListener(
  'keydown',
  function (event) {

    if (
      event.key === 'Escape'
    ) {

      closeAssignModal();

      closeModal();

    }

  }
);


/* ==================================================
   EXPOSE FUNCTIONS
   Needed because buttons use onclick=""
================================================== */

window.load =
  load;

window.openModal =
  openModal;

window.closeModal =
  closeModal;

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

window.updateStatus =
  updateStatus;
