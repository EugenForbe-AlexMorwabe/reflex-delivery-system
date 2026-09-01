async function load() {
  try {
    var response = await fetch('/api/dashboard');

    if (!response.ok) {
      throw new Error(
        'Dashboard request failed: ' + response.status
      );
    }

    var data = await response.json();

    renderStats(data.counts || {});
    renderDeliveries(data.deliveries || []);
    renderRiders(data.riders || []);

  } catch (error) {
    console.error('Dashboard loading error:', error);

    var ridersElement = document.getElementById('riders');

    if (ridersElement) {
      ridersElement.innerHTML =
        '<div class="empty-state">' +
        '<strong>Unable to load riders</strong>' +
        '<span>' + escapeHtml(error.message) + '</span>' +
        '</div>';
    }
  }
}


// ============================================
// STATISTICS
// ============================================

function renderStats(counts) {
  var stats = document.getElementById('stats');

  if (!stats) {
    return;
  }

  function getCount(status) {
    var key = Object.keys(counts || {}).find(function (key) {
      return key.toLowerCase() === status.toLowerCase();
    });

    return key ? counts[key] : 0;
  }

  var pending = getCount('Pending');
  var assigned = getCount('Assigned');
  var pickedUp = getCount('Picked Up');
  var delivered = getCount('Delivered');

  stats.innerHTML =
    statCard(
      pending,
      'Pending',
      'Requests waiting for assignment'
    ) +
    statCard(
      assigned,
      'Assigned',
      'Riders assigned'
    ) +
    statCard(
      pickedUp,
      'Picked Up',
      'Orders on the road'
    ) +
    statCard(
      delivered,
      'Delivered',
      'Completed deliveries'
    );
}

// ============================================
// RIDERS
// ============================================

function renderRiders(riders) {
  var container = document.getElementById('riders');

  if (!container) {
    console.error(
      'Could not find #riders element'
    );

    return;
  }

  if (!riders || riders.length === 0) {
    container.innerHTML =
      '<div class="empty-state">' +
        '<strong>No riders found</strong>' +
        '<span>Your Supabase riders table is empty, or the API returned no riders.</span>' +
      '</div>';

    return;
  }

  container.innerHTML = riders
    .map(function (rider) {
      return renderRider(rider);
    })
    .join('');
}


function renderRider(rider) {
  var available =
    rider.is_available === true;

  var statusText =
    available ? 'Available' : 'Busy';

  var statusClass =
    available ? 'available' : 'busy';

  var vehicle =
    rider.vehicle || 'Motorcycle';

  var phone =
    rider.phone || 'No phone number';

  return (
    '<div class="rider-card">' +

      '<div class="rider-avatar">' +
        escapeHtml(
          getInitials(rider.name || 'Rider')
        ) +
      '</div>' +

      '<div class="rider-info">' +

        '<div class="rider-top">' +
          '<strong>' +
            escapeHtml(rider.name || 'Unnamed rider') +
          '</strong>' +

          '<span class="rider-status ' +
            statusClass +
          '">' +
            '<i></i>' +
            escapeHtml(statusText) +
          '</span>' +
        '</div>' +

        '<div class="rider-details">' +
          '<span>' +
            escapeHtml(vehicle) +
          '</span>' +

          '<span>' +
            escapeHtml(phone) +
          '</span>' +
        '</div>' +

      '</div>' +

    '</div>'
  );
}


// ============================================
// DELIVERIES
// ============================================

function renderDeliveries(deliveries) {
  var container =
    document.getElementById('queue');

  if (!container) {
    return;
  }

  if (!deliveries || deliveries.length === 0) {
    container.innerHTML =
      '<div class="empty-state">' +
        '<strong>No deliveries yet</strong>' +
        '<span>Create a delivery request to see it here.</span>' +
      '</div>';

    return;
  }

  container.innerHTML = deliveries
    .map(function (delivery) {
      return renderDelivery(delivery);
    })
    .join('');
}


function renderDelivery(delivery) {
  var riderName =
    delivery.rider &&
    delivery.rider.name
      ? delivery.rider.name
      : 'Unassigned';

  var status =
    delivery.status || 'Pending';

  var statusClass =
    status
      .toLowerCase()
      .replace(/\s+/g, '-');

  var actions = '';

  if (status === 'Pending') {
    actions =
      '<button onclick="showAssignRider(\'' +
      escapeAttribute(delivery.id) +
      '\')">' +
      'Assign rider' +
      '</button>';
  }

  if (status === 'Assigned') {
    actions =
      '<button onclick="updateStatus(\'' +
      escapeAttribute(delivery.id) +
      '\', \'Picked Up\')">' +
      'Mark picked up' +
      '</button>';
  }

  if (status === 'Picked Up') {
    actions =
      '<button onclick="updateStatus(\'' +
      escapeAttribute(delivery.id) +
      '\', \'Delivered\')">' +
      'Mark delivered' +
      '</button>';
  }

  return (
    '<div class="delivery">' +

      '<div class="row">' +
        '<div>' +
          '<strong>' +
            escapeHtml(
              delivery.delivery_code || 'No code'
            ) +
          '</strong>' +

          '<div class="muted">' +
            escapeHtml(
              delivery.customer_name || ''
            ) +
          '</div>' +
        '</div>' +

        '<span class="pill status-' +
          statusClass +
        '">' +
          escapeHtml(status) +
        '</span>' +
      '</div>' +

      '<div class="muted" style="margin-top:8px">' +
        escapeHtml(
          delivery.delivery_address || ''
        ) +
      '</div>' +

      '<div class="muted" style="margin-top:5px">' +
        'Rider: ' +
        escapeHtml(riderName) +
      '</div>' +

      '<div class="actions">' +
        actions +
      '</div>' +

    '</div>'
  );
}


// ============================================
// ASSIGN RIDER
// ============================================

async function showAssignRider(deliveryId) {
  try {
    var response =
      await fetch('/api/dashboard');

    if (!response.ok) {
      throw new Error(
        'Unable to load riders'
      );
    }

    var data =
      await response.json();

    var riders =
      (data.riders || [])
        .filter(function (rider) {
          return rider.is_available === true;
        });

    if (riders.length === 0) {
      alert(
        'There are no available riders.'
      );

      return;
    }

    var message =
      'Available riders:\n\n';

    riders.forEach(function (rider, index) {
      message +=
        (index + 1) +
        '. ' +
        rider.name +
        ' - ' +
        (rider.vehicle || 'Motorcycle') +
        '\n';
    });

    message +=
      '\nEnter the number of the rider to assign:';

    var choice =
      prompt(message);

    if (!choice) {
      return;
    }

    var index =
      Number(choice) - 1;

    if (
      !Number.isInteger(index) ||
      !riders[index]
    ) {
      alert(
        'Invalid rider selection.'
      );

      return;
    }

    await assignRider(
      deliveryId,
      riders[index].id
    );

  } catch (error) {
    console.error(
      'Assign rider error:',
      error
    );

    alert(
      'Unable to assign rider: ' +
      error.message
    );
  }
}


async function assignRider(
  deliveryId,
  riderId
) {
  var response =
    await fetch(
      '/api/deliveries/' +
      encodeURIComponent(deliveryId) +
      '/assign',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json'
        },
        body: JSON.stringify({
          rider_id: riderId
        })
      }
    );

  var data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
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
    var response =
      await fetch(
        '/api/deliveries/' +
        encodeURIComponent(deliveryId) +
        '/status',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json'
          },
          body: JSON.stringify({
            status: status
          })
        }
      );

    var data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        'Unable to update status'
      );
    }

    await load();

  } catch (error) {
    console.error(
      'Status update error:',
      error
    );

    alert(
      'Unable to update delivery: ' +
      error.message
    );
  }
}


// ============================================
// NEW DELIVERY MODAL
// ============================================

function openModal() {
  var modal =
    document.getElementById('modal');

  if (modal) {
    modal.style.display = 'flex';
  }
}


function closeModal() {
  var modal =
    document.getElementById('modal');

  if (modal) {
    modal.style.display = 'none';
  }
}


// ============================================
// CREATE DELIVERY
// ============================================

document.addEventListener(
  'DOMContentLoaded',
  function () {
    var form =
      document.getElementById('form');

    if (form) {
      form.addEventListener(
        'submit',
        async function (event) {
          event.preventDefault();

          var formData =
            new FormData(form);

          var payload = {
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
            var response =
              await fetch(
                '/api/deliveries',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type':
                      'application/json'
                  },
                  body:
                    JSON.stringify(payload)
                }
              );

            var data =
              await response.json();

            if (!response.ok) {
              throw new Error(
                data.error ||
                'Unable to create delivery'
              );
            }

            form.reset();

            var retailer =
              form.querySelector(
                '[name="retailer_name"]'
              );

            if (retailer) {
              retailer.value =
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
              'Unable to create delivery: ' +
              error.message
            );
          }
        }
      );
    }

    load();
  }
);


// ============================================
// HELPERS
// ============================================

function getInitials(name) {
  var parts =
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


function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


function escapeAttribute(value) {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}
