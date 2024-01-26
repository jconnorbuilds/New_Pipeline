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

  addDepositDateFormSubmitListener();
  createFilters();
  sharedJQueryFuncs();

  // flag to control behavior of the Invoice Info and New Client modal interation on the main Pipeline page
  let depositDateModal;

  initCSVExporter();

  $('.update-cost-table').click(function () {
    const forms = document.getElementsByTagName('form');
    for (const i = 0; i < forms.length; i++) {
      forms[i].submit();
    }
  });

  // Job form submission
  $('#job-form').submit(function (event) {
    var spinner = $('#add-job-spinner');
    event.preventDefault();
    spinner.toggleClass('invisible');
    var formData = {
      job_name: $('#id_job_name').val(),
      client: $('#id_client').val(),
      job_type: $('#id_job_type').val(),
      granular_revenue: $('#id_granular_revenue').val(),
      revenue: $('#id_revenue').val(),
      add_consumption_tax: $('#id_add_consumption_tax').prop('checked'),
      personInCharge: $('#id_personInCharge').val(),
    };

    $.ajax({
      headers: { 'X-CSRFToken': CSRFTOKEN },
      type: 'POST',
      url: '/pipeline/job-add',
      data: formData,
      beforeSend: function () {
        spinner.removeClass('invisible');
      },
      success: function (response) {
        if (response.status === 'success') {
          // $("table").append(response.html);
          spinner.addClass('invisible');
          $('#job-form').removeClass('was-validated');
          // $(".toast").each(function() {
          //     $(this).show()
          // });
          var job = response.data;
          table.row.add($(job)).draw();
          // #TODO: replace the below with the updateRevenueDisplay function using the new data
          // var originalVal = parseInt($("#total-billed-monthly-exp").text().replace(/(¥|,)/g, ''));
          // var newVal = parseInt(job.revenue.replace(/(¥|,)/g, ''));
          // var resultVal = '¥' + (originalVal + newVal).toLocaleString();
          // $("#total-billed-monthly-exp").text(resultVal)
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

          var jobDescriptor =
            formData['job_name'].toUpperCase() +
            ' from ' +
            $('#id_client option:selected').text();
          var header = document.createElement('div');
          header.classList.add('toast-header');
          header.innerHTML = `
                        <i class="bi bi-check2-circle" class="rounded me-2"></i>
                        <strong class="me-auto">Job added</strong>
                        <small class="text-muted">Just now</small>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                        `;
          var body = document.createElement('div');
          body.classList.add('toast-body');
          body.innerText = jobDescriptor;

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
          $('#job-form').get(0).reset();
        } else {
          console.log('it did not work');
          $('#job-form').addClass('was-validated');
          spinner.addClass('invisible');
        }
      },
      error: function (data) {
        alert('Form submission failed');
        spinner.addClass('invisible');
      },
    });
  });

  // var pipelineMonthOld = $('#pipeline-month');
  // var pipelineYeaOld = $('#pipeline-year');
  const pipelineMonth = document.querySelector('#pipeline-month');
  const pipelineYear = document.querySelector('#pipeline-year');
  let { currentMonth, currentYear } = dates.currentDate();
  pipelineMonth.value = currentMonth;
  pipelineYear.value = currentYear;

  for (let year = 2021; year <= currentYear + 1; year++)
    pipelineYear.appendChild(
      createNewEl('option', [], { value: year }, `${year}年`)
    );

  function filterData(year, month) {
    var url = '/pipeline/pipeline-data/';
    if (year !== undefined && month !== undefined) {
      url = url + year + '/' + month + '/';
    }
    // table.ajax.url(url).load(updateRevenueDisplay(year, month))  // using the callback function parameter of load() to display other variables on the page
    table.ajax.url(url).load();
  }

  $('.toggle-view').click(function () {
    if (State.getViewType() === 'monthly') {
      State.setViewType('all');
      $('#view-state').text(State.getViewType());
      $('.monthly-item').slideUp('fast', function () {
        $('#pipeline-date-select .monthly-item').removeClass('d-flex');
      });

      $('.toggle-view').html('<b>月別で表示</b>');
      filterData(undefined, undefined);
    } else {
      State.setViewType('monthly');
      currentExpectedRevenueDisplay.textContent = '表示の案件　請求総額(予定)';
      $('#view-state').text(State.getViewType());
      $('#pipeline-date-select .monthly-item').addClass('d-flex');
      $('.monthly-item').slideDown('fast');
      $('.toggle-view').html('<b>全案件を表示</b>');
      filterData(pipelineYear.value, pipelineMonth.value);
    }
    setExpectedRevenueDisplayText();
  });

  $('#pipeline-month, #pipeline-year').change(function () {
    filterData(pipelineYear.value, pipelineMonth.value);
  });

  const plNextMonthBtn = document.querySelector('#pipeline-next');
  const plPrevMonthBtn = document.querySelector('#pipeline-prev');

  plNextMonthBtn.addEventListener('click', () => {
    // set UI
    setViewMonth(parseInt(pipelineMonth.value));
    setViewYear(parseInt(pipelineYear.value));
    let { viewYear, viewMonth } = State.getViewDate();
    if (viewMonth != 12) {
      viewMonth++;
    } else {
      viewMonth = 1;
      viewYear++;
    }
    pipelineMonth.value = viewingMonth;
    pipelineYear.value = viewingYear;

    // set Data
    filterData(viewYear, viewMonth);
  });

  // $('#pipeline-prev').click(function () {
  //   viewingMonth = parseInt(pipelineMonth.value);
  //   viewingYear = parseInt(pipelineYear.value);
  //   if (viewingMonth != 1) {
  //     viewingMonth--;
  //   } else if (viewingYear - 1 < earliestYear) {
  //     // add some error message?
  //   } else {
  //     viewingMonth = 12;
  //     viewingYear--;
  //   }
  //   pipelineMonth.val(viewingMonth);
  //   pipelineYear.val(viewingYear);
  //   filterData(viewingYear, viewingMonth);
  // });
  $('#pipeline-current').click(function () {
    viewingMonth = currentMonth;
    viewingYear = currentYear;
    pipelineYear.val(currentYear);
    pipelineMonth.val(currentMonth);
    filterData(currentYear, currentMonth);
    // updateRevenueDisplay(viewingYear, viewingMonth)
  });

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
