import { invoiceTable } from './invoices-dt.js';
import { enableDisableInvoiceRequestBtn } from './invoices_common.js';
import * as PayPeriod from '../pay_period.js';
import { csrftoken as CSRFTOKEN } from '../utils.js';
import $ from 'jquery';

const updateTable = (response) => {
  response.status === 'success'
    ? invoiceTable.refresh()
    : console.error(response.message);
};

export const handleStatusChange = (e) => {
  const selectEl = e.target;
  const status = selectEl.value;
  const rowID = selectEl.closest('tr').getAttribute('id');
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'post',
    url: '/pipeline/update-invoice-table-row',
    data: { status: status, cost_id: rowID },
    dataType: 'json',
    success: (response) => updateTable(response),
    error: (response) => console.warn(response),
  });
};

export const handleVendorChange = (status, rowID) => {
  console.log('changing vendors...eventually');
};

export const invoicesTableRowCallback = (row, data) => {
  enableDisableInvoiceRequestBtn(row, data);

  if (data.vendor_id == 0) {
    row.querySelector('select.status').style.display = 'none';
    row
      .querySelectorAll('.inv-req')
      .forEach((el) => el.setAttribute('disabled', ''));
  }

  PayPeriod.defineMenu(row).addEventListener('click', () => {
    PayPeriod.launchModal(data);
  });
};
