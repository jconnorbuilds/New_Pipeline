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
    var result = (calcInput.value * (calcFromRate / calcToRate)).toFixed(2);
    calcResult.value = separateThousands(result);
  });
}

const invoiceStatusOrderMap = {
  NR: 1,
  REQ: 2,
  REC: 3,
  REC2: 4,
  ERR: 5,
  QUE: 6,
  PAID: 7,
  NA: 8,
};

$(document).ready(function () {
  DataTable.ext.order['dom-cost-select'] = function (settings, col) {
    return this.api()
      .column(col, { order: 'index' })
      .nodes()
      .map(function (td, i) {
        let el = td.querySelector('.cost-status-select');
        if (el.getAttribute('style') === 'display: none;') {
          return 0;
        } else {
          return el ? invoiceStatusOrderMap[el.value] : 0;
        }
      });
  };

  var costTable = $('#cost-table').DataTable({
    paging: false,
    responsive: true,
    order: [[0, 'asc']],
    orderClasses: false,
    language: {
      searchPlaceholder: 'コストを探す',
      search: '',
    },

    ajax: {
      url: '/pipeline/cost-data/' + getJobID(),
    },
    rowId: 'id',
    columns: [
      {
        data: 'amount_JPY',
        className: 'px-3',
        render: function (data) {
          return '¥' + data.toLocaleString();
        },
      },
      {
        data: 'amount',
        responsivePriority: 1,
        render: function (data, type, row) {
          return row.currency + data.toLocaleString();
        },
      },
      {
        data: 'vendor_name',
        render: {
          display: function (data, type, row) {
            const vendors = row.vendors_dict ? row.vendors_dict : null;

            function createVendorOption(id, label, selectEl) {
              let optionEl = document.createElement('option');
              optionEl.value = id;
              optionEl.text = label;
              selectEl.appendChild(optionEl);
              if (id == row.vendor_id) optionEl.setAttribute('selected', '');

              return selectEl;
            }

            let selectEl = document.createElement('select');
            selectEl.classList.add('form-control-plaintext', 'cost-vendor-select');
            selectEl.setAttribute('name', 'vendor-select');
            createVendorOption(0, 'Select vendor', selectEl);

            if (vendors) {
              for (const [id, name] of Object.entries(vendors)) {
                createVendorOption(id, name, selectEl);
              }
            }

            return selectEl.outerHTML;
          },
          sort: function (data) {
            return data;
          },
        },
      },
      {
        data: 'description',
        render: function (data) {
          return truncate(data, 15);
        },
      },
      { data: 'PO_number' },
      {
        data: 'invoice_status',
        orderDataType: 'dom-cost-select',
        className: 'p-0',
        render: {
          display: function (data, type, row) {
            const STATUSES = row.invoice_status_choices;
            let selectEl = document.createElement('select');
            selectEl.classList.add('form-control-plaintext', 'cost-status-select', 'p-0');
            selectEl.setAttribute('name', 'invoice_status');
            for (const [_, status] of Object.entries(STATUSES)) {
              let optionEl = document.createElement('option');
              optionEl.value = status[0];
              optionEl.text = status[1];
              if (status[0] === data) optionEl.setAttribute('selected', '');
              selectEl.appendChild(optionEl);
            }
            return selectEl.outerHTML;
          },
          sort: function (data, type, row) {
            return data;
          },
        },
        width: '210px',
      },
      {
        // "Request invoice" button
        data: 'id',
        render: function (data, type, row) {
          const buttonEl = document.createElement('button');
          buttonEl.setAttribute('id', `invoice-request-btn-${data}`);
          buttonEl.setAttribute('type', 'button');
          buttonEl.classList.add(
            'btn',
            'btn-primary',
            'btn-sm',
            'single-invoice-request-btn'
          );
          buttonEl.textContent = 'Request invoice';

          return buttonEl.outerHTML;
        },
      },
      {
        // Edit and delete buttons
        data: 'id',
        render: function (data, type, row) {
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
    rowCallback: function (row, data) {
      // This button disabling/enabling logic only works within the
      // rowCallbackfunction, and not within the createdRow function.
      // At the time of writing this, I'm not totally sure why, but whatever
      var invoiceStatus = data.invoice_status;
      var hasVendor = data.vendor_id !== '0';
      console.log({ row }, { data });

      if (hasVendor == false) {
        $(row).find('.cost-status-select').hide();
        $(row).find('.single-invoice-request-btn').prop('disabled', true);
      } else {
        if (invoiceStatus === 'NR') {
          $(row).find('.single-invoice-request-btn').prop('disabled', false);
        } else {
          $(row).find('.single-invoice-request-btn').prop('disabled', true);
        }
      }
    },
  });

  costTable.on('change', '.cost-vendor-select, .cost-status-select', function (event) {
    var formData = getCostUpdate(this);
    event.preventDefault();

    $.ajax({
      headers: { 'X-CSRFToken': csrftoken },
      type: 'POST',
      url: '/pipeline/cost-add/' + getJobID() + '/',
      data: formData,
      processData: false, // prevents jQuery from processing the data
      contentType: false, // prevents jQuery from setting the Content-Type header
      success: function (response) {
        if (response.status === 'success') {
          var newData = response.data;
          costTable.row(`#${newData.id}`).data(newData).invalidate().draw(false);
        }
      },
    });
  });

  function getCostUpdate(selectElement) {
    /*
     * Returns a FormData object containing the value of the select element
     * that was changed, to update the status or vendor of the Cost object in the db.
     */
    var formData = new FormData();

    if ($(selectElement).hasClass('cost-vendor-select')) {
      formData.append('vendor', $(selectElement).val());
    } else if ($(selectElement).hasClass('cost-status-select')) {
      formData.append('status', $(selectElement).val());
    } else {
      alert('There was a problem getting the form data');
    }
    formData.append('cost_id', $(selectElement).closest('tr').attr('id'));
    formData.append('update', true);
    return formData;
  }
});
