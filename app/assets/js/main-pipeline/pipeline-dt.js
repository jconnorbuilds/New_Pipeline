import DataTable from 'datatables.net-bs5';

import * as State from './pipeline-state.js';
import { truncate } from '../utils.js';
import {
  setTotalExpectedRevenueAmt,
  refreshRevenueDisplay,
} from './pipeline-ui-funcs.js';
import { renderInvoiceStatus, rowCallback } from './pipeline-dt-funcs.js';

let table;
let tableEl;

export const initTable = () => {
  tableEl = document.querySelector('#job-table');
  table = new DataTable(tableEl, {
    paging: false,
    processing: true,
    dom: 'lfrtip',
    autoWidth: true,
    order: [
      [9, 'asc'],
      [7, 'desc'],
      [3, 'asc'],
    ],
    orderClasses: false,
    rowId: 'id',
    language: {
      searchPlaceholder: 'ジョブを探す',
      search: '',
    },
    preDrawCallback: () => setTotalExpectedRevenueAmt(0),
    drawCallback: () => refreshRevenueDisplay(), // update this to calculate once after table finishes drawing?
    ajax: {
      url:
        '/pipeline/pipeline-data/' +
        State.getViewYear() +
        '/' +
        State.getViewMonth() +
        '/',
      dataSrc: (json) => json.data,
    },
    columns: [
      {
        data: null,
        render: (data, type, row) =>
          `<input type='checkbox' name='select' value=${row.id} class='form-check-input'>`,
      },
      {
        data: 'client_name',
        render: (data, type, row) =>
          `<a href="client-update/${row.client_id}">${data}</a>`,
      },
      {
        data: 'job_name',
        className: 'job-label',
        render: {
          // prettier-ignore
          display: (data, type, row) => row.invoice_name
                ? `<a href="/pipeline/${row.id}/job-detail/">INV: ${truncate(row.invoice_name)}</a>`
                : `<a href="/pipeline/${row.id}/job-detail/">${truncate(data)}</a>`,
          sort: (data) => data,
        },
      },
      { data: 'job_code' },
      {
        data: 'revenue',
        className: 'revenue-amt',
        render: (data, type, row) => `¥${data.toLocaleString()}`,
      },
      {
        data: 'total_cost',
        className: 'px-4',
        render: {
          display: (data, type, row) =>
            // prettier-ignore
            `<a href="/pipeline/cost-add/${row.id}/">¥${data.toLocaleString()}</a>`,
          sort: (data) => data,
        },
      },
      {
        data: 'profit_rate',
        className: 'px-4',
        render: (data) => `${data}%`,
      },
      {
        data: 'job_date',
        className: 'invoice-period',
        render: {
          display: (data) => {
            let date = new Date(data);
            return data
              ? `${date.getFullYear()}年${date.getMonth() + 1}月`
              : '---';
          },
          sort: (data) => data,
        },
      },
      {
        data: 'job_type',
        name: 'job_type',
      },
      {
        data: 'status',
        name: 'status',
        width: '120px',
        render: {
          display: (data, type, row) => renderInvoiceStatus(data, row),
        },
        orderDataType: 'dom-job-select',
      },
      {
        data: 'deposit_date',
        name: 'deposit_date',
        className: 'deposit-date',
        defaultContent: '---',
      },

      {
        data: 'invoice_info_completed',
        name: 'invoice_info_completed',
        visible: false,
        render: (data, type, row) => {
          return row.invoice_name && row.invoice_month && row.invoice_year
            ? true
            : false;
        },
      },
      {
        data: 'client_id',
        name: 'client_id',
        visible: false,
      },
      {
        data: 'all_invoices_paid',
        visible: false,
      },
    ],
    columnDefs: [
      { target: 0, className: 'dt-center', searchable: false },
      { targets: [4, 5, 6], className: 'dt-right' },
      {
        targets: [4, 5, 6],
        createdCell: (td, cellData, rowData, row, col) =>
          $(td).addClass('font-monospace'),
      },
    ],

    rowCallback: (row, data) => rowCallback(row, data),
    createdRow: (row, data, dataIndex) => {
      if (!data.deposit_date) row.classList.add('payment-unreceived');
    },
  });
  return table;
};

export const plTable = (() => {
  let currentRowID;
  let selectedStatus;
  let currentSelectEl;

  const getTable = () => table || initTable();
  const getTableEl = () => tableEl;
  const setCurrentRowID = (id) => (currentRowID = id);
  const getCurrentRowID = () => currentRowID;
  const getClientID = () =>
    +table.cell(`#${currentRowID}`, 'client_id:name').data();
  const refresh = () => {
    table.ajax.reload();
  };
  const keepTrackOfCurrentStatus = (status) => {
    selectedStatus = status;
  };
  const getStatus = () => selectedStatus;
  const setCurrentSelectEl = (selectEl) => (currentSelectEl = selectEl);
  const getCurrentSelectEl = () => currentSelectEl;

  return {
    setCurrentRowID,
    getCurrentRowID,
    setCurrentSelectEl,
    getCurrentSelectEl,
    getClientID,
    keepTrackOfCurrentStatus,
    getStatus,
    getTable,
    getTableEl,
    refresh,
  };
})();
