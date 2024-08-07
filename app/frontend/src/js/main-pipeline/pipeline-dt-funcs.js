import { CSRFTOKEN } from '../utils.js';
import { displayErrorMessage } from './pipeline-funcs.js';
import invoiceInfo from '../modals/invoice-details-modal.js';
import { plTable } from './pipeline-dt.js';
import { drawNewRow } from './pipeline-dt-ui-funcs.js';
import {
  getTotalExpectedRevenueAmt,
  setTotalExpectedRevenueAmt,
} from './pipeline-ui-funcs.js';
import { checkForNeedsNewRow } from './PipelineState.js';

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

const handleAjaxError = (response) => {
  handleError(response.message);
};

const handleStatusUpdate = async (status, rowID) => {
  fetch(`/pipeline/pl-job-update/${rowID}/`, {
    method: 'POST',
    body: JSON.stringify({ status: status }),
    headers: { 'X-CSRFToken': CSRFTOKEN, 'Content-Type': 'application/json' },
  })
    .then((response) => response.json())
    .then((response) => updateTable(response.data))
    .catch((error) => handleAjaxError(error.message));
};

const handleStatusChange = (e) => {
  const statusSelectEl = e.target;
  const status = statusSelectEl.value;
  const rowID = plTable.getCurrentRowID();
  plTable.keepTrackOfCurrentStatus(status);

  invoiceInfo.formRequiresCompletion(status)
    ? invoiceInfo.modal.show()
    : handleStatusUpdate(status, rowID);
};

const updateTable = (newRowData) => {
  checkForNeedsNewRow()
    ? drawNewRow(newRowData, plTable.getOrInitTable())
    : plTable.refresh();
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
  setTotalExpectedRevenueAmt(getTotalExpectedRevenueAmt() + parseInt(data.revenue));
};

export const queryJobs = (year, month) => {
  const url =
    year !== undefined && month !== undefined
      ? `/pipeline/pipeline-data/${year}/${month}/`
      : '/pipeline/pipeline-data/';

  plTable.getOrInitTable().ajax.url(url).load();
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
  updateTable,
  handleError,
  handleStatusChange,
  handleAjaxError,
};
