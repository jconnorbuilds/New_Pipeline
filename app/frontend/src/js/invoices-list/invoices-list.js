'use strict';

// import '../../styles/index.scss';
import invoiceTable from './invoices-dt.js';
import {
  initializeStatusFilters,
  listenForRowChange,
  setupPayPeriodFormSubmission,
} from '../costs-and-invoices-common-funcs.js';

const table = invoiceTable.getOrInitTable();
const tableEl = invoiceTable.getTableEl();
const filters = document.querySelectorAll('.display-filter input');

filters.forEach((f) => f.addEventListener('change', () => table.draw()));
listenForRowChange(tableEl);
setupPayPeriodFormSubmission(tableEl);

initializeStatusFilters();
