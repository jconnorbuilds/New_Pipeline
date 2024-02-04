import * as PayPeriod from '../pay_period.js';
import { invoiceTable } from '../invoices/invoices-dt.js';
import { handleStatusChange, handleVendorChange } from './invoices-dt-funcs.js';

const tableEl = invoiceTable.getTable().table().container();

export const setupTableEventHandlers = (datatableEl = tableEl) => {
  datatableEl.addEventListener('change', (e) => {
    if (e.target.matches('select.status')) handleStatusChange(e);
    if (e.target.matches('select.vendor')) handleVendorChange(e);
  });

  PayPeriod.form.addEventListener('submit', (e) =>
    PayPeriod.submitForm(e, datatableEl)
  );

  const filters = document.querySelectorAll('.display-filter input');
  filters.forEach((f) =>
    f.addEventListener('change', () => {
      datatableEl.draw();
    })
  );
};
