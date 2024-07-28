import DataTable from 'datatables.net';
import {
  renderAmount,
  renderAmountJPY,
  renderInvoiceStatus,
  renderPayPeriod,
  renderRequestBtn,
  invoicesTableRowCallback,
} from '../costs-and-invoices-common-funcs.js';
import { truncate } from '../utils.js';
import { setupSortInvoicesByStatus } from '../datatables-extentions.js';

let table;
let tableEl;

const initTable = () => {
  if (!table) {
    const invoicePeriodType = DataTable.absoluteOrder('null');
    const invoiceStatusType = DataTable.absoluteOrder('null');
    tableEl = document.querySelector('#all-invoices-table');
    table = new DataTable(tableEl, {
      paging: true,
      pagingType: 'simple_numbers',
      deferRender: true,
      processing: true,
      pageLength: 50,
      autoWidth: true,
      order: [
        { name: 'invoicePeriod', dir: 'desc' },
        { name: 'jobCode', dir: 'asc' },
      ],
      orderClasses: false,
      language: {
        searchPlaceholder: 'コストを探す',
        search: '',
      },
      ajax: { url: '/pipeline/all-invoices-data/' },
      rowId: 'id',
      columns: [
        {
          data: 'job_id',
          render: (data) => `<a href="/pipeline/cost-add/${data}">Cost Sheet</a>`,
        },
        {
          data: 'amount_JPY',
          className: 'px-4 dt-right',
          render: (data) => renderAmountJPY(data),
        },
        {
          data: 'amount',
          className: 'px-4 dt-right',
          responsivePriority: 1,
          render: (data, type, row) => {
            return renderAmount(data, {
              name: row.currency,
              symbol: row.currency_symbol,
            });
          },
        },

        {
          data: 'job_date',
          name: 'invoicePeriod',
          className: 'invoice-period',
          render: (data) => {
            let date = new Date(data);
            return data ? `${date.getFullYear()}年${date.getMonth() + 1}月` : '---';
          },
          type: invoicePeriodType,
        },
        {
          data: 'job_name',
          render: {
            display: (data) => truncate(data),
            sort: (data) => data,
          },
        },
        { data: 'job_code', name: 'jobCode' },
        { data: 'vendor_name' },
        { data: 'description', render: (data) => truncate(data, 16) },
        {
          data: 'PO_number',
          render: {
            display: (data) => data,
            sort: (data, type, row) =>
              data === null ? '' : row.vendor_code + data.slice(-4),
          },
        },
        {
          data: 'invoice_status',
          name: 'invoiceStatus',
          className: 'px-3',
          width: '210px',
          render: (data, type, row) => {
            return renderInvoiceStatus(data, row);
          },
          type: invoiceStatusType,
        },
        {
          data: 'pay_period',
          render: (data) => renderPayPeriod(data),
        },
        {
          data: 'id',
          render: (data, type, row) => renderRequestBtn(data, row),
        },
        {
          data: 'id',
          visible: false,
        },
        {
          data: 'person_in_charge',
          visible: false,
        },
      ],
      columnDefs: [
        { targets: [0, -2, -3], orderable: false },
        {
          targets: [1, 2, 5],
          createdCell: function (td) {
            td.classList.add('font-monospace');
          },
        },
      ],

      rowCallback: (row, data) => invoicesTableRowCallback(row, data),
    });
  }
  setupSortInvoicesByStatus();
  return table;
};

const invoiceTable = (() => {
  const getOrInitTable = () => table || initTable();
  const getTableEl = () => getOrInitTable().table().container().querySelector('table');

  const refresh = () => table.ajax.reload();

  return {
    getOrInitTable,
    getTableEl,
    refresh,
  };
})();

export default invoiceTable;
