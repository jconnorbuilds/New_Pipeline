import $, { data, event } from 'jquery';
window.$ = $;
import Dropzone from 'dropzone';
import 'dropzone/dist/dropzone.css';
import '../../styles/invoice-uploader.css';
import { slugify, CURRENCY_SYMBOLS } from '../utils.js';
import { CostDisplay, InvoiceFileDisplay } from './Cost.js';

const dropzoneMessages = document.querySelector('.dz-messages');
const dropzoneErrorMessages = document.querySelector('.dz-messages__error');
const invoiceSelectArea = document.querySelector('#invoice-select-area');
const requestedInvoicesArea = document.querySelector('.requested-invoices');
const validationSuccessIcon = `<i class="fa-solid fa-circle-check"></i>`;
const validationFailIcon = `<i class="fa-solid fa-circle-xmark"></i>`;
const invoiceUploadButton = document.querySelector('#invoice-upload-btn');
const dzOverlay = document.querySelector('.dropzone-overlay');
const invoiceIcon = `<i class="fa-solid fa-file-invoice"></i>`;
const deleteIcon = `<i class="fa-solid fa-delete-left"></i>`;
const fileUploadButtons = document.querySelectorAll('.indicators__attach-inv');

const vendorUUID = window.location.href.split('/').pop();
const requestedInvoiceData = await getRequestedInvoiceData();
const vendorId = requestedInvoiceData.vendor_id;
const jobMap = getJobMap(requestedInvoiceData);
const costs = [];
const fileDisplays = [];

requestedInvoiceData.requested_invoices.forEach((cost) =>
  costs.push(new CostDisplay(cost)),
);
console.log(costs);

let costListeningForFile;

// Removes full-width space to avoid some dropzone upload issue
function sanitizeFileName(file) {
  // eslint-disable-next-line no-irregular-whitespace
  return file.name.replace(/　/g, '');
}

let myDropzone = new Dropzone(document.body, {
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
});

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

function filesAreTheSame(file1, file2) {
  return (
    file1.cleanName === file2.cleanName &&
    file1.size === file2.size &&
    file1.lastModified.toString() === file2.lastModified.toString()
  );
}

function filesHaveSamePONumber(file1, file2) {
  const file1PONumber = extractPONumber(file1.cleanName);
  const file2PONumber = extractPONumber(file2.cleanName);
  return file1PONumber && file2PONumber && file1PONumber === file2PONumber;
}

/* Checks if an added file is a duplicate (to be removed). Setting the fileCurrentlyInDropzone flag
to false also allows checking if a file is already in the dropzone. */
function fileIsDuplicate(fileToCheck, fileCurrentlyInDropzone = true) {
  const result = myDropzone.files.some((dropzoneFile, idx) => {
    //  If the file is already in the dropzone (i.e. just added), it'll be last in the files list,
    //  and we want to ignore it or it will be flagged as a duplicate against itself.
    const isCurrentFile = fileCurrentlyInDropzone && idx === myDropzone.files.length - 1;
    if (isCurrentFile) return;

    return (
      filesAreTheSame(dropzoneFile, fileToCheck) ||
      filesHaveSamePONumber(dropzoneFile, fileToCheck)
    );
  });

  return result;
}

function getErrorMessage(fileToCheck, fileCurrentlyInDropzone = true) {
  let errMessage = '';

  myDropzone.files.forEach((dropzoneFile, idx) => {
    const isCurrentFile = fileCurrentlyInDropzone && idx === myDropzone.files.length - 1;
    if (isCurrentFile) return;

    if (filesAreTheSame(dropzoneFile, fileToCheck)) {
      errMessage = `It looks like you uploaded two of the same file (${fileToCheck.name}). We've removed the duplicate.`;
    } else if (filesHaveSamePONumber(dropzoneFile, fileToCheck)) {
      errMessage = `It looks like you tried to add two files with the same PO number in the filename: (${fileToCheck.cleanName}). We've removed the duplicate.`;
    }
  });

  return errMessage;
}

function extractPONumber(string) {
  const PONum = string.match(/[A-Za-z]{4,6}\d{4}/);
  return PONum ? PONum[0] : null;
}

function updateErrorMessage(message) {
  dropzoneErrorMessages.textContent = message;
  dropzoneErrorMessages.classList.toggle('hidden', message === '');
}

async function getRequestedInvoiceData() {
  const data = await fetch(`ajax/get_vendor_requested_invoices_data/${vendorUUID}`)
    .then((response) => response.json())
    .catch((err) =>
      console.error("Couldn't get the data from the server: ", err.message),
    );

  return data;
}

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

function appendOption(cost, file, selectEl) {
  const option = document.createElement('option');
  option.value = cost.pk;
  option.dataset.poNum = cost.PONumber;
  option.text = `${jobMap[cost.jobId].name} / ${cost.description} / ${
    CURRENCY_SYMBOLS[cost.currency]
  }${cost.amount.toLocaleString()}`;

  option.toggleAttribute('selected', fileMatchesCost(file, cost));
  selectEl.append(option);
}

function fileMatchesCost(file, cost) {
  return (
    file.cleanName.includes(cost.PONumber) ||
    file.cleanName.includes(jobMap[cost.jobId].jobCode)
  );
}

function createInvoiceSelector(file, formNum) {
  const selectEl = document.createElement('select');
  const emptyOption = document.createElement('option');

  selectEl.classList.add('inv-selector');
  selectEl.setAttribute('id', `invoice-select-${formNum}`);

  emptyOption.value = 0;
  emptyOption.text = 'Select job';

  selectEl.appendChild(emptyOption);
  costs.forEach((cost) => {
    appendOption(cost, file, selectEl);
    addInvoiceValidationClass(selectEl);
  });

  return selectEl;
}

function addInvoiceValidationClass(selectEl) {
  selectEl.classList.toggle('is-valid', selectEl.value);
}

function getAutoMatchedCost(file) {
  return costs.find((cost) => file.PONumber === cost.PONumber);
}

function createAddedFileDisplayBase(file, formNum) {
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
      <div class="inv-file__is-attached">
        Unattached
      </div>
      
      <div class="inv-file__selector"></div>
    </div>
    <div class="inv-file__options">
      <div class="inv-file__del">${deleteIcon}</div>
    </div>
  `;

  const selectorContainer = container.querySelector('.inv-file__selector');
  selectorContainer.appendChild(createInvoiceSelector(file, formNum));

  return container;
}

function updateFileDisplayMatched(fileDisplay, jobName) {
  fileDisplay.classList.add('matched');
  fileDisplay.querySelector('.inv-selector').classList.add('hidden');
  fileDisplay.querySelector('.inv-file__is-attached').textContent = 'OK';

  const jobNameDisplay = document.createElement('div');
  jobNameDisplay.classList.add('inv-file__job-name');
  jobNameDisplay.textContent = jobName;

  fileDisplay.querySelector('.inv-file__body').appendChild(jobNameDisplay);
}

// function toggleInvoiceAttachedPill(PONumber, isAttached) {
//   const targetInvoice = document.querySelector(`.invoice[data-po-num="${PONumber}"]`);
//   const targetElement = targetInvoice.querySelector('.indicators__attach-inv');
//   targetElement.classList.toggle('attached', isAttached);
//   targetElement.innerHTML = isAttached
//     ? 'Invoice attached'
//     : `<i class="fa-solid fa-plus"></i><span>Add invoice</span>`;
// }

function getCostByPONumber(PONumber) {
  return costs.find((cost) => PONumber === cost.PONumber);
}

function matchUploadedInvoiceToJob(e) {
  const invoiceSelector = e.target;
  const filename = invoiceSelector.closest('.inv-file').dataset.fileName;
  const cost = getCostByPONumber(invoiceSelector.selectedOptions[0].dataset.poNum);

  if (cost.isMatched)
    throw Error('The selected job already has an invoice assigned to it!');

  const file = myDropzone.files.find((f) => f.cleanName === filename);
  file.PONumber = cost.PONumber;
  return { cost, file };
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
  costs.forEach((cost) => {
    if (cost.invoiceFile === fileToDelete) cost.unmatchFile();
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
  dropzoneErrorMessages.classList.add('hidden');
});

myDropzone.on('successmultiple', function () {
  // Gets triggered when the files have successfully been sent.
  dropzoneErrorMessages.classList.add('hidden');
  dropzoneMessages.textContent = 'All looks good!';
  window.location.replace('../invoice-uploader/send-email/');
});

myDropzone.on('errormultiple', function (files, response) {
  // Gets triggered when there was an error sending the files.
  dropzoneErrorMessages.textContent = response.error ? response.error : response;
  dropzoneErrorMessages.classList.remove('hidden');
});

myDropzone.on('removedfile', function (file) {
  formsAndFilesAreValid();
});

function fileMatchesAlreadyMatchedCost(file) {
  return costs.some((cost) => cost.PONumber === file.PONumber && cost.isMatched);
}

function checkForErrorsOnFileAdd(file) {
  if (fileIsDuplicate(file)) {
    updateErrorMessage(getErrorMessage(file));
    return true;
  }

  if (fileMatchesAlreadyMatchedCost(file)) {
    updateErrorMessage(
      `The file you are attempting to submit matches a job that already has an invoice attached to it. Please ensure that you are submitting invoices for the correct job(s)! We've already removed the file that caused this error.`,
    );
    return true;
  }

  if (costListeningForFile) {
    if (file.PONumber && file.PONumber !== costListeningForFile.PONumber) {
      updateErrorMessage(
        `It looks like there is a PO in the filename that doesn't match the job you are attempting to submit it for. To avoid payment issues, please double check the filename and try adding it again.  ${
          jobMap[costListeningForFile.jobId].name
        } 
        }: ${file.PONumber}`,
      );
      costListeningForFile = null;
      return true;
    }
  }

  return false;
}

function displayErrorMessage() {}

function handleDropzoneError() {}

myDropzone.on('error', (file, message) => {
  console.error(message, file);
  const fileDisplay = document.querySelector(
    `.inv-file[data-file-name="${file.cleanName}"]`,
  );
  const statusIndicator = fileDisplay.querySelector('.inv-file__is-attached');
  statusIndicator.classList.remove('matched');
  statusIndicator.classList.add('error');
  statusIndicator.textContent = 'Error';
  handleDropzoneError();
});

let formNum = 0;
myDropzone.on('addedfile', (file) => {
  file.cleanName = sanitizeFileName(file);
  file.PONumber = extractPONumber(file.cleanName);

  const errors = checkForErrorsOnFileAdd(file);
  if (errors) {
    myDropzone.removeFile(file);
    displayErrorMessage();
    costListeningForFile = null;
    return;
  }

  const autoMatchedCost = getAutoMatchedCost(file, costs);
  let fileDisplay = createAddedFileDisplayBase(file, costs, ++formNum);

  if (autoMatchedCost && !costListeningForFile) {
    const cost = autoMatchedCost;
    updateFileDisplayMatched(fileDisplay, jobMap[cost.jobId].name);
    cost.matchFile(file, fileDisplay);
  } else if (costListeningForFile) {
    // Should only execute when a file is being uploaded via the upload dialog
    const cost = getCostByPONumber(costListeningForFile.PONumber);
    file.PONumber = cost.PONumber;
    updateFileDisplayMatched(fileDisplay, jobMap[cost.jobId].name);
    cost.matchFile(file, fileDisplay);
    costListeningForFile = null;
  }

  invoiceSelectArea.appendChild(fileDisplay);
  dropzoneErrorMessages.classList.add('hidden');
  console.log(costs);
  console.log(myDropzone.files);

  if (myDropzone.files.length !== invoiceSelectArea.querySelectorAll('.inv-file').length)
    console.warn('Dropzone and display are out of sync!');

  // Seems like the file is considered rejected until the "accept" event occurs, so we wait.
  setTimeout(function () {
    formsAndFilesAreValid();
  }, 50);
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
    try {
      const { cost, file } = matchUploadedInvoiceToJob(e);
      formsAndFilesAreValid();
      cost.matchFile(file, e.target.closest('.inv-file'));
      updateFileDisplayMatched(cost.invoiceFileDisplay, jobMap[cost.jobId].name, file);
    } catch (err) {
      updateErrorMessage(err.message);
      console.error(err);
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
      updateErrorMessage(err.message);
      console.error(err.message);
    }
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

document.addEventListener('cancel', () => {
  costListeningForFile = null;
});

['dragenter', 'dragover'].forEach((eventName) => {
  document.body.addEventListener(eventName, (e) => {
    if (draggingFiles(e)) dzOverlay.classList.add('dropzone-overlay--active'), false;
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  document.body.addEventListener(eventName, () => {
    dzOverlay.classList.remove('dropzone-overlay--active'), false;
  });
});
