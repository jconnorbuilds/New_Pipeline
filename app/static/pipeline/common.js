const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]') ?
  document.querySelector('[name=csrfmiddlewaretoken]').value : null;

$(document).ready(function () {
  /*
  * The following variables and functions control checkbox click-and-drag selection behavior
  */
  var $firstSelectedBox;
  var $firstSelectedRow;
  var duringSelection = false;
  var mouseDown = 0;

  document.body.onmousedown = function () {
    mouseDown = 1;
  }
  document.body.onmouseup = function () {
    mouseDown = 0;
    duringSelection = false;
  }
  $('table').on('click', '.form-check-input', function (event) {
    if (!mouseDown) {
      var $box = $(this);
      var $row = $box.closest('tr');
      $box.prop('checked', !$firstSelectedBox.prop('checked'))
      $row.toggleClass('selected-row', $box.prop('checked'))
    }
  });

  $('table').on('mousedown', '.form-check-input', function (event) {
    duringSelection = true;
    $firstSelectedBox = $(this);
    $firstSelectedRow = $(this).closest('tr');

    $firstSelectedRow.toggleClass('selected-row')
    $firstSelectedBox.prop('checked', !$firstSelectedBox.prop('checked'))
  });

  $('table').on('mouseenter', 'tr', function (event) {
    if (mouseDown && duringSelection) {
      var $row = $(this);
      var $box = $row.find('.form-check-input');
      $row.toggleClass('selected-row', $firstSelectedBox.prop('checked'))
      $box.prop('checked', $firstSelectedBox.prop('checked'))
    }
  });

  $('table').on('mousemove', function (event) {
    // stops from accidentally highlighting text when dragging during click-and-drag selection
    if (mouseDown && duringSelection) {
      event.preventDefault();
    }
  });

  $('table').on("click", ".single-invoice-request-btn", function (event) {
    event.preventDefault()

    var cost_id = $(this).attr('id').split('-').pop()
    var table = $(this).closest('table').DataTable();

    $.ajax({
      headers: { 'X-CSRFToken': csrftoken },
      url: "/pipeline/request-single-invoice/" + cost_id + "/",
      method: "POST",
      success: function (data) {
        alert(data.message)
        // should really optimize this by getting all table data from a single endpoint
        // so a single row can be reloaded
        table.ajax.reload()
      },
      error: function (data) {
        alert("There was an error. Try again, and if the error persists, request the invoice the old fashioned way")
      }
    })
  })

});