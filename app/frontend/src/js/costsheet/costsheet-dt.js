import DataTable from 'datatables.net';
import {
  handleRowUpdate,
  renderAmount,
  renderAmountJPY,
  renderInvoiceStatus,
  renderPayPeriod,
  renderRequestBtn,
  renderVendorName,
  invoicesTableRowCallback,
  addRowEventListeners,
  setupPayPeriodFormSubmission,
} from '../costs-and-invoices-common-funcs.js';
import { createElement, truncate } from '../utils.js';

import penIcon from '../../../assets/images/pencil-square.svg';
import trashIcon from '../../../assets/images/trash3-fill.svg';

/**
 * Returns the jobID, taken from the URL
 *
 * @returns {string}
 */
const getJobID = () => {
  const jobID = window.location.href.split('/').slice(-2, -1)[0];
  return jobID;
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
      emptyTable: 'No costs for this job!',
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
              classes: ['btn', 'btn-outline-secondary'],
              attributes: { href: `/pipeline/${data}/update-cost/` },
              children: [editIcon],
            },
          ];

          const deleteBtn = [
            'a',
            {
              classes: ['btn', 'btn-outline-secondary'],
              attributes: { href: `/pipeline/${data}/delete-cost/` },
              children: [deleteIcon],
            },
          ];

          const btnGroup = createElement('div', {
            classes: ['btn-group', 'btn-group-sm'],
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
    createdRow: (row, data) => {
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
