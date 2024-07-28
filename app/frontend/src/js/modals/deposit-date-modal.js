'use strict';
import { handleAjaxError, updateTable } from '../main-pipeline/pipeline-dt-funcs.js';
import { bootstrap } from '../base.js';
import { plTable } from '../main-pipeline/pipeline-dt.js';

export const form = document.querySelector('#deposit-date-form');
const modalEl = document.querySelector('#set-deposit-date');
const modal = new bootstrap.Modal(modalEl);
const jobIDField = document.querySelector('#id_job_id');

const modalShowHandler = () => {
  const row = plTable.getOrInitTable().row(`#${plTable.getCurrentRowID()}`).node();
  const jobStatus = row.querySelector('.job-status-select').value;
  jobIDField.value = plTable.getCurrentRowID();
  if (['INVOICED1', 'INVOICED2', 'FINISHED'].includes(jobStatus)) {
    modal.show();
  }
};

const submitHandler = (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  fetch(`/pipeline/set-deposit-date/${formData.get('job_id')}/`, {
    method: 'post',
    body: formData,
  })
    .then((response) => response.json())
    .then((response) => {
      if (response.status !== 'success') {
        throw new Error(`Errors: ${response.message}`);
      }
      updateTable(response.data);
      form.reset();
      modal.hide();
    })
    .catch((error) => handleAjaxError(error));
};

export {
  modalShowHandler as depositDateModalShowHandler,
  submitHandler as depositDateFormSubmitHandler,
};
