import { enableDisableInvoiceRequestBtn } from './invoices_common.js';
import * as PayPeriod from '../pay_period.js';

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
