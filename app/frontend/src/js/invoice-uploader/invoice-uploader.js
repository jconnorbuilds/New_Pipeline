import $, { data, event } from 'jquery';
window.$ = $;
import Dropzone from 'dropzone';
import 'dropzone/dist/dropzone.css';
import '../../styles/invoice-uploader.css';
import { slugify, CURRENCY_SYMBOLS, stripTags } from '../utils.js';
import { CostDisplay, InvoiceFileDisplay } from './Cost.js';
import './invoice-uploader-view.js';

import {
  dropzoneMessages,
  dropzoneErrorMessages,
  invoiceSelectArea,
  requestedInvoicesArea,
  invoiceUploadButton,
  dzOverlay,
  fileUploadButtons,
  updateFileDisplay,
  createAddedFileDisplayBase,
  displayNewErrorMessage,
  removeErrorMessages,
} from './invoice-uploader-view.js';
import { getErrorMessageContent, handleError } from './invoice-uploader-errors.js';

const vendorUUID = window.location.href.split('/').pop();
const requestedInvoiceData = await getRequestedInvoiceData();
const vendorId = requestedInvoiceData.vendor_id;
const jobMap = getJobMap(requestedInvoiceData);
const costs = requestedInvoiceData.requested_invoices.map(
  (cost) => new CostDisplay(cost),
);
let costListeningForFile;

export const myDropzone = new Dropzone(document.body, {
  url: '/pipeline/process-uploaded-vendor-invoice/',
  autoProcessQueue: false,
  uploadMultiple: true,
  parallelUploads: 10,
  maxFiles: null,
  maxFilesize: 10,
  disablePreviews: true,
  clickable: '.indicators__attach-inv',
  acceptedFiles: '.pdf, .jpg, .jpeg',
  renameFile: sanitizeFileName,
  dictFileTooBig: 'filesizeError',
  dictInvalidFileType: 'fileTypeError',
});

function getJobMap(data) {
  const jobMap = {};
  data.jobs.forEach((job) => {
    jobMap[job.pk] = {
      jobCode: job.job_code,
      name: job.job_name,
      display: `${job.job_code} - ${job.job_name}`,
    };
  });

  return jobMap;
}

// Removes full-width space to avoid some dropzone upload issue
function sanitizeFileName(file) {
  // eslint-disable-next-line no-irregular-whitespace
  return file.name.replace(/　/g, '');
}

function extractPONumber(string) {
  const PONum = string.match(/[A-Za-z]{4,6}\d{4}/);
  return PONum ? PONum[0] : null;
}

function getFileDisplayByFilename(filename) {
  return document.querySelector(`.inv-file[data-file-name="${filename}"]`);
}

// Only allow single upload via the file select dialog
document.querySelector('.dz-hidden-input').removeAttribute('multiple');

// Functions for form and file validation
function formsAndFilesAreValid() {
  /*
    To avoid having duplicates or bad files uploaded to the server
    and having to deal with them, check to make sure all invoices are valid and accounted for 
    with a dropdown menu selection, and that there are no duplicates.
    It runs after every time a file is added, removed, or 
    a selection is made one of the dropdown menus.
    */
  let noDuplicates = checkDuplicatesValidation();
  let allSelected = checkifAllJobsSelected();

  if (
    myDropzone.getRejectedFiles().length === 0 &&
    myDropzone.getQueuedFiles().length > 0 &&
    allSelected &&
    noDuplicates
  ) {
    $('#invoice-upload-btn').removeClass('disabled');
    return true;
  } else if (
    myDropzone.getRejectedFiles().length > 0 ||
    myDropzone.files.length === 0 ||
    noDuplicates === false ||
    allSelected === false
  ) {
    $('#invoice-upload-btn').addClass('disabled');
    return false;
  }
}

function checkDuplicatesValidation() {
  let dupChecker = [];
  let duplicates = [];

  $('.invoice-select').each(function () {
    let currentVal = $(this).val();
    if (currentVal === '0') {
      return;
    } else if (dupChecker.includes(currentVal)) {
      duplicates.push(currentVal);
    } else {
      dupChecker.push(currentVal);
    }
  });

  $('.invoice-select').each(function () {
    let currentVal = $(this).val();
    if (currentVal === '0') {
      $(this).removeClass('is-valid');
      $(this).removeClass('is-invalid');
    } else if (duplicates.includes(currentVal)) {
      $(this).removeClass('is-valid');
      $(this).addClass('is-invalid');
    } else {
      $(this).removeClass('is-invalid');
      $(this).addClass('is-valid');
    }
  });

  return duplicates.length === 0;
}

function checkifAllJobsSelected() {
  const invoiceSelectElements = [...document.querySelectorAll('.invoice-select')];
  return invoiceSelectElements.every((element) => element.value === '0');
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
  return costs.find((cost) => file.PONumber === cost.PONumber);
}

function getCostByPONumber(PONumber) {
  return costs.find((cost) => PONumber === cost.PONumber);
}

function findAndRemoveFileFromDz(e) {
  const delBtn = e.target;
  const targetFileName = delBtn.closest('.inv-file').dataset.fileName;
  const fileToDelete = myDropzone.files.find((file) => file.cleanName === targetFileName);
  if (!fileToDelete)
    throw Error(
      `No file to delete. Tried to delete ${targetFileName} but it wasn't found.`,
    );

  myDropzone.removeFile(fileToDelete);
  removeErrorMessages(myDropzone.files, fileToDelete);
  costs.forEach((cost) => {
    if (
      cost.invoiceFile === fileToDelete &&
      costs.filter((cost) => cost.invoiceFile === fileToDelete).length === 1 &&
      fileToDelete.status !== 'error'
    )
      cost.unmatchFile();
  });
  delBtn.closest('.inv-file').remove();
  console.log(costs);
}

function draggingFiles(e) {
  return (
    e.dataTransfer.items &&
    Array.from(e.dataTransfer.items).some((item) => item.kind === 'file')
  );
}

function fileMatchesAlreadyMatchedCost(file) {
  return costs.some((cost) => cost.PONumber === file.PONumber && cost.isMatched);
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
  };

  if (filesAreTheSame(file, true)) {
    Object.assign(response, { responseCode: 1001 });
  } else if (filesHaveSamePONumber(file, true)) {
    Object.assign(response, { responseCode: 1002 });
  } else if (fileMatchesAlreadyMatchedCost(file)) {
    Object.assign(response, { responseCode: 1003 });
  } else if (filePONumDoesntMatchTargetedCost(file)) {
    Object.assign(response, { responseCode: 1004 });
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

function unmatchFileAndResetFileDisplay(e) {
  const matchedCost = costs.find(
    (cost) =>
      cost.invoiceFile?.cleanName === e.target.closest('.inv-file').dataset.fileName,
  );
  if (matchedCost) matchedCost.unmatchFile();

  updateFileDisplay(e.target.closest('.inv-file'), 'default');
}

let formNum = 0;
myDropzone.on('addedfile', (file) => {
  file.cleanName = sanitizeFileName(file);
  file.PONumber = extractPONumber(file.cleanName);

  const status = checkForErrorsOnFileAdd(file);
  const addedSuccessfully = status.responseCode === 2000;
  if (!addedSuccessfully) handleError(file, status);
  console.log('DZ FILES: ', myDropzone.files);
  if (!addedSuccessfully && status.deleteFile) return;

  // If the file wasn't deleted due to an error, proceed with creating the file preview.
  // Create the base display
  const fileDisplay = createAddedFileDisplayBase(file, costs, ++formNum, jobMap);

  // If there are errors, update the display and return
  if (!addedSuccessfully) {
    updateFileDisplay(fileDisplay, 'error');
    invoiceSelectArea.append(fileDisplay);
    costListeningForFile = null;
    return;
  }

  // If file added successfully, see if it can be matched with a cost.
  // First check if it's being added via "add invoice" button, otherwise see if it was automatched.
  const autoMatchedCost = getAutoMatchedCost(file, costs);
  const matchingCost = costListeningForFile
    ? getCostByPONumber(costListeningForFile.PONumber)
    : autoMatchedCost || null;

  if (matchingCost) {
    file.PONumber = matchingCost.PONumber;
    updateFileDisplay(fileDisplay, 'matched', matchingCost.jobName, !!autoMatchedCost);
    matchingCost.matchFile(file, fileDisplay);
  }

  costListeningForFile = null;
  invoiceSelectArea.appendChild(fileDisplay);
  // removeErrorMessages(myDropzone.files);

  if (myDropzone.files.length !== invoiceSelectArea.querySelectorAll('.inv-file').length)
    console.warn('Dropzone and display are out of sync!');

  // Seems like the file is considered rejected until the "accept" event occurs, so we wait.
  setTimeout(function () {
    formsAndFilesAreValid();
  }, 50);
});

fileUploadButtons.forEach((btn) => {
  btn.addEventListener('mouseenter', () => {
    document.querySelector('.dz-hidden-input').removeAttribute('multiple');
  });

  btn.addEventListener('focus', () => {});
});

myDropzone.on('sendingmultiple', function (files, xhr, formData) {
  // Gets triggered when the form is actually being sent.
  const invoices = {};
  $('select').each(function () {
    const costId = $(this).val();
    const fileName = $(this).data('file-name');
    if (costId !== '0') {
      invoices[costId] = fileName;
    }
  });
  formData.append('invoices', JSON.stringify(invoices));
});

myDropzone.on('successmultiple', function () {
  // Gets triggered when the files have successfully been sent.
  dropzoneMessages.textContent = 'All looks good!';
  window.location.replace('../invoice-uploader/send-email/');
});

myDropzone.on('error', function (file, message) {
  const response = {
    responseCode: 2000,
    autoDeleteErrorMsg: true,
    deleteFile: true,
    jobName: null,
  };

  if (message === 'filesizeError') {
    Object.assign(response, { responseCode: 3001 });
  } else if (message === 'fileTypeError') {
    Object.assign(response, { responseCode: 3002 });
  }

  handleError(file, response);

  const fileDisplay = getFileDisplayByFilename(file.cleanName);
  if (response.responseCode !== 2000) {
    costs.find((cost) => cost.invoiceFile === file)?.unmatchFile();
    if (fileDisplay) {
      if (!response.deleteFile) updateFileDisplay(fileDisplay, 'error');
    }
  }
});

myDropzone.on('errormultiple', function (files, message) {
  // Gets triggered when there was an error sending the files.
  console.log('DZ ERROR MULTIPLE: ', files, message);
});

myDropzone.on('removedfile', function (file) {
  const fileDisplay = getFileDisplayByFilename(file.cleanName);
  // If the removed file wasn't a duplicate, then unmatch it and remove the file display
  if (!filesAreTheSame(file, false) && !filesHaveSamePONumber(file, false)) {
    costs.find((cost) => cost.invoiceFile === file)?.unmatchFile();
    if (fileDisplay) fileDisplay.remove();
  }
  formsAndFilesAreValid();
});

invoiceUploadButton.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const allSelected = checkifAllJobsSelected();
  const noDuplicates = checkDuplicatesValidation();
  const rejectedFiles = myDropzone.getRejectedFiles.length;
  if (allSelected && noDuplicates && !rejectedFiles) {
    myDropzone.processQueue();
  } else {
    // TODO: display helpful info on the screen
  }
});

invoiceSelectArea.addEventListener('change', (e) => {
  if (e.target.matches('select.inv-selector')) {
    const targetInvoicePONumber = e.target.selectedOptions[0].dataset.poNum;
    const cost = getCostByPONumber(targetInvoicePONumber);
    const filename = e.target.closest('.inv-file').dataset.fileName;
    const file = myDropzone.files.find((f) => f.cleanName === filename);

    const status = checkForErrorsOnJobSelect(file, cost);
    if (status.responseCode !== 2000) {
      handleError(file, status);
    } else {
      cost.matchFile(file, e.target.closest('.inv-file'));
      updateFileDisplay(cost.invoiceFileDisplay, 'matched', jobMap[cost.jobId].name);
      removeErrorMessages(myDropzone.files);
      formsAndFilesAreValid();
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
      // displayNewErrorMessage(err.message);
      console.error(err.message);
    }
  } else if (e.target.closest('button.inv-file__options')) {
    unmatchFileAndResetFileDisplay(e);
  }
});

// If "attach invoice" button is clicked, have that file display listen for a file upload
// The next file that's uploaded will be linked to that card, unless the upload dialog is cancelled
requestedInvoicesArea.addEventListener('click', (e) => {
  if (e.target.closest('.invoice .indicators__attach-inv')) {
    costListeningForFile = costs.find(
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
