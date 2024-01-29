import $ from 'jquery';
import DataTable from 'datatables.net-bs5';
import * as bootstrap from 'bootstrap';
import { csrftoken as CSRFTOKEN, truncate } from './common.js';
import { NewClientForm, displayErrorMessage } from './pipeline_funcs.js';
import { getOpenModal, invoiceInfoModal } from './invoice_info_modal.js';
import { plTable } from './pipeline-dt.js';
import * as State from './pipeline-state.js';
import { drawNewRow } from './pipeline-dt-ui-funcs.js';
import {
  getTotalExpectedRevenueAmt,
  refreshRevenueDisplay,
  setTotalExpectedRevenueAmt,
  totalExpectedRevenueAmt,
} from './pipeline-ui-funcs.js';

export const table = plTable.getTable();
export const tableEl = plTable.getTableEl();

const updateCurrentRowID = (id) => plTable.setCurrentRowID(id);
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

const updateTable = (response) => {
  response.status === 'success'
    ? handleNewRowDraw(response.data)
    : console.error(response.message);
};

const handleAjaxError = (response) => {
  handleError(response.message);
};

const handleStatusUpdate = (status, rowID) => {
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'post',
    url: '/pipeline/pl-job-update/' + rowID + '/',
    data: { status: status },
    dataType: 'json',
    success: (response) => updateTable(response),
    error: (response) => handleAjaxError(response),
  });
};

const statusChangeHandler = (e) => {
  /*
   * When a user changes the job status via the status dropdown, an
   * invoice info form appears, or otherwise the status is simply updated.
   */
  const statusSelectEl = e.target;
  const status = statusSelectEl.value;
  const rowID = plTable.getCurrentRowID();
  console.log(status, rowID);
  plTable.keepTrackOfCurrentStatus(status);

  NewClientForm.el.addEventListener('hide.bs.modal', function () {
    if (getOpenModal()) invoiceInfoModal.open();
  });

  invoiceInfoModal.formRequiresCompletion(status)
    ? invoiceInfoModal.open()
    : handleStatusUpdate(status, rowID);
};

const handleNewRowDraw = (newRowData) => {
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
    const newDataInvoicePeriod = newRowData.job_date.split('-');
    if (newDataInvoicePeriod) {
      State.checkForNeedsNewRow() ? drawNewRow(newRowData) : plTable.refresh();
    }
  } else {
    State.checkForNeedsNewRow() ? drawNewRow(newRowData) : plTable.refresh();
  }
};

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
    ? row.classList.add('job-finished')
    : row.classList.remove('job-finished');
  ['ONGOING', 'READYTOINV'].includes(initialStatus)
    ? row.classList.add('job-ongoing')
    : row.classList.remove('job-ongoing');
  setTotalExpectedRevenueAmt(getTotalExpectedRevenueAmt() + parseInt(data.revenue));
};

export const queryJobs = (year, month) => {
  var url = '/pipeline/pipeline-data/';
  if (year !== undefined && month !== undefined) {
    url = url + year + '/' + month + '/';
  }
  // table.ajax.url(url).load(updateRevenueDisplay(year, month))  // using the callback function parameter of load() to display other variables on the page
  table.ajax.url(url).load();
};

/**
 *
 * @param {HTMLElement} selectEl
 * @param {string} selectedStatus
 * @returns
 */
const showSelectedStatus = (selectEl, selectedStatus) => {
  selectEl.value = selectedStatus;
};

const revertStatus = (table) => {
  table.ajax.reload();
};

const handleError = (message) => {
  plTable.refresh();
  displayErrorMessage(message);
};

export {
  renderInvoiceStatus,
  rowCallback,
  showSelectedStatus,
  handleNewRowDraw,
  handleError,
  statusChangeHandler,
  updateTable,
  handleAjaxError,
  updateCurrentRowID,
};
