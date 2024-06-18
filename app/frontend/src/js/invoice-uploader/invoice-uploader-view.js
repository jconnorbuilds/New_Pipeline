import { CURRENCY_SYMBOLS } from '../utils.js';

export const dropzoneMessages = document.querySelector('.dz-messages');
export const dropzoneErrorMessages = document.querySelector('.dz-messages__error');
export const invoiceSelectArea = document.querySelector('#invoice-select-area');
export const requestedInvoicesArea = document.querySelector('.requested-invoices');
export const invoiceUploadButton = document.querySelector('#invoice-upload-btn');
export const dzOverlay = document.querySelector('.dropzone-overlay');
export const fileUploadButtons = document.querySelectorAll('.indicators__attach-inv');
export const invoiceIcon = `<i class="fa-solid fa-file-invoice"></i>`;
const deleteIcon = `<i class="fa-solid fa-delete-left"></i>`;
const validationSuccessIcon = `<i class="fa-solid fa-circle-check"></i>`;
const validationFailIcon = `<i class="fa-solid fa-circle-xmark"></i>`;
const menuIcon = '<i class="fa-solid fa-ellipsis"></i>';

function _fileMatchesCost(file, cost, jobMap) {
  return (
    file.cleanName.includes(cost.PONumber) ||
    file.cleanName.includes(jobMap[cost.jobId].jobCode)
  );
}

function _appendOption(cost, file, selectEl, jobMap) {
  const option = document.createElement('option');
  option.value = cost.pk;
  option.dataset.poNum = cost.PONumber;
  option.text = `${jobMap[cost.jobId].name} / ${cost.description} / ${
    CURRENCY_SYMBOLS[cost.currency]
  }${cost.amount.toLocaleString()}`;

  option.toggleAttribute('selected', _fileMatchesCost(file, cost, jobMap));
  selectEl.append(option);
}

function _createInvoiceSelector(file, formNum, costs, jobMap) {
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
    _appendOption(cost, file, selectEl, jobMap);
    _addInvoiceValidationClass(selectEl);
  });

  return selectEl;
}

function _addInvoiceValidationClass(selectEl) {
  selectEl.classList.toggle('is-valid', selectEl.value);
}

export function displayNewErrorMessage(message, oneOrMoreFiles = null) {
  console.log(oneOrMoreFiles?.length);
  console.log(message);
  let errorMessages = [];

  if (oneOrMoreFiles && Array.isArray(oneOrMoreFiles)) {
    oneOrMoreFiles.forEach((file) => {
      const errorMessage = createErrorMessage(message, file);
      errorMessages.push(errorMessage);
    });
  } else if (oneOrMoreFiles) {
    // handles a single file
    const errorMessage = createErrorMessage(message, oneOrMoreFiles);
    errorMessages.push(errorMessage);
  } else {
    const errorMessage = createErrorMessage(message);
    errorMessages.push(errorMessage);
  }

  dropzoneErrorMessages.append(...errorMessages);

  return errorMessages;
}

function createErrorMessage(message, file = null) {
  const errorMessage = document.createElement('div');
  errorMessage.classList.add('error-message');
  if (file) {
    errorMessage.dataset.fileName = file.cleanName;
    errorMessage.innerHTML = `
        <span class="bold">${file.cleanName}:</span> ${message}
        `;
  } else {
    errorMessage.innerHTML = `<span class="bold">Error:</span> ${message}`;
  }

  return errorMessage;
}

// If no file is specified, hanging error messages (ones with no associated file in the dropzone)
// will be deleted.
export function removeErrorMessages(dzFiles, file = null) {
  const errorMessages = [...document.querySelectorAll('.error-message')];
  if (file) {
    const messageToDelete = errorMessages
      .filter((msg) => msg.dataset.fileName === file.cleanName)
      ?.forEach((msg) => msg.remove());
    console.log(messageToDelete);
  } else {
    errorMessages.forEach((msg) => {
      if (!dzFiles.some((file) => file.cleanName === msg.dataset.fileName)) msg.remove();
    });
  }
}

export function createAddedFileDisplayBase(file, costs, formNum, jobMap) {
  const container = document.createElement('div');

  container.classList.add('inv-file');
  container.dataset.fileName = file.cleanName;
  container.innerHTML += `
    <div class="inv-file__body">
      <div class="inv-file__inv-icon">
        ${invoiceIcon}
      </div>
      <div class="inv-file__file-name">
        ${file.cleanName}
      </div>
      <div class="inv-file__status status--default">
        Unattached
      </div>
      <div class="inv-file__selector"></div>
      <div class="inv-file__job-name hidden"></div>
      <button type="button" class="inv-file__options" disabled>
        ${menuIcon}
      </button>
    </div>
     <div class="inv-file__del">${deleteIcon}</div>

  `;

  const selectorContainer = container.querySelector('.inv-file__selector');
  selectorContainer.appendChild(_createInvoiceSelector(file, formNum, costs, jobMap));

  return container;
}

export function updateFileDisplayMatched(fileDisplay, jobName, locked) {
  if (!jobName) throw Error('jobName is required when updating to a "matched" display');

  updateFileStatusIndicator(fileDisplay, 'matched');
  showHideInvoiceSelector(false, fileDisplay);
  showHideJobName(true, fileDisplay, jobName);
  fileDisplay
    .querySelector('button.inv-file__options')
    .toggleAttribute('disabled', locked);
}

function updateFileDisplayError(fileDisplay) {
  updateFileStatusIndicator(fileDisplay, 'error');
  showHideInvoiceSelector(false, fileDisplay);
  showHideJobName(false, fileDisplay);
  fileDisplay.querySelector('button.inv-file__options').toggleAttribute('disabled', true);
}

function updateFileDisplayDefault(fileDisplay) {
  updateFileStatusIndicator(fileDisplay, 'default');
  showHideInvoiceSelector(true, fileDisplay);
  showHideJobName(false, fileDisplay);
  fileDisplay.querySelector('button.inv-file__options').toggleAttribute('disabled', true);
}

function showHideJobName(show, fileDisplay, jobName = '') {
  const jobNameDisplay = fileDisplay.querySelector('.inv-file__job-name');
  jobNameDisplay.textContent = jobName;
  jobNameDisplay.classList.toggle('hidden', !show);
}

function showHideInvoiceSelector(show, fileDisplay) {
  const invoiceSelector = fileDisplay.querySelector('.inv-selector');
  invoiceSelector.value = 0;
  invoiceSelector.classList.toggle('hidden', !show);
}

function updateFileStatusIndicator(element, status) {
  const statusIndicator = element.querySelector('.inv-file__status');
  statusIndicator.classList.remove('status-default', 'status--matched', 'status--error');
  if (status === 'error') {
    statusIndicator.classList.add('status--error');
    statusIndicator.textContent = 'Error';
  } else if (status === 'matched') {
    statusIndicator.classList.add('status--matched');
    statusIndicator.textContent = 'OK';
  } else {
    statusIndicator.classList.add('status--default');
    statusIndicator.textContent = 'Unattached';
  }
}

export function updateFileDisplay(fileDisplayEl, status, jobName = '', locked = false) {
  try {
    if (status === 'matched') {
      updateFileDisplayMatched(fileDisplayEl, jobName, locked);
    } else if (status === 'error') {
      updateFileDisplayError(fileDisplayEl);
    } else {
      updateFileDisplayDefault(fileDisplayEl);
    }
  } catch (err) {
    console.error(err);
  }
}
