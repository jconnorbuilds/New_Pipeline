$(document).ready(function () {
  const statusFilters = document.querySelectorAll(
    '.display-filter .status-filter'
  );

  DataTable.ext.search.push(function (settings, data, dataIndex) {
    const status = data[9];
    let selectedStatuses = [];
    statusFilters.forEach((status) => {
      if (status.checked)
        selectedStatuses.push(status.value.toUpperCase());
    });
    console.log(selectedStatuses);
    if (selectedStatuses.length > 0)
      return selectedStatuses.includes(status) ? true : false;

    return true;
  });

  const allInvoicesTable = $('#all-invoices-table').DataTable({
    paging: true,
    pageLength: 50,
    responsive: {
      details: {
        display: $.fn.dataTable.Responsive.display.childRow,
      },
    },
    order: [
      [3, 'asc'], //job date (asc)
      [5, 'asc'], //job code (asc)
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
        render: (data) =>
          `<a href="/pipeline/cost-add/${data}">Cost Sheet</a>`,
      },
      {
        data: 'amount_JPY',
        className: 'px-3',
        render: (data) => InvoiceTable.renderAmountJPY(data),
      },
      {
        data: 'amount',
        responsivePriority: 1,
        render: {
          display: (data, type, row) =>
            InvoiceTable.renderAmount(data, row),
          sort: (data) => data,
        },
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
      { data: 'job_name', responsivePriority: 2 },
      { data: 'job_code' },
      { data: 'vendor_name' },
      { data: 'description', render: (data) => truncate(data, 15) },
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
        responsivePriority: 3,
        render: (data) => InvoiceTable.renderRequestBtn(data),
      },
      {
        data: 'id',
        visible: false,
      },
    ],
    columnDefs: [
      { targets: [0, -1, -2], orderable: false },
      {
        targets: [1, 2, 5],
        createdCell: function (td, cellData, rowData, row, col) {
          td.classList.add('font-monospace');
        },
      },
      { target: 1, className: 'dt-right', width: '80px' },
      { target: 2, className: 'dt-left' },
      { targets: 4, render: $.fn.dataTable.render.ellipsis(25, true) },
      { target: 7, render: $.fn.dataTable.render.ellipsis(15) },
    ],

    rowCallback: (row, data) => InvoiceTable.rowCallback(row, data),
  });

  allInvoicesTable.on(
    'change',
    '.cost-vendor-select, .cost-status-select',
    function () {
      return Invoices.drawNewRow(this, allInvoicesTable);
    }
  );

  PayPeriod.form.addEventListener('submit', (e) =>
    PayPeriod.submitForm(e, allInvoicesTable)
  );

  let filters = document.querySelectorAll('.display-filter input');

  filters.forEach((f) =>
    f.addEventListener('change', () => {
      allInvoicesTable.draw();
    })
  );
});
