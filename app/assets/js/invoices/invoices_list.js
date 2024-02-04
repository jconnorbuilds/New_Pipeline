'use strict';

import '../../../assets/scss/styles.scss';
import '../../../assets/scss/pipeline.css';
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css';
import 'datatables.net-responsive-bs5/css/responsive.bootstrap5.min.css';
import 'datatables.net-responsive-bs5';
import $ from 'jquery';
window.$ = $;
import * as PayPeriod from '../pay_period.js';
import { getNewRowData } from './invoices.js';
import { initTable, invoiceTable } from './invoices-dt.js';
import { extendSearch, setupSortByStatus } from './invoices_common.js';

$(document).ready(function () {
  const allInvoicesTable = invoiceTable.getTable();
  $(allInvoicesTable).DataTable();
  extendSearch();
  setupSortByStatus();

  allInvoicesTable.on(
    'change',
    '.cost-vendor-select, .cost-status-select',
    function () {
      getNewRowData(this, allInvoicesTable);
    }
  );

  PayPeriod.form.addEventListener('submit', (e) =>
    PayPeriod.submitForm(e, allInvoicesTable)
  );

  const filters = document.querySelectorAll('.display-filter input');
  filters.forEach((f) =>
    f.addEventListener('change', () => {
      allInvoicesTable.draw();
    })
  );
});
