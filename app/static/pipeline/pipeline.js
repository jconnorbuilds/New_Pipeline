const unreceivedFilter = document.querySelector('input.unreceived');
const toggleOngoingFilter = document.querySelector('input.toggle-ongoing');
const showOnlyOngoingFilter = document.querySelector('input.only-ongoing');
const showOutstandingPayments = document.querySelector(
  'input.toggle-outstanding'
);

const revenueUnitToggle = document.querySelector('#revenue-unit');
const totalExpectedRevenueDisplay = document.querySelector(
  '#total-revenue-monthly-exp'
);
const currentExpectedRevenueDisplay = document.querySelector(
  '.revenue-display-text.expected'
);
const currentActualRevenueDisplayText = document.querySelector(
  '.revenue-display-text.actual'
);
let totalExpectedRevenueAmt = 0;
let pipelineViewState = 'monthly';

const jobStatusOrderMap = {
  ONGOING: '0_',
  READYTOINV: '1_',
  INVOICED1: '3_',
  INVOICED2: '4_',
  FINISHED: '5_',
  ARCHIVED: '6_',
};

revenueUnitToggle.addEventListener('click', (e) => {
  const btn = e.currentTarget;
  const unitToggleInput = document.querySelector('#id_granular_revenue');
  const revenueInput = document.querySelector('#id_revenue');

  if (btn.classList.contains('active')) {
    btn.textContent = '円';
    unitToggleInput.value = true;
    revenueInput.setAttribute('placeholder', '例）420069');
  } else {
    btn.textContent = '万円';
    unitToggleInput.value = false;
    revenueInput.setAttribute('placeholder', '例）100');
  }
});

function setExpectedRevenueDisplayText() {
  currentExpectedRevenueDisplay.textContent =
    pipelineViewState !== 'monthly' || unreceivedFilter.checked
      ? '表示の案件　請求総額 (予定)'
      : '表示の月　請求総額 (予定)';
}

$(document).ready(function () {
  // flag to control behavior of the Invoice Info and New Client modal interation on the main Pipeline page
  let currentMonth = Pipeline.currentMonth;
  let currentYear = Pipeline.currentYear;
  let viewingMonth = Pipeline.viewingMonth;
  let viewingYear = Pipeline.viewingYear;
  let currentRowID;
  let depositDateModal;

  const jobTable = $('#job-table').DataTable({
    paging: false,
    responsive: true,
    order: [
      [9, 'asc'],
      [7, 'desc'],
      [3, 'asc'],
    ],
    orderClasses: false,
    rowId: 'id',
    language: {
      searchPlaceholder: 'ジョブを探す',
      search: '',
    },
    preDrawCallback: (settings) => (totalExpectedRevenueAmt = 0),
    drawCallback: (settings) => {
      setExpectedRevenueDisplayText();
      updateRevenueDisplay(viewingYear, viewingMonth);
      totalExpectedRevenueDisplay.textContent = `¥${totalExpectedRevenueAmt.toLocaleString()}`;
    },
    ajax: {
      url:
        '/pipeline/pipeline-data/' +
        viewingYear +
        '/' +
        viewingMonth +
        '/',
      dataSrc: (json) => json.data,
    },
    columns: [
      {
        data: null,
        responsivePriority: 2,
        render: (data, type, row) =>
          `<input type='checkbox' name='select' value=${row.id} class='form-check-input'>`,
      },
      {
        data: 'client_name',
        responsivePriority: 5,
        render: (data, type, row) =>
          `<a href="client-update/${row.client_id}">${data}</a>`,
      },
      {
        data: 'job_name',
        className: 'job-label',
        responsivePriority: 1,
        render: {
          // prettier-ignore
          display: (data, type, row) =>
            row.invoice_name
              ? `<a href="/pipeline/${row.id}/job-detail/">INV: ${truncate(row.invoice_name,15)}</a>`
              : `<a href="/pipeline/${row.id}/job-detail/">${truncate(data, 15)}</a>`,
          sort: (data) => data,
        },
      },
      { data: 'job_code' },
      {
        data: 'revenue',
        className: 'pe-4 revenue-amt',
        responsivePriority: 3,
        render: (data, type, row) => `¥${data.toLocaleString()}`,
      },
      {
        data: 'total_cost',
        className: 'pe-4',
        responsivePriority: 4,
        render: {
          display: (data, type, row) =>
            // prettier-ignore
            `<a href="/pipeline/cost-add/${row.id}/">¥${data.toLocaleString()}</a>`,
          sort: (data) => data,
        },
      },
      {
        data: 'profit_rate',
        className: 'pe-4',
        width: '120px',
        render: (data) => `${data}%`,
      },
      {
        data: 'job_date',
        className: 'invoice-period',
        render: {
          display: (data) => {
            let date = new Date(data);
            return data
              ? `${date.getFullYear()}年${date.getMonth() + 1}月`
              : '---';
          },
          sort: (data) => data,
        },
      },
      {
        data: 'job_type',
        name: 'job_type',
      },
      {
        data: 'status',
        name: 'status',
        responsivePriority: 6,
        render: {
          display: (data, type, row) =>
            PipelineTable.renderInvoiceStatus(data, row),
        },
        orderDataType: 'dom-job-select',
      },
      {
        data: 'deposit_date',
        name: 'deposit_date',
        className: 'deposit-date',
        defaultContent: '---',
      },

      {
        data: 'invoice_info_completed',
        name: 'invoice_info_completed',
        visible: false,
        render: (data, type, row) =>
          row.invoice_name && row.month && row.year ? true : false,
      },
      {
        data: 'client_id',
        name: 'client_id',
        visible: false,
      },
      {
        data: 'all_invoices_paid',
        visible: false,
      },
    ],
    columnDefs: [
      { target: 0, className: 'dt-center', searchable: false },
      { targets: [4, 5, 6], className: 'dt-right' },
      {
        targets: [4, 5, 6],
        createdCell: (td, cellData, rowData, row, col) =>
          $(td).addClass('font-monospace'),
      },
    ],
    rowCallback: (row, data) => PipelineTable.rowCallback(row, data),
    createdRow: (row, data, dataIndex) => {
      if (data.deposit_date === null)
        row.classList.add('payment-unreceived');
    },
  });

  jobTable.on('click', 'td.deposit-date', function () {
    currentRowID = $(this).closest('tr').attr('id');
    row = jobTable.row(`#${currentRowID}`).node();
    jobStatus = $(row)
      .find('select.job-status-select option:selected')
      .val();

    if (['INVOICED1', 'INVOICED2', 'FINISHED'].includes(jobStatus)) {
      depositDateModal = new bootstrap.Modal(
        document.querySelector('#set-deposit-date')
      );
      depositDateModal.show();
    }
  });

  $('#deposit-date-form').on('submit', function (event) {
    event.preventDefault();
    var depositDateData = new FormData();
    depositDateData.append('deposit_date', $('#id_deposit_date').val());
    depositDateData.append('job_id', currentRowID);
    depositDateData.append('set_deposit_date', true);
    let url = `/pipeline/set-deposit-date/${currentRowID}/`;
    function successCallback(newRowData) {
      jobTable
        .row(`#${newRowData.id}`)
        .data(newRowData)
        .invalidate()
        .draw(false);
      depositDateModal.hide();
      $('#deposit-date-form')[0].reset();
    }
    PipelineTable.ajaxCall(depositDateData, url, successCallback);
  });

  let rangeCheckbox = $('#csv-export-use-range');
  rangeCheckbox.click(function () {
    if (rangeCheckbox.is(':checked')) {
      $('#thru-month').removeClass('invisible');
      $('#thru-year').removeClass('invisible');
    } else {
      $('#thru-month').addClass('invisible');
      $('#thru-year').addClass('invisible');
      $('#thru-month').val($('#from-month').val()).change();
      $('#thru-year').val($('#from-year').val()).change();
    }
  });
  $('#from-month').change(function () {
    if (rangeCheckbox.is(':not(:checked)')) {
      $('#thru-month').val($('#from-month').val()).change();
    }
  });
  $('#from-year').change(function () {
    if (rangeCheckbox.is(':not(:checked)')) {
      $('#thru-year').val($('#from-year').val()).change();
    }
  });
  $('.update-cost-table').click(function () {
    var forms = document.getElementsByTagName('form');
    for (var i = 0; i < forms.length; i++) {
      forms[i].submit();
    }
  });

  function updateRevenueDisplay(year, month) {
    $.ajax({
      headers: { 'X-CSRFToken': csrftoken },
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

  jobTable.on('change', '.job-status-select', function (e) {
    /*
     * When a user changes the job status via the status dropdown, if one
     * of the 'finalizing' statuses is selected e.g. 'Completed & Invoiced',
     * and the invoice data hasn't been added, a modal form opens so the information can be added.
     * Otherwise, the status is simply updated.
     *
     * Additional logic is added to make a seamless transition between
     * the invoice data modal and a separate modal for adding a new client,
     * in the case the invoice recipient is a client that isn't in the db yet.
     */

    const statusSelectEl = e.target;
    const status = statusSelectEl.value;
    const initialStatus = statusSelectEl.dataset.initial;
    const rowID = statusSelectEl.closest('tr').getAttribute('id');

    NewClientForm.el.addEventListener('hide.bs.modal', function () {
      if (InvoiceInfo.getOpenModal() === true) {
        InvoiceInfo.modal.show();
      }
    });

    // Can I make this more modular?
    /* Checks the new status of the row and determines if the user needs to
    / add information about the invoice. 
    */
    if (
      InvoiceInfo.isRequired(status) &&
      !InvoiceInfo.isCompleted(jobTable, rowID)
    ) {
      InvoiceInfo.openModal;
      InvoiceInfo.modalEl.addEventListener(
        'show.bs.modal',
        InvoiceInfo.createModalShowListener(statusSelectEl, status)
      );

      InvoiceInfo.modalEl.addEventListener(
        'hide.bs.modal',
        InvoiceInfo.createModalHideListener(
          statusSelectEl,
          initialStatus,
          InvoiceInfo.modalEl,
          jobTable
        )
      );
      // if true, a modal form opens for the user to fill.
      InvoiceInfo.setOpenModal(true);
      InvoiceInfo.setInitialInfo(jobTable, rowID);
      InvoiceInfo.modal.show();
    } else {
      // Otherwise, just send the new status to the db and update nrow
      let url = '/pipeline/pl-job-update/' + rowID + '/';
      $.ajax({
        headers: { 'X-CSRFToken': csrftoken },
        type: 'POST',
        url: url,
        data: { status: status },
        dataTye: 'json',
        success: (response) => {
          if (response.status === 'success') {
            PipelineTable.handleNewRowDraw(
              InvoiceInfo.modal,
              InvoiceInfo.modalEl,
              jobTable,
              response.data
            );
          } else {
            console.log(response);
            console.error(response.message);
          }
        },
        error: (response) =>
          PipelineTable.handleError(
            statusSelectEl,
            initialStatus,
            response.message,
            jobTable
          ),
      });
    }
  });
  // if (viewingMonth == currentMonth && viewingYear == currentYear) {
  //   jobTable
  //     .row(`#${newRowData.id}`)
  //     .data(newRowData)
  //     .invalidate()
  //     .draw();
  // } else {
  //   jobTable.row(`#${newRowData.id}`).remove().draw();
  // }

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
      headers: { 'X-CSRFToken': csrftoken },
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
          jobTable.row.add($(job)).draw();
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

  var pipelineMonth = $('#pipeline-month');
  var pipelineYear = $('#pipeline-year');
  filterEarliestYear = 2021;

  yearOption = filterEarliestYear;
  while (yearOption <= currentYear + 1) {
    pipelineYear.append(
      `<option value="${yearOption}">${yearOption}年</option>`
    );
    yearOption++;
  }

  pipelineMonth.val(currentMonth);
  pipelineYear.val(currentYear);

  function filterData(year, month) {
    var url = '/pipeline/pipeline-data/';
    if (year !== undefined && month !== undefined) {
      url = url + year + '/' + month + '/';
    }
    // jobTable.ajax.url(url).load(updateRevenueDisplay(year, month))  // using the callback function parameter of load() to display other variables on the page
    jobTable.ajax.url(url).load();
  }

  $('.toggle-view').click(function () {
    console.log({ viewingMonth }, { currentMonth });
    if (pipelineViewState === 'monthly') {
      pipelineViewState = 'all';
      $('#view-state').text(pipelineViewState);
      $('.monthly-item').slideUp('fast', function () {
        $('#pipeline-date-select .monthly-item').removeClass('d-flex');
      });

      $('.toggle-view').html('<b>月別で表示</b>');
      filterData(undefined, undefined);
    } else {
      pipelineViewState = 'monthly';
      currentExpectedRevenueDisplay.textContent =
        '表示の案件　請求総額(予定)';
      $('#view-state').text(pipelineViewState);
      $('#pipeline-date-select .monthly-item').addClass('d-flex');
      $('.monthly-item').slideDown('fast');
      $('.toggle-view').html('<b>全案件を表示</b>');
      filterData(pipelineYear.val(), pipelineMonth.val());
    }
    setExpectedRevenueDisplayText();
  });

  $('#pipeline-month, #pipeline-year').change(function () {
    filterData(pipelineYear.val(), pipelineMonth.val());
  });

  $('#pipeline-next').click(function () {
    viewingMonth = parseInt(pipelineMonth.val());
    viewingYear = parseInt(pipelineYear.val());
    if (viewingMonth != 12) {
      viewingMonth++;
    } else if (viewingYear + 1 > currentYear + 1) {
      // add some error message?
    } else {
      viewingMonth = 1;
      viewingYear++;
    }
    pipelineMonth.val(viewingMonth);
    pipelineYear.val(viewingYear);
    filterData(viewingYear, viewingMonth);
  });

  $('#pipeline-prev').click(function () {
    viewingMonth = parseInt(pipelineMonth.val());
    viewingYear = parseInt(pipelineYear.val());
    if (viewingMonth != 1) {
      viewingMonth--;
    } else if (viewingYear - 1 < filterEarliestYear) {
      // add some error message?
    } else {
      viewingMonth = 12;
      viewingYear--;
    }
    pipelineMonth.val(viewingMonth);
    pipelineYear.val(viewingYear);
    filterData(viewingYear, viewingMonth);
  });

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
      headers: { 'X-CSRFToken': csrftoken },
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
      headers: { 'X-CSRFToken': csrftoken },
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
        const errorToastBS =
          bootstrap.Toast.getOrCreateInstance(errorToast);
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
  filters.forEach(() =>
    addEventListener('change', () => {
      jobTable.draw();
    })
  );
});
