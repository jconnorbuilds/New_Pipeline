import * as bootstrap from 'bootstrap';
import { requestInvoice } from './invoices/invoices.js';

const form = document.querySelector('form#pay-period-form');
const modalEl = document.querySelector('#pay-period-modal');
const modal = new bootstrap.Modal(modalEl);
const defineMenu = (row) => row.querySelector('ul.dropdown-menu > li');
const descriptionDiv = document.querySelector(
  '#pay-period-modal .invoice-desc'
);
modalEl.addEventListener('hide.bs.modal', () => {
  form.reset();
  descriptionDiv.innerHTML = '';
});

const submitForm = (e, table) => {
  e.preventDefault();
  const costID = document.querySelector('#pay-period-form #id_cost_id').value;
  const payPeriod = document.querySelector(
    '#pay-period-form #id_pay_period'
  ).value;
  requestInvoice(costID, table, payPeriod);

  modal.hide();
};

const launchModal = (data) => {
  const idField = document.querySelector('#pay-period-modal #id_cost_id');

  const descriptors = [
    `Vendor name: ${data.vendor_name}`,
    `PO number: ${data.PO_number}`,
    `Job name: ${data.job_name}`,
  ];
  descriptors.forEach((str) => {
    const pEl = document.createElement('p');
    pEl.textContent = str;
    descriptionDiv.appendChild(pEl);
  });

  idField.value = data.id;
  modal.show();
};

export { form, modal, defineMenu, launchModal, submitForm };
