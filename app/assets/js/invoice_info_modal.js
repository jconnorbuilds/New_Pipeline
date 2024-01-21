import * as PLTableFunctions from './PLTableFunctions.js';
import { createModal, form } from './modals-ui.js';
import { openModal } from './modals-ui.js';
import { PipelineDT } from './pipeline-datatable.js';

export let modalWillOpen = false;

const modal = (selector) => {
  const [modal, el] = createModal(selector);
  const open = () => {
    openModal(modal);
  };

  const isRequired = (selectedStatus) =>
    ['INVOICED1', 'INVOICED2', 'FINISHED', 'ARCHIVED'].includes(selectedStatus);

  const isCompleted = (datatable, rowID) => {
    let result = JSON.parse(
      datatable.cell('#' + rowID, 'invoice_info_completed:name').node().textContent
    );
    return result;
  };

  const formRequiresCompletion = (selectedStatus) => {
    return (
      isRequired(selectedStatus) &&
      !isCompleted(PipelineDT.getTable(), PipelineDT.getCurrentRowID())
    );
  };

  return { el, modal, open, formRequiresCompletion };
};

export const InvoiceInfoModal = modal('#set-job-invoice-info');
/**
 * @param {HTMLElement} selectEl
 */
function getFormData(selectEl) {
  const recipientField = /** @type {!HTMLInputElement} */ (
    document.querySelector('#id_inv-invoice_recipient')
  );
  const nameField = /** @type {!HTMLInputElement} */ (
    document.querySelector('#id_inv-invoice_name')
  );
  const jobIDField = /** @type {!HTMLInputElement} */ (
    document.querySelector('#id_inv-job_id')
  );
  const yearField = /** @type {!HTMLInputElement} */ (
    document.querySelector('#id_inv-invoice_year')
  );
  const monthField = /** @type {!HTMLInputElement} */ (
    document.querySelector('#id_inv-invoice_month')
  );

  let formData = {};
  formData['inv-invoice_recipient'] = recipientField.value;
  formData['inv-invoice_name'] = nameField.value;
  formData['inv-job_id'] = jobIDField.value;
  formData['inv-invoice_year'] = yearField.value;
  formData['inv-invoice_month'] = monthField.value;

  Object.entries(PLTableFunctions.getUpdate(selectEl)).forEach(
    ([name, value]) => (formData['inv-' + name] = value)
  );
  return { jobIDField, formData };
}

export const submitForm = (selectEl) => (e) => {
  e.preventDefault();

  let { jobIDField, formData } = getFormData(selectEl);
  // const table = new DataTable($(selectEl.closest('table')));
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'POST',
    url: `/pipeline/set-client-invoice-info/${jobIDField.value}/`,
    data: formData,
    dataType: 'json',
    success: (response) => {
      modal.hide();
      Pipeline.table.ajax.reload();
      form.reset();
    },
    error: PLTableFunctions.handleErrorResponse(table),
  });
};

export const setOpenModal = (bool) => {
  modalWillOpen = bool;
};

export const getOpenModal = () => {
  return modalWillOpen;
};
export const setInitialInfo = () => {
  const invoiceRecipientField = form.querySelector('#id_inv-invoice_recipient');
  const hiddenJobIDField = form.querySelector('#id_inv-job_id');

  invoiceRecipientField.value = PipelineDT.getClientID();
  hiddenJobIDField.value = PipelineDT.getCurrentRowID();
};
