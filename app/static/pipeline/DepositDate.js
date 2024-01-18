const form = document.querySelector('#deposit-date-form');
const modalEl = document.querySelector('#set-deposit-date');
const modal = new bootstrap.Modal(modalEl);

const getRowID = (e) => {
  return e.target.closest('tr').getAttribute('id');
};

const handleModalShow = () => (e) => {
  let rowID = getRowID(e);
  // make a 'setRowID' function in PLTF?
  PLTableFunctions.currentRowID = rowID;
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
    depositDateData['job_id'] = PLTableFunctions.currentRowID;
    let url = `/pipeline/set-deposit-date/${PLTableFunctions.currentRowID}/`;

    $('#deposit-date-form')[0].reset();

    $.ajax({
      headers: { 'X-CSRFToken': CSRFTOKEN },
      type: 'post',
      url: url,
      data: depositDateData,
      dataType: 'json',
      success: PLTableFunctions.handleSuccessResponse(Pipeline.table),
      error: PLTableFunctions.handleErrorResponse(Pipeline.table),
    });
  });
}

export { handleModalShow, addFormSubmitListener };
