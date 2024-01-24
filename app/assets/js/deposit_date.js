import { updateTable, handleAjaxError } from './pipeline-dt-funcs.js';
import * as bootstrap from 'bootstrap';
import { setInitialInfo } from './invoice_info_modal.js';
import { PipelineDT, getRowID } from './pipeline-dt.js';
import { csrftoken as CSRFTOKEN } from './common.js';

const form = document.querySelector('#deposit-date-form');
const modalEl = document.querySelector('#set-deposit-date');
const modal = new bootstrap.Modal(modalEl);

/** @type {number} */
let rowID;

const handleModalShow = () => (e) => {
  rowID = PipelineDT.getCurrentRowID(e);
  const row = PipelineDT.getTable().row(`#${rowID}`).node();
  console.log(row);
  const jobStatus = row.querySelector('.job-status-select').value;
  console.log(jobStatus);
  if (['INVOICED1', 'INVOICED2', 'FINISHED'].includes(jobStatus)) {
    modal.show();
  }
};

const addFormSubmitListener = () => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let depositDateData = {};
    depositDateData['deposit_date'] = $('#id_deposit_date').val();
    depositDateData['job_id'] = rowID;
    $.ajax({
      headers: { 'X-CSRFToken': CSRFTOKEN },
      type: 'post',
      url: `/pipeline/set-deposit-date/${rowID}/`,
      data: depositDateData,
      dataType: 'json',
      success: (response) => {
        console.log('success?');
        updateTable(PipelineDT.getTable())(response);
        form.reset();
        modal.hide();
      },
      error: (response) => handleAjaxError(PipelineDT.getTable())(response),
    });
  });
};

export { handleModalShow, addFormSubmitListener };
