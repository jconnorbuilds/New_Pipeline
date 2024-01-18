import * as PLTableFunctions from './PLTableFunctions.js';
import { csrftoken as CSRFTOKEN } from './common.js';

let date = new Date();
let currentMonth = date.getMonth() + 1;
let currentYear = date.getFullYear();
let viewingMonth = currentMonth;
let viewingYear = currentYear;

const newClientBtn = document.querySelector('#pipeline-new-client-btn');
newClientBtn.addEventListener('click', () => InvoiceInfo.setOpenModal(false));

const ajaxCall = (formData, url, successCallback, handleError, modal, table) => {
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'POST',
    url: url,
    data: formData,
    dataType: 'json',
    success: (response) => {
      response.status === 'success'
        ? successCallback(modal, table, (newRowData = response.data))
        : console.error('Something happend - maybe the form received bad data.');
    },
    error: () => {
      typeof handleError === 'function'
        ? handleError()
        : console.error('Error occurred during the AJAX request');
    },
  });
};

const displayErrorMessage = (message) => {
  console.error(message);
};

export {
  newClientBtn,
  ajaxCall,
  currentMonth,
  currentYear,
  viewingMonth,
  viewingYear,
  displayErrorMessage,
};

export const NewClientForm = (() => {
  const el = document.querySelector('#new-client-modal');

  return {
    el,
  };
})();

export const InvoiceInfo = (() => {
  let modalWillOpen = false;
  const modalEl = document.querySelector('#set-job-invoice-info');
  const modal = new bootstrap.Modal(modalEl);
  const form = modalEl.querySelector('#invoice-info-form');
  let modalShowListener;
  let modalHideListener;

  const setOpenModal = (bool) => {
    modalWillOpen = bool;
  };
  const getOpenModal = () => {
    console.log(modalWillOpen);
    return modalWillOpen;
  };

  function getFormData(selectEl) {
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

    Object.entries(PLTableFunctions.getUpdate(selectEl)).forEach(
      ([name, value]) => (formData['inv-' + name] = value)
    );
    return { jobIDField, formData };
  }

  const submitForm = (selectEl) => (e) => {
    e.preventDefault();

    let { jobIDField, formData } = getFormData(selectEl);
    const table = $(selectEl.closest('table')).DataTable();

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

  const handleModalHide = () => {
    Pipeline.table.ajax.reload();
    modalEl.removeEventListener('show.bs.modal', modalShowListener);
    modalEl.removeEventListener('hide.bs.modal', modalHideListener);
  };

  const handleModalShow = (selectEl, selectedStatus) => {
    PLTableFunctions.showSelectedStatus(selectEl, selectedStatus);
  };

  const createModalShowListener = (selectEl, selectedStatus) => {
    modalShowListener = wrappingFunction = () => {
      handleModalShow(selectEl, selectedStatus);
    };
    return modalShowListener;
  };

  const createModalHideListener = () => {
    modalHideListener = () => handleModalHide();
    return modalHideListener;
  };

  const isRequired = (selectedStatus) => {
    const requiredStatuses = ['INVOICED1', 'INVOICED2', 'FINISHED', 'ARCHIVED'];
    return requiredStatuses.includes(selectedStatus);
  };

  const isCompleted = (table, rowID) => {
    let result = JSON.parse(
      table.cell('#' + rowID, 'invoice_info_completed:name').node().textContent
    );
    console.log(result);
    return result;
  };

  const needsToDoInvoiceForm = (selectedStatus, table, rowID) => {
    return isRequired(selectedStatus) && !isCompleted(table, rowID);
  };

  const setInitialInfo = (table, rowID) => {
    const invoiceRecipientField = form.querySelector('#id_inv-invoice_recipient');
    const hiddenJobIDField = form.querySelector('#id_inv-job_id');

    invoiceRecipientField.value = PLTableFunctions.getClientID(table, rowID);
    hiddenJobIDField.value = rowID;
  };

  const openModal = (selectEl, initStatus, table, rowID) => {
    modalEl.addEventListener(
      'show.bs.modal',
      createModalShowListener(selectEl, selectEl.value)
    );

    modalEl.addEventListener('hide.bs.modal', createModalHideListener());

    setOpenModal(true);
    setInitialInfo(table, rowID);
    modal.show();
  };

  form.addEventListener('submit', (e) => {
    submitForm(PLTableFunctions.getLastChangedSelectEl())(e);
  });

  return {
    setOpenModal,
    getOpenModal,
    modalEl,
    modal,
    needsToDoInvoiceForm,
    form,
    setInitialInfo,
    handleModalHide,
    handleModalShow,
    createModalShowListener,
    createModalHideListener,
    submitForm,
    openModal,
  };
})();
