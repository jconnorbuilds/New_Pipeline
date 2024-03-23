import { depositDateModalShowHandler } from '../modals/deposit-date-modal.js';
import {
  beginSelection,
  handleSingleClick,
  preventHighlighting,
  selectOnDrag,
} from '../tables/dt-shared.js';
import { table, tableEl, statusChangeHandler } from './pipeline-dt-funcs.js';
import { plTable } from './pipeline-dt.js';

export const drawNewRow = (newRowData) =>
  table.row(`#${newRowData.id}`).data(newRowData).invalidate().draw(false);

export const setupTableEventHandlers = (datatableEl = tableEl) => {
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
};
