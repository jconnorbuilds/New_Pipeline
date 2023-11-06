const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')
  ? document.querySelector('[name=csrfmiddlewaretoken]').value
  : null;

function truncate(string, length) {
  return string.length > 20 ? string.substr(0, length) + '...' : string;
}

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
  };
  document.body.onmouseup = function () {
    mouseDown = 0;
    duringSelection = false;
  };
  $('table').on('click', '.form-check-input', function (event) {
    if (!mouseDown) {
      var $box = $(this);
      var $row = $box.closest('tr');
      $box.prop('checked', !$firstSelectedBox.prop('checked'));
      $row.toggleClass('selected-row', $box.prop('checked'));
    }
  });

  $('table').on('mousedown', '.form-check-input', function (event) {
    duringSelection = true;
    $firstSelectedBox = $(this);
    $firstSelectedRow = $(this).closest('tr');

    $firstSelectedRow.toggleClass('selected-row');
    $firstSelectedBox.prop('checked', !$firstSelectedBox.prop('checked'));
  });

  $('table').on('mouseenter', 'tr', function (event) {
    if (mouseDown && duringSelection) {
      var $row = $(this);
      var $box = $row.find('.form-check-input');
      $row.toggleClass('selected-row', $firstSelectedBox.prop('checked'));
      $box.prop('checked', $firstSelectedBox.prop('checked'));
    }
  });

  $('table').on('mousemove', function (event) {
    // stops from accidentally highlighting text when dragging during click-and-drag selection
    if (mouseDown && duringSelection) {
      event.preventDefault();
    }
  });

  $('table').on('click', '.inv-req-btn', function (e) {
    e.preventDefault();
    const costID = e.target.getAttribute('id').split('-').pop();
    Invoices.request(costID, $(this).closest('table').DataTable());
  });
});
