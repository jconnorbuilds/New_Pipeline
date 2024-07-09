import Dropzone from 'dropzone';
import 'dropzone/dist/dropzone.css';
import '../../styles/invoice-uploader.css';
import { Cost } from './Cost.js';
import './invoice-uploader-view.js';

import {
  dropzoneMessages,
  invoiceSelectArea,
  requestedInvoicesContainer,
  invoiceUploadButton,
  dzOverlay,
  fileUploadButtons,
  updatePreviewElement,
  createAddedFilePreviewElementBase,
  removeErrorMessages,
  createToast,
  disablePreviewElementButtons,
  enableSubmitButtonIfSubmittable,
  toggleTooltip,
  submitButton,
} from './invoice-uploader-view.js';
import { displayErrorMessage, fadeOut } from './invoice-uploader-errors.js';
import { CSRFTOKEN } from '../utils.js';

const vendorUUID = window.location.href.split('/').pop();
const requestedInvoiceData = await getRequestedInvoiceData();
let allCosts = requestedInvoiceData.requested_invoices.map((cost) => new Cost(cost));
let costListeningForFile;

const CLICKABLE_ELEMENTS = document.querySelectorAll('.indicators__attach-inv')?.length
  ? '.indicators__attach-inv'
  : false;

export const myDropzone = new Dropzone(document.body, {
  url: '/pipeline/process-uploaded-vendor-invoice/',
  headers: { 'X-CSRFTOKEN': CSRFTOKEN },
  autoProcessQueue: false,
  uploadMultiple: true,
  parallelUploads: 10,
  maxFiles: 50,
  maxFilesize: 10, // 10MiB
  disablePreviews: true,
  clickable: CLICKABLE_ELEMENTS,
  acceptedFiles: '.pdf, .jpg, .jpeg',
  renameFile: sanitizeFileName,
  dictFileTooBig: 'filesizeError',
  dictInvalidFileType: 'fileTypeError',
  dictUploadCanceled: 'cancelled',
});

// Removes full-width space to avoid some dropzone upload issue
function sanitizeFileName(file) {
  // eslint-disable-next-line no-irregular-whitespace
  return file.name.replace(/　|/g, '');
}

function extractPONumber(string) {
  const PONum = string.match(/[A-Za-z]{2,4}[A-Za-z0-9]{2,4}\d{4}/);
  return PONum ? PONum[0] : null;
}

function allInvoicesHaveValidJobSelection() {
  const jobSelectMenus = document.querySelectorAll('select.inv-selector');
  return [...jobSelectMenus].every((select) => select.value !== '0');
}

export function formsAndFilesAreValid() {
  return (
    myDropzone.getRejectedFiles().length === 0 &&
    myDropzone.getQueuedFiles().length > 0 &&
    allInvoicesHaveValidJobSelection()
  );
}

function filesAreTheSame(fileToCheck, fileCurrentlyInDropzone = true) {
  return myDropzone.files.some((dzFile, idx) => {
    //  If the file is already in the dropzone (i.e. just added), it'll be last in the files list,
    //  and we want to ignore it or it will be flagged as a duplicate against itself.
    const isCurrentFile = fileCurrentlyInDropzone && idx === myDropzone.files.length - 1;
    if (isCurrentFile) return;
    return (
      dzFile.cleanName === fileToCheck.cleanName &&
      dzFile.size === fileToCheck.size &&
      dzFile.lastModified.toString() === fileToCheck.lastModified.toString()
    );
  });
}

function filesHaveSamePONumber(fileToCheck, fileCurrentlyInDropzone = true) {
  return myDropzone.files.some((dzFile, idx) => {
    //  If the file is already in the dropzone (i.e. just added), it'll be last in the files list,
    //  and we want to ignore it or it will be flagged as a duplicate against itself.
    const isCurrentFile = fileCurrentlyInDropzone && idx === myDropzone.files.length - 1;
    if (isCurrentFile) return;

    const dzFilePONumber = extractPONumber(dzFile.cleanName);
    const newFilePONumber = extractPONumber(fileToCheck.cleanName);
    return dzFilePONumber && newFilePONumber && dzFilePONumber === newFilePONumber;
  });
}

async function getRequestedInvoiceData() {
  const data = await fetch(`ajax/get_vendor_requested_invoices_data/${vendorUUID}`)
    .then((response) => response.json())
    .catch((err) =>
      console.error("Couldn't get the data from the server: ", err.message),
    );

  return data;
}

function getAutoMatchedCost(file) {
  return allCosts.find((cost) => file.PONumber === cost.PONumber);
}

function getCostByPONumber(PONumber) {
  return allCosts.find((cost) => PONumber === cost.PONumber);
}

function findAndRemoveFileFromDz(e) {
  const delBtn = e.target;
  const targetFileName = delBtn.closest('.inv-file').dataset.filename;
  const fileToDelete = myDropzone.files.find((file) => file.cleanName === targetFileName);
  if (!fileToDelete)
    throw Error(
      `No file to delete. Tried to delete ${targetFileName} but it wasn't found.`,
    );

  myDropzone.removeFile(fileToDelete);
  removeErrorMessages(myDropzone.files, fileToDelete);
  allCosts.forEach((cost) => {
    if (
      cost.invoiceFile === fileToDelete &&
      allCosts.filter((cost) => cost.invoiceFile === fileToDelete).length === 1 &&
      fileToDelete.status !== 'error'
    )
      cost.unmatchFile();
  });
}

function draggingFiles(e) {
  return (
    e.dataTransfer.items &&
    Array.from(e.dataTransfer.items).some((item) => item.kind === 'file')
  );
}

function fileMatchesAlreadyMatchedCost(file) {
  return allCosts.some((cost) => cost.PONumber === file.PONumber && cost.isMatched);
}

function filePONumDoesntMatchTargetedCost(file) {
  return (
    costListeningForFile &&
    file.PONumber &&
    file.PONumber !== costListeningForFile.PONumber
  );
}

function checkForErrorsOnFileAdd(file) {
  const response = {
    responseCode: 2000,
    autoDeleteErrorMsg: true,
    deleteFile: true,
    jobName: getCostByPONumber(file.PONumber)?.jobName || null,
    success: true,
  };

  if (filesAreTheSame(file, true)) {
    Object.assign(response, { responseCode: 1001, success: false });
  } else if (filesHaveSamePONumber(file, true)) {
    Object.assign(response, { responseCode: 1002, success: false });
  } else if (fileMatchesAlreadyMatchedCost(file)) {
    Object.assign(response, { responseCode: 1003, success: false });
  } else if (filePONumDoesntMatchTargetedCost(file)) {
    Object.assign(response, { responseCode: 1004, success: false });
  }

  return response;
}

function checkForErrorsOnJobSelect(file, cost) {
  const response = {
    responseCode: 2000,
    autoDeleteErrorMsg: true,
    deleteFile: false,
    jobName: cost.jobName || null,
  };

  if (cost.isMatched) {
    Object.assign(response, { responseCode: 1101 });
  }

  return response;
}

function unmatchFileAndResetPreviewElement(e) {
  const matchedCost = allCosts.find(
    (cost) =>
      cost.invoiceFile?.cleanName === e.target.closest('.inv-file').dataset.filename,
  );
  if (matchedCost) matchedCost.unmatchFile();

  updatePreviewElement(e.target.closest('.inv-file'), 'default');
}

let formNum = 0;
myDropzone.on('addedfile', (file) => {
  // Add file properties. previewElement lets dropzone know that this element is the file preview.
  file.cleanName = sanitizeFileName(file);
  file.PONumber = extractPONumber(file.cleanName);
  file.previewElement = createAddedFilePreviewElementBase(file, allCosts, ++formNum);

  const previewElementState = { status: 'default' };
  const jobSelector = file.previewElement.querySelector('select.inv-selector');
  const status = checkForErrorsOnFileAdd(file);
  const addedSuccessfully =
    file.status === 'error' ? false : status.responseCode === 2000;

  // Handle a bad file, else handle a successfully added one
  if (!addedSuccessfully) {
    if (status.deleteFile) myDropzone.removeFile(file);
    Object.assign(previewElementState, { status: 'error' });
    displayErrorMessage(file, status);
  } else {
    // If an "add invoice" button was clicked, match the invoice with that button's cost
    // Otherwise try matching it automatically (by PO number)
    const autoMatchedCost = getAutoMatchedCost(file, allCosts) || null;
    const matchingCost = costListeningForFile
      ? getCostByPONumber(costListeningForFile.PONumber)
      : autoMatchedCost;
    if (costListeningForFile) jobSelector.value = matchingCost.id;
    if (matchingCost) {
      matchingCost.matchFile(file);
      Object.assign(previewElementState, {
        status: 'matched',
        jobName: matchingCost.jobName,
        canReselect: !!autoMatchedCost,
      });
    }
  }

  // Update the UI with the appropriately styled file preview
  if (fileIsInDropzone(file)) {
    updatePreviewElement(file.previewElement, previewElementState);
    invoiceSelectArea.appendChild(file.previewElement);
  }

  // Seems like the file is considered rejected until the "accept" event occurs, so we wait.
  setTimeout(function () {
    enableSubmitButtonIfSubmittable();
  }, 50);
  costListeningForFile = null;
  displayOutOfSyncDebugMessageIfNecessary();
});

function fileIsInDropzone(file) {
  return myDropzone.files.some((f) => f.upload.uuid === file.upload.uuid);
}

function displayOutOfSyncDebugMessageIfNecessary() {
  if (myDropzone.files.length !== document.querySelectorAll('.inv-file').length)
    console.warn('Dropzone and display are out of sync!');
}

function toggleOptionVisibility(e, shouldBeVisible) {
  const displayStyle = shouldBeVisible ? 'block' : 'none';
  const matchedCostPONumber = e.detail.PONumber;
  const costSelectDropdowns = [...document.querySelectorAll('.inv-selector')];
  costSelectDropdowns.forEach((element) => {
    [...element.querySelectorAll('option')].forEach((option) => {
      if (option.dataset.poNum === matchedCostPONumber)
        option.style.display = displayStyle;
    });
  });
}

function invoiceFilenameInListOfFilenames(filenames, cost) {
  return filenames.some((filename) => filename === cost.invoiceFile?.cleanName);
}

/**
 * Removes costs from the global costs array by filename
 *
 * @param {string[]} filenames | A list of filenames to filter by
 * @returns {Cost[]} | The filtered global cost array
 */
function removeCostsByFilename(filenames) {
  return allCosts.filter((cost) => !invoiceFilenameInListOfFilenames(filenames, cost));
}

function toggleButtonDefaultText(shouldShow) {
  const buttonText = submitButton.querySelector('.btn-text');
  buttonText.classList.toggle('hidden', !shouldShow);
}

function toggleSpinner(shouldShow) {
  document.querySelector('.loading-spinner').classList.toggle('hidden', !shouldShow);
}

function updateSubmitButtonDisplay(showSpinner) {
  toggleSpinner(showSpinner);
  toggleButtonDefaultText(!showSpinner);
}

// Hides already-used options from the cost select list
document.addEventListener('fileMatchedWithCost', (e) => {
  toggleOptionVisibility(e, false);
});

// Shows unused options from the cost select list
document.addEventListener('fileUnmatchedFromCost', (e) => {
  toggleOptionVisibility(e, true);
});

fileUploadButtons.forEach((btn) => {
  btn.addEventListener('mouseenter', () => {
    document.querySelector('.dz-hidden-input').removeAttribute('multiple');
  });

  btn.addEventListener('focus', () => {});
});

myDropzone.on('sendingmultiple', function (files, xhr, formData) {
  const invoices = {};
  files.forEach((file) => {
    const costId = file.previewElement.querySelector('.inv-selector').value;
    invoices[file.cleanName] = { cost_id: costId, origFilename: file.name };
    disablePreviewElementButtons(file.previewElement);
  });
  formData.append('invoice_data', JSON.stringify(invoices));

  updateSubmitButtonDisplay(true);
});

function getUploadResponseToasts(response) {
  const successfulInvoices = response.invoices.successful;
  const failedInvoices = response.invoices.unsuccessful;
  const toasts = [];
  if (successfulInvoices.length) {
    const successMessage = document.createElement('div');
    successMessage.textContent = `The following invoices were uploaded successfully:`;
    successMessage.append(document.createElement('ol'));
    successfulInvoices.forEach((filename) => {
      successMessage.querySelector('ol').innerHTML += `<li>${filename}</li>`;
    });
    const toast = createToast('success', {
      title: 'Successful upload',
      message: successMessage.innerHTML,
    });
    toasts.push(toast);
  }

  if (failedInvoices.length) {
    const failureMessage = document.createElement('div');
    failureMessage.textContent = `Due to an internal error, the following invoices couldn't be uploaded. Please try again, or contact us for help if the issue persists.`;
    failureMessage.append(document.createElement('ol'));
    failedInvoices.forEach((invoice) => {
      failureMessage.querySelector('ol').innerHTML += `<li>${invoice.filename}</li>`;
    });
    const toast = createToast('error', {
      title: 'Upload error',
      message: failureMessage.innerHTML,
    });
    toasts.push(toast);
  }

  return toasts;
}

function trimWhitespace(element) {
  element.textContent = element.textContent.trim();
}

myDropzone.on('successmultiple', function (files, response, e) {
  /**
   * Currently handling all invoice uploads in one request.
   * To avoid one bad file causing an error across the entire request, all uploads are treated as
   * 'successful,' and instead the response contains arrays of successful and unsuccessful invoices.
   *
   * response.invoices.successful is a list of filenames,
   * response.invoices.unsuccessful returns a dictionary for each file that includes an error message from the server.
   */
  const successfulInvoiceFilenames = response.invoices.successful;
  const failedInvoicesJson = response.invoices.unsuccessful;
  const successfulInvoiceFiles = allCosts
    .filter((cost) => invoiceFilenameInListOfFilenames(successfulInvoiceFilenames, cost))
    .map((cost) => cost.invoiceFile);

  const failedInvoiceFiles = files.filter((file) =>
    failedInvoicesJson.some((invoice) => invoice.filename === file.cleanName),
  );

  // Update the UI
  // Move successful uploads to the successful uploads area
  successfulInvoiceFiles.forEach((file) => {
    updatePreviewElement(file.previewElement, { status: 'processed-success' });
    disablePreviewElementButtons(file.previewElement);
    file.costInfoElement?.remove();
    // processedInvoicesContainer.append(invoiceSelectArea.removeChild(file.previewElement));
  });

  // Remove failed uploads to allow the user to try again
  failedInvoiceFiles.forEach((file) => {
    myDropzone.removeFile(file);
  });

  // Removes successful costs from the global costs array
  allCosts = removeCostsByFilename(response.invoices.successful);

  const toasts = getUploadResponseToasts(response);
  dropzoneMessages.append(...toasts);
  enableSubmitButtonIfSubmittable();
  updateSubmitButtonDisplay(false);

  if (!allCosts.length) trimWhitespace(document.querySelector('ol.invoice-list'));
});

myDropzone.on('error', function (file, message) {
  console.warn('ERROR: ', message);
  const response = {
    responseCode: 9997,
    autoDeleteErrorMsg: true,
    deleteFile: true,
    jobName: null,
  };

  if (message === 'filesizeError') {
    Object.assign(response, { responseCode: 3001 });
  } else if (message === 'fileTypeError') {
    Object.assign(response, { responseCode: 3002 });
  } else if (message === 'cancelled') {
    Object.assign(response, { responseCode: 3003, deleteFile: false });
  } else {
    Object.assign(response, { responseCode: 5000, deleteFile: false });
  }

  displayErrorMessage(file, response);
  if (response.deleteFile) myDropzone.removeFile(file);

  if (response.responseCode !== 2000) {
    allCosts.find((cost) => cost.invoiceFile === file)?.unmatchFile();
    if (!response.deleteFile)
      updatePreviewElement(file.previewElement, { status: 'error' });
  }
});

myDropzone.on('errormultiple', function (files, message) {
  console.log('DZ ERROR MULTIPLE: ', files, message);
});

myDropzone.on('removedfile', function (file) {
  // If the removed file wasn't a duplicate, unmatch its related cost when possible
  if (!filesAreTheSame(file, false) && !filesHaveSamePONumber(file, false)) {
    allCosts.find((cost) => cost.invoiceFile === file)?.unmatchFile();
  }
  enableSubmitButtonIfSubmittable();
});

invoiceUploadButton.addEventListener('click', (e) => {
  e.preventDefault();
  myDropzone.processQueue();
});

invoiceSelectArea.addEventListener('change', (e) => {
  if (e.target.matches('select.inv-selector')) {
    const targetInvoicePONumber = e.target.selectedOptions[0].dataset.poNum;
    const cost = getCostByPONumber(targetInvoicePONumber);
    const filename = e.target.closest('.inv-file').dataset.filename;
    const file = myDropzone.files.find((f) => f.cleanName === filename);

    const status = checkForErrorsOnJobSelect(file, cost);
    if (status.responseCode !== 2000) {
      console.log(file);
      displayErrorMessage(file, status);
      e.target.value = 0;
    } else {
      cost.matchFile(file);
      updatePreviewElement(cost.invoicePreviewElement, {
        status: 'matched',
        jobName: cost.jobName,
      });
      removeErrorMessages(myDropzone.files);
      enableSubmitButtonIfSubmittable();
    }
  }
});

// When the delete button next to the file display is clicked, remove the corresponding file from the dropzone
// and also remove the file display
invoiceSelectArea.addEventListener('click', (e) => {
  if (e.target.closest('.inv-file__del')) {
    try {
      findAndRemoveFileFromDz(e);
    } catch (err) {
      console.error(err.message);
    }
  } else if (e.target.closest('button.inv-file__reselect')) {
    unmatchFileAndResetPreviewElement(e);
    enableSubmitButtonIfSubmittable();
  }
});

// If "attach invoice" button is clicked, have that file display listen for a file upload
// The next file that's uploaded will be linked to that card, unless the upload dialog is cancelled
requestedInvoicesContainer.addEventListener('click', (e) => {
  if (e.target.closest('.invoice .indicators__attach-inv')) {
    costListeningForFile = allCosts.find(
      (cost) => cost.PONumber === e.target.closest('.invoice').dataset.poNum,
    );
  }
});

// Stop costs from listening for files when file dialog is closed
document.addEventListener('cancel', () => {
  costListeningForFile = null;
});

['dragenter', 'dragover'].forEach((eventName) => {
  document.body.addEventListener(eventName, (e) => {
    if (draggingFiles(e)) {
      dzOverlay.classList.remove('overlay--off');
      dzOverlay.classList.add('overlay--active');
    }
  }),
    false;
});

['dragleave', 'drop'].forEach((eventName) => {
  document.body.addEventListener(eventName, () => {
    dzOverlay.classList.remove('overlay--active');
    // Without setTimeout, the overlay continually flickers between visibility hidden/visible.
    setTimeout(() => dzOverlay.classList.add('overlay--off'), 150);
  }),
    false;
});

[invoiceSelectArea, requestedInvoicesContainer].forEach((area) => {
  ['mouseenter', 'mouseleave'].forEach((eventName) => {
    area.addEventListener(eventName, toggleTooltip, true);
  });
});
