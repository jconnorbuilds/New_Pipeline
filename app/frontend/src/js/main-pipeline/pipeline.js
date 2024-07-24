'use strict';

import $ from 'jquery';
window.$ = $;

import '../../styles/index.scss';
import { bootstrap } from '../base.js';

import { initCSVExporter } from '../csv-export.js';
import { depositDateFormSubmitHandler } from '../modals/deposit-date-modal.js';
import { plTable } from './pipeline-dt.js';
import {
  createFilters,
  revenueToggleHandler,
  dateSelectionButtonHandler,
  toggleView,
  initializeDateSelectors,
  dateSelectionDropdownHandler,
  pipelineYear,
  pipelineMonth,
  displayAllJobsView,
  displaySelectedView,
} from './pipeline-ui-funcs';
import { initializeGlobalMouseEvents } from '../tables/dt-shared.js';
import { jobFormSubmissionHandler } from './pipeline-funcs.js';
import { setupTableEventHandlers } from './pipeline-dt-ui-funcs.js';
import initializeNewClientForm from '../modals/new-client-form-funcs.js';
import invoiceInfo from '../modals/invoice-details-modal.js';
import { getState } from './PipelineState.js';

const dateDropdownsContainer = document.querySelector('.select-date-dropdowns');
const dateButtonsContainer = document.querySelector('.select-date-buttons');
const revenueUnitToggler = document.querySelector('#revenue-unit');
const viewToggler = document.querySelector('.toggle-view');
const depositDateForm = document.querySelector('#deposit-date-form');
const newJobForm = document.querySelector('#job-form');
const newClientButton = document.querySelector('#pipeline-new-client-btn');

const table = plTable.getOrInitTable();
const filters = document.querySelectorAll('.display-filter input');
revenueUnitToggler.addEventListener('click', revenueToggleHandler);
dateButtonsContainer.addEventListener('click', dateSelectionButtonHandler);
dateDropdownsContainer.addEventListener('change', dateSelectionDropdownHandler);
viewToggler.addEventListener('click', toggleView);
depositDateForm.addEventListener('submit', depositDateFormSubmitHandler);
newJobForm.addEventListener('submit', jobFormSubmissionHandler);
newClientButton.addEventListener('click', () => {
  invoiceInfo.preventFromOpening();
});

initializeGlobalMouseEvents();
initializeDateSelectors();
let state = getState();
[pipelineYear.value, pipelineMonth.value] = [state.viewYear, state.viewMonth];
displaySelectedView();

$(function () {
  filters.forEach((f) => f.addEventListener('change', () => table.draw()));
  setupTableEventHandlers();
  createFilters();
  initCSVExporter();
  initializeNewClientForm();
});
