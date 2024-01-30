import { updateTable, handleAjaxError } from './pipeline-dt-funcs.js';
import * as bootstrap from 'bootstrap';
import { plTable } from './pipeline-dt.js';
import { csrftoken as CSRFTOKEN } from './common.js';

export const form = /**@type {HTMLFormElement} */ (
  document.querySelector('#deposit-date-form')
);
const modalEl = document.querySelector('#set-deposit-date');
const modal = new bootstrap.Modal(modalEl);

/** @type {number} */
let rowID;

const modalShowHandler = () => {
  rowID = plTable.getCurrentRowID();
  const row = plTable.getTable().row(`#${rowID}`).node();
  const jobStatus = row.querySelector('.job-status-select').value;
  if (['INVOICED1', 'INVOICED2', 'FINISHED'].includes(jobStatus)) {
    modal.show();
  }
};

const submitHandler = (e) => {
  e.preventDefault();
  let depositDateData = {};
  depositDateData['deposit_date'] = document.querySelector('#id_deposit_date').value;
  depositDateData['job_id'] = rowID;
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'post',
    url: `/pipeline/set-deposit-date/${rowID}/`,
    data: depositDateData,
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
