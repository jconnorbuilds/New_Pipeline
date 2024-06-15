import $, { data } from 'jquery';
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

let invoiceListeningForFile;

function clearDropzone() {
  invoiceSelectArea.style.display = 'none';
  if (!myDropzone.files.length) {
    dropzoneErrorMessages.classList.add('hidden');
  }
}

function sanitizeFileName(file) {
  // eslint-disable-next-line no-irregular-whitespace
  return file.name.replace(/　/g, '');
}

let myDropzone = new Dropzone(document.body, {
  url: '/pipeline/process-uploaded-vendor-invoice/',
  autoProcessQueue: false,
  uploadMultiple: true,
  parallelUploads: 20,
  maxFiles: 20,
  maxFilesize: 10,
  disablePreviews: true,
  clickable: '.indicators__attach-inv',
  thumbnailMethod: 'contain',
  acceptedFiles: '.pdf, .jpg, .jpeg',
  renameFile: sanitizeFileName,

  // Set up the dropzone
  init: function () {
    let dz = this;
    // First change the button to actually tell Dropzone to process the queue.
    // Get rid of the init function?
    invoiceUploadButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const allSelected = checkifAllJobsSelected();
      const noDuplicates = checkDuplicatesValidation();
      const rejectedFiles = dz.getRejectedFiles.length;
      if (allSelected && noDuplicates && !rejectedFiles) {
        dz.processQueue();
      } else {
        // TODO: display helpful info on the screen
      }
    });

    // Listen to the sendingmultiple event. In this case, it's the sendingmultiple event instead
    // of the sending event because uploadMultiple is set to true.
    this.on('sendingmultiple', function (files, xhr, formData) {
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

    this.on('successmultiple', function () {
      // Gets triggered when the files have successfully been sent.
      dropzoneErrorMessages.classList.add('hidden');
      dropzoneMessages.textContent = 'All looks good!';
      window.location.replace('../invoice-uploader/send-email/');
    });

    this.on('errormultiple', function (files, response) {
      // Gets triggered when there was an error sending the files.
      dropzoneErrorMessages.textContent = response.error ? response.error : response;
      dropzoneErrorMessages.classList.remove('hidden');
    });

    this.on('removedfile', function (file) {
      // Does NOT remove the form if the form was already removed i.e. as a duplicate
      if (!isDuplicate(this, file, false)) {
        if (file.PONumber) toggleInvoiceAttachedPill(file.PONumber, false);
      }

      formsAndFilesAreValid();
      if (!dz.files.length) clearDropzone();
    });

    let formNum = 0;
    this.on('addedfile', (file) => {
      file.cleanName = sanitizeFileName(file);

      if (isDuplicate(this, file)) {
        this.removeFile(file);
      } else {
        let fileDisplay = createAddedFileDisplayBase(file, costs, ++formNum);
        dropzoneErrorMessages.classList.add('hidden');

        if (fileHasMatchingInvoice(file, costs)) {
          const cost = costs.find((cost) =>
            file.cleanName.includes(cost.fields.PO_number),
          );
          file.PONumber = cost.fields.PO_number;

          updateFileDisplayMatched(fileDisplay, cost, file);
          updateInvoiceDisplay(cost.fields.PO_number, true);
        } else if (invoiceListeningForFile) {
          const cost = costs.find(
            (cost) => invoiceListeningForFile.dataset.poNum === cost.fields.PO_number,
          );
          file.PONumber = cost.fields.PO_number;
          updateFileDisplayMatched(fileDisplay, cost, file);
          updateInvoiceDisplay(cost.fields.PO_number, true);
          invoiceListeningForFile = null;
        }

        invoiceSelectArea.appendChild(fileDisplay);
        invoiceSelectArea.style.display = 'grid';

        // Seems like the file is considered rejected until the "accept" event occurs, so we wait.
        setTimeout(function () {
          formsAndFilesAreValid();
        }, 50);
      }
    });
  },
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

function isDuplicate(dropzone, fileToCheck, isFileCurrentlyInDropzone = true) {
  let errMessage;
  const PONumRegEx = /[A-Za-z]{4,6}\d{4}/;
  const PONum = fileToCheck.cleanName.match(PONumRegEx);

  const result = dropzone.files.some((dropzoneFile, idx) => {
    // If the file is already in the dropzone (i.e. just added), it'll be last in the files list,
    // and we want to ignore it or it will be flagged as a duplicate against itself.
    if (isFileCurrentlyInDropzone) {
      const isCurrentFile = idx === dropzone.files.length - 1;
      if (isCurrentFile) return;
    }

    // Check if file is a duplicate (same file was dragged and dropped twice)
    if (
      dropzoneFile.name === fileToCheck.name &&
      dropzoneFile.size === fileToCheck.size &&
      dropzoneFile.lastModified.toString() === fileToCheck.lastModified.toString()
    ) {
      errMessage = `It looks like you uploaded two of the same file (${fileToCheck.name}). We've removed the duplicate.`;
      return true;

      // Else, check if two different files have the same PO number:
    } else if (
      dropzoneFile.name.match(PONumRegEx) &&
      PONum &&
      dropzoneFile.name.match(PONumRegEx)[0] === PONum[0]
    ) {
      errMessage = `It looks like you tried to add two files with the same PO number in the filename: (${fileToCheck.name}). We've removed the duplicate.`;
      return true;
      // Else, it's not a duplicate (as far as I can see right now)
    } else {
      errMessage = '';
      return false;
    }
  });

  updateErrorMessage(errMessage);

  return result;
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

const requestedInvoiceData = await getRequestedInvoiceData();
const jobMap = getJobMap(requestedInvoiceData);
const costs = requestedInvoiceData.requested_invoices;
const vendorId = requestedInvoiceData.vendor_id;

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

function fileHasMatchingInvoice(file, costs) {
  return costs.some((cost) => file.cleanName.includes(cost.fields.PO_number));
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

function updateInvoiceDisplay(PONumber, isMatched) {
  if (isMatched) {
    toggleInvoiceAttachedPill(PONumber, true);
    addValidation(PONumber, true);
  }
}

$(document).ready(function () {
  /* 
    Dynamic dropdown menu generation logic.
    When a file is uploaded, a dropdown is generated with all 
    costs that are awaiting invoices that are available to that vendor.
    */

  invoiceSelectArea.addEventListener('change', (e) => {
    if (e.target.matches('.inv-selector')) {
      const invoiceSelector = e.target;
      const filename = e.target.closest('.inv-file').dataset.fileName;
      formsAndFilesAreValid();
      const cost = costs.find(
        (cost) =>
          invoiceSelector.selectedOptions[0].dataset.poNum === cost.fields.PO_number,
      );
      const file = myDropzone.files.find((f) => f.cleanName === filename);
      file.PONumber = cost.fields.PO_number;

      updateInvoiceDisplay(cost.fields.PO_number, true);
      updateFileDisplayMatched(e.target.closest('.inv-file'), cost, file);
    }
  });

  invoiceSelectArea.addEventListener('click', (e) => {
    if (e.target.closest('.inv-file__del')) {
      const delBtn = e.target;
      const targetFileName = delBtn.closest('.inv-file').dataset.fileName;
      const fileToDelete = myDropzone.files.find(
        (file) => file.cleanName === targetFileName,
      );
      if (fileToDelete) myDropzone.removeFile(fileToDelete);
      delBtn.closest('.inv-file').remove();
    }
  });

  requestedInvoicesArea.addEventListener('click', (e) => {
    if (e.target.closest('.invoice .indicators__attach-inv')) {
      invoiceListeningForFile = e.target.closest('.invoice');
    }
  });

  document.addEventListener('cancel', () => {
    invoiceListeningForFile = null;
  });

  document.body.addEventListener('dragenter', (e) => {
    if (
      e.dataTransfer.items &&
      Array.from(e.dataTransfer.items).some((item) => item.kind === 'file')
    ) {
      const dzOverlay = document.querySelector('.dropzone-overlay');
      dzOverlay.classList.add('dropzone-overlay--active'), false;
    } else {
      console.log('no files here');
    }
  });

  document.body.addEventListener('dragleave', (e) => {
    const dzOverlay = document.querySelector('.dropzone-overlay');
    dzOverlay.classList.remove('dropzone-overlay--active'), false;
  });

  document.body.addEventListener('dragover', (e) => {
    if (
      e.dataTransfer.items &&
      Array.from(e.dataTransfer.items).some((item) => item.kind === 'file')
    ) {
      const dzOverlay = document.querySelector('.dropzone-overlay');
      dzOverlay.classList.add('dropzone-overlay--active'), false;
    } else {
      console.log('No files here, regular drag');
    }
  });

  document.body.addEventListener('drop', (e) => {
    console.log(e.dataTransfer);
    const dzOverlay = document.querySelector('.dropzone-overlay');
    dzOverlay.classList.remove('dropzone-overlay--active'), false;
  });
});
