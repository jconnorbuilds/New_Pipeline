import $ from 'jquery';
import { csrftoken as CSRFTOKEN } from './utils.js';
import { setOpenModal } from './invoice_info_modal.js';

const newClientBtn = /** @type {!HTMLElement}*/ (
  document.querySelector('#pipeline-new-client-btn')
);
newClientBtn.addEventListener('click', () => setOpenModal(false));

const ajaxCall = (
  formData,
  url,
  successCallback,
  handleError,
  modal,
  table
) => {
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'POST',
    url: url,
    data: formData,
    dataType: 'json',
    success: (response) => {
      response.status === 'success'
        ? successCallback(modal, table, response.data)
        : console.error(
            'Something happend - maybe the form received bad data.'
          );
    },
    error: () => {
      typeof handleError === 'function'
        ? handleError()
        : console.error('Error occurred during the AJAX request');
    },
  });
};

const displayErrorMessage = (message) => {
  // TODO: actually dislpay the message on screen?
  console.error(message);
};

const NewClientForm = (() => {
  const el = document.querySelector('#new-client-modal');

  return {
    el,
  };
})();

export { newClientBtn, ajaxCall, displayErrorMessage, NewClientForm };
export function updateRevenueDisplay(year, month) {
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'GET',
    url: '/pipeline/revenue-data/' + year + '/' + month + '/',
    processData: false, // prevents jQuery from processing the data
    contentType: false, // prevents jQuery from setting the Content-Type header
    success: function (response) {
      $('#total-revenue-ytd').text(response.total_revenue_ytd);
      $('#avg-revenue-ytd').text(response.avg_monthly_revenue_ytd);
      $('#total-revenue-monthly-act').text(
        response.total_revenue_monthly_actual
      );
    },
  });
}
