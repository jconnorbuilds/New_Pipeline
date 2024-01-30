import { depositDateModalShowHandler } from './deposit_date.js';
import { requestInvoice } from './invoices.js';
import { table, tableEl, statusChangeHandler } from './pipeline-dt-funcs.js'; // importing table
import { plTable } from './pipeline-dt.js';

let firstSelectedBox;
let firstSelectedRow;
let ongoingSelection = false;
let mouseDown = 0;

export const drawNewRow = (newRowData) =>
  table.row(`#${newRowData.id}`).data(newRowData).invalidate().draw(false);

export const setupTableEventHandlers = (datatableEl = tableEl) => {
  datatableEl.addEventListener('click', (e) => {
    if (e.target.matches('.deposit-date' || '.job-status-select'))
      plTable.setCurrentRowID(e.target.closest('tr').getAttribute('id'));
  });

  datatableEl.addEventListener('input', (e) =>
    plTable.setCurrentSelectEl(e.target.closest('select'))
  );

  datatableEl.addEventListener('click', (e) => {
    if (e.target.matches('td.deposit-date')) depositDateModalShowHandler();
  });

  datatableEl.addEventListener('change', (e) => {
    if (e.target.matches('.job-status-select')) statusChangeHandler(e);
  });

  document.body.onmousedown = () => (mouseDown = 1);
  document.body.onmouseup = () => {
    mouseDown = 0;
    ongoingSelection = false;
  };

  // move the click+drag behavior into another module

  datatableEl.addEventListener('mousedown', (e) => {
    if (e.target.matches('.form-check-input')) {
      ongoingSelection = true;
      firstSelectedBox = e.target;
      firstSelectedRow = e.target.closest('tr');
      firstSelectedRow.classList.toggle('.selected-row');
      firstSelectedBox.checked = !firstSelectedBox.checked;
    }
  });

  datatableEl.addEventListener('click', (e) => {
    if (e.target.matches('.form-check-input')) {
      if (!mouseDown) {
        const checkbox = e.target;
        const row = checkbox.closest('tr');
        const isChecked = firstSelectedBox.checked;

        checkbox.checked = !isChecked;
        checkbox.checked
          ? row.classList.add('selected-row')
          : row.classList.remove('selected-row');
      }
    }
  });

  datatableEl.addEventListener(
    'mouseenter',
    (e) => {
      if (mouseDown && ongoingSelection && e.target.closest('tr')) {
        const row = e.target.closest('tr');
        const checkbox = row.querySelector('.form-check-input') || null;
        const isChecked = firstSelectedBox.checked;
        console.log(e.target.querySelector('th'));
        isChecked
          ? row.classList.add('selected-row')
          : row.classList.remove('selected-row');

        if (checkbox) checkbox.checked = isChecked;
      }
    },
    true
  );

  datatableEl.addEventListener('mousemove', (e) => {
    if (mouseDown && ongoingSelection) e.preventDefault();
  });

  datatableEl.addEventListener('click', (e) => {
    if (e.target.matches('.inv-req-btn')) {
      e.preventDefault();
      const costID = e.target.getAttribute('id').split('-').pop();
      requestInvoice(costID, plTable.getTable());
    }
  });
};
