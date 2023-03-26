from django import forms
from django.forms import ModelForm, Textarea, formset_factory, formsets, renderers
from django.db.models import Q
from .models import Cost, Job, Vendor, Client
from datetime import date
import django_filters
from datetime import date
import calendar
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
DATE_CHOICES = []
for y in range(date.today().year, 2021, -1):
    for m in range(12,0,-1):
        DATE_CHOICES.append((f'{y}-{m:02d}-01', f'{calendar.month_abbr[m]} {y}'))

class CostForm(ModelForm):
    class Meta:
        model = Cost
        fields = ['vendor','description','amount','currency','notes']

class AddVendorToCostForm(forms.Form):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['addVendor'].choices = [('', 'Select vendor...')] + [(vendor.unique_id, vendor.full_name) for vendor in Vendor.objects.all()]

    addVendor = forms.ChoiceField(choices=[])
    # cost_id = forms.IntegerField(widget=forms.HiddenInput())


class UpdateCostForm(forms.Form):
    vendor = forms.ModelChoiceField(queryset=Vendor.objects.all(), required=False, empty_label='Select vendor', widget=forms.Select(attrs={'class':'form-select'}))
    cost = forms.ModelChoiceField(queryset=Cost.objects.all())
    invoice_status = forms.ChoiceField(required=False, widget=forms.Select(attrs={'class':'form-select'}), choices=(
                                ('NR','Not ready to request'),
                                ('READY','Ready to request'),
                                ('REQ','Requested'),
                                ('REC','Received'),
                                ('CHECK','Needs manual check'),
                                ('PAID','Paid'),
                                ('NA','No Invoice')
                                ))

    # def __init__(self, job, *args, **kwargs):
    #   super().__init__(*args, **kwargs)
    #   self.fields['vendor'].queryset = Vendor.objects.filter(jobs_rel=job)

class JobForm(ModelForm):
    def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.fields['client'].empty_label = 'Select client'
            # self.fields['personInCharge'].empty_label = '-PIC-'

    # job_date = forms.DateField(widget=forms.Select(choices=MONTH_CHOICES))
    year = forms.CharField(widget=forms.Select(choices=YEAR_CHOICES), initial=date.today().year)
    month = forms.CharField(widget=forms.Select(choices=MONTH_CHOICES), initial=date.today().month)

    class Meta:
        model = Job
        fields = ['job_name','client','job_type','budget','personInCharge','year','month']

class ClientForm(ModelForm):
    class Meta:
        model = Client
        fields = ['friendly_name','proper_name','proper_name_japanese','job_code_prefix']

    def clean(self):
        cleaned_data = super().clean()
        proper_name = cleaned_data.get('proper_name')
        print(f'proper name: {proper_name}')
        proper_name_japanese = cleaned_data.get('proper_name_japanese')
        print(f'proper name JP: {proper_name_japanese}')

        if not proper_name and not proper_name_japanese:
            raise forms.ValidationError("At least one proper name field must be filled in.")
        return cleaned_data

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

    year = django_filters.ChoiceFilter(
        field_name = 'year',
        lookup_expr='exact', 
        label='Year', 
        choices=YEAR_CHOICES, 
        empty_label='-Select year-'
    )
    job_date = django_filters.ChoiceFilter(
        field_name='job_date',
        lookup_expr='icontains', 
        label='Date', choices=DATE_CHOICES,
        empty_label='-Select date-',
    )
    job_name = django_filters.CharFilter(
        field_name='job_name',
        lookup_expr='icontains', 
        label='Job name'
    )
    client = django_filters.CharFilter(
        method='client_name_or_prefix',
        field_name = 'client__friendly_name',
        lookup_expr='icontains',
        label='Client name'
    )
    full_name = django_filters.CharFilter(
        field_name='vendors__full_name',
        lookup_expr='icontains',
        label='Vendor'
    )

    def client_name_or_prefix(self, queryset, name, value):
        return queryset.filter(
            Q(client__friendly_name__icontains=value)|Q(client__job_code_prefix__icontains=value)
        )

    class Meta:
        model = Job
        fields = []

class UploadInvoiceForm(forms.Form):
    '''
    Vendors can drag and drop files into the dropzone (dropzone.js), then have the form appear.
    Then, the invoice name can be lined up with the cost that it goes with.

    '''
    # cost_id = forms.IntegerField(widget=forms.HiddenInput)
    file = forms.FileField(widget=forms.ClearableFileInput())
    # invoice_name = forms.CharField(max_length=50, widget=forms.TextInput(attrs={"readonly":True}))
    cost = forms.ModelChoiceField(queryset=Cost.objects.none())

    def __init__(self, *args, vendor, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['cost'].queryset = Cost.objects.filter(vendor_id=vendor.id, invoice_status="REQ")
        # self.fields['cost_name'].widget.attrs.update({'value': kwargs['initial']['cost_name']})
        # 
        # print(f'vendor from the form arguments : {vendor}')
        # print(f'vendor ID: {vendor.id}')
        # if vendor:
        #     print(f'vendor: {vendor}')
        # else:
        #     print("NO VENDOR")
        

# class UploadInvoiceFormset(BaseFormSet):
#     def __init__(self, *args, **kwargs):
#         self.vendor = kwargs.pop('vendor', None)
#         super().__init__(*args, **kwargs)

#     def _construct_form(self, i, **kwargs):
#         kwargs['vendor'] = self.vendor
#         return super(UploadInvoiceFormset, self)._construct_form(i, **kwargs)






