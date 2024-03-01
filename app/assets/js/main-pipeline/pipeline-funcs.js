import $ from 'jquery';
import { Modal } from 'bootstrap';
import { CSRFTOKEN } from '../utils.js';
import { showLoadingSpinner, hideLoadingSpinner } from './pipeline-ui-funcs.js';
import { plTable } from './pipeline-dt.js';
import createAndInitializeToast from '../toast-notifs.js';

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
  const init = () => el.modal();

  return {
    el,
    init,
  };
})();

export function updateRevenueDisplay(year, month) {
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'GET',
    url: '/pipeline/revenue-data/' + year + '/' + month + '/',
    success: (response) => {
      // abstract to pipeline-ui-funcs
      $('#total-revenue-ytd').text(response.total_revenue_ytd);
      $('#avg-revenue-ytd').text(response.avg_monthly_revenue_ytd);
      $('#total-revenue-monthly-act').text(
        response.total_revenue_monthly_actual
      );
    },
    error: (response) => console.warn(response),
  });
}

const handleFormSubmission = (e) => {
  showLoadingSpinner();
  e.preventDefault();
  const jobForm = document.querySelector('#job-form');

  const formData = {
    job_name: document.querySelector('#id_job_name').value,
    client: document.querySelector('#id_client').value,
    job_type: document.querySelector('#id_job_type').value,
    granular_revenue: document.querySelector('#id_granular_revenue').value,
    revenue: document.querySelector('#id_revenue').value,
    add_consumption_tax: document.querySelector('#id_add_consumption_tax')
      .checked,
    personInCharge: document.querySelector('#id_personInCharge').value,
  };

  const createSuccessToast = (response) => {
    return createAndInitializeToast(
      'Job created',
      response.data.job_name,
      'toast-successful-job-created'
    );
  };

  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    method: 'POST',
    url: '/pipeline/job-add',
    data: formData,
    // beforeSend: () => showLoadingSpinner(),
    success: (response) => {
      if (response.status === 'success') {
        jobForm.classList.remove('was-validated');
        plTable.refresh();
        createSuccessToast(response).show();
        jobForm.reset();
      } else {
        console.alert('Form processing failed. Perhaps bad data was sent?');
        jobForm.classList.add('was-validated');
      }
    },
    error: () => {
      alert('Form submission failed');
    },
  });
  hideLoadingSpinner();
};

export {
  ajaxCall,
  displayErrorMessage,
  NewClientForm,
  handleFormSubmission as jobFormSubmissionHandler,
};
