import $ from 'jquery';
import * as bootstrap from 'bootstrap';
import { CSRFTOKEN } from '../utils.js';
import { NewClientForm, displayErrorMessage } from './pipeline-funcs.js';
import { getOpenModal, invoiceInfoModal } from '../invoice_info_modal.js';
import { plTable } from './pipeline-dt.js';
import * as State from './pipeline-state.js';
import { drawNewRow } from './pipeline-dt-ui-funcs.js';
import {
  getTotalExpectedRevenueAmt,
  setTotalExpectedRevenueAmt,
} from './pipeline-ui-funcs.js';

export const table = plTable.getOrInitTable();
export const tableEl = plTable.getTableEl();

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
  const statusSelectEl = e.target;
  const status = statusSelectEl.value;
  const rowID = plTable.getCurrentRowID();
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
    ? row.classList.add('table-primary')
    : row.classList.remove('table-primary');
  setTotalExpectedRevenueAmt(
    getTotalExpectedRevenueAmt() + parseInt(data.revenue)
  );
};

export const queryJobs = (year, month) => {
  var url = '/pipeline/pipeline-data/';
  if (year !== undefined && month !== undefined) {
    url = url + year + '/' + month + '/';
  }
  table.ajax.url(url).load();
};

const showSelectedStatus = (selectEl, selectedStatus) => {
  selectEl.value = selectedStatus;
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
};
