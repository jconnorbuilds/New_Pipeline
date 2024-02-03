import * as PayPeriod from '../pay_period.js';
import DataTable from 'datatables.net-bs5';

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

const renderAmount = (data, row) => row.currency + data.toLocaleString();

const renderAmountJPY = (data) => '¥' + data.toLocaleString();

const renderInvoiceStatus = (data, row) => {
  const STATUSES = row.invoice_status_choices;
  const selectEl = document.createElement('select');
  selectEl.classList.add('form-control-plaintext', 'cost-status-select', 'p-0');
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

  selectEl.classList.add('form-control-plaintext', 'cost-vendor-select');
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

export const extendSearch = () => {
  DataTable.ext.search.push(function (settings, data, dataIndex) {
    const status = data[9];
    let selectedStatuses = [];
    statusFilters.forEach((status) => {
      if (status.checked) selectedStatuses.push(status.value.toUpperCase());
    });
    if (selectedStatuses.length > 0)
      return selectedStatuses.includes(status) ? true : false;

    return true;
  });

  DataTable.ext.order['dom-cost-select'] = function (settings, col) {
    return this.api()
      .column(col, { order: 'index' })
      .nodes()
      .map(function (td, i) {
        let el = td.querySelector('.cost-status-select');
        return el.getAttribute('style') === 'display: none;'
          ? 0
          : el
          ? invoiceStatusOrderMap[el.value]
          : 0;
      });
  };
};

const rowCallback = (row, data) => {
  if (data.vendor_id == 0) {
    $(row).find('.cost-status-select').hide();
    $(row).find('.inv-req').prop('disabled', true);
  } else {
    if (data.invoice_status === 'NR') {
      $(row).find('.inv-req').prop('disabled', false);
      $(row).find('.cost-vendor-select').prop('disabled', false);
    } else {
      $(row).find('.inv-req').prop('disabled', true);
      $(row).find('.cost-vendor-select').prop('disabled', true);
    }
  }

  PayPeriod.setMenu(row).addEventListener('click', () => {
    PayPeriod.launchModal(data);
  });
};

export {
  renderRequestBtn,
  renderAmount,
  renderAmountJPY,
  renderInvoiceStatus,
  renderVendorName,
  renderPayPeriod,
  rowCallback,
};
