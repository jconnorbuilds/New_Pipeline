import $, { data, event } from 'jquery';
window.$ = $;
import Dropzone from 'dropzone';
import 'dropzone/dist/dropzone.css';
import '../../styles/invoice-uploader.css';
import { slugify, CURRENCY_SYMBOLS } from '../utils.js';

const dropzoneMessages = document.querySelector('.dz-messages');
const dropzoneErrorMessages = document.querySelector('.dz-messages__error');
const invoiceSelectArea = document.querySelector('#invoice-select-area');
const requestedInvoicesArea = document.querySelector('.requested-invoices');
const vendorUUID = window.location.href.split('/').pop();
const validationSuccessIcon = `<i class="fa-solid fa-circle-check"></i>`;
const validationFailIcon = `<i class="fa-solid fa-circle-xmark"></i>`;
const invoiceIcon = `<i class="fa-solid fa-file-invoice"></i>`;
const deleteIcon = `<i class="fa-solid fa-delete-left"></i>`;
const invoiceUploadButton = document.querySelector('#invoice-upload-btn');
const dzOverlay = document.querySelector('.dropzone-overlay');

const requestedInvoiceData = await getRequestedInvoiceData();
const jobMap = getJobMap(requestedInvoiceData);
const costs = requestedInvoiceData.requested_invoices;
const vendorId = requestedInvoiceData.vendor_id;

let invoiceListeningForFile;

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
const hiddenInput = document.querySelector('.dz-hidden-input');
hiddenInput.removeAttribute('multiple');

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
    // If the file is already in the dropzone (i.e. just added), it'll be last in the files list,
    // and we want to ignore it or it will be flagged as a duplicate against itself.
    const isCurrentFile = fileCurrentlyInDropzone && idx === myDropzone.files.length - 1;
    if (isCurrentFile) return;

    // Check file duplicity
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
  const PONumRegEx = /[A-Za-z]{4,6}\d{4}/;
  const PONum = string.match(PONumRegEx);

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
  option.dataset.poNum = cost.fields.PO_number;
  option.text = `${jobMap[cost.fields.job].name} / ${cost.fields.description} / ${
    CURRENCY_SYMBOLS[cost.fields.currency]
  }${cost.fields.amount.toLocaleString()}`;

  option.toggleAttribute('selected', fileMatchesCost(file, cost));
  selectEl.append(option);
}

function fileMatchesCost(file, cost) {
  return (
    file.cleanName.includes(cost.fields.PO_number) ||
    file.cleanName.includes(jobMap[cost.fields.job].jobCode)
  );
}

function PONumberMatchesSomeCost(PONumber) {
  const costs = [...document.querySelectorAll('li.invoice')];
  return costs.some((cost) => cost.dataset.poNum === PONumber);
}

function createInvoiceSelector(file, costsList, formNum) {
  const selectEl = document.createElement('select');
  const emptyOption = document.createElement('option');

  selectEl.classList.add('inv-selector');
  selectEl.setAttribute('id', `invoice-select-${formNum}`);

  emptyOption.value = 0;
  emptyOption.text = 'Select job';

  selectEl.appendChild(emptyOption);
  costsList.forEach((cost) => {
    appendOption(cost, file, selectEl);
    addInvoiceValidationClass(selectEl);
  });

  return selectEl;
}

function addInvoiceValidationClass(selectEl) {
  selectEl.classList.toggle('is-valid', selectEl.value);
}

function getAutoMatchedCost(file, costs) {
  return costs.find((cost) => file.PONumber === cost.fields.PO_number);
}

function createAddedFileDisplayBase(file, costsList, formNum) {
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
  selectorContainer.appendChild(createInvoiceSelector(file, costsList, formNum));

  return container;
}

function updateFileDisplayMatched(fileDisplay, cost, file) {
  fileDisplay.classList.add('matched');
  fileDisplay.querySelector('.inv-selector').classList.add('hidden');
  fileDisplay.querySelector('.inv-file__is-attached').textContent = 'OK';

  const jobName = document.createElement('div');
  jobName.classList.add('inv-file__job-name');
  jobName.textContent = jobMap[cost.fields.job].name;

  fileDisplay.querySelector('.inv-file__body').appendChild(jobName);

  const invoices = [...document.querySelectorAll('li.invoice')];
  const invoice = invoices.find((inv) => inv.dataset.poNum === cost.fields.PO_number);
}

function toggleInvoiceAttachedPill(PONumber, isAttached) {
  const targetInvoice = document.querySelector(`.invoice[data-po-num="${PONumber}"]`);
  const targetElement = targetInvoice.querySelector('.indicators__attach-inv');
  targetElement.classList.toggle('attached', isAttached);
  targetElement.innerHTML = isAttached
    ? 'Invoice attached'
    : `<i class="fa-solid fa-plus"></i><span>Add invoice</span>`;
}

function addValidation(PONumber, isValid) {
  const targetElement = document.querySelector(`.invoice[data-po-num="${PONumber}"]`);
  const iconContainer = targetElement.querySelector('.indicators__validation');
  iconContainer.innerHTML = isValid ? validationSuccessIcon : validationFailIcon;
}

function toggleValidationVisibility(PONumber, isVisible) {
  const targetElement = document.querySelector(`.invoice[data-po-num="${PONumber}"]`);
  const iconContainer = targetElement.querySelector('.indicators__validation');
  iconContainer.classList.toggle('hidden', isVisible);
}

function updateCostInfoDisplay(PONumber, isMatched) {
  if (isMatched) {
    toggleInvoiceAttachedPill(PONumber, true);
    addValidation(PONumber, true);
  }
}

// Listen to the sendingmultiple event. In this case, it's the sendingmultiple event instead
// of the sending event because uploadMultiple is set to true.
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
  // Toggles "invoice attached" indicator from the cost info card, unless the file was removed as a duplicate
  if (!fileIsDuplicate(file, false)) {
    if (PONumberMatchesSomeCost(file.PONumber))
      toggleInvoiceAttachedPill(file.PONumber, false);
  }

  formsAndFilesAreValid();
});

let formNum = 0;
myDropzone.on('addedfile', (file) => {
  file.cleanName = sanitizeFileName(file);
  file.PONumber = extractPONumber(file.cleanName);
  const autoMatchedCost = getAutoMatchedCost(file, costs);

  if (fileIsDuplicate(file)) {
    updateErrorMessage(getErrorMessage(file));
    // myDropzone.removeFile(file);
    return;
  }

  let fileDisplay = createAddedFileDisplayBase(file, costs, ++formNum);

  if (autoMatchedCost) {
    const cost = autoMatchedCost;
    updateFileDisplayMatched(fileDisplay, cost, file);
    updateCostInfoDisplay(file.PONumber, true);
  } else if (invoiceListeningForFile) {
    // Should only execute when a file is being uploaded via the upload dialog
    const cost = getCostByPONumber(invoiceListeningForFile.dataset.poNum);
    file.PONumber = cost.fields.PO_number;
    updateFileDisplayMatched(fileDisplay, cost, file);
    updateCostInfoDisplay(file.PONumber, true);
    invoiceListeningForFile = null;
  }

  invoiceSelectArea.appendChild(fileDisplay);
  invoiceSelectArea.style.display = 'grid';
  dropzoneErrorMessages.classList.add('hidden');

  // Seems like the file is considered rejected until the "accept" event occurs, so we wait.
  setTimeout(function () {
    formsAndFilesAreValid();
  }, 50);
});

invoiceSelectArea.addEventListener('change', (e) => {
  if (e.target.matches('select.inv-selector')) {
    const { cost, file } = matchUploadedInvoiceToJob(e);

    formsAndFilesAreValid();
    updateCostInfoDisplay(cost.fields.PO_number, true);
    updateFileDisplayMatched(e.target.closest('.inv-file'), cost, file);
  }
});

// When the delete button next to the file display is clicked, remove the corresponding file from the dropzone
// and also remove the file display
invoiceSelectArea.addEventListener('click', (e) => {
  if (e.target.closest('.inv-file__del')) {
    try {
      findAndRemoveFileFromDz(e);
    } catch (err) {
      console.warn(err.message);
    }
  }
});

// If "attach invoice" button is clicked, have that file display listen for a file upload
// The next file that's uploaded will be linked to that card, unless the upload dialog is cancelled
requestedInvoicesArea.addEventListener('click', (e) => {
  if (e.target.closest('.invoice .indicators__attach-inv')) {
    invoiceListeningForFile = e.target.closest('.invoice');
  }
});

document.addEventListener('cancel', () => {
  invoiceListeningForFile = null;
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

function getCostByPONumber(PONumber) {
  return costs.find((cost) => PONumber === cost.fields.PO_number);
}

function matchUploadedInvoiceToJob(e) {
  const invoiceSelector = e.target;
  console.log(myDropzone.files);
  const filename = e.target.closest('.inv-file').dataset.fileName;
  const cost = getCostByPONumber(invoiceSelector.selectedOptions[0].dataset.poNum);
  const file = myDropzone.files.find((f) => f.cleanName === filename);
  file.PONumber = cost.fields.PO_number;
  return { cost, file };
}

function findAndRemoveFileFromDz(e) {
  const delBtn = e.target;
  const targetFileName = delBtn.closest('.inv-file').dataset.fileName;
  const fileToDelete = myDropzone.files.find((file) => file.cleanName === targetFileName);
  if (fileToDelete) {
    myDropzone.removeFile(fileToDelete);
  } else {
    throw Error(
      `No file to delete. Tried to delete ${targetFileName} but it wasn't found.`,
    );
  }
  delBtn.closest('.inv-file').remove();
}

function draggingFiles(e) {
  return (
    e.dataTransfer.items &&
    Array.from(e.dataTransfer.items).some((item) => item.kind === 'file')
  );
}
