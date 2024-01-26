import * as bootstrap from 'bootstrap';
import { setInitialInfo } from './invoice_info_modal.js';
import { setOpenModal } from './invoice_info_modal.js';
import { showSelectedStatus } from './pipeline-dt-funcs.js';
import { getSelectedEl } from './pipeline.js';
import { plTable } from './pipeline-dt.js';
import { invoiceInfoModal } from './invoice_info_modal.js';

let modalShowHandler;
let modalHideHandler;

const handleModalHide = (modalEl) => {
  modalEl.removeEventListener('show.bs.modal', modalShowHandler);
  modalEl.removeEventListener('hide.bs.modal', modalHideHandler);
  plTable.refresh();
};

const handleModalShow = (selectEl) => showSelectedStatus(selectEl, selectEl.value);

const createModalShowHandler = (selectEl) => {
  modalShowHandler = () => handleModalShow(selectEl);
  return modalShowHandler;
};

const createModalHideHandler = (modalEl) => {
  modalHideHandler = () => handleModalHide(modalEl);
  return modalHideHandler;
};

export const openModal = (modal) => {
  const modalEl = modal._element;
  modalEl.addEventListener('show.bs.modal', createModalShowHandler(getSelectedEl()));
  modalEl.addEventListener(
    'hide.bs.modal',
    createModalHideHandler(modalEl, () => true)
  );

  setOpenModal(true);
  setInitialInfo();
  modal.show();
};

export function createModal(selector, eventHandlerFns) {
  const modalEl = document.querySelector(selector);
  const modal = new bootstrap.Modal(modalEl);

  console.assert(
    modalEl,
    `No elements with selector "${selector}". Check for typos? `
  );

  eventHandlerFns.forEach((fn) => fn());

  return [modal, modalEl];
}
