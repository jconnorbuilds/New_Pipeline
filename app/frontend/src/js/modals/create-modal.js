import { bootstrap } from '../base.js';

const createModal = ({ selector, eventHandlerFns = [] } = {}) => {
  const modalEl = document.querySelector(selector);
  const modal = new bootstrap.Modal(modalEl);

  eventHandlerFns.forEach((fn) => fn());

  return [modal, modalEl];
};

export default createModal;
