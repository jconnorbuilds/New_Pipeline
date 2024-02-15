import $ from 'jquery';
import { csrftoken as CSRFTOKEN } from '../utils.js';
import DataTable from 'datatables.net-bs5';

const request = (costID, table, costPayPeriod = 'next') => {
  console.log(table);
  // requests the vendor invoice
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    url: '/pipeline/request-single-invoice/' + costID + '/',
    method: 'POST',
    data: { pay_period: costPayPeriod },
    dataType: 'json',
    success: function (data) {
      alert(data.message);
      new DataTable(table)
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

  if (selectEl.classList.contains('vendor')) {
    formData.vendor = selectEl.value;
  } else if (selectEl.classList.contains('status')) {
    formData.status = selectEl.value;
  } else {
    console.error('There was a problem getting the form data');
  }

  formData.cost_id = selectEl.closest('tr').getAttribute('id');

  return formData;
};

const handleStatusChange = (selectEl) => {
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'POST',
    url: '/pipeline/update-invoice-table-row',
    data: selectEl.value,
    dataType: 'json',
    success: (response) => console.log(response.data),
  });
};

export { request as requestInvoice, handleStatusChange };
