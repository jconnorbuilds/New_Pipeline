import costTable from './costsheet-dt.js';
import * as PayPeriod from '../pay_period.js';
import {
  handleRowUpdate,
  setupPayPeriodFormSubmission,
} from '../invoices/invoices_common.js';
import $ from 'jquery';
window.$ = $;

const tableEl = costTable.getTableEl();

export const setupTableEventHandlers = (datatableEl = tableEl) => {
  console.log(tableEl);
  handleRowUpdate(datatableEl);
  setupPayPeriodFormSubmission(datatableEl);
};
