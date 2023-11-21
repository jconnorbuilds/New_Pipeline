const Pipeline = (() => {
  let date = new Date();
  let currentMonth = date.getMonth() + 1;
  let currentYear = date.getFullYear();
  let viewingMonth = currentMonth;
  let viewingYear = currentYear;
  let table;

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
    table,
  };
})();

const PLTableFunctions = (() => {
  let lastChangedSelectEl;
  const getLastChangedSelectEl = () => lastChangedSelectEl;
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

  const handleSuccessResponse = (table) => (response) => {
    response.status === 'success'
      ? handleNewRowDraw(table, response.data)
      : console.error(response.message);
  };

  const handleErrorResponse = (table) => (response) => {
    handleError(response.message, table);
  };

  const handleStatusUpdate = (status, rowID) => {
    let url = '/pipeline/pl-job-update/' + rowID + '/';
    $.ajax({
      headers: { 'X-CSRFToken': csrftoken },
      type: 'post',
      url: url,
      data: { status: status },
      dataType: 'json',
      success: handleSuccessResponse(Pipeline.table),
      error: handleErrorResponse(Pipeline.table),
    });
  };

  const statusChangeListener = (e) => {
    /*
     * When a user changes the job status via the status dropdown, an
     * invoice info form appears, or otherwise the status is simply updated.
     */
    const statusSelectEl = e.target;
    const initialStatus = statusSelectEl.dataset.initial;
    const status = statusSelectEl.value;
    const rowID = statusSelectEl.closest('tr').getAttribute('id');
    const table = $(e.target.closest('table')).DataTable();
    lastChangedSelectEl = statusSelectEl;

    NewClientForm.el.addEventListener('hide.bs.modal', function () {
      if (InvoiceInfo.getOpenModal() === true) {
        InvoiceInfo.modal.show();
      }
    });

    InvoiceInfo.needsToDoInvoiceForm(status, table, rowID)
      ? InvoiceInfo.openModal(status, initialStatus, table, rowID)
      : handleStatusUpdate(status, rowID);
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

  const drawNewRow = (table, newRowData) =>
    table
      .row(`#${newRowData.id}`)
      .data(newRowData)
      .invalidate()
      .draw(false);

  const needsNewRow = () =>
    Pipeline.viewingMonth == Pipeline.currentMonth &&
    Pipeline.viewingYear == Pipeline.currentYear;

  const removeRow = (table, newRowData) =>
    table.row(`#${newRowData.id}`).remove().draw();

  const handleNewRowDraw = (table, newRowData) => {
    /* 
    Close the modal, show a success toast,
    and draw a new row in the table if it belongs on the current
    page.

    arguments: 
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
      if (newDataInvoicePeriod) {
        needsNewRow()
          ? drawNewRow(table, newRowData)
          : removeRow(table, newRowData);
      }
    } else {
      console.log('else!');
      needsNewRow()
        ? drawNewRow(table, newRowData)
        : removeRow(table, newRowData);
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

  const revertStatus = (table) => {
    table.ajax.reload();
    // table
    //   .row(`#${newRowData.id}`)
    //   .data(newRowData)
    //   .invalidate()
    //   .draw(false);
  };

  const handleError = (message, table) => {
    console.error('error in the error handler');
    revertStatus(table);
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
    // updateRow,
    handleNewRowDraw,
    handleError,
    removeRow,
    statusChangeListener,
    getLastChangedSelectEl,
    handleSuccessResponse,
    handleErrorResponse,
  };
})();

const NewClientForm = (() => {
  const el = document.querySelector('#new-client-modal');

  return {
    el,
  };
})();

const InvoiceInfo = (() => {
  let modalWillOpen = false;
  const modalEl = document.querySelector('#set-job-invoice-info');
  const modal = new bootstrap.Modal(modalEl);
  const form = modalEl.querySelector('#invoice-info-form');
  let modalShowListener;
  let modalHideListener;

  const setOpenModal = (bool) => {
    modalWillOpen = bool;
  };
  const getOpenModal = () => {
    console.log(modalWillOpen);
    return modalWillOpen;
  };

  function getFormData(selectEl) {
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

    Object.entries(PLTableFunctions.getUpdate(selectEl)).forEach(
      ([name, value]) => (formData['inv-' + name] = value)
    );
    return { jobIDField, formData };
  }

  const submitForm = (selectEl) => (e) => {
    e.preventDefault();

    let { jobIDField, formData } = getFormData(selectEl);
    const table = $(selectEl.closest('table')).DataTable();

    $.ajax({
      headers: { 'X-CSRFToken': csrftoken },
      type: 'POST',
      url: `/pipeline/set-client-invoice-info/${jobIDField.value}/`,
      data: formData,
      dataType: 'json',
      success: (response) => {
        modal.hide();
        Pipeline.table.ajax.reload();
        form.reset();
      },
      error: PLTableFunctions.handleErrorResponse(table),
    });
  };

  const handleModalHide = () => {
    Pipeline.table.ajax.reload();
    modalEl.removeEventListener('show.bs.modal', modalShowListener);
    modalEl.removeEventListener('hide.bs.modal', modalHideListener);
  };

  const handleModalShow = (selectEl, selectedStatus) => {
    PLTableFunctions.showSelectedStatus(selectEl, selectedStatus);
  };

  const createModalShowListener = (selectEl, selectedStatus) => {
    modalShowListener = wrappingFunction = () => {
      handleModalShow(selectEl, selectedStatus);
    };
    return modalShowListener;
  };

  const createModalHideListener = () => {
    modalHideListener = () => handleModalHide();
    return modalHideListener;
  };

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
    let result = JSON.parse(
      table.cell('#' + rowID, 'invoice_info_completed:name').node()
        .textContent
    );
    console.log(result);
    return result;
  };

  const needsToDoInvoiceForm = (selectedStatus, table, rowID) => {
    return isRequired(selectedStatus) && !isCompleted(table, rowID);
  };

  const setInitialInfo = (table, rowID) => {
    const invoiceRecipientField = form.querySelector(
      '#id_inv-invoice_recipient'
    );
    const hiddenJobIDField = form.querySelector('#id_inv-job_id');

    invoiceRecipientField.value = PLTableFunctions.getClientID(
      table,
      rowID
    );
    hiddenJobIDField.value = rowID;
  };

  const openModal = (selectEl, initStatus, table, rowID) => {
    modalEl.addEventListener(
      'show.bs.modal',
      createModalShowListener(selectEl, selectEl.value)
    );

    modalEl.addEventListener('hide.bs.modal', createModalHideListener());

    setOpenModal(true);
    setInitialInfo(table, rowID);
    modal.show();
  };

  form.addEventListener('submit', (e) => {
    submitForm(PLTableFunctions.getLastChangedSelectEl())(e);
  });

  return {
    setOpenModal,
    getOpenModal,
    modalEl,
    modal,
    needsToDoInvoiceForm,
    form,
    setInitialInfo,
    handleModalHide,
    handleModalShow,
    createModalShowListener,
    createModalHideListener,
    submitForm,
    openModal,
  };
})();

const DepositDate = (() => {
  const form = document.querySelector('#deposit-date-form');
  const modalEl = document.querySelector('#set-deposit-date');
  const modal = new bootstrap.Modal(modalEl);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let depositDateData = {};
    depositDateData['deposit_date'] = $('#id_deposit_date').val();
    depositDateData['job_id'] = PLTableFunctions.currentRowID;
    let url = `/pipeline/set-deposit-date/${PLTableFunctions.currentRowID}/`;

    $('#deposit-date-form')[0].reset();

    $.ajax({
      headers: { 'X-CSRFToken': csrftoken },
      type: 'post',
      url: url,
      data: depositDateData,
      dataType: 'json',
      success: PLTableFunctions.handleSuccessResponse(Pipeline.table),
      error: PLTableFunctions.handleErrorResponse(Pipeline.table),
    });
  });

  const getRowID = (e) => {
    return e.target.closest('tr').getAttribute('id');
  };

  const handleModalShow = () => (e) => {
    let rowID = getRowID(e);
    // make a 'setRowID' function in PLTF?
    PLTableFunctions.currentRowID = rowID;
    let row = Pipeline.table.row(`#${rowID}`).node();
    jobStatus = row.querySelector('.job-status-select').value;
    if (['INVOICED1', 'INVOICED2', 'FINISHED'].includes(jobStatus)) {
      modal.show();
    }
  };
  return {
    modal,
    handleModalShow,
  };
})();
