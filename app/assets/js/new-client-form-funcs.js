import $, { error } from 'jquery';
import { CSRFTOKEN, createElement } from './utils.js';
import { Modal } from 'bootstrap';
import createAndInitializeToast from './toast-notifs.js';
import invoiceInfo from './invoice_details_modal.js';

const newClientModalEl = document.querySelector('#new-client-modal');
const newClientForm = document.querySelector('#new-client-form');
const submitButton = newClientForm.querySelector('button[type="submit"]');
const friendlyNameInput = newClientForm.querySelector('#id_friendly_name');
const properNameInput = newClientForm.querySelector(
  'input[name="proper_name"]'
);
const properNameJapaneseInput = newClientForm.querySelector(
  'input[name="proper_name_japanese"]'
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
  console.log(errors);
  const clientFriendlyNameErrorMsg = errors['friendly_name'];
  if (clientFriendlyNameErrorMsg) {
    friendlyNameInput.classList.add('is-invalid'); // TODO: set up proper client-side validation
    errorMsgs.appendChild(
      createElement('div', { text: clientFriendlyNameErrorMsg })
    );
  }

  // newClientForm.classList.add('was-validated');
  spinner.classList.add('invisible');
};

const handleSuccessfulSubmission = (response) => {
  // const invoiceInfoModalIsOpen = !!invoiceRecipient;
  // console.log(invoiceInfoModalIsOpen);
  if (response.status === 'success') {
    spinner.classList.add('invisible');
    const addNewClientOption = () =>
      createElement('option', {
        attributes: { value: response.id, selected: '' },
        text: `${response.client_friendly_name} - ${response.prefix}`,
      });
    // adds the newly added client to the client list
    clientField.appendChild(addNewClientOption());
    // adds the newly added client to the invoice recipient list ( in the invoice info modal)

    Modal.getOrCreateInstance('#new-client-modal').toggle();
    invoiceRecipient.appendChild(addNewClientOption());
    newClientForm.classList.remove('was-validated');
    newClientForm.reset();

    // create and instantiate toast for successful client creation
    createAndInitializeToast(
      'New client added',
      response.client_friendly_name
    ).show();

    errorMsgs.replaceChildren(); // removes all error messages
    [friendlyNameInput].forEach((field) =>
      field.classList.remove('is-valid', 'is-invalid')
    );
  } else {
    processFormErrors(response.errors);
  }
};

const newClientFormSubmission = (e) => {
  e.preventDefault();
  const formData = {
    friendly_name: document.querySelector('#id_friendly_name').value,
    job_code_prefix: document.querySelector('#id_job_code_prefix').value,
    proper_name: document.querySelector('#id_proper_name').value,
    proper_name_japanese: document.querySelector('#id_proper_name_japanese')
      .value,
    new_client: 'new ajax client add',
  };

  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'POST',
    url: '/pipeline/',
    data: formData,
    beforeSend: () => spinner.classList.remove('invisible'),
    success: (response, textStatus) => {
      handleSuccessfulSubmission(response), console.log(textStatus);
    },
    error: (jqXHR) => {
      alert('form not submitted', jqXHR.statusText);
      newClientForm.classList.add('was-validated');
      spinner.classList.add('invisible');
    },
  });
};

const initializeNewClientForm = () => {
  console.log('adding event listeners to newClientForm');
  submitButton.setAttribute('disabled', '');
  properNameInput.addEventListener('input', () => validateInputs());
  properNameJapaneseInput.addEventListener('input', () => validateInputs());
  newClientForm.addEventListener('submit', (e) => newClientFormSubmission(e));
  newClientModalEl.addEventListener('hide.bs.modal', () => {
    if (invoiceInfo.getOpenModal()) invoiceInfo.openModal();
  });
};

export default initializeNewClientForm;
