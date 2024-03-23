import invoiceTable from './invoices-dt.js';
import {
  handleRowUpdate,
  setupPayPeriodFormSubmission,
} from '../costs-and-invoices-common-funcs.js';

export const setupTableEventHandlers = (
  datatable = invoiceTable.getOrInitTable(),
  datatableEl = invoiceTable.getTableEl()
) => {
  handleRowUpdate(datatableEl);
  setupPayPeriodFormSubmission(datatableEl);

  const filters = document.querySelectorAll('.display-filter input');
  filters.forEach((f) => f.addEventListener('change', () => datatable.draw()));
};
