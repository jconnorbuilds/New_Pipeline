'use strict';

import '../../../assets/scss/styles.scss';
import '../../../assets/scss/pipeline.css';
import $ from 'jquery';
window.$ = $;
import * as bootstrap from 'bootstrap';
import { csrftoken as CSRFTOKEN, truncate } from '../utils.js';
import * as PayPeriod from '../pay_period.js';
import * as Invoices from './invoices.js';
import { getNewRowData } from './invoices.js';
import { initTable } from './invoices-dt.js';
import { extendSearch } from './invoices_common.js';

let table;
$(document).ready(function () {
  const allInvoicesTable = initTable();
  $(allInvoicesTable).DataTable();
  extendSearch();
  const statusFilters = document.querySelectorAll(
    '.display-filter .status-filter'
  );

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

  let filters = document.querySelectorAll('.display-filter input');

  filters.forEach((f) =>
    f.addEventListener('change', () => {
      allInvoicesTable.draw();
    })
  );
});
