import $ from 'jquery';
window.$ = $;
import DataTable from 'datatables.net-bs5';
import { CSRFTOKEN } from '../utils.js';
import * as PayPeriod from '../pay-period-modal.js';

const renderRequestBtn = (data) => {
  /*  create a Bootstrap input group with a "request invoice" btn
      and a dropdown to optionally set the payment period to something other than default.

      return: the outerHTML to render in the table.
  */
  const btnGroup = document.createElement('div');
  const requestBtn = document.createElement('button');
  const innerBtnGroup = document.createElement('div');
  const dropdownBtn = document.createElement('button');
  const dropdownMenu = document.createElement('ul');
  const dropdownItemContainer = document.createElement('li');
  const dropdownItem = document.createElement('span');
  btnGroup.classList.add('btn-group', 'btn-group-sm');
  btnGroup.setAttribute('role', 'group');
  btnGroup.setAttribute(
    'aria-label',
    'Invoice request button with nested dropdown'
  );
  requestBtn.classList.add('btn', 'btn-primary', 'inv-req', 'inv-req-btn');
  requestBtn.setAttribute('type', 'button');
  requestBtn.setAttribute('id', `invoice-request-btn-${data}`);
  requestBtn.textContent = 'Req. invoice';

  innerBtnGroup.classList.add('btn-group');
  innerBtnGroup.setAttribute('role', 'group');

  dropdownBtn.setAttribute('type', 'button');
  dropdownBtn.classList.add(
    'btn',
    'btn-primary',
    'dropdown-toggle',
    'inv-req',
    'inv-req-menu'
  );
  dropdownBtn.dataset.bsToggle = 'dropdown';
  dropdownBtn.setAttribute('aria-expanded', 'false');
  dropdownMenu.classList.add('dropdown-menu');
  dropdownItem.classList.add('dropdown-item');
  dropdownItem.textContent = 'Specify pay period';

  dropdownItemContainer.appendChild(dropdownItem);
  dropdownMenu.appendChild(dropdownItemContainer);
  dropdownBtn.appendChild(innerBtnGroup);
  btnGroup.appendChild(requestBtn);
  btnGroup.appendChild(dropdownBtn);
  btnGroup.appendChild(dropdownMenu);

  return btnGroup.outerHTML;
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
  selectEl.setAttribute('name', 'vendor-select');
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
    let year = data.split('-')[0];
    let month = data.split('-')[1];
    return `${year}年${month}月末`;
  } else {
    return '-';
  }
};

const statusFilters = document.querySelectorAll(
  '.display-filter .status-filter'
);

export const extendSearch = () => {
  DataTable.ext.search.push(function (settings, data, dataIndex) {
    const status = data[9]; // invoice status;
    let selectedStatuses = [];
    statusFilters.forEach((status) => {
      if (status.checked) selectedStatuses.push(status.value.toUpperCase());
    });
    if (selectedStatuses.length > 0)
      return selectedStatuses.includes(status) ? true : false;

    return true;
  });
};

export const setupSortByStatus = () => {
  // Defines the order of the invoice status column
  const invoiceStatusOrderMap = {
    NR: 1,
    REQ: 2,
    REC: 3,
    REC2: 4,
    ERR: 5,
    QUE: 6,
    PAID: 7,
    NA: 8,
  };

  // Sort by status, based on the order above
  DataTable.ext.order['dom-cost-select'] = function (settings, col) {
    return this.api()
      .column(col, { order: 'index' })
      .nodes()
      .map(function (td, i) {
        let el = td.querySelector('select.status');
        return el.getAttribute('style') === 'display: none;'
          ? 0
          : el
          ? invoiceStatusOrderMap[el.value]
          : 0;
      });
  };
};

const enableDisableVendorSelection = (row, data) => {
  data.invoice_status === 'NR'
    ? row.querySelector('.cost-vendor-select').removeAttribute('disabled')
    : row.querySelector('.cost-vendor-select').setAttribute('disabled', '');
};

const enableDisableInvoiceRequestBtn = (row, data) => {
  // enables/disables both parts of the invoice request button group
  data.invoice_status === 'NR' && data.vendor_id != 0
    ? row
        .querySelectorAll('.inv-req')
        .forEach((el) => el.removeAttribute('disabled'))
    : row
        .querySelectorAll('.inv-req')
        .forEach((el) => el.setAttribute('disabled', ''));
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
};

export const handleStatusChange = (e) => {
  const selectEl = e.target;
  const table = selectEl.closest('table');
  const _status = selectEl.value;
  const _rowID = selectEl.closest('tr').getAttribute('id');
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    method: 'POST',
    url: '/pipeline/update-invoice-table-row',
    data: { status: _status, cost_id: _rowID },
    dataType: 'json',
    success: (response) => updateTable(response, table),
    error: (response) => console.warn(response),
  });
};

export const handleVendorChange = (e) => {
  const selectEl = e.target;
  const table = selectEl.closest('table');
  const _vendor = selectEl.value;
  const _rowID = selectEl.closest('tr').getAttribute('id');
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    method: 'POST',
    url: '/pipeline/update-invoice-table-row',
    data: { vendor: _vendor, cost_id: _rowID },
    dataType: 'json',
    success: (response) => updateTable(response, table),
    error: (response) => console.warn(response),
  });
  console.log('changing vendors...eventually');
};

export const handleRowUpdate = (datatableEl) => {
  datatableEl.addEventListener('change', (e) => {
    if (e.target.matches('select.status')) handleStatusChange(e);
    if (e.target.matches('select.vendor')) handleVendorChange(e);
  });
};

export const setupPayPeriodFormSubmission = (
  datatableEl,
  payPeriodModal = PayPeriod
) => {
  payPeriodModal.form.addEventListener('submit', (e) =>
    payPeriodModal.submitForm(e, datatableEl)
  );
};

export const addRequestBtnListener = (row, data) => {
  const invoiceRequestBtn = row.querySelector('button.inv-req-btn');
  invoiceRequestBtn.addEventListener('click', (e) => {
    const table = e.target.closest('table');
    requestInvoice(data.id, table);
  });
};

export const updateTable = (response, table) => {
  console.log('updateTable response: ', response);
  response.status === 'success'
    ? new DataTable(table).ajax.reload()
    : console.error(response.message);
};

export const addRowEventListeners = (row, data) => {
  addRequestBtnListener(row, data);

  PayPeriod.defineMenu(row).addEventListener('click', () => {
    PayPeriod.launchModal(data);
  });
};

export const invoicesTableRowCallback = (row, data, cells) => {
  enableDisableInvoiceRequestBtn(row, data);
  //name this function and extract
  if (data.vendor_id == 0) {
    row.querySelector('select.status').style.display = 'none';
    row
      .querySelectorAll('.inv-req')
      .forEach((el) => el.setAttribute('disabled', ''));
  }
};

export const requestInvoice = (costID, table, costPayPeriod = 'next') => {
  // requests the vendor invoice
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    url: '/pipeline/request-single-invoice/' + costID + '/',
    method: 'POST',
    data: { pay_period: costPayPeriod },
    dataType: 'json',
    success: function (data) {
      console.log('invoice request callback: ', data); // make this a toast
      new DataTable(table)
        .row(`#${data.response.id}`)
        .data(data.response)
        .invalidate()
        .draw(false);
    },
    error: (data) => {
      console.warn(data);
      alert(
        'There was an error. Try again, and if the error persists, request the invoice the old fashioned way'
      );
    },
  });
};
