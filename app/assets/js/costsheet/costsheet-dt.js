import DataTable from 'datatables.net-bs5';
import {
  renderAmount,
  renderAmountJPY,
  renderInvoiceStatus,
  renderPayPeriod,
  renderRequestBtn,
  renderVendorName,
} from '../costs-and-invoices/costs-and-invoices-common-funcs.js';
import * as PayPeriod from '../pay-period-modal.js';
import { truncate } from '../utils.js';
import { invoicesTableRowCallback } from '../costs-and-invoices/costs-and-invoices-common-funcs.js';
import { addRowEventListeners } from '../costs-and-invoices/costs-and-invoices-common-funcs.js';

const getJobID = () => {
  return typeof jobID !== 'undefined' ? jobID : false;
};

let table;
let tableEl;

const initTable = () => {
  tableEl = document.querySelector('#cost-table');
  table = new DataTable(tableEl, {
    paging: false,
    processing: true,
    dom: 'lfrtip',
    autoWidth: true,
    order: [[0, 'asc']],
    orderClasses: false,
    language: {
      searchPlaceholder: 'コストを探す',
      search: '',
    },

    ajax: { url: '/pipeline/cost-data/' + getJobID() },
    rowId: 'id',
    columns: [
      {
        data: 'amount_JPY',
        className: 'dt-right pe-4',
        render: (data) => renderAmountJPY(data),
      },
      {
        data: 'amount',
        className: 'dt-right pe-4',
        render: {
          display: (data, type, row) =>
            renderAmount(data, {
              name: row.currency,
              symbol: row.currency_symbol,
            }),
          sort: (data) => data,
        },
      },
      {
        data: 'vendor_name',
        render: {
          display: (data, type, row) => renderVendorName(row),
          sort: (data) => data,
        },
      },
      {
        data: 'description',
        render: (data) => truncate(data),
      },
      { data: 'PO_number' },
      {
        data: 'invoice_status',
        orderDataType: 'dom-cost-select',
        className: 'p-0',
        width: '210px',
        render: {
          display: (data, type, row) => renderInvoiceStatus(data, row),
          sort: (data) => data,
        },
      },
      {
        data: 'pay_period',
        render: (data) => renderPayPeriod(data),
      },
      {
        data: 'id',
        render: (data) => renderRequestBtn(data),
      },
      {
        // Edit and delete buttons
        data: 'id',
        render: function (data) {
          const btnGroup = document.createElement('div');
          const editBtn = document.createElement('a');
          const delBtn = document.createElement('a');
          editBtn.setAttribute('href', `/pipeline/${data}/update-cost/`);
          delBtn.setAttribute('href', `/pipeline/${data}/delete-cost/`);
          editBtn.classList.add('btn', 'btn-dark', 'btn-sm');
          delBtn.classList.add('btn', 'btn-danger', 'btn-sm');

          const editIcon = document.createElement('i');
          const delIcon = document.createElement('i');
          editIcon.classList.add('bi', 'bi-wrench-adjustable-circle');
          delIcon.classList.add('bi', 'bi-trash3-fill');

          editBtn.appendChild(editIcon);
          delBtn.appendChild(delIcon);
          btnGroup.appendChild(editBtn);
          btnGroup.appendChild(delBtn);

          return btnGroup.outerHTML;
        },
      },
      {
        data: 'id',
        visible: false,
      },
    ],
    rowCallback: (row, data) => invoicesTableRowCallback(row, data),
    createdRow: (row, data, dataIndex, cells) => {
      addRowEventListeners(row, data);
    },
  });
  return table;
};

const costTable = (() => {
  const getOrInitTable = () => table || initTable();
  const getTableEl = () =>
    getOrInitTable().table().container().querySelector('table');
  const refresh = () => table.ajax.reload();

  return { getOrInitTable, getTableEl, refresh };
})();

export default costTable;
