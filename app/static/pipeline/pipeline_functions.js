const Pipeline = (() => {
  let date = new Date();
  let currentMonth = date.getMonth() + 1;
  let currentYear = date.getFullYear();
  let viewingMonth = currentMonth;
  let viewingYear = currentYear;

  const newClientBtn = document.querySelector('#pipeline-new-client-btn');
  newClientBtn.addEventListener('click', () =>
    InvoiceInfo.setOpenModal(false)
  );

  const ajaxCall = (
    formData,
    url,
    successCallback,
    handleError,
    modal,
    table
  ) => {
    $.ajax({
      headers: { 'X-CSRFToken': csrftoken },
      type: 'POST',
      url: url,
      data: formData,
      dataType: 'json',
      success: (response) => {
        response.status === 'success'
          ? successCallback(modal, table, (newRowData = response.data))
          : console.error(
              'Something happend - maybe the form received bad data.'
            );
      },
      error: () => {
        typeof handleError === 'function'
          ? handleError()
          : console.error('Error occurred during the AJAX request');
      },
    });
  };

  const displayErrorMessage = (message) => {
    console.error(message);
  };

  return {
    newClientBtn,
    ajaxCall,
    currentMonth,
    currentYear,
    viewingMonth,
    viewingYear,
    displayErrorMessage,
  };
})();

const PipelineTable = (() => {
  const renderInvoiceStatus = (data, row) => {
    const STATUSES = row.job_status_choices;
    let selectEl = document.createElement('select');
    selectEl.classList.add('form-control-plaintext', 'job-status-select');
    selectEl.setAttribute('name', 'job_status');

    for (const [_, status] of Object.entries(STATUSES)) {
      let optionEl = document.createElement('option');
      optionEl.value = status[0];
      optionEl.text = status[1];
      if (status[0] === data) optionEl.setAttribute('selected', '');
      selectEl.appendChild(optionEl);
    }
    return selectEl.outerHTML;
  };

  const getUpdate = (selectEl) => {
    /*
     * Returns an object containing the value of the select element
     */
    var formData = {};
    selectEl.classList.contains('job-status-select')
      ? (formData.status = selectEl.value)
      : console.error('There was a problem getting the form data');
    return formData;
  };

  const getClientID = (table, rowID) =>
    parseInt(table.cell(`#${rowID}`, 'client_id:name').data());

  const drawNewRow = (table, newRowData) => {
    table.row(`#${newRowData.id}`).data(newRowData).invalidate().draw();
  };

  const needsNewRow = () => {
    return (
      Pipeline.viewingMonth == Pipeline.currentMonth &&
      Pipeline.viewingYear == Pipeline.currentYear
    );
  };

  const removeRow = (table, newRowData) => {
    table.row(`#${newRowData.id}`).remove().draw();
  };

  const handleNewRowDraw = (modal, modalEl, table, newRowData) => {
    /* 
    Close the modal, show a success toast,
    and draw a new row in the table if it belongs on the current
    page.

    arguments: 
    modal: the modal to be hidden 
    table: the job table
    newRowData: response data returned from the ajax call
    */
    const invoiceInfoSavedToast = bootstrap.Toast.getOrCreateInstance(
      $('#invoice-set-success-toast')
    );

    if (newRowData.job_date) {
      // TODO: 'edge' case - needs to draw new rows even on all-jobs view.
      // Should set up a cleaner way to handle viewingMonth+Year, maybe
      // consolidate into one viewingDate view
      newDataInvoicePeriod = newRowData.job_date.split('-');
      console.log(needsNewRow());
      if (Pipeline.newDataInvoicePeriod) {
        needsNewRow()
          ? drawNewRow(table, newRowData)
          : removeRow(table, newRowData);
      }
    } else {
      console.log('else!');
      PipelineTable.needsNewRow()
        ? PipelineTable.drawNewRow(table, newRowData)
        : PipelineTable.removeRow(table, newRowData);
    }
  };

  const rowCallback = (row, data) => {
    const statusCell = $(row).find('.job-status-select');
    const initialStatus = statusCell.val();
    const depositDateCell = $(row).find('.deposit-date');

    if (['INVOICED1', 'INVOICED2', 'FINISHED'].includes(data.status)) {
      row.classList.add('job-invoiced');
    }

    ['INVOICED1', 'INVOICED2', 'FINISHED'].includes(statusCell.val())
      ? depositDateCell.removeClass('text-body-tertiary')
      : depositDateCell.addClass('text-body-tertiary');

    statusCell.attr('data-initial', initialStatus);
    initialStatus === 'FINISHED'
      ? $(row).addClass('job-finished')
      : $(row).removeClass('job-finished');
    ['ONGOING', 'READYTOINV'].includes(initialStatus)
      ? $(row).addClass('job-ongoing')
      : $(row).removeClass('job-ongoing');
    totalExpectedRevenueAmt += parseInt(data.revenue);
  };

  const showSelectedStatus = (selectEl, selectedStatus) =>
    (selectEl.value = selectedStatus);

  const revertStatus = (selectEl, initStatus, table) => {
    // console.log('INSIDE THE FUNC', initStatus);
    // selectEl.value = initStatus;
    table.ajax.reload();
  };

  const handleError = (selectEl, initStatus, message, table) => {
    console.error('error in the error handler');
    revertStatus(selectEl, initStatus, table);
    Pipeline.displayErrorMessage(message);
  };

  DataTable.ext.order['dom-job-select'] = function (settings, col) {
    return this.api()
      .column(col, { order: 'index' })
      .nodes()
      .map(function (td, i) {
        let status = td.querySelector('.job-status-select').value;
        return status ? jobStatusOrderMap[status] : 0;
      });
  };

  DataTable.ext.search.push(function (settings, data, dataIndex) {
    const unreceivedPayment = data[10] === '---';
    const ongoing = ['ONGOING', 'READYTOINV'].includes(data[9]);
    if (unreceivedFilter.checked) {
      return toggleOngoingFilter.checked
        ? unreceivedPayment || ongoing
        : unreceivedPayment && !ongoing;
    }
    if (showOnlyOngoingFilter.checked) return ongoing;
    if (!toggleOngoingFilter.checked) return !ongoing;

    return true;
  });

  DataTable.ext.search.push(function (settings, data, dataIndex) {
    const outstandingVendorPayment = data[13] === 'false' && +data[5] > 0;
    if (showOutstandingPayments.checked) {
      return outstandingVendorPayment ? true : false;
    }
    return true;
  });

  return {
    renderInvoiceStatus,
    getUpdate,
    rowCallback,
    getClientID,
    showSelectedStatus,
    revertStatus,
    needsNewRow,
    drawNewRow,
    handleNewRowDraw,
    handleError,
    removeRow,
  };
})();

const NewClientForm = (() => {
  const el = document.querySelector('#new-client-modal');

  return {
    el,
  };
})();

const InvoiceInfo = (() => {
  let openModal = false;
  const modalEl = document.querySelector('#set-job-invoice-info');
  const modal = new bootstrap.Modal(modalEl);
  const form = modalEl.querySelector('#invoice-info-form');
  let modalShowListener;
  let modalHideListener;

  const setOpenModal = (bool) => {
    openModal = bool;
  };
  const getOpenModal = () => {
    return openModal;
  };

  const handleModalHide = (selectEl, initStatus, modalEl, table) => {
    console.log('inside MODAL HIDE handler', { initStatus });
    PipelineTable.revertStatus(selectEl, initStatus, table);

    modalEl.removeEventListener('show.bs.modal', modalShowListener);
    modalEl.removeEventListener('hide.bs.modal', modalHideListener);
  };

  const handleModalShow = (selectEl, selectedStatus) => {
    PipelineTable.showSelectedStatus(selectEl, selectedStatus);
  };

  const createModalShowListener = (selectEl, selectedStatus) => {
    modalShowListener = wrappingFunction = () => {
      handleModalShow(selectEl, selectedStatus);
    };
    return modalShowListener;
  };

  const createModalHideListener = (
    selectEl,
    initStatus,
    modalEl,
    table
  ) => {
    modalHideListener = wrappingFunction = () => {
      handleModalHide(selectEl, initStatus, modalEl, table);
    };
    return modalHideListener;
  };

  // const getModalShowListener = () => {
  //   return modalShowListener;
  // };

  // const getModalHideListener = () => {
  //   return modalHideListener;
  // };

  const isRequired = (selectedStatus) => {
    const requiredStatuses = [
      'INVOICED1',
      'INVOICED2',
      'FINISHED',
      'ARCHIVED',
    ];
    return requiredStatuses.includes(selectedStatus);
  };

  const isCompleted = (table, rowID) => {
    return JSON.parse(
      table.cell('#' + rowID, 'invoice_info_completed:name').node()
        .textContent
    );
  };

  const setInitialInfo = (table, rowID) => {
    const invoiceRecipientField = form.querySelector(
      '#id_inv-invoice_recipient'
    );
    const hiddenJobIDField = form.querySelector('#id_inv-job_id');

    invoiceRecipientField.value = PipelineTable.getClientID(table, rowID);
    hiddenJobIDField.value = rowID;
  };

  // const successCallbackB = (modal, table, newRowData) => {
  //   /*
  //   Close the modal, show a success toast,
  //   and draw a new row in the table if it belongs on the current
  //   page.

  //   arguments:
  //   modal: the modal to be hidden
  //   table: the job table
  //   newRowData: response data returned from the ajax call
  //   */
  //   const invoiceInfoSavedToast = bootstrap.Toast.getOrCreateInstance(
  //     $('#invoice-set-success-toast')
  //   );
  //   modalEl.removeEventListener(
  //     'hide.bs.modal',
  //     PipelineTable.revertStatus
  //   );
  //   modal.hide();
  //   invoiceInfoSavedToast.show();

  //   // if (newRowData.job_date) {
  //   //   newDataInvoicePeriod = newRowData.job_date.split('-');
  //   //   if (Pipeline.newDataInvoicePeriod)

  //   // Pipeline.viewingMonth == Pipeline.currentMonth &&
  //   // Pipeline.viewingYear == Pipeline.currentYear
  //   //   ? table.row(`#${newRowData.id}`).data(newRowData).invalidate().draw()
  //   //   : table.row(`#${newRowData.id}`).remove().draw();
  //   // } else {

  //   //  }}
  // };

  const submitForm = (e, selectData) => {
    e.preventDefault();
    const selectEl = e.target;

    const recipientField = document.querySelector(
      '#id_inv-invoice_recipient'
    );
    const nameField = document.querySelector('#id_inv-invoice_name');
    const jobIDField = document.querySelector('#id_inv-job_id');
    const yearField = document.querySelector('#id_inv-invoice_year');
    const monthField = document.querySelector('#id_inv-invoice_month');

    let formData = {};
    formData['inv-invoice_recipient'] = recipientField.value;
    formData['inv-invoice_name'] = nameField.value;
    formData['inv-job_id'] = jobIDField.value;
    formData['inv-invoice_year'] = yearField.value;
    formData['inv-invoice_month'] = monthField.value;
    Object.entries(selectData).forEach(
      ([name, value]) => (formData['inv-' + name] = value)
    );

    form.reset();

    let url =
      '/pipeline/set-client-invoice-info/' + jobIDField.value + '/';
    Pipeline.ajaxCall(
      formData,
      url,
      handleNewRowDraw,
      () => PipelineTable.revertStatus(selectEl),
      invoiceInfoModal,
      jobTable
    );

    return formData;
  };

  return {
    setOpenModal,
    getOpenModal,
    modalEl,
    modal,
    isRequired,
    isCompleted,
    form,
    setInitialInfo,
    handleModalHide,
    handleModalShow,
    createModalShowListener,
    getModalShowListener,
    createModalHideListener,
    // getModalHideListener,
    submitForm,
  };
})();
