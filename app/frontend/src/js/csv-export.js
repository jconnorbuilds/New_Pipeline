import $ from 'jquery';

export function initCSVExporter() {
  let rangeCheckbox = $('#csv-export-use-range');
  rangeCheckbox.click(function () {
    if (rangeCheckbox.is(':checked')) {
      $('#thru-month').removeClass('invisible');
      $('#thru-year').removeClass('invisible');
    } else {
      $('#thru-month').addClass('invisible');
      $('#thru-year').addClass('invisible');
      $('#thru-month').val($('#from-month').val()).change();
      $('#thru-year').val($('#from-year').val()).change();
    }
  });
  $('#from-month').change(function () {
    if (rangeCheckbox.is(':not(:checked)')) {
      $('#thru-month').val($('#from-month').val()).change();
    }
  });
  $('#from-year').change(function () {
    if (rangeCheckbox.is(':not(:checked)')) {
      $('#thru-year').val($('#from-year').val()).change();
    }
  });
}
