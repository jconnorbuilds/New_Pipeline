import Modal from 'bootstrap/js/dist/modal';
import { requestInvoice } from '../tables/dt-shared.js';

const form = document.querySelector('form#pay-period-form');
const modalEl = document.querySelector('#pay-period-modal');
const modal = new Modal(modalEl);
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

const launchModal = (rowData) => {
  console.log({ rowData });
  const idField = document.querySelector('#pay-period-modal #id_cost_id');

  const descriptors = [
    `Vendor name: ${rowData.vendor_name}`,
    `PO number: ${rowData.PO_number}`,
    `Job name: ${rowData.job_name}`,
  ];
  descriptors.forEach((str) => {
    const pEl = document.createElement('p');
    pEl.textContent = str;
    descriptionDiv.appendChild(pEl);
  });

  idField.value = rowData.id;
  modal.show();
};

export { form, defineMenu, launchModal, submitForm };
