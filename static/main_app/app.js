$(document).ready(function(){
    console.log('Ready!');

    // # start doing stuff here
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
            // $('#thru-month').attr('disabled',false);
            // $('#thru-year').attr('disabled',false);
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
        // $("#add-job-spinner").addClass('testclass')
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
            success: function (data) {
                $("#job-form").get(0).reset();
                spinner.addClass('invisible');
                $("#job-form").removeClass('was-validated')
                $(".toast").each(function() {
                    $(this).show()
                });

                // instantiate toast for successful job creation
                var toast = document.createElement("div");
                toast.classList.add('toast', 'position-fixed', 'bg-success-subtle', 'border-0', 'top-0', 'end-0');
                toast.setAttribute('role', 'alert');
                toast.setAttribute('aria-live', 'assertive');
                toast.setAttribute('aria-atomic', 'true');

                var jobDescriptor = formData['job_name'].toUpperCase() + " from " + $("#id_client option:selected").text()
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
            },

            error: function(data) {
                form.addClass('was-validated');
                spinner.addClass('invisible');
                // alert('Form submission failed');
            },
        });
    });

    // $("#job-form").submit(function(event) {
    //     event.preventDefault();

    // var form = $('#new-client-form');
    // console.log("heeeeee");
    // $('#add-new-client-btn').click(function () {
    //     form.submit();
    // });


    // const addClientModal = $('#new-client-modal')
    // $('#pipeline-new-client-btn').click(function() {
        
    // })

});

