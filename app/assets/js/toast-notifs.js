import { Toast } from 'bootstrap';
import { createElement, createNewEl } from './utils.js';
import successIcon from '../images/check2-circle.svg';

const createToastEl = (headerText, bodyText, id = '') => {
  const icon = [
    'img',
    {
      attributes: {
        src: successIcon,
        alt: 'success-icon',
      },
    },
  ];
  const title = ['strong', { classes: ['me-auto'], text: headerText }];
  const timestamp = ['small', { classes: 'text-muted', text: 'Just now' }];
  const closeBtn = [
    'button',
    {
      classes: 'btn-close',
      data: { bsDismiss: 'toast' },
      attributes: { type: 'button', 'aria-label': 'Close' },
    },
  ];
  const toastHeader = [
    'div',
    {
      classes: ['toast-header'],
      children: [icon, title, timestamp, closeBtn],
    },
  ];
  const toastBody = [
    'div',
    {
      classes: ['toast-body'],
      text: bodyText,
    },
  ];

  const toastEl = createElement('div', {
    id: id,
    classes: ['toast', 'bg-success-subtle', 'border-0'],
    attributes: {
      role: 'alert',
      'aria-live': 'assertive',
      'aria-atomic': 'true',
    },
    children: [toastHeader, toastBody],
  });

  return toastEl;
};

const createAndInitializeToast = (
  headerText,
  bodyText,
  options = {},
  id = ''
) => {
  const toastEl = createToastEl(headerText, bodyText, id);
  const toastContainer = document.querySelector('.toast-container');
  toastContainer
    ? toastContainer.appendChild(toastEl)
    : document.body.appendChild(toastEl);
  return new Toast(toastEl, options);
};

export default createAndInitializeToast;
