$(document).ready(function(){
    console.log('Ready!');

    // Initialise and set settings for the main Jobs table
    $('#job_table').DataTable( {
        paging: false,
        scrollY: 800,
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

    // $('#thru-month').attr('disabled',true);
    // $('#thru-year').attr('disabled',true);
    // $('#thru-month').attr('hidden',true);
    // $('#thru-year').attr('hidden',true);
    let date = new Date()
    let currentMonth = date.getMonth() + 1
    let currentYear = date.getFullYear()


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

    // $('#new-client-modal').on('shown.bs.modal', function() {
    //     console.log('got u')
    //     var form = $('#new-client-form');
    //     $.ajax({
    //         url: form.data('url'),
    //         type: 'get',
    //         data: form.serialize(), 
    //         success: function(response) {
    //             form.replaceWith($(response).find('#new-client-form'));
    //             // re-initialize the form using Django's built-in form handling
    //             django.jQuery.initGlobalHandlers();
    //         }
    //     });
    // });

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
            url: "/main_app/",
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
                    var table = $("#job_table").DataTable();
                    var job = response.data;
                    
                    table.row.add($(job)).draw();

                    // var row = '<tr>' +
                    //               '<td><input type="checkbox" name="select" value="' + job.pk + '" class="form-check-input"></input></td>' +
                    //               '<td>' + job.fields.client.friendly_name + '</td>' +
                    //               '<td><a href="{% url \'main_app:job-detail\' job.id %}">' + job.fields.job_name + '</a></td>' +
                    //               '<td>' + job.fields.job_code + '</td>' +
                    //               '<td>¥' + job.fields.budget + '</td>' +
                    //               '<td><a href="{% url \'main_app:cost-add\' job.id %}">¥' + job.fields.total_cost + '</a></td>' +
                    //               '<td>' + job.fields.profit_rate + '%</td>' +
                    //               '<td>' + new Date(job.fields.job_date).toLocaleDateString("en-US", { month: 'short', year: 'numeric' }) + '</td>' +
                    //               '<td>' + job.fields.job_type + '</td>' +
                    //               '<td>' + job.fields.status + '</td>' +
                    //               '<td>' +
                    //                 '<div class="btn-group" role="group" aria-label="edit and delete buttons">' +
                    //                   '<button type="button" class="btn btn-dark btn-sm"><a href="{% url \'main_app:job-update\' job.id %}" class="edit-del-btn-group"><i class="bi bi-wrench-adjustable-circle"></i></a></button>' +
                    //                   '<button type="button" class="btn btn-danger btn-sm"><a href="{% url \'main_app:job-delete\' job.id %}" class="edit-del-btn-group"><i class="bi bi-trash3-fill"></i></a></button>' +
                    //                 '</div>' +
                    //               '</td>' +
                    //             '</tr>';

                    // instantiate toast for successful job creation
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
                    form.addClass('was-validated');
                    spinner.addClass('invisible');
                };
            },
            error: function(data) {
                alert('Form submission failed');
                spinner.addClass('invisible');
            },
        });
    });

    var form = $('#new-client-form');
    var submitButton = form.find('button[type="submit"]');
    // Get the input fields
    var properNameInput = form.find('input[name="proper_name"]');
    var properNameJapaneseInput = form.find('input[name="proper_name_japanese"]');

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


