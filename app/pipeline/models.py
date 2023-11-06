from django.db import models
from django.conf import settings
from datetime import date
from django.urls import reverse
from django.utils import timezone
from .utils import get_forex_rates
from .currencies import currencies
from decimal import Decimal
import uuid
import requests


class Vendor(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    first_name = models.CharField(max_length=30, null=True, blank=True)
    last_name = models.CharField(max_length=30, null=True, blank=True)
    vendor_code = models.CharField(max_length=4, null=True, unique=True)
    kanji_name = models.CharField(max_length=10, blank=True)
    kana_name = models.CharField(max_length=12, blank=True)
    use_company_name = models.BooleanField(default=False)
    company_name = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(max_length=300, blank=True)
    email = models.EmailField(max_length=100, blank=True, null=True, unique=True)
    payment_id = models.IntegerField(unique=True, null=True, blank=True)
    preferred_currency = models.CharField(max_length=3, null=True, blank=True)

    @property
    def full_name(self):
        """
        A simple concatenation of first and last name.
        Returns None if no name is defined (i.e. if only a company name exists)
        """
        if self.first_name != None and self.last_name != None:
            return " ".join([self.first_name, self.last_name])
        else:
            return None

    @property
    def familiar_name(self):
        """
        The name used throughout the app to refer to the vendor.
        This is also the name that will be used in emails, if it's a company name.
        If it's a human name, just their first name will be used.
        """
        if not self.use_company_name:
            return (
                " ".join([self.first_name, self.last_name])
                if self.last_name
                else self.first_name
            )
        else:
            return self.company_name

    class Meta:
        unique_together = (("first_name", "last_name"),)
        constraints = [
            models.CheckConstraint(
                name="%(app_label)s_%(class)s_is_person_or_company",
                check=(
                    models.Q(first_name__isnull=True, company_name__isnull=False)
                    | models.Q(first_name__isnull=False, company_name__isnull=True)
                    | models.Q(first_name__isnull=False, company_name__isnull=False)
                ),
            )
        ]

    def __str__(self):
        return f"{self.familiar_name} - {self.vendor_code}"


class Client(models.Model):
    friendly_name = models.CharField(max_length=100, unique=True)
    proper_name = models.CharField(max_length=100, null=True, blank=True)
    proper_name_japanese = models.CharField(max_length=100, blank=True)
    job_code_prefix = models.CharField(max_length=4, unique=True)

    # Payment Term
    NET30 = "NET30"
    NET60 = "NET60"
    NET90 = "NET90"
    UNKNOWN = "Unknown"
    NA = "N/A"
    SPECIAL = "Special"
    NONE = "None"
    PAYMENT_TERM_CHOICES = [
        (NET30, "Net 30"),
        (NET60, "Net 60"),
        (NET90, "Net 90"),
        (UNKNOWN, "Unknown"),
        (SPECIAL, "Special"),
        (NA, "N/A"),
        (NONE, ""),
    ]
    paymentTerm = models.CharField(
        max_length=7,
        choices=PAYMENT_TERM_CHOICES,
        default=NONE,
        null=True,
    )
    notes = models.TextField(max_length=300, blank=True)

    def __str__(self):
        return f"{self.friendly_name} - {self.job_code_prefix}"

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="%(app_label)s_%(class)s_has_proper_name",
                check=(
                    models.Q(
                        proper_name__isnull=True, proper_name_japanese__isnull=False
                    )
                    | models.Q(
                        proper_name__isnull=False, proper_name_japanese__isnull=True
                    )
                    | models.Q(
                        proper_name__isnull=False, proper_name_japanese__isnull=False
                    )
                ),
            )
        ]


class Cost(models.Model):
    forex_rates = get_forex_rates()

    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vendor_rel",
    )
    description = models.CharField(max_length=30, blank=True)
    amount = models.IntegerField(null=True)
    # TODO: Add conversion to JPY

    CURRENCIES = currencies  # tuple, format (USD,USD $)
    currency = models.CharField(max_length=10, default="¥", choices=CURRENCIES)

    INVOICE_STATUS_CHOICES = (
        ("NR", "Not requested"),
        ("REQ", "Requested"),
        ("REC", "Received via upload"),
        ("REC2", "Received (direct PDF/paper)"),
        ("ERR", "Error on upload"),
        ("QUE", "Queued for payment"),
        ("PAID", "Paid"),
        ("NA", "No Invoice"),
    )
    invoice_status = models.CharField(
        max_length=50, default="NR", choices=INVOICE_STATUS_CHOICES
    )

    notes = models.CharField(max_length=300, blank=True)
    job = models.ForeignKey(
        "Job", on_delete=models.CASCADE, related_name="cost_rel", null=True
    )
    PO_number = models.CharField(max_length=10, null=True, default=None, editable=False)
    PO_num_is_fixed = models.BooleanField(default=False)
    locked_exchange_rate = models.DecimalField(
        max_digits=10, decimal_places=3, default=None, null=True, blank=True
    )
    exchange_rate_locked_at = models.DateTimeField(default=None, null=True, blank=True)
    pay_period = models.DateField(null=True)

    # a flag to cue the save method to re-calculate the exchange rate based on a custom datetime
    exchange_rate_override = models.BooleanField(default=False)

    def calculate_exchange_rate_overide(self, source_currency, exchange_rate_locked_at):
        """
        Calculates the exchange rate based on a specific point in time.
        Useful for entering information for older jobs.
        """
        target_currency = "JPY"
        url = "https://api.wise.com/v1/rates/"
        headers = {
            "Authorization": f"Bearer {settings.WISE_API_KEY}",
            "Content-Type": "application/json",
        }
        params = {
            "source": source_currency,
            "target": target_currency,
            "time": exchange_rate_locked_at.isoformat(),
        }
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            print(response.json()[0].get("rate"))
            return response.json()[0].get("rate")
        else:
            # need to update: make approximation and add warning message
            return 1

    def get_PO_number(self):
        """
        Generate a unique Purchase Order number for a cost.
        Example: JCOAPL0001

        """
        po = ""
        POCount = 0
        this_vendor_PO_count = Cost.objects.filter(vendor_id=self.vendor.id)
        for PO in this_vendor_PO_count:
            if PO.PO_number:
                if int(PO.PO_number[-3::]) > POCount:
                    POCount = int(PO.PO_number[-3::])
        POCount += 1
        po = f"{self.vendor.vendor_code[:3]}{self.job.client.job_code_prefix[:3]}{POCount:04d}"

        return po

    def save(self, *args, **kwargs):
        if self.vendor and not self.PO_num_is_fixed:
            self.PO_number = self.get_PO_number()
            self.PO_num_is_fixed = True
        elif self.vendor and self.vendor.vendor_code not in self.PO_number[0:6]:
            self.PO_number = self.get_PO_number()

        if self.exchange_rate_override:
            self.locked_exchange_rate = self.calculate_exchange_rate_overide(
                self.currency, self.exchange_rate_locked_at
            )
            self.exchange_rate_override = False

        if not self.locked_exchange_rate and self.invoice_status == "PAID":
            self.locked_exchange_rate = self.forex_rates[self.currency]
            self.exchange_rate_locked_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.job.job_name} ({self.job.job_code}) {self.currency}{self.amount} -- {self.vendor.vendor_code if self.vendor else ""}'


class Job(models.Model):
    forex_rates = get_forex_rates()

    def get_absolute_url(self):
        return reverse("pipeline:job-detail", kwargs={"pk": self.pk})

    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )
    job_name = models.CharField(max_length=50)
    client = models.ForeignKey(
        Client, on_delete=models.CASCADE, blank=False, related_name="jobs_by_client"
    )
    # In practicality, this field is required for not-deleted jobs. Logic is handled in the save method.
    job_code = models.CharField(max_length=15, unique=True, blank=True, null=True)
    job_code_is_fixed = models.BooleanField(default=False)
    job_code_isOverridden = models.BooleanField(default=False)
    custom_job_code = models.CharField(max_length=15, null=True, blank=True)
    isArchived = models.BooleanField(default=False)
    isInvoiced = models.BooleanField(default=False)
    revenue = models.IntegerField()
    granular_revenue = models.BooleanField(default=False)
    add_consumption_tax = models.BooleanField(default=True)
    consumption_tax_amt = models.IntegerField(null=True, blank=True, editable=True)
    revenue_incl_tax = models.IntegerField(null=True, editable=False)
    vendors = models.ManyToManyField(
        Vendor, verbose_name="vendors involved", blank=True, related_name="jobs_rel"
    )
    # Who the invoice is paid to, if it differs from the client
    invoice_recipient = models.ForeignKey(
        Client, on_delete=models.CASCADE, null=True, blank=True
    )
    # If the client has a job code or special name for the invoice
    invoice_name = models.CharField(max_length=100, blank=True, null=True)
    relatedJobs = models.ManyToManyField("self", blank=True)
    deposit_date = models.DateField(blank=True, null=True)

    # Separating out year and month because the day of the month doesn't matter
    # And this was the easiest way to take in and manipulate form data via select widgets
    invoice_year = models.CharField(max_length=4, editable=True, null=True, blank=True)
    invoice_month = models.CharField(max_length=2, editable=True, null=True, blank=True)
    # This is set in the save method
    job_date = models.DateField(editable=False, null=True)

    def set_job_code(self, prefix=None, year=None, month=None):
        """
        Create a job code in the following format:
        {prefix}{month:02d}{i:02d}{year}

        e.g. APL06012023:
        prefix: APL
        month: 06
        i: 01
        year: 2023

        params:
        prefix: job code prefix
        year: the year to be used in the job code
        month: the month to be used in the job code
        i: iterator for generating unique job codes
        passable args are auto generated, so they default to None unles

        This function will run in the save() method as long as job_code_is_fixed is False
        """

        jc = ""
        prefix = self.client.job_code_prefix if prefix is None else prefix
        month = int(timezone.now().month) if month is None else month
        year = int(timezone.now().year) if year is None else year

        i = 1
        while jc == "" and i <= 999:
            if i > 99:
                temp_jc = f"{prefix}{month:02d}{i}{year}"
            temp_jc = f"{prefix}{month:02d}{i:02d}{year}"
            if not Job.objects.filter(job_code=temp_jc).exists():
                jc = temp_jc
                # TODO: move to logger
                print(f"{jc} created")
                return jc
            else:
                i += 1

        if i > 999:
            raise ValueError("Job code is out of range!")

    def reset_month_year_date(self):
        self.invoice_month = None
        self.invoice_year = None
        self.job_date = None

    JOB_TYPE_CHOICES = [
        ("ORIGINAL", "Original Music"),
        ("RENEWAL", "Renewal"),
        ("LIBRARY", "Library"),
        ("LICENSING", "Licensing"),
        ("LOGO", "Sound Logo"),
        ("MISC", "Misc"),
        ("RETAINER", "Retainer"),
    ]

    job_type = models.CharField(
        max_length=15,
        choices=JOB_TYPE_CHOICES,
        default="ORIGINAL",
    )

    notes = models.TextField(max_length=300, blank=True)

    ERIK = "ER"
    JOE = "JC"
    KENNY = "KD"
    MARIA = "MH"
    RYU = "RI"
    SEIYA = "SM"
    TIMO = "TO"
    KRIS = "KR"
    PIC_CHOICES = [
        (None, "Select PIC"),
        (ERIK, "Erik Reiff"),
        (JOE, "Joe Connor"),
        (KENNY, "Kenny Dallas"),
        (MARIA, "Maria Hasegawa"),
        (RYU, "Ryu Ishizawa"),
        (SEIYA, "Seiya Matsumiya"),
        (TIMO, "Timo Otsuki"),
    ]

    personInCharge = models.CharField(
        max_length=2,
        choices=PIC_CHOICES,
        blank=False,
    )

    # STATUS
    STATUS_CHOICES = [
        ("ONGOING", "Ongoing"),
        ("READYTOINV", "Ready to Invoice"),
        ("INVOICED1", "Invoiced"),
        ("INVOICED2", "Invoiced (canc.)"),
        ("FINISHED", "Finished"),
        ("ARCHIVED", "Archived"),
    ]

    status = models.CharField(
        max_length=14,
        choices=STATUS_CHOICES,
        default="ONGOING",
    )

    isDeleted = models.BooleanField(default=False)

    def get_consumption_tax_amt(self):
        """
        Returns the consumption tax amount

        Returns:
            consumption tax amt
        """
        consumption_tax_rate = Decimal("0.1")
        if self.add_consumption_tax:
            consumption_tax_amt = int((self.revenue * consumption_tax_rate).normalize())
        else:
            consumption_tax_amt = 0

        return consumption_tax_amt

    @property
    def total_cost(self):
        all_costs = Cost.objects.filter(job__job_code=self.job_code)
        total = 0

        if all_costs:
            for cost in all_costs:
                if cost.currency == "JPY":
                    total += cost.amount
                elif cost.invoice_status == "PAID":
                    total += round(cost.amount * cost.locked_exchange_rate)
                else:
                    try:
                        total += round(self.forex_rates[cost.currency] * cost.amount)
                    except:
                        total += cost.amount * 10
        return total

    @property
    def profit_incl_tax(self):
        return self.revenue_incl_tax - self.total_cost

    @property
    def profit_excl_tax(self):
        return self.revenue - self.total_cost

    @property
    def profit_rate(self):
        if self.revenue != 0:
            profit_rate = round(
                ((self.revenue - self.total_cost) / self.revenue) * 100, 1
            )
            return profit_rate
        else:
            return 100.0

    @property
    def allVendorInvoicesRequested(self):
        costs = Cost.objects.filter(job_id=self.id)
        for cost in costs:
            if cost.invoice_status not in ["REQ", "REC", "PAID"]:
                return False
        else:
            return True

    @property
    def allVendorInvoicesReceived(self):
        costs = Cost.objects.filter(job_id=self.id)
        for cost in costs:
            if cost.invoice_status not in ["REC", "PAID"]:
                return False
        else:
            return True

    @property
    def allVendorInvoicesPaid(self):
        costs = Cost.objects.filter(job_id=self.id)
        for cost in costs:
            if cost.invoice_status not in ["PAID"]:
                return False
        return True

    def save(self, *args, **kwargs):
        # Auto-generate the job code
        if not self.job_code_is_fixed:
            self.job_code = self.set_job_code()
            self.job_code_is_fixed = True

        if self.isDeleted:
            self.job_code = None
            self.job_code_is_fixed = False

        if self.status in ["ONGOING", "READYTOINV"]:
            self.invoice_name = ""
            self.invoice_recipient = None
            if self.invoice_month != None and self.invoice_year != None:
                self.reset_month_year_date()
        self.job_date = (
            f"{self.invoice_year}-{int(self.invoice_month):02d}-01"
            if (self.invoice_year and self.invoice_month)
            else None
        )
        self.consumption_tax_amt = self.get_consumption_tax_amt()
        self.revenue_incl_tax = self.get_consumption_tax_amt() + self.revenue
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.job_name} - {self.job_code}"
