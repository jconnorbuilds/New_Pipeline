from django import forms

# from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.forms import ModelForm, ModelMultipleChoiceField
from django.db.models import Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from .models import Cost, Job, Vendor, Client
from datetime import date
from datetime import date
import calendar

MONTH_CHOICES = [
    (1, _("January")),
    (2, _("February")),
    (3, _("March")),
    (4, _("April")),
    (5, _("May")),
    (6, _("June")),
    (7, _("July")),
    (8, _("August")),
    (9, _("September")),
    (10, _("October")),
    (11, _("November")),
    (12, _("December")),
]

# year_list is a tuple (int, int) of each year through the current year
# YEAR_CHOICES is (int, str) of the same list, to avoid a comma in the select element
year_list = [(year, year) for year in range(2018, date.today().year + 1)]
YEAR_CHOICES = [(y[0], (str(y[1]))) for y in year_list]
DATE_CHOICES = []
for y in range(date.today().year, 2021, -1):
    for m in range(12, 0, -1):
        DATE_CHOICES.append((f"{y}-{m:02d}-01", f"{calendar.month_abbr[m]} {y}"))


class CostForm(ModelForm):
    class Meta:
        model = Cost
        fields = ["vendor", "description", "amount", "currency", "notes"]


class CostPayPeriodForm(forms.Form):
    this_month = timezone.now()
    next_month = timezone.now() + timezone.timedelta(days=30)
    next_next_month = timezone.now() + timezone.timedelta(days=60)

    cost_id = forms.IntegerField(widget=forms.HiddenInput)
    pay_period = forms.ChoiceField(
        required=False,
        choices=[
            ("this", f"This month ({this_month.strftime('%b')})"),
            ("next", f"Next month ({next_month.strftime('%b')}, default)"),
            ("next-next", f"In two months ({next_next_month.strftime('%b')})"),
        ],
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["pay_period"].initial = "next"


class AddVendorToCostForm(forms.Form):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        sorted_vendors = sorted(
            Vendor.objects.all(), key=lambda vendor: vendor.familiar_name
        )
        VENDOR_CHOICES = [("", "Select vendor...")] + [
            (vendor.pk, vendor.familiar_name) for vendor in sorted_vendors
        ]
        self.fields["addVendor"].choices = VENDOR_CHOICES

    addVendor = forms.ChoiceField(choices=[])


class UpdateCostForm(forms.Form):
    vendor = forms.ModelChoiceField(
        queryset=Vendor.objects.all(),
        required=False,
        empty_label="Select vendor",
        widget=forms.Select(attrs={"class": "form-select"}),
    )
    cost = forms.ModelChoiceField(queryset=Cost.objects.all())
    invoice_status = forms.ChoiceField(
        required=False,
        widget=forms.Select(attrs={"class": "form-select"}),
        choices=Cost.INVOICE_STATUS_CHOICES,
    )


class SetInvoiceInfoForm(ModelForm):
    prefix = "inv"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["invoice_recipient"].queryset = Client.objects.order_by(
            "friendly_name"
        )

        current_time = timezone.now()
        self.fields["invoice_month"].initial = str(current_time.month)
        self.fields["invoice_year"].initial = str(current_time.year)

    invoice_year = forms.CharField(widget=forms.Select(choices=YEAR_CHOICES))
    invoice_month = forms.CharField(widget=forms.Select(choices=MONTH_CHOICES))
    job_id = forms.IntegerField(widget=forms.HiddenInput)
    status = forms.CharField(widget=forms.HiddenInput)

    class Meta:
        model = Job
        fields = [
            "invoice_recipient",
            "invoice_name",
            "invoice_year",
            "invoice_month",
            "status",
        ]


class SetDepositDateForm(ModelForm):
    deposit_date = forms.DateField(widget=forms.DateInput())

    job_id = forms.IntegerField(widget=forms.HiddenInput)

    class Meta:
        model = Job
        fields = ["deposit_date"]

    def __init__(self, *args, **kwargs):
        instance = kwargs.get("instance")  # Get the object instance
        initial = kwargs.get("initial", {})
        kwargs["initial"] = initial
        super().__init__(*args, **kwargs)


class JobForm(ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["client"].empty_label = "Select client"
        self.fields["client"].queryset = Client.objects.order_by("friendly_name")

    granular_revenue = forms.BooleanField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = Job
        fields = [
            "job_name",
            "client",
            "job_type",
            "granular_revenue",
            "revenue",
            "add_consumption_tax",
            "personInCharge",
        ]


class PipelineJobUpdateForm(ModelForm):
    class Meta:
        model = Job
        fields = ["status"]


class JobImportForm(forms.Form):
    file = forms.FileField(
        validators=[FileExtensionValidator(allowed_extensions=["csv"])]
    )


class ClientForm(ModelForm):
    class Meta:
        model = Client
        fields = [
            "friendly_name",
            "proper_name",
            "proper_name_japanese",
            "job_code_prefix",
        ]

    def clean(self):
        cleaned_data = super().clean()
        proper_name = cleaned_data.get("proper_name")
        proper_name_japanese = cleaned_data.get("proper_name_japanese")

        if not proper_name and not proper_name_japanese:
            raise forms.ValidationError(
                "At least one proper name field must be filled in."
            )
        return cleaned_data


class NewExtensionForm(ModelForm):

    is_extension_of = forms.ModelChoiceField(
        queryset=Job.objects.all(),
        widget=forms.Select(),
        label="Extend from job",
        empty_label="Select a job",
    )

    class Meta:
        model = Job
        fields = ["is_extension_of"]

    def save(self, commit=True):
        instance = super().save(commit=False)
        new_extension = self.cleaned_data["is_extension_of"]

        if commit:
            instance.is_extension_of.add(new_extension)
            instance.save()

        return instance


class PipelineCSVExportForm(forms.Form):
    fromMonth = forms.CharField(
        max_length=50,
        required=True,
        initial=date.today().month,
        widget=forms.Select(
            choices=MONTH_CHOICES,
            attrs={
                "class": "form-select",
                "id": "from-month",
                "aria-label": "Export from month",
            },
        ),
    )
    fromYear = forms.CharField(
        max_length=50,
        required=True,
        initial=date.today().year,
        widget=forms.Select(
            choices=YEAR_CHOICES,
            attrs={
                "class": "form-select",
                "id": "from-year",
                "aria-label": "Export from year",
            },
        ),
    )
    thruMonth = forms.CharField(
        max_length=50,
        initial=date.today().month,
        widget=forms.Select(
            choices=MONTH_CHOICES,
            attrs={
                "class": "form-select",
                "id": "thru-month",
                "aria-label": "Export through month",
            },
        ),
    )
    thruYear = forms.CharField(
        max_length=50,
        initial=date.today().year,
        widget=forms.Select(
            choices=YEAR_CHOICES,
            attrs={
                "class": "form-select",
                "id": "thru-year",
                "aria-label": "Export through year",
            },
        ),
    )
    useRange = forms.BooleanField(
        required=False,
        initial=False,
        widget=forms.CheckboxInput(
            attrs={
                "class": "ms-3",
                "id": "csv-export-use-range",
                "aria-label": "Use range",
            }
        ),
    )


class PipelineBulkActionsForm(forms.Form):
    actions = forms.CharField(
        max_length=50,
        widget=forms.Select(
            choices=(
                ("NEXT", "Move to next month"),
                ("PREVIOUS", "Move to previous month"),
                ("RELATE", "Relate jobs"),
                ("UNRELATE", "Unrelate jobs"),
                ("DEL", "Delete"),
            ),
            attrs={
                "class": "form-select",
                "id": "pipeline-bulk-actions",
                "aria-label": "Bulk actions",
            },
        ),
    )
