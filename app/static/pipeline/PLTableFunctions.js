import { csrftoken as CSRFTOKEN } from './common.js';
import { NewClientForm, InvoiceInfo } from './pipeline_functions.js';

let lastChangedSelectEl;
const getLastChangedSelectEl = () => lastChangedSelectEl;
const renderInvoiceStatus = (data, row) => {
  const STATUSES = row.job_status_choices;
  let selectEl = document.createElement('select');
  selectEl.classList.add('form-control-plaintext', 'job-status-select');
  selectEl.setAttribute('name', 'job_status');

  for (const [_, status] of Object.entries(STATUSES)) {
    let optionEl = document.createElement('option');
    optionEl.value = status[0];
    optionEl.text = status[1];
    if (status[0] === data) optionEl.setAttribute('selected', '');
    selectEl.appendChild(optionEl);
  }
  return selectEl.outerHTML;
};

const handleSuccessResponse = (table) => (response) => {
  response.status === 'success'
    ? handleNewRowDraw(table, response.data)
    : console.error(response.message);
};

const handleErrorResponse = (table) => (response) => {
  handleError(response.message, table);
};

const handleStatusUpdate = (status, rowID) => {
  let url = '/pipeline/pl-job-update/' + rowID + '/';
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'post',
    url: url,
    data: { status: status },
    dataType: 'json',
    success: handleSuccessResponse(Pipeline.table),
    error: handleErrorResponse(Pipeline.table),
  });
};

const statusChangeListener = (e) => {
  /*
   * When a user changes the job status via the status dropdown, an
   * invoice info form appears, or otherwise the status is simply updated.
   */
  const statusSelectEl = e.target;
  const initialStatus = statusSelectEl.dataset.initial;
  const status = statusSelectEl.value;
  const rowID = statusSelectEl.closest('tr').getAttribute('id');
  const table = $(e.target.closest('table')).DataTable();
  lastChangedSelectEl = statusSelectEl;

  NewClientForm.el.addEventListener('hide.bs.modal', function () {
    if (InvoiceInfo.getOpenModal() === true) {
      InvoiceInfo.modal.show();
    }
  });

  InvoiceInfo.needsToDoInvoiceForm(status, table, rowID)
    ? InvoiceInfo.openModal(status, initialStatus, table, rowID)
    : handleStatusUpdate(status, rowID);
};

const getUpdate = (selectEl) => {
  /*
   * Returns an object containing the value of the select element
   */
  var formData = {};
  selectEl.classList.contains('job-status-select')
    ? (formData.status = selectEl.value)
    : console.error('There was a problem getting the form data');
  return formData;
};

const getClientID = (table, rowID) =>
  parseInt(table.cell(`#${rowID}`, 'client_id:name').data());

const drawNewRow = (table, newRowData) =>
  table.row(`#${newRowData.id}`).data(newRowData).invalidate().draw(false);

const needsNewRow = () =>
  Pipeline.viewingMonth == Pipeline.currentMonth &&
  Pipeline.viewingYear == Pipeline.currentYear;

const removeRow = (table, newRowData) =>
  table.row(`#${newRowData.id}`).remove().draw();

const handleNewRowDraw = (table, newRowData) => {
  /*
  Close the modal, show a success toast,
  and draw a new row in the table if it belongs on the current
  page.

  arguments:
  table: the job table
  newRowData: response data returned from the ajax call
  */
  const invoiceInfoSavedToast = bootstrap.Toast.getOrCreateInstance(
    $('#invoice-set-success-toast')
  );

  if (newRowData.job_date) {
    // TODO: 'edge' case - needs to draw new rows even on all-jobs view.
    // Should set up a cleaner way to handle viewingMonth+Year, maybe
    // consolidate into one viewingDate view
    newDataInvoicePeriod = newRowData.job_date.split('-');
    console.log(needsNewRow());
    if (newDataInvoicePeriod) {
      needsNewRow() ? drawNewRow(table, newRowData) : removeRow(table, newRowData);
    }
  } else {
    console.log('else!');
    needsNewRow() ? drawNewRow(table, newRowData) : removeRow(table, newRowData);
  }
};

let totalExpectedRevenueAmt = 0;

const setTotalExpectedRevenueAmt = (value) => (totalExpectedRevenueAmt = value);

const getTotalExpectedRevenueAmt = () => totalExpectedRevenueAmt;

const rowCallback = (row, data) => {
  const statusCell = $(row).find('.job-status-select');
  const initialStatus = statusCell.val();
  const depositDateCell = $(row).find('.deposit-date');

  if (['INVOICED1', 'INVOICED2', 'FINISHED'].includes(data.status)) {
    row.classList.add('job-invoiced');
  }

  ['INVOICED1', 'INVOICED2', 'FINISHED'].includes(statusCell.val())
    ? depositDateCell.removeClass('text-body-tertiary')
    : depositDateCell.addClass('text-body-tertiary');

  statusCell.attr('data-initial', initialStatus);
  initialStatus === 'FINISHED'
    ? $(row).addClass('job-finished')
    : $(row).removeClass('job-finished');
  ['ONGOING', 'READYTOINV'].includes(initialStatus)
    ? $(row).addClass('job-ongoing')
    : $(row).removeClass('job-ongoing');
  totalExpectedRevenueAmt += parseInt(data.revenue);
};

const showSelectedStatus = (selectEl, selectedStatus) =>
  (selectEl.value = selectedStatus);

const revertStatus = (table) => {
  table.ajax.reload();
};

const handleError = (message, table) => {
  console.error('error in the error handler');
  revertStatus(table);
  Pipeline.displayErrorMessage(message);
};

const unreceivedFilter = document.querySelector('input.unreceived');
const toggleOngoingFilter = document.querySelector('input.toggle-ongoing');
const showOnlyOngoingFilter = document.querySelector('input.only-ongoing');
const showOutstandingPayments = document.querySelector('input.toggle-outstanding');

function createFilters() {
  const jobStatusOrderMap = {
    ONGOING: '0_',
    READYTOINV: '1_',
    INVOICED1: '3_',
    INVOICED2: '4_',
    FINISHED: '5_',
    ARCHIVED: '6_',
  };

  DataTable.ext.order['dom-job-select'] = function (settings, col) {
    return this.api()
      .column(col, { order: 'index' })
      .nodes()
      .map(function (td, i) {
        let status = td.querySelector('.job-status-select').value;
        return status ? jobStatusOrderMap[status] : 0;
      });
  };
  DataTable.ext.search.push(function (settings, data, dataIndex) {
    const unreceivedPayment = data[10] === '---';
    const ongoing = ['ONGOING', 'READYTOINV'].includes(data[9]);
    if (unreceivedFilter.checked) {
      return toggleOngoingFilter.checked
        ? unreceivedPayment || ongoing
        : unreceivedPayment && !ongoing;
    }
    if (showOnlyOngoingFilter.checked) return ongoing;
    if (!toggleOngoingFilter.checked) return !ongoing;

    return true;
  });

  DataTable.ext.search.push(function (settings, data, dataIndex) {
    const outstandingVendorPayment = data[13] === 'false' && +data[5] > 0;
    if (showOutstandingPayments.checked) {
      return outstandingVendorPayment ? true : false;
    }
    return true;
  });
}

export {
  renderInvoiceStatus,
  getUpdate,
  rowCallback,
  getClientID,
  showSelectedStatus,
  revertStatus,
  needsNewRow,
  drawNewRow,
  handleNewRowDraw,
  handleError,
  removeRow,
  statusChangeListener,
  getLastChangedSelectEl,
  handleSuccessResponse,
  handleErrorResponse,
  getTotalExpectedRevenueAmt,
  setTotalExpectedRevenueAmt,
  createFilters,
  unreceivedFilter,
};
