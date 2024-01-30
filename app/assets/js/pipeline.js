'use strict';

import '../../assets/scss/styles.scss';
import '../../assets/scss/pipeline.css';
import $ from 'jquery';
window.$ = $;
import * as bootstrap from 'bootstrap';
import { csrftoken as CSRFTOKEN } from './utils';
import { initCSVExporter } from './csv-export.js';
import {
  depositDateFormSubmitHandler,
  depositDateFormModalShowHandler,
} from './deposit_date.js';
import { plTable } from './pipeline-dt.js';
import {
  currentExpectedRevenueDisplay,
  setExpectedRevenueDisplayText,
  createFilters,
  revenueToggleHandler,
  showLoadingSpinner,
  hideLoadingSpinner,
  pipelineMonth,
  pipelineYear,
  addDateChangeHandlers,
  dateSelectionHandler,
  toggleViewHandler,
} from './pipeline-ui-funcs';
import { setupTableEventHandlers } from './pipeline-dt-ui-funcs';
import { createAndLaunchToast } from './toast-notifs.js';

document
  .querySelector('#revenue-unit')
  .addEventListener('click', revenueToggleHandler);

document
  .querySelector('#pipeline-next')
  .parentNode.addEventListener('click', dateSelectionHandler);

document
  .querySelector('.toggle-view')
  .addEventListener('click', toggleViewHandler);

document
  .querySelector('#deposit-date-form')
  .addEventListener('submit', depositDateFormSubmitHandler);

let table;
$(document).ready(function () {
  table = plTable.getTable();
  $(table).DataTable();

  createFilters();

  initCSVExporter();

  // $('.update-cost-table').click(function () {
  //   const forms = document.getElementsByTagName('form');
  //   for (const i = 0; i < forms.length; i++) {
  //     forms[i].submit();
  //   }
  // });

  // Job form submission
  const jobForm = document.querySelector('#job-form');
  jobForm.addEventListener('submit', (e) => {
    showLoadingSpinner();
    e.preventDefault();

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

    $.ajax({
      headers: { 'X-CSRFToken': CSRFTOKEN },
      type: 'POST',
      url: '/pipeline/job-add',
      data: formData,
      beforeSend: () => showLoadingSpinner(),
      success: (response) => {
        if (response.status === 'success') {
          jobForm.classList.remove('was-validated');
          plTable.refresh();
          createAndLaunchToast();
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
  });

  // TODO: clean up this mess
  $('#batch-pay-csv-dl').on('submit', function (e) {
    e.preventDefault();
    $.ajax({
      headers: { 'X-CSRFToken': CSRFTOKEN },
      type: 'POST',
      url: '/pipeline/prepare-batch-payment/',
      data: '',
      success: function (data, testStatus, xhr) {
        var blob = new Blob([data]);
        var link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = 'WISE_batch_payment.csv';
        link.click();

        var processingStatus = JSON.parse(
          xhr.getResponseHeader('X-Processing-Status')
        );
        console.log('Processing status:', processingStatus);

        var batchProcessSuccess = [];
        var batchProcessError = [];
        const successToast = document.getElementById(
          'payment-template-success-toast'
        );
        const errorToast = document.getElementById(
          'payment-template-error-toast'
        );
        const successToastBody = successToast.querySelector('.toast-body');
        const errorToastBody = errorToast.querySelector('.toast-body');

        for (var key in processingStatus) {
          for (var key in processingStatus) {
            if (processingStatus[key].status == 'success') {
              batchProcessSuccess[key] = processingStatus[key];
            } else if (processingStatus[key].status == 'error') {
              batchProcessError[key] = processingStatus[key];
            } else {
              alert('Unknown error during processing!');
            }
          }
        }
        successToastBody.innerHTML = '';
        errorToastBody.innerHTML = '';
        for (const i in batchProcessSuccess) {
          successToastBody.innerHTML += `
                        <li>${i}: ${batchProcessSuccess[i].message}</li>
                        `;
        }
        for (const i in batchProcessError) {
          errorToastBody.innerHTML += `
                        <li>${i}: ${batchProcessError[i].message}</li>
                        `;
        }
        const successToastBS =
          bootstrap.Toast.getOrCreateInstance(successToast);
        const errorToastBS = bootstrap.Toast.getOrCreateInstance(errorToast);
        if (Object.keys(batchProcessSuccess).length > 0) {
          successToastBS.show();
        }

        if (Object.keys(batchProcessError).length > 0) {
          errorToastBS.show();
        }
      },
    });
  });

  let filters = document.querySelectorAll('.display-filter input');

  filters.forEach((f) =>
    f.addEventListener('change', () => {
      table.draw();
    })
  );
});
