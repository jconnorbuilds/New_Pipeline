import $ from 'jquery';
window.$ = $;
import DataTable from 'datatables.net';
import { CSRFTOKEN, createElement } from './utils.js';
import * as PayPeriod from './modals/pay-period-modal.js';
import { requestInvoice } from './tables/dt-shared.js';

const renderRequestBtn = (data) => {
  /*  create a Bootstrap input group with a "request invoice" btn
      and a dropdown to optionally set the payment period to something other than default.

      return: the outerHTML to render in the table.
  */
  const requestBtn = [
    'button',
    {
      classes: ['btn', 'btn-primary', 'inv-req', 'inv-req-btn'],
      attributes: { type: 'button' },
      id: `invoice-request-btn-${data}`,
      text: 'Req. invoice',
    },
  ];

  const innerBtnGroup = [
    'div',
    {
      classes: 'btn-group',
      attributes: { role: 'group' },
    },
  ];
  const dropdownBtn = [
    'button',
    {
      classes: [
        'btn',
        'btn-primary',
        'dropdown-toggle',
        'inv-req',
        'inv-req-menu',
      ],
      attributes: { type: 'button', 'aria-expanded': false },
      data: { bsToggle: 'dropdown' },
      children: [innerBtnGroup],
    },
  ];
  const dropdownItem = [
    'span',
    { classes: 'dropdown-item', text: 'Specify pay period' },
  ];

  const dropdownItemContainer = ['li', { children: [dropdownItem] }];

  const dropdownMenu = [
    'ul',
    { classes: 'dropdown-menu', children: [dropdownItemContainer] },
  ];

  const btnGroup = createElement('div', {
    classes: ['btn-group', 'btn-group-sm'],
    attributes: {
      role: 'group',
      'aria-label': 'Invoice request button with nested dropdown',
    },
    children: [requestBtn, dropdownBtn, dropdownMenu],
  });

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
  DataTable.ext.search.push(function (settings, data) {
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

  DataTable.ext.type.order['status-pre'] = (data) => {
    const statusOrder = invoiceStatusOrderMap[data];
    return statusOrder ? statusOrder : -1;
  };
};

export const setupSortByDate = () => {
  DataTable.ext.type.order['job-date-pre'] = (data) => {
    console.log(data);
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
  const status = selectEl.value;
  const rowID = selectEl.closest('tr').getAttribute('id');
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    method: 'POST',
    url: '/pipeline/update-invoice-table-row',
    data: { status: status, cost_id: rowID },
    dataType: 'json',
    success: (response) => updateTable(response, table),
    error: (response) => console.warn(response),
  });
};

/**
 * Handler for when the vendor for a cost is changed (e.g. in a table)
 *
 * @todo update the error function with something useful
 * @param {*} e
 */
export const handleVendorChange = (e) => {
  const selectEl = e.target;
  const table = selectEl.closest('table');
  const vendor = selectEl.value;
  const rowID = selectEl.closest('tr').getAttribute('id');
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    method: 'POST',
    url: '/pipeline/update-invoice-table-row',
    data: { vendor: vendor, cost_id: rowID },
    dataType: 'json',
    success: (response) => updateTable(response, table),
    error: (response) => console.warn(response),
  });
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

export const invoicesTableRowCallback = (row, data) => {
  enableDisableInvoiceRequestBtn(row, data);
  //name this function and extract
  if (data.vendor_id == 0) {
    row.querySelector('select.status').style.display = 'none';
    row
      .querySelectorAll('.inv-req')
      .forEach((el) => el.setAttribute('disabled', ''));
  }
};
