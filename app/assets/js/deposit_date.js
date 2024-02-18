import {
  updateTable,
  handleAjaxError,
} from './main-pipeline/pipeline-dt-funcs.js';
import * as bootstrap from 'bootstrap';
import { plTable } from './main-pipeline/pipeline-dt.js';
import { CSRFTOKEN } from './utils.js';

export const form = document.querySelector('#deposit-date-form');
const modalEl = document.querySelector('#set-deposit-date');
const modal = new bootstrap.Modal(modalEl);

const modalShowHandler = () => {
  const row = plTable
    .getOrInitTable()
    .row(`#${plTable.getCurrentRowID()}`)
    .node();
  const jobStatus = row.querySelector('.job-status-select').value;
  if (['INVOICED1', 'INVOICED2', 'FINISHED'].includes(jobStatus)) {
    modal.show();
  }
};

const submitHandler = (e) => {
  e.preventDefault();
  const rowID = plTable.getCurrentRowID();
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'post',
    url: `/pipeline/set-deposit-date/${rowID}/`,
    data: {
      deposit_date: document.querySelector('#id_deposit_date').value,
      job_id: rowID,
    },
    dataType: 'json',
    success: (response) => {
      updateTable(response);
      form.reset();
      modal.hide();
    },
    error: (response) => handleAjaxError(response),
  });
};

export {
  modalShowHandler as depositDateModalShowHandler,
  submitHandler as depositDateFormSubmitHandler,
};
