import { invoiceTable } from './invoices-dt.js';
import {
  handleRowUpdate,
  setupPayPeriodFormSubmission,
} from './costs-and-invoices-common-funcs.js';

const table = invoiceTable.getOrInitTable();
const tableEl = invoiceTable.getTableEl();

export const setupTableEventHandlers = (
  datatable = table,
  datatableEl = tableEl
) => {
  handleRowUpdate(datatableEl);
  setupPayPeriodFormSubmission(datatableEl);

  const filters = document.querySelectorAll('.display-filter input');
  filters.forEach((f) => f.addEventListener('change', () => datatable.draw()));
};
