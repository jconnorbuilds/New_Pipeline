import { handleModalShow as handleDepositDateModalShow } from './deposit_date.js';
import {
  table,
  tableEl,
  updateCurrentRowID,
  statusChangeHandler,
} from './pipeline-dt-funcs.js';
import { plTable } from './pipeline-dt.js';

export const drawNewRow = (newRowData) =>
  table.row(`#${newRowData.id}`).data(newRowData).invalidate().draw(false);

export const setupTableEventHandlers = (
  datatable = table,
  datatableEl = tableEl
) => {
  datatableEl.addEventListener('click', (e) => {
    let id = e.target.closest('tr').getAttribute('id');
    updateCurrentRowID(id);
  });
  datatableEl.addEventListener('input', (e) => {
    plTable.setCurrentSelectEl(e.target.closest('select'));
  });
  datatable.on('click', 'td.deposit-date', handleDepositDateModalShow());
  datatable.on('change', '.job-status-select', statusChangeHandler);
};
