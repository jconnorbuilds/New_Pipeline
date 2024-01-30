import $ from 'jquery';
const clientForm = $('#new-client-form');
const submitButton = clientForm.find('button[type="submit"]');

const properNameInput = clientForm.find('input[name="proper_name"]');
const properNameJapaneseInput = clientForm.find(
  'input[name="proper_name_japanese"]'
);

properNameInput.on('input', validateInputs);
properNameJapaneseInput.on('input', validateInputs);

submitButton.prop('disabled', true);

function validateInputs() {
  if (properNameInput.val() || properNameJapaneseInput.val()) {
    submitButton.prop('disabled', false);
  } else {
    submitButton.prop('disabled', true);
  }
}

$('#new-client-form').submit(function (event) {
  var spinner = $('#add-client-spinner');
  event.preventDefault();
  spinner.removeClass('invisible');
  // $("#add-job-spinner").addClass('testclass')
  var formData = {
    friendly_name: $('#id_friendly_name').val(),
    job_code_prefix: $('#id_job_code_prefix').val(),
    proper_name: $('#id_proper_name').val(),
    proper_name_japanese: $('#id_proper_name_japanese').val(),
    new_client: 'new ajax client add',
  };
  $.ajax({
    headers: { 'X-CSRFToken': CSRFTOKEN },
    type: 'POST',
    url: '/pipeline/',
    data: formData,
    beforeSend: function () {
      spinner.removeClass('invisible');
    },
    success: function (response) {
      if (response.status === 'success') {
        spinner.addClass('invisible');
        $('#id_client').append(
          $('<option></option>')
            .val(response.id)
            .text(`${response.value} - ${response.prefix}`)
        );
        $('#id_client').val(response.id);
        $('#id_invoice_recipient').append(
          $('<option></option>')
            .val(response.id)
            .text(`${response.value} - ${response.prefix}`)
        );
        $('#id_invoice_recipient').val(response.id);
        $('#new-client-form').removeClass('was-validated');
        $('.toast').each(function () {
          $(this).show();
        });
        $('#new-client-modal').modal('toggle');
        $('#new-client-form')[0].reset();

        // create and instantiate toast for successful client creation
        var toast = document.createElement('div');
        toast.classList.add(
          'toast',
          'position-fixed',
          'bg-success-subtle',
          'border-0',
          'top-0',
          'end-0'
        );
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        var descriptor = formData['friendly_name'].toUpperCase();
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
        setTimeout(function () {
          $(toastElement).fadeOut('fast', function () {
            $(this).remove();
          });
        }, 1000);
      } else {
        $('#new-client-form').addClass('was-validated');
        spinner.addClass('invisible');
      }
    },

    error: function (request) {
      alert('form not submitted');
      $(this).addClass('was-validated');
      spinner.addClass('invisible');
    },
  });
});
