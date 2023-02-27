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

});

