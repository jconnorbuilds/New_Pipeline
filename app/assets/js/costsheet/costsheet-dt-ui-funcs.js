import costTable from './costsheet-dt.js';
import * as PayPeriod from '../pay-period-modal.js';
import {
  handleRowUpdate,
  setupPayPeriodFormSubmission,
} from '../costs-and-invoices/costs-and-invoices-common-funcs.js';
import $ from 'jquery';
window.$ = $;

const tableEl = costTable.getTableEl();

export const setupTableEventHandlers = (datatableEl = tableEl) => {
  console.log(tableEl);
  handleRowUpdate(datatableEl);
  setupPayPeriodFormSubmission(datatableEl);
};
