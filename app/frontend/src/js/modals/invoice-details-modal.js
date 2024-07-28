import $ from 'jquery';
import { handleAjaxError } from '../main-pipeline/pipeline-dt-funcs.js';
import createModal from './create-modal.js';
import { plTable } from '../main-pipeline/pipeline-dt.js';
import createAndInitializeToast from '../toast-notifs.js';

const form = document.querySelector('#invoice-info-form');
const invoiceInfoNewClientBtn = document.querySelector(
  '#set-invoice-modal-new-client-btn',
);

const submitForm = async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const jobID = formData.get('inv-job_id');

  fetch(`/pipeline/set-client-invoice-info/${jobID}/`, {
    method: 'post',
    body: formData,
  })
    .then((response) => response.json())
    .then((response) => handleSuccessfulFormSubmission(response))
    .catch((error) => handleAjaxError(error));
};

const setInitialFormInfo = () => {
  const invoiceRecipientField = form.querySelector('#id_inv-invoice_recipient');
  const hiddenJobIDField = form.querySelector('#id_inv-job_id');
  const status = form.querySelector('#id_inv-status');

  invoiceRecipientField.value = plTable.getClientID();
  hiddenJobIDField.value = plTable.getCurrentRowID();
  status.value = plTable.getStatus();
};

const handleSuccessfulFormSubmission = (response) => {
  const jobName = response.data.job_name;
  const invoiceName = response.data.invoice_name;
  invoiceInfo.modal.hide();
  createAndInitializeToast({
    headerText: 'Invoice details saved',
    bodyText: `${jobName} ${invoiceName} `,
  }).show();
  plTable.refresh();
  form.reset();
};

const invoiceInfo = (() => {
  const [modal, el] = createModal({
    selector: '#set-job-invoice-info',
  });

  let modalWillOpen = false;
  const setOpenModal = (willOpen) => (modalWillOpen = willOpen);
  const getOpenModal = () => modalWillOpen;
  const initializeModal = () => {
    setOpenModal(true);
    setInitialFormInfo();
  };

  const formRequiresCompletion = (selectedStatus) => {
    const datatable = plTable.getOrInitTable();
    const rowID = plTable.getCurrentRowID();
    const requiredStatuses = ['INVOICED1', 'INVOICED2', 'FINISHED', 'ARCHIVED'];

    const formIsRequired = requiredStatuses.includes(selectedStatus);
    const jobIsCompleted = JSON.parse(
      datatable.cell(`#${rowID}`, 'invoice_info_completed:name').node().textContent,
    );
    return !jobIsCompleted && formIsRequired;
  };

  el.addEventListener('show.bs.modal', () => initializeModal());
  el.addEventListener('hide.bs.modal', () => plTable.refresh());
  el.addEventListener('hidden.bs.modal', () => form.reset());

  invoiceInfoNewClientBtn.addEventListener('click', () => setOpenModal(true));
  form.addEventListener('submit', (e) => {
    submitForm(e);
    setOpenModal(false);
  });

  return {
    modal,
    setOpenModal,
    getOpenModal,
    formRequiresCompletion,
  };
})();

export default invoiceInfo;
