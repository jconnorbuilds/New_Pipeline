import { csrftoken as CSRFTOKEN } from '../utils.js';
const request = (costID, table, costPayPeriod = 'next') => {
  // requests the client invoice
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    url: '/pipeline/request-single-invoice/' + costID + '/',
    method: 'POST',
    data: { pay_period: costPayPeriod },
    dataType: 'json',
    success: function (data) {
      alert(data.message);
      table
        .row(`#${data.response.id}`)
        .data(data.response)
        .invalidate()
        .draw(false);
    },
    error: (data) => {
      console.warn(data);
      alert(
        'There was an error. Try again, and if the error persists, request the invoice the old fashioned way'
      );
    },
  });
};

const getUpdate = (selectEl) => {
  // Returns an object describing the changed element
  let formData = {};

  if (selectEl.classList.contains('cost-vendor-select')) {
    formData.vendor = selectEl.value;
  } else if (selectEl.classList.contains('cost-status-select')) {
    formData.status = selectEl.value;
  } else {
    console.error('There was a problem getting the form data');
  }

  formData.cost_id = selectEl.closest('tr').getAttribute('id');

  return formData;
};

const getNewRowData = (selectEl, table) => {
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'POST',
    url: '/pipeline/update-invoice-table-row',
    data: selectEl.value,
    dataType: 'json',
    success: (response) => getNewRowData(table, response.data),
  });
};

export { request as requestInvoice, getUpdate, getNewRowData };
