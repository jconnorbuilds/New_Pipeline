'use strict';

import '../../assets/scss/styles.scss';
import '../../assets/scss/pipeline.css';
import $ from 'jquery';
window.$ = $;
import * as bootstrap from 'bootstrap';
import * as State from './pipeline-state.js';
import { csrftoken as CSRFTOKEN, sharedJQueryFuncs } from './common.js';
import { dates } from './utils.js';
import { initCSVExporter } from './csv-export.js';
import { addFormSubmitListener as addDepositDateFormSubmitListener } from './deposit_date.js';
import { plTable } from './pipeline-dt.js';
import {
  currentExpectedRevenueDisplay,
  setExpectedRevenueDisplayText,
  createFilters,
  revenueToggleHandler,
} from './pipeline-ui-funcs';
import { createNewEl } from './utils';
import { queryJobs } from './pipeline-dt-funcs.js';
import { setupTableEventHandlers } from './pipeline-dt-ui-funcs';
import { createAndLaunchToast } from './toast-notifs.js';

document
  .querySelector('#revenue-unit')
  .addEventListener('click', revenueToggleHandler);

let currentlySelectedEl;
export const getSelectedEl = () => currentlySelectedEl;
export const setSelectedEl = (el) => (currentlySelectedEl = el);

let table;
$(document).ready(function () {
  table = plTable.getTable();
  $(table).DataTable();
  setupTableEventHandlers();

  addDepositDateFormSubmitListener();
  createFilters();
  sharedJQueryFuncs();

  // flag to control behavior of the Invoice Info and New Client modal interation on the main Pipeline page
  // let depositDateModal;

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
    const spinner = document.querySelector('#add-job-spinner'); // rename this ID
    e.preventDefault();
    spinner.classList.toggle('invisible');

    var formData = {
      job_name: document.querySelector('#id_job_name').value,
      client: document.querySelector('#id_client').value,
      job_type: document.querySelector('#id_job_type').value,
      granular_revenue: document.querySelector('#id_granular_revenue').value,
      revenue: document.querySelector('#id_revenue').value,
      add_consumption_tax: document.querySelector('#id_add_consumption_tax').checked,
      personInCharge: document.querySelector('#id_personInCharge').value,
    };

    $.ajax({
      headers: { 'X-CSRFToken': CSRFTOKEN },
      type: 'POST',
      url: '/pipeline/job-add',
      data: formData,
      beforeSend: () => spinner.classList.remove('invisible'),
      success: (response) => {
        if (response.status === 'success') {
          spinner.classList.add('invisible');
          jobForm.classList.remove('was-validated');
          plTable.refresh();
          createAndLaunchToast();
          jobForm.reset();
        } else {
          console.log('it did not work');
          jobForm.classList.add('was-validated');
          spinner.classList.add('invisible');
        }
      },
      error: function (data) {
        alert('Form submission failed');
        spinner.classList.add('invisible');
      },
    });
  });

  const pipelineMonth = document.querySelector('#pipeline-month');
  const pipelineYear = document.querySelector('#pipeline-year');

  for (let year = 2021; year <= dates.thisYear() + 1; year++)
    pipelineYear.appendChild(
      createNewEl('option', [], { value: year }, `${year}年`)
    );
  [pipelineYear.value, pipelineMonth.value] = dates.currentDate();

  $('.toggle-view').click(function () {
    if (State.getViewType() === 'monthly') {
      State.setViewType('all');
      $('#view-state').text(State.getViewType());
      $('.monthly-item').slideUp('fast', function () {
        $('#pipeline-date-select .monthly-item').removeClass('d-flex');
      });

      $('.toggle-view').html('<b>月別で表示</b>');
      queryJobs(undefined, undefined);
    } else {
      State.setViewType('monthly');
      currentExpectedRevenueDisplay.textContent = '表示の案件　請求総額(予定)';
      $('#view-state').text(State.getViewType());
      $('#pipeline-date-select .monthly-item').addClass('d-flex');
      $('.monthly-item').slideDown('fast');
      $('.toggle-view').html('<b>全案件を表示</b>');
      queryJobs(pipelineYear.value, pipelineMonth.value);
    }
    setExpectedRevenueDisplayText();
  });

  $('#pipeline-month, #pipeline-year').change(function () {
    queryJobs(pipelineYear.value, pipelineMonth.value);
  });

  const plDateBtns = document.querySelector('#pipeline-next').parentNode;
  plDateBtns.addEventListener('click', (e) => handleDateSelection(e));

  const handleDateSelection = (event) => {
    let viewYear, viewMonth;
    switch (event.target.getAttribute('id')) {
      case 'pipeline-next':
        [viewYear, viewMonth] = State.getNextMonth();
        break;
      case 'pipeline-prev':
        [viewYear, viewMonth] = State.getPrevMonth();
        break;
      case 'pipeline-current':
        [viewYear, viewMonth] = dates.currentDate();
    }
    // update UI
    [pipelineYear.value, pipelineMonth.value] = [viewYear, viewMonth];

    // update state
    State.setViewDate([+pipelineYear.value, +pipelineMonth.value]);

    // get data
    queryJobs(viewYear, viewMonth);
  };

  var clientForm = $('#new-client-form');
  var submitButton = clientForm.find('button[type="submit"]');

  var properNameInput = clientForm.find('input[name="proper_name"]');
  var properNameJapaneseInput = clientForm.find(
    'input[name="proper_name_japanese"]'
  );

  properNameInput.on('input', validateInputs);
  properNameJapaneseInput.on('input', validateInputs);

  submitButton.prop('disabled', true);

  function validateInputs() {
    /*
     * add docstring
     */
    if (properNameInput.val() || properNameJapaneseInput.val()) {
      submitButton.prop('disabled', false);
    } else {
      submitButton.prop('disabled', true);
    }
  }

  //New Client form submission
  $('#new-client-form').submit(function (event) {
    var spinner = $('#add-client-spinner');
    event.preventDefault();
    spinner.removeClass('invisible');
    // $("#add-job-spinner").addClass('testclass')
    var formData = {
      friendly_name: $('#id_friendly_name').val(),
      job_code_prefix: $('#id_job_code_prefix').val(),
      proper_name: $('#id_proper_name').val(),
      proper_name_japanese: $('#id_proper_name_japanese').val(),
      new_client: 'new ajax client add',
    };
    $.ajax({
      headers: { 'X-CSRFToken': CSRFTOKEN },
      type: 'POST',
      url: '/pipeline/',
      data: formData,
      beforeSend: function () {
        spinner.removeClass('invisible');
      },
      success: function (response) {
        if (response.status === 'success') {
          spinner.addClass('invisible');
          $('#id_client').append(
            $('<option></option>')
              .val(response.id)
              .text(`${response.value} - ${response.prefix}`)
          );
          $('#id_client').val(response.id);
          $('#id_invoice_recipient').append(
            $('<option></option>')
              .val(response.id)
              .text(`${response.value} - ${response.prefix}`)
          );
          $('#id_invoice_recipient').val(response.id);
          $('#new-client-form').removeClass('was-validated');
          $('.toast').each(function () {
            $(this).show();
          });
          $('#new-client-modal').modal('toggle');
          $('#new-client-form')[0].reset();

          // create and instantiate toast for successful client creation
          var toast = document.createElement('div');
          toast.classList.add(
            'toast',
            'position-fixed',
            'bg-success-subtle',
            'border-0',
            'top-0',
            'end-0'
          );
          toast.setAttribute('role', 'alert');
          toast.setAttribute('aria-live', 'assertive');
          toast.setAttribute('aria-atomic', 'true');

          var descriptor = formData['friendly_name'].toUpperCase();
          var header = document.createElement('div');
          header.classList.add('toast-header');
          header.innerHTML = `
                        <i class="bi bi-check2-circle" class="rounded me-2"></i>
                        <strong class="me-auto">New client added</strong>
                        <small class="text-muted">Just now</small>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                        `;
          var body = document.createElement('div');
          body.classList.add('toast-body');
          body.innerText = descriptor;

          toast.appendChild(header);
          toast.appendChild(body);

          document.body.appendChild(toast);

          var toastElement = new bootstrap.Toast(toast);
          toastElement.show();
          setTimeout(function () {
            $(toastElement).fadeOut('fast', function () {
              $(this).remove();
            });
          }, 1000);
        } else {
          $('#new-client-form').addClass('was-validated');
          spinner.addClass('invisible');
        }
      },

      error: function (request) {
        alert('form not submitted');
        $(this).addClass('was-validated');
        spinner.addClass('invisible');
      },
    });
  });

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
        const errorToast = document.getElementById('payment-template-error-toast');
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
        const successToastBS = bootstrap.Toast.getOrCreateInstance(successToast);
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
