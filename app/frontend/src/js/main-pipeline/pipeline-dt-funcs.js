import $ from 'jquery';
import { CSRFTOKEN } from '../utils.js';
import { displayErrorMessage } from './pipeline-funcs.js';
import invoiceInfo from '../modals/invoices-details-modal.js';
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

  invoiceInfo.formRequiresCompletion(status)
    ? invoiceInfo.modal.show()
    : handleStatusUpdate(status, rowID);
};

const handleNewRowDraw = (newRowData) => {
  /*
  Close the modal, draw a new row in the table if it belongs on the current
  page.
  */

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
  const INVOICED_STATUSES = ['INVOICED1', 'INVOICED2', 'FINISHED'];
  const statusCell = row.querySelector('.job-status-select');
  const initialStatus = statusCell.value;
  const depositDateCell = row.querySelector('.deposit-date');
  INVOICED_STATUSES.includes(data.status)
    ? row.classList.add('job-invoiced')
    : row.classList.remove('job-invoiced');
  INVOICED_STATUSES.includes(statusCell.value)
    ? depositDateCell.classList.remove('text-body-tertiary')
    : depositDateCell.classList.add('text-body-tertiary');
  statusCell.setAttribute('data-initial', initialStatus);
  initialStatus === 'FINISHED'
    ? row.classList.add('job-finished')
    : row.classList.remove('job-finished');
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
