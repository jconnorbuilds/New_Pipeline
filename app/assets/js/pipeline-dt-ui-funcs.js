import { depositDateModalShowHandler } from './deposit_date.js';
import { table, tableEl, statusChangeHandler } from './pipeline-dt-funcs.js'; // importing table
import { plTable } from './pipeline-dt.js';

export const drawNewRow = (newRowData) =>
  table.row(`#${newRowData.id}`).data(newRowData).invalidate().draw(false);

export const setupTableEventHandlers = (datatableEl = tableEl) => {
  datatableEl.addEventListener('click', (e) =>
    plTable.setCurrentRowID(e.target.closest('tr').getAttribute('id'))
  );

  datatableEl.addEventListener('input', (e) =>
    plTable.setCurrentSelectEl(e.target.closest('select'))
  );

  datatableEl.addEventListener('click', (e) => {
    if (e.target.matches('td.deposit-date')) depositDateModalShowHandler();
  });

  datatableEl.addEventListener('change', (e) => {
    if (e.target.matches('.job-status-select')) statusChangeHandler(e);
  });
};
