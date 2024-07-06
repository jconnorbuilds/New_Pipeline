import { CURRENCY_SYMBOLS, truncate } from '../utils.js';
import successIcon from '../../images/check2-circle.svg';

export const dropzoneMessages = document.querySelector('.dz-messages');
export const dropzoneErrorMessages = document.querySelector('.dz-error-messages');
export const invoiceSelectArea = document.querySelector('#invoice-select-area');
export const requestedInvoicesArea = document.querySelector('.requested-invoices');
export const invoiceUploadButton = document.querySelector('#invoice-upload-btn');
export const dzOverlay = document.querySelector('.dropzone-overlay');
export const fileUploadButtons = document.querySelectorAll('.indicators__attach-inv');
export const processedInvoicesContainer = document.querySelector(
  'section.processed-invoices',
);
export const invoiceIcon = `<i class="fa-solid fa-file-invoice"></i>`;
const deleteIcon = `<i class="fa-solid fa-delete-left"></i>`;

function _fileMatchesCost(file, cost) {
  return file.cleanName.includes(cost.PONumber) || file.cleanName.includes(cost.jobCode);
}

function _appendOption(cost, file, selectEl) {
  const option = document.createElement('option');
  option.value = cost.id;
  option.dataset.poNum = cost.PONumber;
  option.text = `${cost.jobName} / ${cost.description} / ${
    CURRENCY_SYMBOLS[cost.currency]
  }${cost.amount.toLocaleString()}`;

  option.toggleAttribute('selected', _fileMatchesCost(file, cost));
  selectEl.append(option);

  return option;
}

function _createInvoiceSelector(file, formNum, costs) {
  const selectEl = document.createElement('select');
  const emptyOption = document.createElement('option');

  selectEl.classList.add('inv-selector');
  selectEl.setAttribute('id', `invoice-select-${formNum}`);

  emptyOption.value = 0;
  emptyOption.text = 'Select job';
  emptyOption.setAttribute('disabled', '');

  selectEl.appendChild(emptyOption);
  selectEl.value = 0;
  costs.forEach((cost) => {
    {
      const option = _appendOption(cost, file, selectEl);
      _addInvoiceValidationClass(selectEl);

      if (cost.isMatched) option.style.display = 'none';
    }
  });

  return selectEl;
}

function _addInvoiceValidationClass(selectEl) {
  selectEl.classList.toggle('is-valid', selectEl.value);
}

function closeToast(e) {
  e.target.closest('.toast').remove();
}

export function createToast(type, { title, message } = {}) {
  const toast = document.createElement('div');
  const toastHeader = document.createElement('div');
  const toastBody = document.createElement('div');

  const closeBtn = document.createElement('button');
  closeBtn.classList.add('toast-close');
  closeBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`;

  toast.classList.add('toast', `${type}-message`, 'fade--shown');
  toastHeader.classList.add('toast__header', 'bold');
  toastBody.classList.add('toast__body');

  toastHeader.textContent = title;
  toastHeader.append(closeBtn);
  toastBody.innerHTML = message;

  closeBtn.addEventListener('click', closeToast);
  toast.append(toastHeader, toastBody);

  return toast;
}

// If no file is specified, hanging error messages (ones with no associated file in the dropzone)
// will be deleted.
export function removeErrorMessages(dzFiles, file = null) {
  const errorMessages = [...document.querySelectorAll('.error-message')];
  if (file) {
    const messageToDelete = errorMessages
      .filter((msg) => msg.dataset.filename === file.cleanName)
      ?.forEach((msg) => msg.remove());
    // console.log(messageToDelete);
    messageToDelete?.remove();
  } else {
    errorMessages.forEach((msg) => {
      if (!dzFiles.some((file) => file.cleanName === msg.dataset.filename)) msg.remove();
    });
  }
}

export function createAddedFilePreviewElementBase(file, costs, formNum) {
  const container = document.createElement('div');

  container.classList.add('inv-file');
  container.dataset.filename = file.cleanName;
  container.innerHTML += `
    <div class="inv-file__body">
        <div class="inv-file__inv-icon">
          ${invoiceIcon}
        </div>
        <div class="inv-file__file-name">
          ${truncate(file.cleanName, 40)}
        </div>
        <div class="inv-file__status status--default">
          Unattached
        </div>
        <div class="inv-file__selector"></div>
        <div class="inv-file__job-name hidden"></div>
        <button type="button" class="inv-file__reselect" disabled>
          <i class="fa-solid fa-eject"></i>
        </button>
       <div class="inv-file__progress">
        <span class="progress" data-dz-uploadprogress></span>
      </div>
    </div>
     <button class="inv-file__del" dz-data-remove>${deleteIcon}</button>

  `;

  const selectorContainer = container.querySelector('.inv-file__selector');
  selectorContainer.appendChild(_createInvoiceSelector(file, formNum, costs));

  return container;
}

function showHideJobName(show, previewElement, jobName = '') {
  const jobNameDisplay = previewElement.querySelector('.inv-file__job-name');
  jobNameDisplay.textContent = truncate(jobName, 40);
  jobNameDisplay.classList.toggle('hidden', !show);
}

function showHideInvoiceSelector(show, previewElement) {
  const invoiceSelector = previewElement.querySelector('.inv-selector');
  if (show) invoiceSelector.value = 0;
  invoiceSelector.classList.toggle('hidden', !show);
}

function updateFileStatusIndicator(element, status) {
  const statusIndicator = element.querySelector('.inv-file__status');
  statusIndicator.classList.remove(
    'status--default',
    'status--matched',
    'status--error',
    'status--processed-success',
    'status--processed-fail',
  );
  statusIndicator.classList.add(`status--${status}`);

  if (status === 'error' || status === 'processed-error') {
    statusIndicator.textContent = 'Error';
  } else if (status === 'matched') {
    statusIndicator.textContent = 'OK';
  } else if (status === 'status-default') {
    statusIndicator.textContent = 'Unattached';
  } else if (status === 'processed-success') {
    statusIndicator.textContent = 'Received';
  }
}

export function disablePreviewElementButtons(element) {
  const jobReselectBtn = element.querySelector('button.inv-file__reselect');
  const deleteBtn = element.querySelector('button.inv-file__del');
  jobReselectBtn.setAttribute('disabled', '');
  deleteBtn.setAttribute('disabled', '');
}

export function updatePreviewElement(
  element,
  { status = 'default', jobName = '--placeholder--', canReselect = false } = {},
) {
  updateFileStatusIndicator(element, status);
  element
    .querySelector('button.inv-file__reselect')
    .toggleAttribute('disabled', canReselect);

  if (status === 'matched') {
    showHideInvoiceSelector(false, element);
    showHideJobName(true, element, jobName);
  } else if (status === 'error') {
    showHideInvoiceSelector(false, element);
    showHideJobName(false, element);
    element.querySelector('button.inv-file__reselect').toggleAttribute('disabled', true);
  } else if (status === 'processed-success') {
    const previewElementBody = element.querySelector('.inv-file__body');
    const validationSuccessIcon = document.createElement('div');
    validationSuccessIcon.innerHTML = `<i class="fa-regular fa-circle-check"></i>`;
    validationSuccessIcon.classList.add('validation', 'success');
    previewElementBody.append(validationSuccessIcon);
  } else if (status === 'processed-fail') {
    // do something else
  } else {
    showHideInvoiceSelector(true, element);
    showHideJobName(false, element);
    element.querySelector('button.inv-file__reselect').toggleAttribute('disabled', true);
  }
}
