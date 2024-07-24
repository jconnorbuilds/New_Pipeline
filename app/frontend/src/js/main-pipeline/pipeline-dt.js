import $ from 'jquery';
import DataTable from 'datatables.net';
import { state } from './PipelineState.js';
import { truncate } from '../utils.js';
import {
  setTotalExpectedRevenueAmt,
  refreshRevenueDisplay,
  setupStatusOrdering,
} from './pipeline-ui-funcs.js';
import { renderInvoiceStatus, rowCallback } from './pipeline-dt-funcs.js';
import { bootstrap } from '../base.js';
let table;
let tableEl;

const ONGOING_STATUSES = ['ONGOING', 'READYTOINV'];

let jobCodeNameMap = new Map();

const initTable = () => {
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
    drawCallback: () => refreshRevenueDisplay(),
    ajax: {
      url: `/pipeline/pipeline-data/${state.viewYear}/${state.viewMonth}/`,
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
          display: (data, type, row) => {
            const cellContent = document.createElement('a');
            cellContent.setAttribute('href', `/pipeline/${row.id}/job-detail/`);
            if (!ONGOING_STATUSES.includes(row.status)) {
              cellContent.textContent = `INV: ${truncate(row.invoice_name)}`;
            } else {
              cellContent.textContent = truncate(data);
            }

            return cellContent;
          },
          filter: (data) => data,
        },
      },
      {
        data: 'job_code',
        className: 'dt-center',
        render: (data, type, row) => {
          const cellContent = document.createElement('span');
          cellContent.classList.add('copyable', 'job-code');
          cellContent.textContent = data;
          if (!ONGOING_STATUSES.includes(row.status)) {
            cellContent.dataset.bsToggle = 'tooltip';
            cellContent.dataset.bsPlacement = 'top';
            cellContent.dataset.bsTitle = `${row.job_name}`;
            new bootstrap.Tooltip(cellContent);
          }
          return cellContent;
        },
      },
      {
        data: 'revenue',
        className: 'revenue-amt',
        render: (data) => `¥${data.toLocaleString()}`,
      },
      {
        data: 'total_cost',
        className: 'px-4',
        render: {
          display: (data, type, row) =>
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
            return data ? `${date.getFullYear()}年${date.getMonth() + 1}月` : '---';
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
        type: 'status',
        width: '120px',
        render: {
          display: (data, type, row) => renderInvoiceStatus(data, row),
        },
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
          return row.invoice_name && row.invoice_month && row.invoice_year ? true : false;
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
      {
        targets: [4, 5, 6],
        className: 'dt-right',
        createdCell: (td) => $(td).addClass('font-monospace'),
      },
    ],

    rowCallback: (row, data) => rowCallback(row, data),
    createdRow: (row, data, dataIndex, cells) => {
      if (!data.deposit_date) row.classList.add('payment-unreceived');
      jobCodeNameMap.set(data.job_code, data.job_name);

      /* 
      this should work but is currently broken in DataTables v2.0.2 as of 2023/3/23. Currently using the workaround from here:
      

      if (['ONGOING', 'READYTOINV'].includes(data.status)) {
        row.classList.add('table-primary');
      } else {
        row.classList.remove('table-primary');
      }
      */

      // workaround from https://github.com/DataTables/DataTablesSrc/issues/262
      if (ONGOING_STATUSES.includes(data.status)) {
        cells.forEach((cell) =>
          cell.classList.add('bg-primary-subtle', 'text-primary-emphasis'),
        );
      } else {
        cells.forEach((cell) =>
          cell.classList.remove('bg-primary-subtle', 'text-primary-emphasis'),
        );
      }
    },
  });
  setupStatusOrdering();
  return table;
};

export const copyJobCodeAndNameToClipboard = (jobCode) => {
  navigator.clipboard.writeText(`${jobCode} ${jobCodeNameMap.get(jobCode)}`);
};

export const plTable = (() => {
  let currentRowID;
  let selectedStatus;
  let currentSelectEl;

  const getOrInitTable = () => table || initTable();
  const getTableEl = () => getOrInitTable().table().container().querySelector('table');
  const setCurrentRowID = (id) => (currentRowID = id);
  const getCurrentRowID = () => currentRowID;
  const getClientID = () => +table.cell(`#${currentRowID}`, 'client_id:name').data();
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
    getOrInitTable,
    getTableEl,
    refresh,
  };
})();
