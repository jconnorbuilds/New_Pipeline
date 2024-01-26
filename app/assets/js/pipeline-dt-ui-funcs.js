import { table } from './pipeline-dt-funcs.js';

export const drawNewRow = (newRowData) =>
  table.row(`#${newRowData.id}`).data(newRowData).invalidate().draw(false);

export const removeRow = (newRowData) =>
  table.row(`#${newRowData.id}`).remove().draw();
