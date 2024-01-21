import { csrftoken as CSRFTOKEN } from './common.js';
import * as InvoiceInfo from './invoice_info_modal.js';
import { setOpenModal } from './invoice_info_modal.js';

const newClientBtn = /** @type {!HTMLElement}*/ (
  document.querySelector('#pipeline-new-client-btn')
);
newClientBtn.addEventListener('click', () => setOpenModal(false));

const ajaxCall = (formData, url, successCallback, handleError, modal, table) => {
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'POST',
    url: url,
    data: formData,
    dataType: 'json',
    success: (response) => {
      response.status === 'success'
        ? successCallback(modal, table, response.data)
        : console.error('Something happend - maybe the form received bad data.');
    },
    error: () => {
      typeof handleError === 'function'
        ? handleError()
        : console.error('Error occurred during the AJAX request');
    },
  });
};

const displayErrorMessage = (message) => {
  console.error(message);
};

export { newClientBtn, ajaxCall, displayErrorMessage };

export const NewClientForm = (() => {
  const el = document.querySelector('#new-client-modal');

  return {
    el,
  };
})();
