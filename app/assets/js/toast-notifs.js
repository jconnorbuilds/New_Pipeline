import * as bootstrap from 'bootstrap';
import { createNewEl } from './utils.js';
export const createAndLaunchToast = () => {
  const toast = document.createElement('div');
  toast.classList.add(
    'toast',
    'position-fixed',
    'bg-success-subtle',
    'border-0',
    'top-0',
    'end-0'
  );
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');

  var jobDescriptor = 'Placeholder for jobDescriptor';
  const header = createNewEl('div', ['toast-header']);
  const icon = createNewEl('i', 'bi bi-check2-circle rounded me-2'.split(' '));
  const title = createNewEl('strong', ['me-auto'], {}, 'Job added');
  const timestamp = createNewEl('small', ['text-muted'], {}, 'Just now');
  const closeBtn = createNewEl('button', ['btn-close'], {
    type: 'button',
    'data-bs-dismiss': 'toast',
    'aria-label': 'Close',
  });
  [icon, title, timestamp, closeBtn].forEach((el) => header.appendChild(el));

  var body = document.createElement('div');
  body.classList.add('toast-body');
  body.innerText = jobDescriptor;

  toast.appendChild(header);
  toast.appendChild(body);

  document.body.appendChild(toast);

  var toastElement = new bootstrap.Toast(toast);
  toastElement.show();
  setTimeout(function () {
    $(toastElement).fadeOut('fast', function () {
      $(this).remove();
    });
  }, 1000);
};
