// ============================================
// REFLEX DELIVERY SYSTEM
// Dashboard Frontend
// ============================================

'use strict';


// ============================================
// LOAD DASHBOARD
// ============================================

// ============================================
// ASSIGN RIDER MODAL
// ============================================

let selectedRiderId = null;
let selectedDeliveryId = null;


// ============================================
// OPEN ASSIGN RIDER MODAL
// ============================================

async function showAssignRider(deliveryId) {

  selectedDeliveryId = deliveryId;
  selectedRiderId = null;

  const modal =
    document.getElementById('assign-modal');

  const ridersContainer =
    document.getElementById('assign-riders');

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
      'Assign modal not found'
    );

    return;
  }

  if (ridersContainer) {
    ridersContainer.innerHTML = `
      <div class="empty-state">
        <strong>Loading riders...</strong>
        <span>Please wait.</span>
      </div>
    `;
  }

  if (errorBox) {
    errorBox.style.display = 'none';
    errorBox.textContent = '';
  }

  if (confirmButton) {
    confirmButton.disabled = true;
    confirmButton.classList.remove(
      'loading'
    );
  }

  modal.style.display = 'flex';

  try {

    const response =
      await fetch('/api/dashboard', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.details ||
        data.error ||
        'Unable to load dashboard'
      );
    }

    const delivery =
      (data.deliveries || []).find(
        item =>
          String(item.id) ===
          String(deliveryId)
      );

    if (summary && delivery) {

      summary.innerHTML = `
        <strong>
          ${escapeHtml(
            delivery.delivery_code ||
            'Delivery'
          )}
        </strong>

        <span>
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

    const availableRiders =
      (data.riders || []).filter(
        rider =>
          rider.is_available === true ||
          rider.is_available === 'true'
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
          <strong>Unable to load riders</strong>
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


// ============================================
// RENDER AVAILABLE RIDERS
// ============================================

function renderAssignRiders(riders) {

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
        <strong>No available riders</strong>
        <span>
          All riders are currently busy.
        </span>
      </div>
    `;

    return;
  }

  container.innerHTML =
    riders.map(function (rider) {

      const name =
        rider.name ||
        'Unnamed Rider';

      const vehicle =
        rider.vehicle ||
        'Motorcycle';

      const phone =
        rider.phone ||
        'No phone';

      return `
        <button
          type="button"
          class="assign-rider"
          data-rider-id="${escapeAttribute(
            rider.id
          )}"
          onclick="selectRider(
            '${escapeAttribute(rider.id)}',
            this
          )"
        >

          <span class="assign-rider-avatar">
            ${escapeHtml(
              getInitials(name)
            )}
          </span>

          <span class="assign-rider-info">

            <span class="assign-rider-name">
              ${escapeHtml(name)}
            </span>

            <span class="assign-rider-meta">
              ${escapeHtml(vehicle)}
              ·
              ${escapeHtml(phone)}
            </span>

          </span>

          <span class="assign-rider-check">
            ✓
          </span>

        </button>
      `;

    }).join('');
}


// ============================================
// SELECT RIDER
// ============================================

function selectRider(
  riderId,
  element
) {

  selectedRiderId = riderId;

  const buttons =
    document.querySelectorAll(
      '.assign-rider'
    );

  buttons.forEach(function (button) {
    button.classList.remove(
      'selected'
    );
  });

  if (element) {
    element.classList.add(
      'selected'
    );
  }

  const confirmButton =
    document.getElementById(
      'confirm-assign-btn'
    );

  if (confirmButton) {
    confirmButton.disabled = false;
  }
}


// ============================================
// CLOSE ASSIGN MODAL
// ============================================

function closeAssignModal() {

  const modal =
    document.getElementById(
      'assign-modal'
    );

  if (modal) {
    modal.style.display = 'none';
  }

  selectedRiderId = null;
  selectedDeliveryId = null;
}


// ============================================
// CONFIRM ASSIGNMENT
// ============================================

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
    errorBox.style.display = 'none';
    errorBox.textContent = '';
  }

  if (button) {
    button.disabled = true;
    button.classList.add('loading');
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

          body: JSON.stringify({
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
      button.disabled = false;
      button.classList.remove(
        'loading'
      );
      button.textContent =
        'Assign rider';
    }
  }
}


// ============================================
// DASHBOARD ERROR
// ============================================

function renderDashboardError(message) {
  const queue = document.getElementById('queue');
  const riders = document.getElementById('riders');

  if (queue) {
    queue.innerHTML = `
      <div class="empty-state">
        <strong>Unable to load deliveries</strong>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  if (riders) {
    riders.innerHTML = `
      <div class="empty-state">
        <strong>Unable to load riders</strong>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }
}


// ============================================
// STATISTICS
// ============================================

function renderStats(counts) {
  const stats = document.getElementById('stats');

  if (!stats) {
    console.error('Element #stats not found');
    return;
  }

  const pending = getStatusCount(counts, 'Pending');
  const assigned = getStatusCount(counts, 'Assigned');
  const pickedUp = getStatusCount(counts, 'Picked Up');
  const delivered = getStatusCount(counts, 'Delivered');

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


// ============================================
// STATUS COUNT
// Handles Pending / pending / PENDING
// ============================================

function getStatusCount(counts, status) {
  if (!counts || typeof counts !== 'object') {
    return 0;
  }

  const matchingKey = Object.keys(counts).find(
    key =>
      String(key).trim().toLowerCase() ===
      status.trim().toLowerCase()
  );

  if (!matchingKey) {
    return 0;
  }

  return Number(counts[matchingKey]) || 0;
}


// ============================================
// STAT CARD
// ============================================

function statCard(number, label, description) {
  return `
    <div class="stat">
      <b>${number}</b>
      <span>${escapeHtml(label)}</span>
      <small>${escapeHtml(description)}</small>
    </div>
  `;
}


// ============================================
// RIDERS
// ============================================

function renderRiders(riders) {
  const container = document.getElementById('riders');

  if (!container) {
    console.error('Element #riders not found');
    return;
  }

  if (!Array.isArray(riders) || riders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>No riders found</strong>
        <span>
          No riders were returned from the database.
        </span>
      </div>
    `;

    return;
  }

  container.innerHTML = riders
    .map(renderRider)
    .join('');
}


// ============================================
// SINGLE RIDER
// ============================================

function renderRider(rider) {
  const name =
    rider.name || 'Unnamed Rider';

  const phone =
    rider.phone || 'No phone';

  const vehicle =
    rider.vehicle || 'Motorcycle';

  const isAvailable =
    rider.is_available === true ||
    rider.is_available === 'true';

  const status =
    isAvailable
      ? 'Available'
      : 'Busy';

  const statusClass =
    isAvailable
      ? 'available'
      : 'busy';

  const initials =
    getInitials(name);

  return `
    <div class="rider-card">

      <div class="rider-avatar">
        ${escapeHtml(initials)}
      </div>

      <div class="rider-info">

        <div class="rider-top">

          <strong>
            ${escapeHtml(name)}
          </strong>

          <span class="rider-status ${statusClass}">
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


// ============================================
// DELIVERY QUEUE
// ============================================

function renderDeliveries(deliveries) {
  const container =
    document.getElementById('queue');

  if (!container) {
    console.error('Element #queue not found');
    return;
  }

  if (
    !Array.isArray(deliveries) ||
    deliveries.length === 0
  ) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>No deliveries yet</strong>
        <span>
          Create a delivery request to see it here.
        </span>
      </div>
    `;

    return;
  }

  container.innerHTML = deliveries
    .map(renderDelivery)
    .join('');
}


// ============================================
// SINGLE DELIVERY
// ============================================

function renderDelivery(delivery) {
  const code =
    delivery.delivery_code ||
    'No delivery code';

  const customer =
    delivery.customer_name ||
    'Unknown customer';

  const address =
    delivery.delivery_address ||
    'No address';

  const status =
    normalizeStatus(
      delivery.status || 'Pending'
    );

  const rider =
    delivery.rider &&
    delivery.rider.name
      ? delivery.rider.name
      : 'Unassigned';

  let actionButtons = '';

  if (status === 'Pending') {
    actionButtons = `
      <button
        type="button"
        onclick="showAssignRider('${escapeAttribute(delivery.id)}')"
      >
        Assign rider
      </button>
    `;
  }

  if (status === 'Assigned') {
    actionButtons = `
      <button
        type="button"
        onclick="updateStatus(
          '${escapeAttribute(delivery.id)}',
          'Picked Up'
        )"
      >
        Mark picked up
      </button>
    `;
  }

  if (status === 'Picked Up') {
    actionButtons = `
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
        Rider:
        ${escapeHtml(rider)}
      </div>

      ${
        actionButtons
          ? `
            <div class="actions">
              ${actionButtons}
            </div>
          `
          : ''
      }

    </div>
  `;
}


// ============================================
// NORMALIZE STATUS
// ============================================

function normalizeStatus(status) {
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


// ============================================
// ASSIGN RIDER
// ============================================

async function showAssignRider(deliveryId) {
  try {

    const response =
      await fetch('/api/dashboard', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.details ||
        data.error ||
        'Unable to load riders'
      );
    }

    const availableRiders =
      (data.riders || []).filter(
        rider =>
          rider.is_available === true ||
          rider.is_available === 'true'
      );

    if (availableRiders.length === 0) {
      alert(
        'There are currently no available riders.'
      );

      return;
    }

    let message =
      'AVAILABLE RIDERS\n\n';

    availableRiders.forEach(
      (rider, index) => {

        message +=
          `${index + 1}. ` +
          `${rider.name || 'Unnamed rider'} ` +
          `(${rider.vehicle || 'Motorcycle'})\n`;
      }
    );

    message +=
      '\nEnter the rider number:';

    const choice =
      window.prompt(message);

    if (!choice) {
      return;
    }

    const selectedIndex =
      Number(choice) - 1;

    if (
      !Number.isInteger(selectedIndex) ||
      !availableRiders[selectedIndex]
    ) {
      alert(
        'Invalid rider selection.'
      );

      return;
    }

    const rider =
      availableRiders[selectedIndex];

    await assignRider(
      deliveryId,
      rider.id
    );

  } catch (error) {

    console.error(
      'Assign rider error:',
      error
    );

    alert(
      'Unable to assign rider:\n' +
      error.message
    );
  }
}


// ============================================
// SEND RIDER ASSIGNMENT
// ============================================

async function assignRider(
  deliveryId,
  riderId
) {

  const response =
    await fetch(
      `/api/deliveries/${encodeURIComponent(
        deliveryId
      )}/assign`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          'Accept':
            'application/json'
        },

        body: JSON.stringify({
          rider_id: riderId
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

  await load();
}


// ============================================
// UPDATE DELIVERY STATUS
// ============================================

async function updateStatus(
  deliveryId,
  status
) {

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

          body: JSON.stringify({
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

    await load();

  } catch (error) {

    console.error(
      'Status update error:',
      error
    );

    alert(
      'Unable to update delivery:\n' +
      error.message
    );
  }
}


// ============================================
// NEW DELIVERY MODAL
// ============================================

function openModal() {

  const modal =
    document.getElementById('modal');

  if (!modal) {
    return;
  }

  modal.style.display = 'flex';
}


// ============================================
// CLOSE MODAL
// ============================================

function closeModal() {

  const modal =
    document.getElementById('modal');

  if (!modal) {
    return;
  }

  modal.style.display = 'none';
}


// ============================================
// CREATE DELIVERY
// ============================================

document.addEventListener(
  'DOMContentLoaded',
  function () {

    const form =
      document.getElementById('form');

    if (form) {

      form.addEventListener(
        'submit',
        async function (event) {

          event.preventDefault();

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
              )
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
              'Create delivery error:',
              error
            );

            alert(
              'Unable to create delivery:\n' +
              error.message
            );
          }
        }
      );
    }


    // Close modal when clicking
    // outside the modal card
    const modal =
      document.getElementById('modal');

    if (modal) {

      modal.addEventListener(
        'click',
        function (event) {

          if (event.target === modal) {
            closeModal();
          }

        }
      );
    }


    // Initial dashboard load
    load();

  }
);


// ============================================
// KEYBOARD SUPPORT
// ============================================

document.addEventListener(
  'keydown',
  function (event) {

    if (event.key === 'Escape') {
      closeModal();
    }

  }
);


// ============================================
// HELPERS
// ============================================

function getInitials(name) {

  const parts =
    String(name)
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


// ============================================
// HTML ESCAPING
// ============================================

function escapeHtml(value) {

  return String(
    value == null ? '' : value
  )
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// ============================================
// ATTRIBUTE ESCAPING
// ============================================

function escapeAttribute(value) {

  return String(
    value == null ? '' : value
  )
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}
