import $, { data } from 'jquery';
window.$ = $;
import Dropzone from 'dropzone';
import 'dropzone/dist/dropzone.css';
import '../../styles/invoice-uploader.css';
import { slugify, CURRENCY_SYMBOLS } from '../utils.js';

let hintWithInvoices =
  "Simply choose the matching job from the dropdown menu. When you've finished, click the Submit button below.";
let hintWithNoInvoices = "Files will appear here once you've added them.";

const dropzoneMessages = document.querySelector('.dz-messages');
const dropzoneErrorMessages = document.querySelector('.dz-messages__error');
const invoiceSelectArea = document.querySelector('#invoice-select-area');
const vendorUUID = window.location.href.split('/').pop();
const validationSuccessIcon = `<i class="fa-solid fa-circle-check"></i>`;
const validationFailIcon = `<i class="fa-solid fa-circle-xmark"></i>`;
const invoiceIcon = `<i class="fa-solid fa-file-invoice"></i>`;
const deleteIcon = `<i class="fa-solid fa-delete-left"></i>`;
const invoiceUploadButton = document.querySelector('#invoice-upload-btn');

function clearDropzone() {
  invoiceSelectArea.style.display = 'none';
  if (!myDropzone.getRejectedFiles().length) {
    document.querySelector('#invoice-hint').textContent = hintWithNoInvoices;
    document.querySelector('.dz-message').style.display = 'block';
  }
  if (!myDropzone.files.length) {
    dropzoneErrorMessages.classList.add('hidden');
  }
}

function sanitizeFileName(file) {
  // eslint-disable-next-line no-irregular-whitespace
  return file.name.replace(/　/g, '');
}

let myDropzone;
Dropzone.options.invoiceUploadForm = {
  autoProcessQueue: false,
  uploadMultiple: true,
  parallelUploads: 20,
  maxFiles: 20,
  maxFilesize: 10,
  previewsContainer: '.dropzone-previews',
  clickable: false,
  thumbnailMethod: 'contain',
  acceptedFiles: '.pdf, .jpg, .jpeg',
  addRemoveLinks: true,
  dictDefaultMessage: 'Drop them here!',
  renameFile: sanitizeFileName,

  // Set up the dropzone
  init: function () {
    let dz = this;
    // First change the button to actually tell Dropzone to process the queue.
    $('#invoice-upload-btn').on('click', function (e) {
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
        document.querySelector(`#form-${slugify(file.cleanName)}`).remove();
        const invoiceAttachedCard = document.querySelector(
          `.inv-matched[data-po-num="${file.PONumber}"]`,
        );
        console.log(invoiceAttachedCard);
        invoiceAttachedCard?.remove();
        showMainInvoiceDetailsCard(file.PONumber);
      }

      formsAndFilesAreValid();
      if (!dz.files.length) clearDropzone();
    });
  },
};

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
  console.log(!!PONum);
  console.log(PONum);

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
  option.text = `PO# ${cost.fields.PO_number} - Job details: ${
    cost.fields.description
  } for ${jobMap[cost.fields.job].name}`;

  option.toggleAttribute('selected', fileMatchesCost(file, cost));

  selectEl.append(option);
}

function createInputGroup(file, costsList, formNum) {
  const invoiceSelectInputGroup = document.createElement('div');
  const labelEl = document.createElement('label');
  const selectEl = document.createElement('select');
  const emptyOption = document.createElement('option');

  invoiceSelectInputGroup.classList.add('input-group', 'inv-select-group');
  invoiceSelectInputGroup.setAttribute('id', `form-${slugify(file.cleanName)}`);

  labelEl.classList.add('ig-text');
  labelEl.setAttribute('for', `invoice-select-${formNum}`);
  labelEl.appendChild(document.createTextNode(file.cleanName));

  selectEl.classList.add('ig-select', 'invoice-select');
  selectEl.setAttribute('id', `invoice-select-${formNum}`);
  selectEl.dataset.fileName = file.cleanName;

  emptyOption.value = 0;
  emptyOption.text = 'Select job';

  selectEl.appendChild(emptyOption);
  invoiceSelectInputGroup.appendChild(labelEl);
  invoiceSelectInputGroup.appendChild(selectEl);

  costsList.forEach((cost) => {
    if (cost.fields.vendor === vendorId) {
      appendOption(cost, file, selectEl);
    }
    if ($(`#invoice-select-${formNum} :selected`).val() !== '0') {
      $(`#invoice-select-${formNum}`).addClass('is-valid');
    }
  });

  return invoiceSelectInputGroup;
}

function fileMatchesCost(file, cost) {
  return (
    file.cleanName.includes(cost.fields.PO_number) ||
    file.cleanName.includes(jobMap[cost.fields.job].jobCode)
  );
}

function fileHasMatchingCost(file, costs) {
  return costs.some((cost) => file.cleanName.includes(cost.fields.PO_number));
}

function createMatchedInvoiceDisplay(cleanFileName, cost) {
  const container = document.createElement('div');
  const jobName = jobMap[cost.fields.job].name;
  const currency = cost.fields.currency;
  const specifyTaxIfNeeded = currency === 'JPY' ? '(tax excl.)' : '';

  container.classList.add('inv-matched');
  container.dataset.poNum = cost.fields.PO_number;
  container.dataset.fileName = cleanFileName;
  console.log(cost);
  container.innerHTML += `
    <div class="inv-matched__body">
      <div class="inv-matched__job-name">
        ${jobName}
      </div>
      <div class="inv-matched__is-attached">
        Invoice attached
      </div>
      <div class="inv-matched__PO-number">
        ${cost.fields.PO_number}
      </div>
      <div class="inv-matched__PO-number">
      ${
        CURRENCY_SYMBOLS[currency]
      }${cost.fields.amount.toLocaleString()}<span class="tax-memo">${specifyTaxIfNeeded}</span>
      </div>
      <div class="inv-matched__validation">
      ${validationSuccessIcon}
      </div>
    </div>
    <div class="inv-matched__options">

      <div class="inv-matched__del">${deleteIcon}</div>
    </div>
  `;

  return container;
}

function hideMainInvoiceDetailsCard(PONumber) {
  const targetElement = document.querySelector(`[data-po-num="${PONumber}"]`);
  console.log(targetElement);
  targetElement.style.display = 'none';
}

function showMainInvoiceDetailsCard(PONumber) {
  const targetElement = document.querySelector(`[data-po-num="${PONumber}"]`);
  targetElement.style.display = 'grid';
}

$(document).ready(function () {
  console.log('Ready!');

  /* 
    Dynamic dropdown menu generation logic.
    When a file is uploaded, a dropdown is generated with all 
    costs that are awaiting invoices that are available to that vendor.
    */
  myDropzone = new Dropzone('#invoice-upload-form');

  const invoiceSelectArea = document.querySelector('#invoice-select-area');
  const dropzoneMessage = document.querySelector('.dz-message');

  console.log(costs);

  let formNum = 0;
  myDropzone.on('addedfile', (file) => {
    file.cleanName = sanitizeFileName(file);
    dropzoneMessage.style.display = 'none';

    if (isDuplicate(myDropzone, file)) {
      myDropzone.removeFile(file);
    } else {
      dropzoneErrorMessages.classList.add('hidden');
      const selectInputGroup = createInputGroup(file, costs, ++formNum);

      if (fileHasMatchingCost(file, costs)) {
        const cost = costs.find((cost) => file.cleanName.includes(cost.fields.PO_number));
        file.PONumber = cost.fields.PO_number;

        selectInputGroup.style.display = 'none';
        const matchedInvoiceDisplay = createMatchedInvoiceDisplay(file.cleanName, cost);
        invoiceSelectArea.appendChild(matchedInvoiceDisplay);
        // hideMainInvoiceDetailsCard(cost.fields.PO_number);
      }

      invoiceSelectArea.appendChild(selectInputGroup);
      invoiceSelectArea.style.display = 'grid';
      $('#invoice-hint').text(hintWithInvoices);

      // Seems like the file is considered rejected until the "accept" event occurs, so we wait.
      setTimeout(function () {
        formsAndFilesAreValid();
      }, 50);
    }
  });
  // Use event delegation to handle dynamically-generated elements
  invoiceSelectArea.addEventListener('change', (e) => {
    if (e.target.matches('.invoice-select')) {
      const invoiceSelector = e.target;
      const filename = e.target.dataset.fileName;
      formsAndFilesAreValid();
      const cost = costs.find((cost) =>
        invoiceSelector.selectedOptions[0].text.includes(cost.fields.PO_number),
      );
      const file = myDropzone.files.find((f) => f.cleanName === filename);
      file.PONumber = cost.fields.PO_number;

      const inputGroupToRemove = e.target.parentElement;
      inputGroupToRemove.style.display = 'none';
      invoiceSelectArea.appendChild(createMatchedInvoiceDisplay(file.cleanName, cost));
      // hideMainInvoiceDetailsCard(cost.fields.PO_number);
    }
  });

  invoiceSelectArea.addEventListener('click', (e) => {
    if (e.target.closest('.inv-matched__del')) {
      const delBtn = e.target;
      const targetFileName = delBtn.closest('.inv-matched').dataset.fileName;
      const fileToDelete = myDropzone.files.find(
        (file) => file.cleanName === targetFileName,
      );
      myDropzone.removeFile(fileToDelete);
    }
  });
});
