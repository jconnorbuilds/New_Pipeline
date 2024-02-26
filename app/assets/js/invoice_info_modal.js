import { handleAjaxError } from './main-pipeline/pipeline-dt-funcs.js';
import { createModal } from './modals-ui.js';
import { openModal } from './modals-ui.js';
import { plTable } from './main-pipeline/pipeline-dt.js';
import { CSRFTOKEN } from './utils.js';

let modalWillOpen = false;

const form = document.querySelector('#invoice-info-form');
const formSubmitHandler = () => {
  form.addEventListener('submit', (e) => {
    console.log('THE STATUS IS ', plTable.getStatus());
    submitForm(plTable.getStatus())(e);
  });
};

const modal = (selector) => {
  const [modal, el] = createModal(selector, [formSubmitHandler]);
  const open = () => {
    openModal(modal);
  };

  const hide = () => {
    plTable.refresh();
    modal.hide();
    form.reset();
  };

  const statusWhichRequireFormCompletion = [
    'INVOICED1',
    'INVOICED2',
    'FINISHED',
    'ARCHIVED',
  ];

  const isRequired = (selectedStatus) =>
    statusWhichRequireFormCompletion.includes(selectedStatus);

  const isCompleted = (datatable, rowID) =>
    JSON.parse(
      datatable.cell('#' + rowID, 'invoice_info_completed:name').node()
        .textContent
    );

  const formRequiresCompletion = (selectedStatus) =>
    isRequired(selectedStatus) &&
    !isCompleted(plTable.getOrInitTable(), plTable.getCurrentRowID());

  return { el, open, hide, formRequiresCompletion };
};

export const invoiceInfoModal = modal('#set-job-invoice-info');

function getFormData(newStatus) {
  const recipientField = document.querySelector('#id_inv-invoice_recipient');
  const nameField = document.querySelector('#id_inv-invoice_name');
  const jobIDField = document.querySelector('#id_inv-job_id');
  const yearField = document.querySelector('#id_inv-invoice_year');
  const monthField = document.querySelector('#id_inv-invoice_month');

  let formData = {};
  formData['inv-invoice_recipient'] = recipientField.value;
  formData['inv-invoice_name'] = nameField.value;
  formData['inv-job_id'] = jobIDField.value;
  formData['inv-invoice_year'] = yearField.value;
  formData['inv-invoice_month'] = monthField.value;
  formData['inv-status'] = newStatus;

  return { jobIDField, formData };
}

export const submitForm = (newStatus) => (e) => {
  e.preventDefault();

  let { jobIDField, formData } = getFormData(newStatus);
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'POST',
    url: `/pipeline/set-client-invoice-info/${jobIDField.value}/`,
    data: formData,
    dataType: 'json',
    success: () => {
      invoiceInfoModal.hide();
      plTable.refresh();
      form.reset();
    },
    error: (response) => handleAjaxError(response),
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

  invoiceRecipientField.value = plTable.getClientID();
  hiddenJobIDField.value = plTable.getCurrentRowID();
};
