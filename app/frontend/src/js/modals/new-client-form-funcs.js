'use strict';
import { createElement } from '../utils.js';
import { bootstrap } from '../base.js';
import createAndInitializeToast from '../toast-notifs.js';
import invoiceInfo from './invoice-details-modal.js';
import { hideLoadingSpinner } from '../main-pipeline/pipeline-ui-funcs.js';

const newClientModalEl = document.querySelector('#new-client-modal');
const newClientForm = document.querySelector('#new-client-form');
const submitButton = newClientForm.querySelector('button[type="submit"]');
const friendlyNameInput = newClientForm.querySelector('#id_friendly_name');
const properNameInput = newClientForm.querySelector('input[name="proper_name"]');
const properNameJapaneseInput = newClientForm.querySelector(
  'input[name="proper_name_japanese"]',
);
const spinner = document.querySelector('#add-client-spinner');
const validateInputs = () => {
  if (properNameInput.value || properNameJapaneseInput.value) {
    submitButton.removeAttribute('disabled');
  } else {
    submitButton.setAttribute('disabled', '');
  }
};
const clientField = document.querySelector('#id_client');
const invoiceRecipient = document.querySelector('#id_inv-invoice_recipient');
const errorMsgs = document.querySelector('#new-client-errors');

const processFormErrors = (errors) => {
  const clientFriendlyNameErrorMsg = errors['friendly_name'];
  if (clientFriendlyNameErrorMsg) {
    friendlyNameInput.classList.add('is-invalid'); // TODO: set up proper client-side validation
    errorMsgs.appendChild(createElement('div', { text: clientFriendlyNameErrorMsg }));
  }
  hideLoadingSpinner();
};

// TODO: Clean up all of this validation stuff
// TODO: Maybe we simply re-load the list from the backend to greatly simplify
const handleSuccessfulSubmission = (response) => {
  if (response.status === 'success') {
    spinner.classList.add('invisible');
    const addNewClientOption = () =>
      createElement('option', {
        attributes: { value: response.id, selected: '' },
        text: `${response.client_friendly_name} - ${response.prefix}`,
      });
    // adds the newly added client to the client list
    clientField.appendChild(addNewClientOption());

    bootstrap.Modal.getOrCreateInstance('#new-client-modal').toggle();
    // adds the newly added client to the invoice recipient list
    // (in the invoice info modal)
    invoiceRecipient.appendChild(addNewClientOption());
    newClientForm.classList.remove('was-validated');
    newClientForm.reset();

    // create and instantiate toast for successful client creation
    createAndInitializeToast({
      headerText: 'New client added',
      bodyText: response.client_friendly_name,
    }).show();

    errorMsgs.replaceChildren(); // removes all error messages
    [friendlyNameInput].forEach((field) =>
      field.classList.remove('is-valid', 'is-invalid'),
    );
  } else {
    processFormErrors(response.errors);
  }
};

const newClientFormSubmission = (e) => {
  e.preventDefault();

  fetch('/pipeline/modal-client-add/', {
    method: 'post',
    body: new FormData(newClientForm),
  })
    .then((response) => response.json())
    .then((response) => handleSuccessfulSubmission(response))
    .catch((error) => {
      alert(error);
      newClientForm.classList.add('was-validated');
      hideLoadingSpinner();
    });
};

const initializeNewClientForm = () => {
  submitButton.setAttribute('disabled', '');
  properNameInput.addEventListener('input', () => validateInputs());
  properNameJapaneseInput.addEventListener('input', () => validateInputs());
  newClientForm.addEventListener('submit', (e) => newClientFormSubmission(e));
  newClientModalEl.addEventListener('hide.bs.modal', () => {
    if (invoiceInfo.getOpenModal()) invoiceInfo.modal.show();
  });
};

export default initializeNewClientForm;
