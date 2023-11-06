function getJobID() {
  if (typeof jobID !== 'undefined') {
    return jobID;
  } else {
    return false;
  }
}

const currencyCalc = document.querySelector('#currencyCalc');
const calcInput = document.querySelector('#calcInput');
const calcResult = document.querySelector('#calcResult');
const calcFrom = document.querySelector('#calcFrom');
const calcTo = document.querySelector('#calcTo');
var calcFromCurrency;
var calcFromRate;
var calcToCurrency;
var calcToRate;

const currencySelectors = currencyCalc.querySelectorAll('select');

function initCurrencySelectors() {
  var initialToCurrency = 'EUR';
  for (currency of currencyList) {
    var fromOption = document.createElement('option');
    fromOption.value = currency[0];
    fromOption.innerHTML = currency[1];

    var toOption = fromOption.cloneNode(true);
    if (toOption.value === initialToCurrency) {
      toOption.setAttribute('selected', 'selected');
    }
    currencyCalc.querySelector('#calcFrom').appendChild(fromOption);
    currencyCalc.querySelector('#calcTo').appendChild(toOption);
  }

  calcFromCurrency = calcFrom.value;
  calcToCurrency = calcTo.value;

  calcFromRate = forexRates[calcFromCurrency];
  calcToRate = forexRates[calcToCurrency];
}

function separateThousands(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

initCurrencySelectors();

calcInput.addEventListener('input', function () {
  var result = (calcInput.value * (calcFromRate / calcToRate)).toFixed(2);
  calcResult.value = separateThousands(result);
});

for (let i = 0; i < currencySelectors.length; i++) {
  currencySelectors[i].addEventListener('change', function () {
    calcFromCurrency = calcFrom.value;
    calcToCurrency = calcTo.value;
    calcFromRate = forexRates[calcFromCurrency];
    calcToRate = forexRates[calcToCurrency];
    var result = (calcInput.value * (calcFromRate / calcToRate)).toFixed(
      2
    );
    calcResult.value = separateThousands(result);
  });
}

$(document).ready(function () {
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
          display: (data, type, row) =>
            InvoiceTable.renderAmount(data, row),
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
      return Invoices.handleUpdate(this, costTable);
    }
  );

  PayPeriod.form.addEventListener('submit', (e) =>
    PayPeriod.submitForm(e, costTable)
  );
});
