import DataTable from 'datatables.net-bs5';
import {
  handleRowUpdate,
  renderAmount,
  renderAmountJPY,
  renderInvoiceStatus,
  renderPayPeriod,
  renderRequestBtn,
  renderVendorName,
  setupPayPeriodFormSubmission,
} from '../costs-and-invoices/costs-and-invoices-common-funcs.js';
import { createElement, truncate } from '../utils.js';
import {
  invoicesTableRowCallback,
  addRowEventListeners,
} from '../costs-and-invoices/costs-and-invoices-common-funcs.js';
import penIcon from '../../images/pencil-square.svg';
import trashIcon from '../../images/trash3-fill.svg';

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
    dom: 'lrtp',
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
        // width: '210px',
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
        render: (data) => {
          const editIcon = [
            'img',
            {
              attributes: {
                src: penIcon,
                alt: 'edit icon',
              },
            },
          ];
          const deleteIcon = [
            'img',
            {
              attributes: {
                src: trashIcon,
                alt: 'delete icon',
              },
            },
          ];

          const editBtn = [
            'a',
            {
              classes: ['btn', 'btn-outline-secondary', 'btn-sm'],
              attributes: { href: `/pipeline/${data}/update-cost/` },
              children: [editIcon],
            },
          ];

          const deleteBtn = [
            'a',
            {
              classes: ['btn', 'btn-outline-secondary', 'btn-sm'],
              attributes: { href: `/pipeline/${data}/delete-cost/` },
              children: [deleteIcon],
            },
          ];

          const btnGroup = createElement('div', {
            classes: ['btn-group'],
            attributes: { role: 'group' },
            children: [editBtn, deleteBtn],
          });
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
  const setupTableEventHandlers = (datatableEl = getTableEl()) => {
    handleRowUpdate(datatableEl);
    setupPayPeriodFormSubmission(datatableEl);
  };

  return { getOrInitTable, getTableEl, refresh, setupTableEventHandlers };
})();

export default costTable;
