import * as PayPeriod from './pay_period.js';
import * as InvoiceTable from './invoices_common.js';
import { truncate } from './utils.js';
import * as Invoices from './invoices.js';
import { Calculator } from './currency_calculator.js';
import * as State from './pipeline-state.js';
import * as bootstrap from 'bootstrap';

function getJobID() {
  if (typeof jobID !== 'undefined') {
    return jobID;
  } else {
    return false;
  }
}
const currencyList = currencies; // currencies is declared globally in html template

$(document).ready(function () {
  Calculator.setup(currencyList);
  const costTable = $('#cost-table').DataTable({
    paging: false,
    responsive: true,
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
        className: 'px-3',
        render: (data) => InvoiceTable.renderAmountJPY(data),
      },
      {
        data: 'amount',
        responsivePriority: 1,
        render: {
          display: (data, type, row) => InvoiceTable.renderAmount(data, row),
          sort: (data) => data,
        },
      },
      {
        data: 'vendor_name',
        render: {
          display: (data, type, row) => InvoiceTable.renderVendorName(row),
          sort: (data) => data,
        },
      },
      {
        data: 'description',
        render: (data) => truncate(data, 15),
      },
      { data: 'PO_number' },
      {
        data: 'invoice_status',
        orderDataType: 'dom-cost-select',
        className: 'p-0',
        width: '210px',
        render: {
          display: (data, type, row) =>
            InvoiceTable.renderInvoiceStatus(data, row),
          sort: (data) => data,
        },
      },
      {
        data: 'pay_period',
        render: (data) => InvoiceTable.renderPayPeriod(data),
      },
      {
        data: 'id',
        render: (data) => InvoiceTable.renderRequestBtn(data),
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
    columnDefs: [
      {
        target: 0,
        className: 'dt-right',
        width: '80px',
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).css('padding-right', '10px');
        },
      },
      {
        target: 1,
        className: 'dt-left',
        width: '100px',
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).css('padding-left', '10px');
        },
      },
    ],
    rowCallback: (row, data) => InvoiceTable.rowCallback(row, data),
  });

  costTable.on(
    'change',
    '.cost-vendor-select, .cost-status-select',
    function () {
      return getNewRowData(this, costTable);
    }
  );

  PayPeriod.form.addEventListener('submit', (e) =>
    PayPeriod.submitForm(e, costTable)
  );
});
