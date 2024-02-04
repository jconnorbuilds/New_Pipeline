import * as bootstrap from 'bootstrap';
import { setInitialInfo } from './invoice_info_modal.js';
import { setOpenModal } from './invoice_info_modal.js';
import { showSelectedStatus } from './main-pipeline/pipeline-dt-funcs.js';
import { plTable } from './main-pipeline/pipeline-dt.js';

let modalShowHandler;
let modalHideHandler;

const handleModalHide = (modalEl) => {
  modalEl.removeEventListener('show.bs.modal', modalShowHandler);
  modalEl.removeEventListener('hide.bs.modal', modalHideHandler);
  plTable.refresh();
};

const handleModalShow = (selectEl) =>
  showSelectedStatus(selectEl, selectEl.value);

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
  modalEl.addEventListener(
    'show.bs.modal',
    createModalShowHandler(plTable.getCurrentSelectEl())
  );
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

  eventHandlerFns.forEach((fn) => fn());

  return [modal, modalEl];
}
