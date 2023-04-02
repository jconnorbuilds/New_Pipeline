$(document).ready(function(){
    console.log('Ready!');
    let date = new Date()
    let currentMonth = date.getMonth() + 1
    let currentYear = date.getFullYear()
    // Initialise and set settings for the main Jobs table
    var selectedDate = ""
    var totalRevenueYtd = 0
    var totalRevenueMonthly = 0
    var table = $('#job_table').DataTable({
        paging: false,
        ajax: {
            url: 'http://139.162.118.33:8000/main_app/pipeline-data/' + currentYear + '/' + currentMonth + '/',
            // url: 'http://127.0.0.1:8000/main_app/pipeline-data/' + currentYear + '/' + currentMonth + '/',
            dataSrc: function(json) {
                // Sets these variables on initial page load
                totalRevenueYtd = json.total_revenue_ytd;
                totalRevenueMonthly = json.total_revenue_monthly;
                return json.data
            }
        },
        // scrollY: 800,
        columns: [
            {"data": "select"},
            {"data": "client_name"},
            {"data": "job_name"},
            {"data": "job_code"},
            {"data": "budget"},
            {"data": "total_cost"},
            {"data": "profit_rate"},
            {"data": "job_date"},
            {"data": "job_type"},
            {"data": "status"},
            {"data": "edit"},
        ],
        columnDefs: [
            {
                targets: 0,
                className: 'dt-center',
                orderable: false,
                searchable: false,
            },
            {
                targets: 4,
                className: 'dt-right'
            },
            {
                targets: 5,
                className: 'dt-right'
            },
        ],
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

    // Job form submission
    $("#job-form").submit(function(event) {
        var spinner = $("#add-job-spinner")
        event.preventDefault();
        spinner.toggleClass('invisible')
        var formData = {
            job_name: $("#id_job_name").val(),
            client: $("#id_client").val(),
            job_type: $("#id_job_type").val(),
            budget: $("#id_budget").val(),
            personInCharge: $("#id_personInCharge").val(),
            year: $("#id_year").val(),
            month: $("#id_month").val(),
            addjob: 'addjob via ajax'
        };
        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        $.ajax({
            headers: {'X-CSRFToken': csrftoken },
            type: "POST",
            url: "/main_app/pipeline/",
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
                    // var table = $("#job_table").DataTable();
                    var job = response.data;
                    
                    table.row.add($(job)).draw();
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
        // table.clear().rows.add(formData).draw();
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

    function filterData(year, month, successCallback) {
        var url = 'http://139.162.118.33:8000/main_app/pipeline-data/';
        // var url = 'http://127.0.0.1:8000/main_app/pipeline-data/';
        if (year !== undefined && month !== undefined) {
            url = url + year + '/' + month + '/';
        }
        // console.log(url)
        // console.log(year)
        table.ajax.url(url).load();

        // $.ajax({
        //     url: url,
        //     dataType: 'json',
        //     success: function(data) {
        //         totalRevenueYtd = data.total_revenue_ytd;
        //         totalRevenueMonthly = data.total_revenue_monthly;
        //         if (typeof successCallback === 'function') {
        //             console.log(`total rev YTD: ${data.total_revenue_ytd}`)
        //             console.log(`total rev monthly: ${data.total_revenue_monthly}`)
        //             successCallback(data, totalRevenueYtd, totalRevenueMonthly);
        //         }
        //     }
        // });
    }
    function displayData(data, totalRevenueYtd, totalRevenueMonthly) {
        // Code to display the table data
        // ...
        table.clear().rows.add(data.data).draw();
        $("#total-billed-ytd").html(`<p>Total billed YTD: ${totalRevenueYtd}</p>`)
        $("#total-billed-monthly").html(`<p>Total billed this month: ${totalRevenueMonthly}</p>`)
    }

    $(".toggle-view").click(function() {
        if (pipelineViewState == "monthly") {
            pipelineViewState = "all";
            $("#view-state").text(pipelineViewState);
            $(".monthly-item").hide()
            $(".toggle-view").html("<b>Viewing all jobs</b>")
            filterData(undefined, undefined, displayData);
        } else {
            pipelineViewState = "monthly"
            $("#view-state").text(pipelineViewState);
            $(".monthly-item").show()
            $(".toggle-view").html("<b>Viewing jobs by month</b>")
            filterData(pipelineYear.val(), pipelineMonth.val(), displayData);
        }
    });

    $("#pipeline-month, #pipeline-year").change(function() {
        filterData(pipelineYear.val(), pipelineMonth.val(), displayData);
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
        filterData(year, month, displayData);
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
        filterData(year, month, displayData);
    });

    $("#pipeline-current").click(function() {
        pipelineYear.val(currentYear);
        pipelineMonth.val(currentMonth);
        filterData(currentYear, currentMonth, displayData);
    });

    var clientForm = $('#new-client-form');
    var submitButton = clientForm.find('button[type="submit"]');
    // Get the input fields
    var properNameInput = clientForm.find('input[name="proper_name"]');
    var properNameJapaneseInput = clientForm.find('input[name="proper_name_japanese"]');

    // Listen for changes to the input fields
    properNameInput.on('input', validateInputs);
    properNameJapaneseInput.on('input', validateInputs);

    // Disable the submit button by default
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
            url: "/main_app/",
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
});


