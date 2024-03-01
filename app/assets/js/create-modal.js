import { Modal } from 'bootstrap';

const createModal = (selector, eventHandlerFns = []) => {
  const modalEl = document.querySelector(selector);
  const modal = new Modal(modalEl);

  eventHandlerFns.forEach((fn) => fn());

  return [modal, modalEl];
};

export default createModal;
