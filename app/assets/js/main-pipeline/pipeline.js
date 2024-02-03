'use strict';

import '../../../assets/scss/styles.scss';
import '../../../assets/scss/pipeline.css';
import $ from 'jquery';
window.$ = $;
import * as bootstrap from 'bootstrap';
import { csrftoken as CSRFTOKEN } from '../utils';
import { initCSVExporter } from '../csv-export.js';
import { depositDateFormSubmitHandler } from '../deposit_date.js';
import { plTable } from './pipeline-dt.js';
import {
  createFilters,
  revenueToggleHandler,
  dateSelectionHandler,
  toggleViewHandler,
  initializeDateSelectors,
} from './pipeline-ui-funcs';
import { initializeGlobalMouseEvents } from '../dt-shared.js';
import { jobFormSubmissionHandler } from './pipeline-funcs.js';
import { setupTableEventHandlers } from './pipeline-dt-ui-funcs.js';

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

document
  .querySelector('#job-form')
  .addEventListener('submit', jobFormSubmissionHandler);

initializeGlobalMouseEvents();
initializeDateSelectors();

let table;
$(document).ready(function () {
  table = plTable.getTable();
  $(table).DataTable();
  setupTableEventHandlers();
  createFilters();
  initCSVExporter();

  // $('.update-cost-table').click(function () {
  //   const forms = document.getElementsByTagName('form');
  //   for (const i = 0; i < forms.length; i++) {
  //     forms[i].submit();
  //   }
  // });

  // TODO: clean up this mess, but it's for an unsupported feature...
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
          if (processingStatus[key].status == 'success') {
            batchProcessSuccess[key] = processingStatus[key];
          } else if (processingStatus[key].status == 'error') {
            batchProcessError[key] = processingStatus[key];
          } else {
            alert('Unknown error during processing!');
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
