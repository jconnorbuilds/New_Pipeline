import { setInitialInfo } from './invoice_info_modal.js';
import { setOpenModal } from './invoice_info_modal.js';
import { showSelectedStatus } from './PLTableFunctions.js';
import * as bootstrap from 'bootstrap';
import { getSelectedEl } from './pipeline-ui-funcs.js';
import { PipelineDT } from './pipeline-datatable.js';
import { InvoiceInfoModal } from './invoice_info_modal.js';

export const form = document.querySelector('#invoice-info-form');
let modalShowListener;
let modalHideListener;

const handleModalHide = (modalEl, callback) => {
  modalEl.removeEventListener('show.bs.modal', modalShowListener);
  modalEl.removeEventListener('hide.bs.modal', modalHideListener);
  callback();
};

const handleModalShow = (selectEl) => showSelectedStatus(selectEl, selectEl.value);

const createModalShowListener = (selectEl) => {
  modalShowListener = () => handleModalShow(selectEl);
  return modalShowListener;
};

const createModalHideListener = (modalEl, callback) => {
  modalHideListener = () => handleModalHide(modalEl, callback);
  return modalHideListener;
};

export const openModal = (modal) => {
  const modalEl = modal._element;
  console.log(getSelectedEl());
  // modalEl.addEventListener(
  //   'show.bs.modal',
  //   createModalShowListener(getSelectedEl())
  // );
  modalEl.addEventListener(
    'hide.bs.modal',
    createModalHideListener(modalEl, () => true)
  );

  setOpenModal(true);
  setInitialInfo();
  modal.show();
};

form.addEventListener('submit', (e) => {
  submitForm(PLTableFunctions.getLastChangedSelectEl())(e);
});

export function createModal(selector) {
  const modalEl = document.querySelector(selector);
  const modal = new bootstrap.Modal(modalEl);
  console.assert(
    modalEl,
    `No elements with selector "${selector}". Check for typos? `
  );
  return [modal, modalEl];
}
