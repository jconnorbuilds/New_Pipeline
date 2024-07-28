import DataTable from 'datatables.net';
import { CSRFTOKEN } from './utils.js';
import * as PayPeriod from './modals/pay-period-modal.js';
import { requestInvoice } from './tables/dt-shared.js';

/**
 * create a Bootstrap input group with a "request invoice" button
 * and a dropdown to optionally set the payment period to something other than default.
 *
 * @param {*} - JSON data from DataTables row
 * @returns {string} - the outerHTML of the input group (DataTables render fn doesn't accept nodes)
 */
const renderRequestBtn = (data, row) => {
  const btnGroup = document.createElement('div');
  btnGroup.classList.add('btn-group', 'btn-group-sm');
  btnGroup.setAttribute('role', 'group');
  btnGroup.setAttribute('aria-label', 'Invoice request button with nested dropdown');

  const requestBtn = document.createElement('button');
  requestBtn.classList.add('btn', 'btn-primary', 'inv-req', 'inv-req-btn');
  requestBtn.setAttribute('type', 'button');
  requestBtn.id = `invoice-request-btn-${data}`;
  requestBtn.textContent = 'Req. invoice';

  const innerBtnGroup = document.createElement('div');
  innerBtnGroup.classList.add('btn-group');
  innerBtnGroup.setAttribute('role', 'group');

  const dropdownBtn = document.createElement('button');
  dropdownBtn.classList.add(
    'btn',
    'btn-primary',
    'dropdown-toggle',
    'inv-req',
    'inv-req-menu',
  );
  dropdownBtn.setAttribute('type', 'button');
  dropdownBtn.setAttribute('aria-expanded', false);
  dropdownBtn.dataset.bsToggle = 'dropdown';

  const dropdownItem = document.createElement('span');
  dropdownItem.classList.add('dropdown-item', 'btn');
  dropdownItem.textContent = 'Specify pay period';

  const dropdownItemContainer = document.createElement('li');
  const dropdownMenu = document.createElement('ul');
  dropdownMenu.classList.add('dropdown-menu');

  dropdownBtn.append(innerBtnGroup);

  dropdownItemContainer.append(dropdownItem);
  dropdownMenu.append(dropdownItemContainer);

  btnGroup.append(requestBtn);
  btnGroup.append(dropdownBtn);
  btnGroup.append(dropdownMenu);

  dropdownMenu.addEventListener('click', () => {
    PayPeriod.launchModal(row);
  });
  requestBtn.addEventListener('click', (e) => {
    const table = e.target.closest('table');
    requestInvoice(data, table);
  });

  return btnGroup;
};

const renderAmount = (amount, currency) =>
  currency.name == 'JPY' ? '' : currency.symbol + amount.toLocaleString();

const renderAmountJPY = (data) => '¥' + data.toLocaleString();

const renderInvoiceStatus = (data, row) => {
  const STATUSES = row.invoice_status_choices;
  const selectEl = document.createElement('select');
  selectEl.classList.add('form-control-plaintext', 'status', 'p-0');
  selectEl.setAttribute('name', 'invoice_status');
  for (const [_, status] of Object.entries(STATUSES)) {
    const optionEl = document.createElement('option');
    optionEl.value = status[0];
    optionEl.text = status[1];
    if (status[0] === data) optionEl.setAttribute('selected', '');
    selectEl.appendChild(optionEl);
  }
  return selectEl.outerHTML;
};

const createVendorOption = (id, label, selectEl, row) => {
  const optionEl = document.createElement('option');
  optionEl.value = id;
  optionEl.text = label;
  selectEl.appendChild(optionEl);
  if (id == row.vendor_id) optionEl.setAttribute('selected', '');
};

const renderVendorName = (row) => {
  const vendors = row.vendors_dict ? row.vendors_dict : null;
  const selectEl = document.createElement('select');

  selectEl.classList.add('form-control-plaintext', 'vendor');
  selectEl.setAttribute('name', 'vendor');
  createVendorOption(0, 'Select vendor', selectEl, row);

  if (vendors) {
    Object.entries(vendors).forEach(([id, name]) => {
      createVendorOption(id, name, selectEl, row);
    });
  }

  return selectEl.outerHTML;
};

const renderPayPeriod = (data) => {
  if (data) {
    const date = new Date(data);

    const formatter = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });

    const formattedDate = formatter.format(date);
    return `${formattedDate}末`;
  } else {
    return '-';
  }
};

const statusFilters = document.querySelectorAll('.display-filter .status-filter');

/**
 * Extends DataTables search to allow filtering by checkbox selection
 */
export const initializeStatusFilters = () => {
  DataTable.ext.search.push(function (settings, data) {
    const status = new DOMParser()
      .parseFromString(data[9], 'text/html')
      .querySelector('select').value; // invoice status;
    let selectedStatuses = [];
    statusFilters.forEach((status) => {
      if (status.checked) selectedStatuses.push(status.value.toUpperCase());
    });
    if (selectedStatuses.length > 0)
      return selectedStatuses.includes(status) ? true : false;

    return true;
  });
};

const enableDisableVendorSelection = (row, data) => {
  data.invoice_status === 'NR'
    ? row.querySelector('.cost-vendor-select').removeAttribute('disabled')
    : row.querySelector('.cost-vendor-select').setAttribute('disabled', '');
};

const enableDisableInvoiceRequestBtn = (row, data) => {
  // enables/disables both parts of the invoice request button group
  data.invoice_status === 'NR' && data.vendor_id != 0
    ? row.querySelectorAll('.inv-req').forEach((el) => el.removeAttribute('disabled'))
    : row.querySelectorAll('.inv-req').forEach((el) => el.setAttribute('disabled', ''));
};

const handleRowChange = async (e) => {
  const selectEl = e.target;
  const table = selectEl.closest('table');
  const rowID = selectEl.closest('tr').getAttribute('id');
  fetch('/pipeline/update-invoice-table-row', {
    method: 'POST',
    body: JSON.stringify({ [selectEl.name]: selectEl.value, cost_id: rowID }),
    headers: { 'X-CSRFToken': CSRFTOKEN, 'Content-Type': 'application/json' },
  })
    .then((response) => response.json())
    .then((data) => updateTable(data, table))
    .catch((error) => console.error(error.message));
};

const listenForRowChange = (datatableEl) => {
  datatableEl.addEventListener('change', (e) => {
    if (e.target.matches('select.status, select.vendor')) handleRowChange(e);
  });
};

const setupPayPeriodFormSubmission = (datatableEl, payPeriodModal = PayPeriod) => {
  payPeriodModal.form.addEventListener('submit', (e) =>
    payPeriodModal.submitForm(e, datatableEl),
  );
};

const addRequestBtnListener = (row, data) => {
  const invoiceRequestBtn = row.querySelector('button.inv-req-btn');
  invoiceRequestBtn.addEventListener('click', (e) => {
    const table = e.target.closest('table');
    requestInvoice(data.id, table);
  });
};

const updateTable = (response, table) => {
  response.status === 'success'
    ? new DataTable(table).ajax.reload()
    : console.error(response.message);
};

const invoicesTableRowCallback = (row, data) => {
  enableDisableInvoiceRequestBtn(row, data);
  // name this function and extract
  // TODO: add an empty option to the select to handle sorting better
  if (data.vendor_id == 0) {
    row.querySelector('select.status').style.display = 'none';
    row.querySelectorAll('.inv-req').forEach((el) => el.setAttribute('disabled', ''));
  }
};

export {
  renderRequestBtn,
  renderAmount,
  renderAmountJPY,
  renderInvoiceStatus,
  renderVendorName,
  renderPayPeriod,
  enableDisableVendorSelection,
  enableDisableInvoiceRequestBtn,
  handleRowChange,
  listenForRowChange,
  setupPayPeriodFormSubmission,
  addRequestBtnListener,
  updateTable,
  invoicesTableRowCallback,
};
