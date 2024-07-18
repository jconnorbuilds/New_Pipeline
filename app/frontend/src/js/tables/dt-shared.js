import DataTable from 'datatables.net';
import $ from 'jquery';
import { CSRFTOKEN } from '../utils.js';

let firstSelectedBox;
let firstSelectedRow;
let ongoingSelection = false;
let mouseDown = 0;

export const initializeGlobalMouseEvents = () => {
  document.body.addEventListener('mousedown', () => {
    mouseDown = 1;
  });

  document.body.addEventListener('mouseup', () => {
    mouseDown = 0;
    ongoingSelection = false;
  });
};

export const beginSelection = (e) => {
  ongoingSelection = true;
  firstSelectedBox = e.target;
  firstSelectedRow = e.target.closest('tr');
  firstSelectedRow.classList.toggle('.selected-row');
  firstSelectedBox.checked = !firstSelectedBox.checked;
};

export const handleSingleClick = (e) => {
  if (!mouseDown) {
    const checkbox = e.target;
    const row = checkbox.closest('tr');
    const isChecked = firstSelectedBox.checked;

    checkbox.checked = !isChecked;
    checkbox.checked
      ? row.classList.add('selected-row')
      : row.classList.remove('selected-row');
  }
};

export const selectOnDrag = (e) => {
  if (mouseDown && ongoingSelection && e.target.closest('tr')) {
    const row = e.target.closest('tr');
    const checkbox = row.querySelector('.form-check-input') || null;
    const isChecked = firstSelectedBox.checked;
    isChecked ? row.classList.add('selected-row') : row.classList.remove('selected-row');

    if (checkbox) checkbox.checked = isChecked;
  }
};

export const preventHighlighting = (e) => {
  if (mouseDown && ongoingSelection) e.preventDefault();
};

export const requestInvoice = (costID, table, costPayPeriod = 'next') => {
  // requests the vendor invoice
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    url: '/pipeline/request-single-invoice/' + costID + '/',
    method: 'POST',
    data: { pay_period: costPayPeriod },
    dataType: 'json',
    success: function (data) {
      // console.log('invoice request callback: ', data); // make this a toast
      new DataTable(table)
        .row(`#${data.response.id}`)
        .data(data.response)
        .invalidate()
        .draw(false);
    },
    error: (data) => {
      console.warn(data);
      alert(
        'There was an error. Try again, and if the error persists, request the invoice the old fashioned way',
      );
    },
  });
};
