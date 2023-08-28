function getJobID() {
  if (typeof jobID !== "undefined") {
    return jobID;
  } else {
    return false;
  }
}

const currencyCalc = document.querySelector("#currencyCalc");
const calcInput = document.querySelector("#calcInput");
const calcResult = document.querySelector("#calcResult")
const calcFrom = document.querySelector("#calcFrom")
const calcTo = document.querySelector("#calcTo")
var calcFromCurrency
var calcFromRate
var calcToCurrency
var calcToRate

const currencySelectors = currencyCalc.querySelectorAll("select")

function initCurrencySelectors() {
  var initialToCurrency = "EUR"
  for (currency of currencyList) {
    var fromOption = document.createElement('option')
    fromOption.value = currency[0]
    fromOption.innerHTML = currency[1]

    var toOption = fromOption.cloneNode(true)
    if (toOption.value === initialToCurrency) {
      toOption.setAttribute('selected', 'selected')
    }
    currencyCalc.querySelector("#calcFrom").appendChild(fromOption)
    currencyCalc.querySelector("#calcTo").appendChild(toOption)
  }

  calcFromCurrency = calcFrom.value
  calcToCurrency = calcTo.value

  calcFromRate = forexRates[calcFromCurrency]
  calcToRate = forexRates[calcToCurrency]
}

function separateThousands(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

initCurrencySelectors()

calcInput.addEventListener("input", function () {
  var result = (calcInput.value * (calcFromRate / calcToRate)).toFixed(2)
  calcResult.value = separateThousands(result)
});

for (let i = 0; i < currencySelectors.length; i++) {
  currencySelectors[i].addEventListener("change", function () {
    calcFromCurrency = calcFrom.value
    calcToCurrency = calcTo.value
    calcFromRate = forexRates[calcFromCurrency]
    calcToRate = forexRates[calcToCurrency]
    var result = (calcInput.value * (calcFromRate / calcToRate)).toFixed(2)
    calcResult.value = separateThousands(result)
  });
}

const invoiceStatusOrderMap = {
  'NR': 0,
  'REQ': 1,
  'REC': 2,
  'REC2': 3,
  'ERR': 4,
  'QUE': 5,
  'PAID': 6,
  'NA': 7,
};

$(document).ready(function () {

  DataTable.ext.order['dom-cost-select'] = function (settings, col) {
    return this.api()
      .column(col, { order: 'index' })
      .nodes()
      .map(function (td, i) {
        let el = td.querySelector('.cost-status-select');
        return el ? invoiceStatusOrderMap[el.value] : 0;
      });
  };

  var costTable = $('#cost-table').DataTable({
    paging: false,
    responsive: true,
    order: [[0, 'asc']],
    orderClasses: false,
    language: {
      searchPlaceholder: "コストを探す",
      search: "",
    },

    ajax: {
      url: '/pipeline/cost-data/' + getJobID(),

    },
    rowId: 'id',
    columns: [
      { "data": "amount_JPY" },
      { "data": "amount_local" },
      { "data": "vendor" },
      { "data": "description" },
      { "data": "PO_number" },
      {
        "data": "invoice_status",
        orderDataType: "dom-cost-select",
      },
      {
        "data": "request_invoice", "render": function (data, type, row) {
          return data;
        }
      },
      {
        "data": "edit", "render": function (data, type, row) {
          return data;
        }
      },
      {
        "data": "id",
        "visible": false
      },
    ],
    columnDefs: [
      {
        target: 0,
        className: 'dt-right',
        width: "80px",
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).css('padding-right', '10px')
        }
      },
      {
        target: 1,
        className: 'dt-left',
        width: "100px",
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).css('padding-left', '10px')
        }
      },
    ],
    rowCallback: function (row, data) {
      // This button disabling/enabling logic only works within the
      // rowCallbackfunction, and not within the createdRow function.
      // At the time of writing this, I'm not totally sure why, but whatever
      var invoiceStatus = $(data.invoice_status).val()
      var hasVendor = ($(data.vendor).val() !== "0");

      if (hasVendor == false) {
        $(row).find('.cost-status-select').hide();
        $(row).find('.single-invoice-request-btn').prop('disabled', true)

      } else {
        if (invoiceStatus === 'NR') {
          $(row).find('.single-invoice-request-btn').prop('disabled', false);
        } else {
          $(row).find('.single-invoice-request-btn').prop('disabled', true);
        }
      }
    }
  });

  costTable.on("change", ".cost-vendor-select, .cost-status-select", function (event) {
    var formData = getCostUpdate(this);
    // var spinner = $("#add-job-spinner")
    event.preventDefault();
    // spinner.toggleClass('invisible')

    $.ajax({
      headers: { 'X-CSRFToken': csrftoken },
      type: "POST",
      url: "/pipeline/cost-add/" + getJobID() + '/',
      data: formData,
      processData: false, // prevents jQuery from processing the data
      contentType: false, // prevents jQuery from setting the Content-Type header
      // beforeSend: function() {
      //       spinner.removeClass('invisible');
      // },
      success: function (response) {
        if (response.status === 'success') {
          var newData = response.data
          // Use the #ID selector to target the new row and redraw with new data
          costTable.row(`#${newData.id}`).data(newData).invalidate().draw(false);
        };
      }
    });
  });

  function getCostUpdate(selectElement) {
    /*
   * Returns a FormData object containing the value of the select element
   * that was changed, to update the status or vendor of the Cost object in the db.
   */
    var formData = new FormData();

    if ($(selectElement).hasClass("cost-vendor-select")) {
      formData.append("vendor", $(selectElement).val());
    } else if ($(selectElement).hasClass("cost-status-select")) {
      formData.append("status", $(selectElement).val());
    } else {
      alert("There was a problem getting the form data");
    }
    formData.append("cost_id", $(selectElement).closest("tr").attr("id"));
    formData.append("update", true)
    return formData;
  }

});