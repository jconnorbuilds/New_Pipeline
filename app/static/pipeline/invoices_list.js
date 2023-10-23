const invoiceStatusOrderMap = {
  NR: '1',
  REQ: '2',
  REC: '3',
  REC2: '4',
  ERR: '5',
  QUE: '6',
  PAID: '7',
  NA: '8',
};

$(document).ready(function () {
  DataTable.ext.order['dom-cost-select'] = function (settings, col) {
    return this.api()
      .column(col, { order: 'index' })
      .nodes()
      .map(function (td, i) {
        let el = td.querySelector('.cost-status-select');
        return el.getAttribute('style') === 'display: none;'
          ? 0
          : el
          ? invoiceStatusOrderMap[el.value]
          : 0;
      });
  };

  var allInvoicesTable = $('#all-invoices-table').DataTable({
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
    ajax: {
      url: '/pipeline/all-invoices-data/',
    },
    rowId: 'id',
    columns: [
      {
        data: 'job_id',
        render: function (data, type, row) {
          return `<a href="/pipeline/cost-add/${data}">Cost Sheet</a>`;
        },
      },
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
        data: 'job_date',
        className: 'invoice-period',
        render: {
          display: function (data) {
            let date = new Date(data);
            return data ? `${date.getFullYear()}年${date.getMonth() + 1}月` : '---';
          },
          sort: function (data) {
            return data;
          },
        },
      },
      { data: 'job_name', responsivePriority: 1 },
      { data: 'job_code' },
      { data: 'vendor_name' },
      {
        data: 'description',
        render: function (data) {
          return truncate(data, 15);
        },
      },
      {
        data: 'PO_number',
        render: {
          display: function (data) {
            return data;
          },
          sort: function (data, type, row) {
            console.log(row.vendor_code + data.slice(-4));
            return row.vendor_code + data.slice(-4);
          },
        },
      },
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
    ],
    columnDefs: [
      {
        targets: [0, -1, -2],
        orderable: false,
      },
      {
        targets: [1, 2, 5],
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).addClass('font-monospace');
        },
      },

      {
        target: 1,
        className: 'dt-right',
        width: '80px',
      },
      {
        target: 2,
        className: 'dt-left',
      },
      {
        targets: 4,
        render: $.fn.dataTable.render.ellipsis(25, true),
      },
      {
        target: 7,
        render: $.fn.dataTable.render.ellipsis(15),
      },
      // {
      //   target: 13,
      //   visible: false,
      // },
    ],

    rowCallback: function (row, data) {
      // This button disabling/enabling logic only seems to work within the
      // rowCallbackfunction, and not within the createdRow function.
      var invoiceStatus = data.invoice_status;
      var hasVendor = data.vendor != '';

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

  allInvoicesTable.on('change', '.cost-vendor-select, .cost-status-select', function () {
    var formData = getCostUpdate(this);
    $('#batch-pay-csv-dl-btn').attr('disabled', false);
    $.ajax({
      headers: { 'X-CSRFToken': csrftoken },
      type: 'POST',
      url: '/pipeline/invoices/',
      data: formData,
      processData: false, // prevents jQuery from processing the data
      contentType: false, // prevents jQuery from setting the Content-Type header
      // beforeSend: function() {
      //       spinner.removeClass('invisible');
      // },
      success: function (response) {
        if (response.status === 'success') {
          var newData = response.data;
          // Use the #ID selector to target the new row and redraw with new data
          allInvoicesTable.row(`#${newData.id}`).data(newData).invalidate().draw(false);
          // allInvoicesTable.ajax.reload();
        }
      },
    });
  });
});
