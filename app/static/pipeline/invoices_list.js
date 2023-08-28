$(document).ready(function () {
  var allInvoicesTable = $('#all-invoices-table').DataTable({
    paging: true,
    pageLength: 50,
    responsive: {
      details: {
        display: $.fn.dataTable.Responsive.display.childRow
      }
    },
    order: [[4, 'asc'], [6, 'asc']],
    orderClasses: false,
    language: {
      searchPlaceholder: "コストを探す",
      search: "",
    },
    ajax: {
      url: '/pipeline/all-invoices-data/',
    },
    rowId: 'id',
    columns: [
      { "data": "select", visible: false },
      { "data": "costsheet_link", },
      { "data": "amount_JPY" },
      { "data": "amount_local", responsivePriority: 1 },
      {
        "data": "job_date",
        "render": function (data) {
          var date = new Date(data);
          var year = date.getFullYear();
          var month = date.getMonth() + 1;
          return year + "年" + month + "月";
        }
      },
      { "data": "job_name", responsivePriority: 1 },
      { "data": "job_code" },
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
      { "data": "id" },
    ],
    columnDefs: [
      {
        targets: [0, 1, -1, -2, -3],
        orderable: false,
      },
      {
        targets: [2, 3, 6, 9],
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).addClass("font-monospace");
        }
      },

      {
        target: 2,
        className: "dt-right",
        width: "80px",
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).css('padding-right', '10px')

        }
      },
      {
        target: 3,
        className: "dt-left",
        width: "100px",
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).css('padding-left', '15px')
        }
      },
      {
        targets: 5,
        render: $.fn.dataTable.render.ellipsis(25, true)
      },
      {
        target: 8,
        render: $.fn.dataTable.render.ellipsis(15)
      },
      {
        target: 13,
        visible: false
      }
    ],

    rowCallback: function (row, data) {
      // This button disabling/enabling logic only seems to work within the
      // rowCallbackfunction, and not within the createdRow function.
      var invoiceStatus = $(data.invoice_status).val()
      var hasVendor = (data.vendor != "");

      if (hasVendor == false) {
        $(row).find('.cost-status-select').hide();
        $(row).find('.single-invoice-request-btn').prop('disabled', true)

      } else {
        if (invoiceStatus === 'NR') {
          $(row).find('.single-invoice-request-btn').prop('disabled', false);
        } else {
          $(row).find('.single-invoice-request-btn').prop('disabled', true)
        }
      }
    }
  });

  allInvoicesTable.on("change", ".cost-vendor-select, .cost-status-select", function () {
    var formData = getCostUpdate(this);
    $("#batch-pay-csv-dl-btn").attr("disabled", false)
    $.ajax({
      headers: { 'X-CSRFToken': csrftoken },
      type: "POST",
      url: "/pipeline/invoices/",
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
          allInvoicesTable.row(`#${newData.id}`).data(newData).invalidate().draw(false);
          // allInvoicesTable.ajax.reload();
        }
      }
    })
  });
});