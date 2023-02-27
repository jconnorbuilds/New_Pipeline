from django import forms
from django.forms import ModelForm, Textarea
from django.db.models import Q
from .models import Cost, Job, Vendor
from datetime import date
import django_filters
from datetime import date
from django_filters.widgets import RangeWidget

MONTH_CHOICES = [
	(1,'January'),
	(2,'February'),
	(3,'March'),
	(4,'April'),
	(5,'May'),
	(6,'June'),
	(7,'July'),
	(8,'August'),
	(9,'September'),
	(10,'October'),
	(11,'November'),
	(12,'December'),
	]

#year_list is a tuple (int, int) of each year through the current year
#YEAR_CHOICES is (int, str) of the same list, to avoid a comma in the select element
year_list = [(year, year) for year in range(2018, date.today().year+1)]
YEAR_CHOICES = [(y[0],(str(y[1]))) for y in year_list]

class CostForm(ModelForm):
	class Meta:
		model = Cost
		fields = ['vendor','description','amount','currency','invoice_status','notes']

class AddVendorToCostForm(forms.Form):
	VENDOR_CHOICES=[(vendor.unique_id, vendor.full_name) for vendor in Vendor.objects.all()]
	addVendor = forms.CharField(max_length=100,
				widget=forms.Select(choices=VENDOR_CHOICES))

class UpdateCostForm(forms.Form):
	vendor = forms.ModelChoiceField(queryset=Vendor.objects.all(), required=False, empty_label='Select vendor')
	# invoice = forms.ChoiceField(required=False, choices=(
	# 							('NR','Not ready to request'),
	# 							('READY','Ready to request'),
	# 							('REQ','Requested'),
	# 							('REC','Received'),
	# 							('CHECK','Needs manual check'),
	# 							('PAID','Paid'),
	# 							('NA','No Invoice')
	# 							))
	cost = forms.ModelChoiceField(queryset=Cost.objects.all(), widget=forms.HiddenInput)

		

class JobForm(ModelForm):
	def __init__(self, *args, **kwargs):
			super().__init__(*args, **kwargs)
			self.fields['client'].empty_label = 'Select client'
			# self.fields['personInCharge'].empty_label = '-PIC-'

	# job_date = forms.DateField(widget=forms.Select(choices=MONTH_CHOICES))
	year = forms.CharField(widget=forms.Select(choices=YEAR_CHOICES))
	month = forms.CharField(widget=forms.Select(choices=MONTH_CHOICES))

	class Meta:
		model = Job
		fields = ['job_name','client','job_type','budget','personInCharge','year','month']

class PipelineCSVExportForm(forms.Form):

	fromMonth = forms.CharField(max_length=50, required=True, initial=date.today().month, 
				widget=forms.Select(choices=MONTH_CHOICES,attrs={
					"class":"form-select", 
					"id":"from-month", 
					"aria-label":"Export from month",
					}
				))
	fromYear = forms.CharField(max_length=50, required=True, initial=date.today().year, 
				widget=forms.Select(choices=YEAR_CHOICES,attrs={
					"class":"form-select",
					"id":"from-year",
					"aria-label":"Export from year"}
				))
	thruMonth = forms.CharField(max_length=50, initial=date.today().month, 
				widget=forms.Select(choices=MONTH_CHOICES,attrs={
					"class": "form-select", 
					"id":"thru-month", 
					"aria-label":"Export through month"
					}
				))
	thruYear = forms.CharField(max_length=50, initial=date.today().year, 
				widget=forms.Select(choices=YEAR_CHOICES,attrs={
					"class": "form-select", 
					"id":"thru-year", 
					"aria-label":"Export through year",}
				))
	useRange = forms.BooleanField(required=False,initial=False,
					widget=forms.CheckboxInput(attrs={
					"class" : "ms-3",
					"id":"csv-export-use-range", 
					"aria-label":"Use range"}))

class PipelineBulkActionsForm(forms.Form):
	actions = forms.CharField(max_length=50,
				widget=forms.Select(choices=
					(('NEXT','Move to next month'),
					('PREVIOUS','Move to previous month'),
					('RELATE', 'Relate jobs'),
					('UNRELATE', 'Unrelate jobs'),
					('DEL','Delete'),
				), attrs={
				"class":"form-select",
				"id":"pipeline-bulk-actions",
				"aria-label":"Bulk actions",
				}
			))

class JobFilter(django_filters.FilterSet):

	year = django_filters.ChoiceFilter(field_name = 'year', lookup_expr='exact', label='Year', choices=(YEAR_CHOICES), initial=date.today().year, empty_label='-Select year-')
	month = django_filters.ChoiceFilter(field_name = 'month', lookup_expr='exact', label='Month', choices=(MONTH_CHOICES), initial=date.today().month, empty_label='-Select month-')
	job_name = django_filters.CharFilter(field_name = 'job_name', lookup_expr='icontains', label='Job name')
	client = django_filters.CharFilter(method='client_name_or_prefix', field_name = 'client__name', lookup_expr='icontains', label='Client name')
	full_name = django_filters.CharFilter(field_name = 'vendors__full_name', lookup_expr='icontains', label='Vendor')
	
	def client_name_or_prefix(self, queryset, name, value):
		return queryset.filter(
			Q(client__name__icontains=value)|Q(client__job_code_prefix__icontains=value)
		)
	
	class Meta:
		model = Job
		fields = []

