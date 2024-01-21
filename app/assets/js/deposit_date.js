import { handleSuccessResponse, handleErrorResponse } from './PLTableFunctions.js';
import * as bootstrap from 'bootstrap';
import { setInitialInfo } from './invoice_info_modal.js';
import { getRowID } from './pipeline-datatable.js';

const form = document.querySelector('#deposit-date-form');
const modalEl = document.querySelector('#set-deposit-date');
const modal = new bootstrap.Modal(modalEl);

/** @type {number} */
let currentRowID;

const handleModalShow = () => (e) => {
  let rowID = getRowID(e);
  currentRowID = rowID;
  let row = Pipeline.table.row(`#${rowID}`).node();
  jobStatus = row.querySelector('.job-status-select').value;
  if (['INVOICED1', 'INVOICED2', 'FINISHED'].includes(jobStatus)) {
    modal.show();
  }
};

function addFormSubmitListener() {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let depositDateData = {};
    depositDateData['deposit_date'] = $('#id_deposit_date').val();
    depositDateData['job_id'] = currentRowID;
    let url = `/pipeline/set-deposit-date/${currentRowID}/`;

    $('#deposit-date-form')[0].reset();

    $.ajax({
      headers: { 'X-CSRFToken': CSRFTOKEN },
      type: 'post',
      url: url,
      data: depositDateData,
      dataType: 'json',
      success: handleSuccessResponse(),
      error: handleErrorResponse(),
    });
  });
}

export { handleModalShow, addFormSubmitListener };
