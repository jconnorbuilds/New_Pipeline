import { updateTable, handleAjaxError } from './pipeline-dt-funcs.js';
import * as bootstrap from 'bootstrap';
import { setInitialInfo } from './invoice_info_modal.js';
import { plTable, getRowID } from './pipeline-dt.js';
import { csrftoken as CSRFTOKEN } from './common.js';

const form = document.querySelector('#deposit-date-form');
const modalEl = document.querySelector('#set-deposit-date');
const modal = new bootstrap.Modal(modalEl);

/** @type {number} */
let rowID;

const handleModalShow = () => (e) => {
  rowID = plTable.getCurrentRowID(e);
  const row = plTable.getTable().row(`#${rowID}`).node();
  const jobStatus = row.querySelector('.job-status-select').value;
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
        updateTable(plTable.getTable())(response);
        form.reset();
        modal.hide();
      },
      error: (response) => handleAjaxError(plTable.getTable())(response),
    });
  });
};

export { handleModalShow, addFormSubmitListener };
