import Modal from 'bootstrap/js/dist/modal';

const createModal = (selector, eventHandlerFns = []) => {
  const modalEl = document.querySelector(selector);
  const modal = new Modal(modalEl);

  eventHandlerFns.forEach((fn) => fn());

  return [modal, modalEl];
};

export default createModal;
