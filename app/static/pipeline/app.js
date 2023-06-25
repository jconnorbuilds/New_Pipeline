$(document).ready(function(){
    console.log('Ready!');
    let date = new Date()
    let currentMonth = date.getMonth() + 1
    let currentYear = date.getFullYear()
    // Initialise and set settings for the main Jobs table
    var selectedDate = ""
    var totalRevenueYtd = 0
    var avgMonthlyRevenueYtd = 0
    var totalRevenueMonthlyExp = 0
    var totalRevenueMonthlyAct = 0
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;


    var jobTable = $('#job-table').DataTable({
        paging: false,
        responsive: true,
        order: [[8, 'desc'],[4,'asc']],
        orderClasses: false,
        rowId: 'id',
        language: {
            searchPlaceholder: "Search jobs",
            search: "",
        },
        ajax: {
            url: '/pipeline/pipeline-data/' + currentYear + '/' + currentMonth + '/',
            dataSrc: function(json) {
                updateRevenueDisplay(json)
                console.log(json)
                return json.data
            }
        },
        columns: [
            { "data": "select", responsivePriority: 2 }, 
            { 
                "data": "id",
                "visible": false
            },
            { "data": "client_name", responsivePriority: 4 },
            {
                 "data": "client_id",
                 "name": "client_id",
                 "visible": false
            }, 
            { "data": "job_name", responsivePriority: 1 },
            { "data": "job_code", },
            { "data": "revenue", responsivePriority: 3 },
            { "data": "total_cost", responsivePriority: 5 },
            { "data": "profit_rate"},
            {
                "data": "job_date",
                "render": function (data) {
                    var date = new Date(data);
                    var year = date.getFullYear();
                    var month = date.getMonth() + 1;
                    return year + "年" + month + "月";
                }
            },
            {"data": "job_type"},
            {
                "data": "status",
                "name": "status"
            },
            {
                "data": "invoice_info_completed",
                "name": "invoice_info_completed",
                "visible": false
            }
        ],
        columnDefs: [
            {
                target: 0,
                className: 'dt-center',
                searchable: false,
            },
            {
                targets: [0, 1, -1, -2,],
                orderable: false
            },
            {
                targets: [6, 7],
                className: 'dt-right'
            },
            {
                targets: [5, 6, 7],
                createdCell: function (td, cellData, rowData, row, col) {
                    $(td).addClass("font-monospace");
                }
            },

        ],
        "rowCallback": function (row, data) {
            var statusCell = $(row).find(".job-status-select")
            var initialStatus = statusCell.val()
            statusCell.attr("data-initial", initialStatus)
            if (initialStatus === "FINISHED") {
                $(row).addClass('job-finished');
            } else {
                $(row).removeClass('job-finished');
            }
        },
    });

    let rangeCheckbox = $('#csv-export-use-range')
    rangeCheckbox.click(function(){
        if (rangeCheckbox.is(':checked')) {
            console.log('checked')
            $('#thru-month').removeClass('invisible');
            $('#thru-year').removeClass('invisible');
            }
        else {
            console.log('nope')
            // $('#thru-month').attr('disabled',true);
            // $('#thru-year').attr('disabled',true);
            $('#thru-month').addClass('invisible');
            $('#thru-year').addClass('invisible');
            $('#thru-month').val($('#from-month').val()).change();
            $('#thru-year').val($('#from-year').val()).change();
        }
    });
    $('#from-month').change(function(){
        if (rangeCheckbox.is(':not(:checked)')){
            $('#thru-month').val($('#from-month').val()).change();
        }
    });
    $('#from-year').change(function(){
        if (rangeCheckbox.is(':not(:checked)')){
            $('#thru-year').val($('#from-year').val()).change();
        }
    });
    $('.update-cost-table').click(function() {
        var forms = document.getElementsByTagName('form');
        for (var i = 0; i < forms.length; i++) {
            forms[i].submit();
            console.log('something happened in JS');
        }
    });
    
    var $firstSelectedBox;
    var $firstSelectedRow;
    var duringSelection = false;

    var mouseDown = 0;

    document.body.onmousedown = function() {
        mouseDown = 1;
    }
    document.body.onmouseup = function(){
        mouseDown = 0;
        duringSelection = false;
    }

    $('table').on('click', '.form-check-input', function(event) {
        if (!mouseDown) {
            var $box = $(this);
            var $row = $box.closest('tr');
            $box.prop('checked', !$firstSelectedBox.prop('checked'))
            $row.toggleClass('selected-row', $box.prop('checked'))
        }
    });

    $('table').on('mousedown', '.form-check-input', function(event) {
        duringSelection = true;

        // Store the first selected checkbox and row
        $firstSelectedBox = $(this);
        $firstSelectedRow = $(this).closest('tr'); 
        
        $firstSelectedRow.toggleClass('selected-row')
        $firstSelectedBox.prop('checked', !$firstSelectedBox.prop('checked'))
    });
    
    $('table').on('mouseenter', 'tr', function(event) {
        if (mouseDown && duringSelection) {
            var $row = $(this);
            var $box = $row.find('.form-check-input');
            $row.toggleClass('selected-row', $firstSelectedBox.prop('checked'))
            $box.prop('checked', $firstSelectedBox.prop('checked'))
        }
    });

    $('table').on('mousemove', function(event) {
        if (mouseDown && duringSelection) {
            // stop from highlighting text when dragging during multiple select
            event.preventDefault();
        }
    });

    function getJobID() {
        if (typeof jobID !== "undefined") {
            return jobID;
        } else {
            return false;
        }
    }

    var costTable = $('#cost-table').DataTable({
        paging: false,
        responsive: true,
        order: [[0, 'asc']],
        orderClasses: false,
        language: {
        searchPlaceholder: "Search costs",
        search: "",
        },
        
        ajax: {
            url: '/pipeline/cost-data/' + getJobID(),
            
        },
        rowId: 'id',
        columns: [
            {"data": "amount_JPY"},
            {"data": "amount_local"},
            {"data": "vendor"},
            {"data": "description"},
            {"data": "PO_number"},
            {"data": "invoice_status"},
            {"data": "request_invoice", "render": function (data, type, row) {
                return data;
            }},
            {"data": "edit", "render": function(data, type, row){
                return data;
            }}, 
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
        rowCallback: function(row, data) {
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

    $("#cost-table").on("change", ".cost-vendor-select, .cost-status-select", function(event) {
        var formData = getCostUpdate(this);
        // var spinner = $("#add-job-spinner")
        event.preventDefault();
        // spinner.toggleClass('invisible')
        // console.log(JSON.stringify(formData))

        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
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

                    // $("table").append(response.html);
                    // spinner.addClass('invisible');
                    // $("#job-form").removeClass('was-validated')
                    // $(".toast").each(function() {
                    //     $(this).show()
                    // });
                    // var job = response.data;

                    //         var toast = document.createElement("div");
                    //         toast.classList.add('toast', 'position-fixed', 'bg-success-subtle', 'border-0', 'top-0', 'end-0');
                    //         toast.setAttribute('role', 'alert');
                    //         toast.setAttribute('aria-live', 'assertive');
                    //         toast.setAttribute('aria-atomic', 'true');

                    //         var jobDescriptor = formData['job_name'].toUpperCase() + " from " + $("#id_client option:selected").text();
                    //         var header = document.createElement('div');
                    //         header.classList.add('toast-header');
                    //         header.innerHTML = `
                    //             <i class="bi bi-check2-circle" class="rounded me-2"></i>
                    //             <strong class="me-auto">Job added</strong>
                    //             <small class="text-muted">Just now</small>
                    //             <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                    //             `;
                    //         var body = document.createElement('div');
                    //         body.classList.add('toast-body');
                    //         body.innerText = jobDescriptor;

                    //         toast.appendChild(header);
                    //         toast.appendChild(body);

                    //         document.body.appendChild(toast);

                    //         var toastElement = new bootstrap.Toast(toast);
                    //         toastElement.show();
                    //         setTimeout(function() {
                    //             $(toastElement).fadeOut("fast", function() {
                    //                 $(this).remove();
                    //             });
                    //         }, 1000);
                    //         $("#job-form").get(0).reset();

                    //     } else {
                    //         console.log('it did not work')
                    //         $("#job-form").addClass('was-validated');
                    //         spinner.addClass('invisible');
                    //     };
                    // },
                    // error: function(data) {
                    //     alert('Form submission failed');
                    //     spinner.addClass('invisible');
                    // },

                    // table.clear().rows.add(formData).draw();
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
        console.log(selectElement.className)

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

    function getJobUpdate(selectElement) {
        /*
        * Returns a FormData object containing the value of the select element
        * that was changed, to update the status of the Job object in the db.
        */
        var formData = new FormData();
        if ($(selectElement).hasClass("job-status-select")) {
            formData.append("status", $(selectElement).val());
        } else {
            alert("There was a problem getting the form data");
        }
        formData.append("job_id", $(selectElement).closest("tr").attr("id"));
        formData.append("update-job", true)
        return formData;
    }

    function jobTableAjaxCall(formData, successCallBack) {
        $.ajax({
            headers: { 'X-CSRFToken': csrftoken },
            type: "POST",
            url: "/pipeline/",
            data: formData,
            processData: false, // prevents jQuery from processing the data
            contentType: false, // prevents jQuery from setting the Content-Type header
            success: function (response) {
                if (response.status === 'success') {
                    var newData = response.data
                    successCallBack(newData)
                };
            }
        });
    }

    jobTable.on("change", ".job-status-select", function () {

        var formData = getJobUpdate(this);
        var statusSelectEl = $(this)
        var selectedStatus = statusSelectEl.val();
        var initialStatus = statusSelectEl.data("initial");
        // console.log(initialStatus)
        var rowID = $(this).closest("tr").attr("id")
        const invoiceInfoCompleted = jobTable.cell('#' + rowID, 'invoice_info_completed:name').data()
        const requiresInvoiceInfo = ["INVOICED","FINISHED"]
        console.log(invoiceInfoCompleted)
        
        if (requiresInvoiceInfo.includes(selectedStatus) && invoiceInfoCompleted == false) {
            const setInvoiceInfoModal = new bootstrap.Modal(document.getElementById('set-job-invoice-info'))
            const clientID = parseInt(jobTable.cell('#' + rowID, 'client_id:name').data())
            const invoiceInfoModalEl = document.querySelector('#set-job-invoice-info')        
            const form = invoiceInfoModalEl.querySelector('#invoice-info-form')
            const invoiceRecipientFieldDefault = form.querySelector('#id_invoice_recipient')
            const hiddenJobIDField = form.querySelector('#id_job_id')
            
            invoiceRecipientFieldDefault.value = clientID
            hiddenJobIDField.value = rowID
            setInvoiceInfoModal.show()
            
            const cancelBtn = document.getElementById('set-invoice-info-cancel')
            cancelBtn.addEventListener('click', function () {
                statusSelectEl.val(initialStatus)
            });

            form.addEventListener('submit', function(event) {
                jobTableAjaxCall(formData, function (newData) {
                    jobTable.row(`#${newData.id}`).data(newData).invalidate().draw(false);
                })
            });

        } else {
            // # TODO: implement loading spinner?
            jobTableAjaxCall(formData, function (newData) {
                jobTable.row(`#${newData.id}`).data(newData).invalidate().draw(false);
            });
        };
    });

    var allInvoicesTable = $('#all-invoices-table').DataTable({
        paging: true,
        pageLength: 50,
        responsive: {
            details: {
                display: $.fn.dataTable.Responsive.display.childRow
            }},
        order: [[4, 'asc'],[6, 'asc']],
        orderClasses: false,
        language: {
            searchPlaceholder: "Search invoices",
            search: "",
        },
        ajax: {
            url: '/pipeline/all-invoices-data/',
        },
        rowId: 'id',
        columns: [
            { "data": "select", visible: false},
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
            { "data": "job_code"},
            { "data": "vendor" },
            { "data": "description" },
            { "data": "PO_number" },
            { "data": "invoice_status" },
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

        // createdRow: function (row, data, dataIndex) {
        //     var vendorColumnId = 'costsheet-vendor' + (dataIndex + 1);
        //     $(row).find('.cost-vendor-select').attr('id', vendorColumnId);
            
        // },
        rowCallback: function (row, data) {
            // This button disabling/enabling logic only works within the
            // rowCallbackfunction, and not within the createdRow function.
            // At the time of writing this, I'm not totally sure why, but whatever
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

    function submitCostUpdate(formData) {
        
    };

    $("#all-invoices-table").on("change", ".cost-vendor-select, .cost-status-select", function () {
        var formData = getCostUpdate(this);
        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        $("#batch-pay-csv-dl-btn").attr("disabled",false)
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

    $('table').on("click", ".single-invoice-request-btn", function(event) {
        // console.log($(this))
        event.preventDefault()

        var cost_id = $(this).attr('id').split('-').pop()
        console.log(cost_id)
        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        var table = $(this).closest('table').DataTable();
            
        $.ajax({
            headers: { 'X-CSRFToken': csrftoken },
            url: "/pipeline/request-single-invoice/" + cost_id + "/",
            method: "POST",
            success: function(data) {
                alert(data.message)
                // should really optimize this by getting all table data from a single endpoint
                // so a single row can be reloaded
                table.ajax.reload()                
            },
            error: function(data) {
                alert("There was an error. Try again, and if the error persists, request the invoice the old fashioned way")
            }
        })
    })

    // Job form submission
    $("#job-form").submit(function(event) {
        var spinner = $("#add-job-spinner")
        event.preventDefault();
        spinner.toggleClass('invisible')
        var formData = {
            job_name: $("#id_job_name").val(),
            client: $("#id_client").val(),
            job_type: $("#id_job_type").val(),
            revenue: $("#id_revenue").val(),
            personInCharge: $("#id_personInCharge").val(),
            year: $("#id_year").val(),
            month: $("#id_month").val(),
            addjob: 'addjob via ajax'
        };
        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        $.ajax({
            headers: {'X-CSRFToken': csrftoken },
            type: "POST",
            url: "/pipeline/",
            data: formData,
            beforeSend: function() {
                  spinner.removeClass('invisible');
            },
            success: function (response) {
                if (response.status === 'success') {
                    // $("table").append(response.html);
                    spinner.addClass('invisible');
                    $("#job-form").removeClass('was-validated')
                    $(".toast").each(function() {
                        $(this).show()
                    });
                    var job = response.data;
                    jobTable.row.add($(job)).draw();

                    // update total billed this month
                    // var totalBilledMonthlyExp = job.total_revenue_monthly_expected;
                    var originalVal = parseInt($("#total-billed-monthly-exp").text().replace(/(¥|,)/g, ''));
                    // console.log(`originalVal ${originalVal}`);
                    var newVal = parseInt(job.revenue.replace(/(¥|,)/g, ''));
                    // console.log(`newVal ${job.revenue}`);
                    var resultVal = '¥' + (originalVal + newVal).toLocaleString();
                    // console.log(resultVal);
                    $("#total-billed-monthly-exp").text(resultVal)
                    
                    var toast = document.createElement("div");
                    toast.classList.add('toast', 'position-fixed', 'bg-success-subtle', 'border-0', 'top-0', 'end-0');
                    toast.setAttribute('role', 'alert');
                    toast.setAttribute('aria-live', 'assertive');
                    toast.setAttribute('aria-atomic', 'true');

                    var jobDescriptor = formData['job_name'].toUpperCase() + " from " + $("#id_client option:selected").text();
                    var header = document.createElement('div');
                    header.classList.add('toast-header');
                    header.innerHTML = `
                        <i class="bi bi-check2-circle" class="rounded me-2"></i>
                        <strong class="me-auto">Job added</strong>
                        <small class="text-muted">Just now</small>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                        `;
                    var body = document.createElement('div');
                    body.classList.add('toast-body');
                    body.innerText = jobDescriptor;

                    toast.appendChild(header);
                    toast.appendChild(body);

                    document.body.appendChild(toast);

                    var toastElement = new bootstrap.Toast(toast);
                    toastElement.show();
                    setTimeout(function() {
                        $(toastElement).fadeOut("fast", function() {
                            $(this).remove();
                        });
                    }, 1000);
                    $("#job-form").get(0).reset();

                } else {
                    console.log('it did not work')
                    $("#job-form").addClass('was-validated');
                    spinner.addClass('invisible');
                };
            },
            error: function(data) {
                alert('Form submission failed');
                spinner.addClass('invisible');
            },
        });
    });

    var pipelineMonth = $("#pipeline-month");
    var pipelineYear = $("#pipeline-year");
    filterEarliestYear = 2021;

    yearOption = filterEarliestYear
    while (yearOption <= currentYear +1) {
        pipelineYear.append(`<option value="${yearOption}">${yearOption}年</option>`)
        yearOption++;
    };
        
    pipelineMonth.val(currentMonth);
    pipelineYear.val(currentYear);
    var pipelineViewState = "monthly"

    function filterData(year, month) {
        var url = '/pipeline/pipeline-data/';
        if (year !== undefined && month !== undefined) {
            url = url + year + '/' + month + '/';
        }
        // using the callback function parameter of load() to display other variables on the page
        jobTable.ajax.url(url).load(updateRevenueDisplay) 
    }

    function updateRevenueDisplay(data) {
        // console.log("updating revenue")
        totalRevenueYtd = data.total_revenue_ytd;
        avgMonthlyRevenueYtd = data.avg_monthly_revenue_ytd;
        totalRevenueMonthlyExp = data.total_revenue_monthly_expected;
        totalRevenueMonthlyAct = data.total_revenue_monthly_actual;
        $("#total-revenue-ytd").html(`${totalRevenueYtd}`)
        $("#avg-revenue-ytd").html(`${avgMonthlyRevenueYtd}`)
        $("#total-revenue-monthly-exp").html(`${totalRevenueMonthlyExp}`)
        $("#total-revenue-monthly-act").html(`${totalRevenueMonthlyAct}`)
    }
    
    $(".toggle-view").click(function() {
        if (pipelineViewState == "monthly") {
            pipelineViewState = "all";
            $("#view-state").text(pipelineViewState);
            $(".monthly-item").slideUp("fast");
            $(".toggle-view").html("<b>Viewing all jobs</b>")
            filterData(undefined, undefined);
        } else {
            pipelineViewState = "monthly";
            $("#view-state").text(pipelineViewState);
            $(".monthly-item").slideDown("fast");
            $(".toggle-view").html("<b>Viewing jobs by month</b>")
            filterData(pipelineYear.val(), pipelineMonth.val());
        }
    });

    $("#pipeline-month, #pipeline-year").change(function() {
        filterData(pipelineYear.val(), pipelineMonth.val());
    });

    $("#pipeline-next").click(function() {
        var month = parseInt(pipelineMonth.val());
        var year = parseInt(pipelineYear.val());
        if (month != 12) {
           month ++;
           
        } else if ((year + 1) > currentYear + 1) {
            // add some error message?
        } else {
            month = 1;
            year++;
        } 
        pipelineMonth.val(month);
        pipelineYear.val(year);
        filterData(year, month);
    });

    $("#pipeline-prev").click(function() {
        var month = parseInt(pipelineMonth.val());
        var year = parseInt(pipelineYear.val());
        if (month != 1) {
           month --;
        } else if ((year - 1) < filterEarliestYear) {
            // add some error message?
        } else {
            month = 12;
            year--;
        }
        pipelineMonth.val(month);
        pipelineYear.val(year);
        filterData(year, month);
    });

    $("#pipeline-current").click(function() {
        pipelineYear.val(currentYear);
        pipelineMonth.val(currentMonth);
        filterData(currentYear, currentMonth);
    });


    var clientForm = $('#new-client-form');
    var submitButton = clientForm.find('button[type="submit"]');

    var properNameInput = clientForm.find('input[name="proper_name"]');
    var properNameJapaneseInput = clientForm.find('input[name="proper_name_japanese"]');

    properNameInput.on('input', validateInputs);
    properNameJapaneseInput.on('input', validateInputs);

    submitButton.prop('disabled', true);

    // Validation function
    function validateInputs() {
        // Check if either field has a value
        if (properNameInput.val() || properNameJapaneseInput.val()) {
            submitButton.prop('disabled', false);
        } else {
            submitButton.prop('disabled', true);
        }
    }

    //New Client form submission
    $("#new-client-form").submit(function(event) {
        var spinner = $("#add-client-spinner")
        event.preventDefault();
        spinner.removeClass('invisible')
        // $("#add-job-spinner").addClass('testclass')
        var formData = {
            friendly_name: $("#id_friendly_name").val(),
            job_code_prefix: $("#id_job_code_prefix").val(),
            proper_name: $("#id_proper_name").val(),
            proper_name_japanese: $("#id_proper_name_japanese").val(),
            new_client: 'new ajax client add'
        };
        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        $.ajax({
            headers: {'X-CSRFToken': csrftoken },
            type: "POST",
            url: "/pipeline/",
            data: formData,
            beforeSend: function() {
                  spinner.removeClass('invisible');
            },
            success: function (response) {
                if (response.status === 'success') {
                    spinner.addClass('invisible');
                    $('#id_client').append($('<option></option>').val(response.id).text(response.value));
                    $('#id_client').val(response.id);
                    console.log("response: " + JSON.stringify(response))
                    $("#new-client-form").removeClass('was-validated')
                    $(".toast").each(function() {
                        $(this).show()
                    });
                    $('#new-client-modal').modal('toggle')

                    // instantiate toast for successful client creation
                    var toast = document.createElement("div");
                    toast.classList.add('toast', 'position-fixed', 'bg-success-subtle', 'border-0', 'top-0', 'end-0');
                    toast.setAttribute('role', 'alert');
                    toast.setAttribute('aria-live', 'assertive');
                    toast.setAttribute('aria-atomic', 'true');

                    var descriptor = formData['friendly_name'].toUpperCase()
                    var header = document.createElement('div');
                    header.classList.add('toast-header');
                    header.innerHTML = `
                        <i class="bi bi-check2-circle" class="rounded me-2"></i>
                        <strong class="me-auto">New client added</strong>
                        <small class="text-muted">Just now</small>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                        `;
                    var body = document.createElement('div');
                    body.classList.add('toast-body');
                    body.innerText = descriptor;

                    toast.appendChild(header);
                    toast.appendChild(body);

                    document.body.appendChild(toast);

                    var toastElement = new bootstrap.Toast(toast);
                    toastElement.show();
                    setTimeout(function() {
                        $(toastElement).fadeOut("fast", function() {
                            $(this).remove();
                        });
                    }, 1000);

                } else {
                    $("#new-client-form").addClass('was-validated');
                    spinner.addClass('invisible');
                }
            },

            error: function(request) {
                alert('form not submitted')
                $(this).addClass('was-validated');
                spinner.addClass('invisible');
                // alert('Form submission failed');
            },
        });
    });

    $("#batch-pay-csv-dl").on("submit", function(e) {
        e.preventDefault()
        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        // $(this).find("button").attr("disabled", true);
        $.ajax({
            headers: { 'X-CSRFToken': csrftoken },
            type: "POST",
            url: "/pipeline/prepare-batch-payment/",
            data: "",
            success: function(data, testStatus, xhr) {
                var blob = new Blob([data]);
                var link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = "WISE_batch_payment.csv";
                link.click();

                var processingStatus = JSON.parse(xhr.getResponseHeader('X-Processing-Status'));
                console.log('Processing status:', processingStatus);

                var batchProcessSuccess = []
                var batchProcessError = []
                const successToast = document.getElementById('payment-template-success-toast')
                const errorToast = document.getElementById('payment-template-error-toast')
                const successToastBody = successToast.querySelector('.toast-body');
                const errorToastBody = errorToast.querySelector('.toast-body');
                
                for (var key in processingStatus) {
                    for (var key in processingStatus) {
                        if (processingStatus[key].status == "success") {
                            batchProcessSuccess[key] = processingStatus[key];
                        } else if (processingStatus[key].status == "error") {
                            batchProcessError[key] = processingStatus[key];
                        } else {
                            alert("Unknown error during processing!")
                        }
                    }
                }
                successToastBody.innerHTML = "";
                errorToastBody.innerHTML = "";
                for (const i in batchProcessSuccess) {
                    successToastBody.innerHTML +=
                        `
                        <li>${i}: ${batchProcessSuccess[i].message}</li>
                        ` 
                }
                for (const i in batchProcessError) {
                    errorToastBody.innerHTML +=
                        `
                        <li>${i}: ${batchProcessError[i].message}</li>
                        `
                }
                const successToastBS = bootstrap.Toast.getOrCreateInstance(successToast)
                const errorToastBS = bootstrap.Toast.getOrCreateInstance(errorToast)
                if (Object.keys(batchProcessSuccess).length > 0) {
                    successToastBS.show()
                }

                if (Object.keys(batchProcessError).length > 0) {
                    errorToastBS.show()
                }
            }
        })
    })
});


