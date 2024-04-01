import { depositDateModalShowHandler } from '../modals/deposit-date-modal.js';
import {
  beginSelection,
  handleSingleClick,
  preventHighlighting,
  selectOnDrag,
} from '../tables/dt-shared.js';
import { statusChangeHandler } from './pipeline-dt-funcs.js';
import { copyJobCodeAndNameToClipboard, plTable } from './pipeline-dt.js';

export const drawNewRow = (newRowData, table) =>
  table.row(`#${newRowData.id}`).data(newRowData).invalidate().draw(false);

export const setupTableEventHandlers = (datatableEl = plTable.getTableEl()) => {
  datatableEl.addEventListener('click', (e) => {
    if (
      e.target.matches('.deposit-date') ||
      e.target.matches('.job-status-select')
    )
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

  datatableEl.addEventListener('mousedown', (e) => {
    if (e.target.matches('.form-check-input')) beginSelection(e);
  });

  datatableEl.addEventListener('click', (e) => {
    if (e.target.matches('.form-check-input')) handleSingleClick(e);
  });

  datatableEl.addEventListener('mouseenter', (e) => selectOnDrag(e), true);

  datatableEl.addEventListener('mousemove', (e) => preventHighlighting(e));

  datatableEl.addEventListener('click', (e) => {
    if ((e.target.matches('td .job-code') && e.metaKey) || e.ctrlKey) {
      let textContent = e.target.textContent;
      copyJobCodeAndNameToClipboard(textContent);
    }
  });

  datatableEl.addEventListener('mousemove', (e) => {
    if (e.target.matches('td .job-code')) {
      let jobCodeText = e.target;
      // Check if cmd or ctrlKey is pressed and add highlight
      if (e.metaKey || e.ctrlKey) {
        jobCodeText.classList.add('highlight');
      } else {
        // If the keys are not pressed, remove the highlight
        jobCodeText.classList.remove('highlight');
      }
    }
  });

  datatableEl.addEventListener('mouseout', (e) => {
    if (e.target.matches('td .job-code')) {
      let jobCodeText = e.target;
      // Always remove the highlight when the mouse moves out of the cell
      jobCodeText.classList.remove('highlight');
    }
  });

  // Additional listener for keyup and keydown to handle cases where the mouse is still but the cmd/ctrl key is pressed or released
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && document.querySelector('.job-code:hover')) {
      document.querySelector('.job-code:hover').classList.add('highlight');
    }
  });

  document.addEventListener('keyup', () => {
    // Remove highlight from any job-code element if cmd/ctrl key is released
    let highlighted = document.querySelectorAll('.job-code.highlight');
    highlighted.forEach((element) => element.classList.remove('highlight'));
  });
};
