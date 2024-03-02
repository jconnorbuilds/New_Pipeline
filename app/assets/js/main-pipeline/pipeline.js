'use strict';

import '../../../assets/scss/pipeline.scss';
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css';

import $ from 'jquery';
window.$ = $;

import { initCSVExporter } from '../csv-export.js';
import { depositDateFormSubmitHandler } from '../deposit_date.js';
import { plTable } from './pipeline-dt.js';
import {
  createFilters,
  revenueToggleHandler,
  dateSelectionHandler,
  toggleViewHandler,
  initializeDateSelectors,
} from './pipeline-ui-funcs';
import { initializeGlobalMouseEvents } from '../dt-shared.js';
import { jobFormSubmissionHandler } from './pipeline-funcs.js';
import { setupTableEventHandlers } from './pipeline-dt-ui-funcs.js';
import initializeNewClientForm from '../new-client-form-funcs.js';
import invoiceInfo from '../invoice_details_modal.js';

document
  .querySelector('#revenue-unit')
  .addEventListener('click', revenueToggleHandler);

document
  .querySelector('#pipeline-next')
  .parentNode.addEventListener('click', dateSelectionHandler);

document
  .querySelector('.toggle-view')
  .addEventListener('click', toggleViewHandler);

document
  .querySelector('#deposit-date-form')
  .addEventListener('submit', depositDateFormSubmitHandler);

document
  .querySelector('#job-form')
  .addEventListener('submit', jobFormSubmissionHandler);

document
  .querySelector('#pipeline-new-client-btn')
  .addEventListener('click', () => {
    invoiceInfo.preventFromOpening();
  });

let filters = document.querySelectorAll('.display-filter input');

filters.forEach((f) => f.addEventListener('change', () => table.draw()));

initializeGlobalMouseEvents();
initializeDateSelectors();

$(function () {
  plTable.getOrInitTable();
  setupTableEventHandlers();
  createFilters();
  initCSVExporter();
  initializeNewClientForm();

  // $('.update-cost-table').click(function () {
  //   const forms = document.getElementsByTagName('form');
  //   for (const i = 0; i < forms.length; i++) {
  //     forms[i].submit();
  //   }
  // });
});
