import $ from 'jquery';
import 'datatables.net-responsive-bs5';
import DataTable from 'datatables.net-responsive-bs5';
import * as State from './pipeline-state.js';
import { updateRevenueDisplay } from './pipeline_funcs.js';
import { truncate } from './common.js';
import { setTotalExpectedRevenueAmt } from './pipeline-ui-funcs.js';
import {
  refreshRevenueDisplay,
  setExpectedRevenueDisplayText,
} from './pipeline-ui-funcs.js';
import {
  renderInvoiceStatus,
  updateCurrentRowID,
  rowCallback,
} from './pipeline-dt-funcs.js';
import { statusChangeHandler } from './pipeline-dt-ui-funcs.js';
import { handleModalShow as handleDepositDateModalShow } from './deposit_date.js';

let table;
let tableEl;

export function initTable() {
  if (!table) {
    tableEl = document.querySelector('#job-table');
    table = new DataTable(tableEl, {
      paging: false,
      responsive: true,
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
          responsivePriority: 2,
          render: (data, type, row) =>
            `<input type='checkbox' name='select' value=${row.id} class='form-check-input'>`,
        },
        {
          data: 'client_name',
          responsivePriority: 5,
          render: (data, type, row) =>
            `<a href="client-update/${row.client_id}">${data}</a>`,
        },
        {
          data: 'job_name',
          className: 'job-label',
          responsivePriority: 1,
          render: {
            // prettier-ignore
            display: (data, type, row) => row.invoice_name
                ? `<a href="/pipeline/${row.id}/job-detail/">INV: ${truncate(row.invoice_name, 15)}</a>`
                : `<a href="/pipeline/${row.id}/job-detail/">${truncate(data, 15)}</a>`,
            sort: (data) => data,
          },
        },
        { data: 'job_code' },
        {
          data: 'revenue',
          className: 'pe-4 revenue-amt',
          responsivePriority: 3,
          render: (data, type, row) => `¥${data.toLocaleString()}`,
        },
        {
          data: 'total_cost',
          className: 'pe-4',
          responsivePriority: 4,
          render: {
            display: (data, type, row) =>
              // prettier-ignore
              `<a href="/pipeline/cost-add/${row.id}/">¥${data.toLocaleString()}</a>`,
            sort: (data) => data,
          },
        },
        {
          data: 'profit_rate',
          className: 'pe-4',
          width: '120px',
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
          responsivePriority: 6,
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
  }
  return table;
}

const datatableUtils = () => {
  let currentRowID;
  let selectedStatus;
  let currentSelectEl;

  const getTable = () => table || initTable();
  const getTableEl = () => tableEl;
  const setCurrentRowID = (id) => (currentRowID = id);
  const getCurrentRowID = () => currentRowID;
  const getClientID = () =>
    parseInt(table.cell(`#${currentRowID}`, 'client_id:name').data());
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
};

export const plTable = datatableUtils();
