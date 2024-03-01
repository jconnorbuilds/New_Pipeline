import { handleAjaxError } from './main-pipeline/pipeline-dt-funcs.js';
import createModal from './create-modal.js';
import { plTable } from './main-pipeline/pipeline-dt.js';
import { CSRFTOKEN } from './utils.js';

const form = document.querySelector('#invoice-info-form');

const getFormData = (newStatus) => {
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
};

const submitForm = (newStatus) => (e) => {
  e.preventDefault();

  let { jobIDField, formData } = getFormData(newStatus);
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'POST',
    url: `/pipeline/set-client-invoice-info/${jobIDField.value}/`,
    data: formData,
    dataType: 'json',
    success: () => {
      invoiceInfo.modal.hide();
      plTable.refresh();
      form.reset();
    },
    error: (response) => handleAjaxError(response),
  });
};

const setInitialInfo = () => {
  const invoiceRecipientField = form.querySelector('#id_inv-invoice_recipient');
  const hiddenJobIDField = form.querySelector('#id_inv-job_id');

  invoiceRecipientField.value = plTable.getClientID();
  hiddenJobIDField.value = plTable.getCurrentRowID();
};

const formSubmitHandler = () => {
  form.addEventListener('submit', (e) => {
    submitForm(plTable.getStatus())(e);
    invoiceInfo.preventFromOpening();
  });
};

const invoiceInfo = (() => {
  const [modal, el] = createModal('#set-job-invoice-info', [formSubmitHandler]);
  const invoiceInfoNewClientBtn = document.querySelector(
    '#set-invoice-modal-new-client-btn'
  );

  let modalWillOpen = false;

  const preventFromOpening = () => {
    modalWillOpen = false;
  };
  const letModalOpen = () => {
    modalWillOpen = true;
  };
  const getOpenModal = () => {
    return modalWillOpen;
  };

  const formRequiresCompletion = (selectedStatus) => {
    const _requiredStatuses = [
      'INVOICED1',
      'INVOICED2',
      'FINISHED',
      'ARCHIVED',
    ];

    const _formIsRequired = (selectedStatus) =>
      _requiredStatuses.includes(selectedStatus);

    const _jobIsCompleted = (
      datatable = plTable.getOrInitTable(),
      rowID = plTable.getCurrentRowID()
    ) =>
      JSON.parse(
        datatable.cell('#' + rowID, 'invoice_info_completed:name').node()
          .textContent
      );

    return !_jobIsCompleted() && _formIsRequired(selectedStatus);
  };

  el.addEventListener('show.bs.modal', () => {
    letModalOpen();
    setInitialInfo();
  });

  el.addEventListener('hide.bs.modal', () => {
    plTable.refresh();
    form.reset();
  });

  invoiceInfoNewClientBtn.addEventListener('click', () => letModalOpen());

  return {
    modal,
    preventFromOpening,
    letModalOpen,
    getOpenModal,
    formRequiresCompletion,
  };
})();

export default invoiceInfo;
