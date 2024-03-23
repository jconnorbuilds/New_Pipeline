'use strict';

import $ from 'jquery';
window.$ = $;
import '../../styles/index.scss';

import { initCSVExporter } from '../csv-export.js';
import { depositDateFormSubmitHandler } from '../modals/deposit-date-modal.js';
import { plTable } from './pipeline-dt.js';
import {
  createFilters,
  revenueToggleHandler,
  dateSelectionHandler,
  toggleViewHandler,
  initializeDateSelectors,
} from './pipeline-ui-funcs';
import { initializeGlobalMouseEvents } from '../tables/dt-shared.js';
import { jobFormSubmissionHandler } from './pipeline-funcs.js';
import { setupTableEventHandlers } from './pipeline-dt-ui-funcs.js';
import initializeNewClientForm from '../modals/new-client-form-funcs.js';
import invoiceInfo from '../modals/invoices-details-modal.js';

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

initializeGlobalMouseEvents();
initializeDateSelectors();

$(function () {
  const table = plTable.getOrInitTable();
  filters.forEach((f) => f.addEventListener('change', () => table.draw()));
  setupTableEventHandlers();
  createFilters();
  initCSVExporter();
  initializeNewClientForm();
});
