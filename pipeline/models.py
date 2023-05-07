from django.db import models
from django.conf import settings
from datetime import date
from django.urls import reverse
from django.utils import timezone
import uuid
import requests

# Create your models here.
def id_suffix_generator():
        n = 1
        while n < 9999:
            yield (f"{n:02d}")
            n += 1
gen = id_suffix_generator()


def PO_num_generator():
        n = 1
        while n < 9999:
            yield (f"{n:03d}")
            n += 1

PONumgen = PO_num_generator()


def forExRate(source_currency):
    
    '''
    Calculates the foreign exchange rate via Wise's API.
    '''
    # Set the endpoint URL for Wise's rates API'
    API_KEY = '2577c5cf-0c38-4f18-89dc-3b10f273b6e1'
    url = 'https://api.wise.com/v1/rates/'
    target_currency = 'JPY'  # Example target currency (your local currency)

    # Set the API headers with your API key and specify the response format as JSON
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    # Set the query parameters for the API request
    params = {
        'source': source_currency,
        'target': target_currency
    }
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        print(response.json()[0].get('rate'))
        # return JsonResponse({'rate':response.json()[0].get('rate')})
        return response.json()[0].get('rate')
    else:
        # return JsonResponse({'error':'Failed to retrieve exchange rate from Wise API.'})
        return 1

class Vendor(models.Model):

    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    unique_id = models.CharField(max_length=10, default = 'NEW00')
    full_name = models.CharField(max_length=30, default='NewVendor')
    vendor_initials = models.CharField(max_length=4)
    kanji_name = models.CharField(max_length=10, blank=True)
    kana_name = models.CharField(max_length=12, blank=True)
    company_name = models.CharField(max_length=12, blank=True)
    notes = models.TextField(max_length=300, blank=True)
    email = models.EmailField(max_length=100, blank=True)

    def save(self, *args, **kwargs):
        if self.unique_id == 'NEW000':
            self.unique_id = self.vendor_initials + str(next(gen))
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.full_name} - {self.unique_id}'

class Client(models.Model):
    friendly_name = models.CharField(max_length=100, unique=True)
    proper_name = models.CharField(max_length=100, null=True, blank=True)
    name_japanese = models.CharField(max_length=100, null= True, blank=True)
    proper_name_japanese = models.CharField(max_length=100, blank=True)
    job_code_prefix = models.CharField(max_length=4, unique=True)

    # Payment Term 
    NET30 = 'NET30'
    NET60 = 'NET60'
    NET90 = 'NET90'
    UNKNOWN = 'Unknown'
    NA = 'N/A'
    SPECIAL = 'Special'
    NONE = 'None'
    PAYMENT_TERM_CHOICES = [
        (NET30, 'Net 30'),
        (NET60, 'Net 60'),
        (NET90, 'Net 90'),
        (UNKNOWN, 'Unknown'),
        (SPECIAL, 'Special'),
        (NA, 'N/A'),
        (NONE, ''),
    ]
    paymentTerm = models.CharField(
        max_length=7,
        choices=PAYMENT_TERM_CHOICES,
        default = NONE,
        null=True,
        )
    notes = models.TextField(max_length=300, blank=True)

    def __str__(self):
        return f'{self.friendly_name} - {self.job_code_prefix}'

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="%(app_label)s_%(class)s_has_proper_name",
                check=(
                    models.Q(proper_name__isnull=True, proper_name_japanese__isnull=False)
                    | models.Q(proper_name__isnull=False, proper_name_japanese__isnull=True)
                    | models.Q(proper_name__isnull=False, proper_name_japanese__isnull=False)
                ),
            )
        ]

class Cost(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='vendor_rel')
    description = models.CharField(max_length=30, blank=True)
    amount = models.IntegerField(null=True)
    currency = models.CharField(max_length=10, default='¥', choices=(
                            ('JPY','JPY ¥'),
                            ('USD','USD $'),
                            ('CAD','CAD $'),
                            ('AUD','AUD $'),
                            ('EUR','EUR €'),
                            ('GBP','GBP £'),
                            )
                        )
    invoice_status = models.CharField(max_length=50, default='NR', choices=(
                                ('NR','Not ready to request'),
                                ('READY','Ready to request'),
                                ('REQ','Requested'),
                                ('REC','Received via upload'),
                                ('REC2','Received (direct PDF/paper)'),
                                ('PAID','Paid'),
                                ('NA','No Invoice'),
                                ),
                            )

    notes = models.CharField(max_length=300, blank=True)
    job = models.ForeignKey('Job', on_delete=models.CASCADE, related_name='cost_rel', null=True)
    PO_number = models.CharField(max_length=15, null=True, default=None, editable = False)
    PO_num_is_fixed = models.BooleanField(default=False)
    locked_exchange_rate = models.DecimalField(max_digits=10, decimal_places=3, default=None, null=True, blank=True)
    exchange_rate_locked_at = models.DateTimeField(default=None, null=True, blank=True)
    
    # a flag to cue the save method to re-calculate the exchange rate based on a custom datetime
    exchange_rate_override = models.BooleanField(default=False)
    def calculate_exchange_rate_overide(self, source_currency, exchange_rate_locked_at):
        '''
        Calculates the exchange rate based on a specific point in time.
        Useful for entering information for older jobs.
        '''
        target_currency = 'JPY'
        url = 'https://api.wise.com/v1/rates/'
        headers = {
            'Authorization': f'Bearer {settings.WISE_API_KEY}',
            'Content-Type': 'application/json'
        }
        params = {
                'source': source_currency,
                'target': target_currency,
                'time': exchange_rate_locked_at.isoformat(),
            }
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            print(response.json()[0].get('rate'))
            return response.json()[0].get('rate')
        else:
            # need to update: make approximation and add warning message
            return 1

    def get_PO_number(self):
        '''
        This should only run once, so the logic runs in the overridden save() function

        '''
        po = ""
        POCount = 0
        this_vendor_PO_count = Cost.objects.filter(vendor_id = self.vendor.id)
        for PO in this_vendor_PO_count:
            if PO.PO_number:
                if int(PO.PO_number[-3::]) > POCount:
                    POCount = int(PO.PO_number[-3::])
        POCount += 1
        po = f'{self.vendor.unique_id}{self.job.client.job_code_prefix}{POCount:03d}'

        return po

    def save(self, *args, **kwargs):
        if self.vendor and not self.PO_num_is_fixed:
            self.PO_number = self.get_PO_number()
            self.PO_num_is_fixed = True
        elif self.vendor and self.vendor.unique_id != self.PO_number[0:4]:
            self.PO_number = self.get_PO_number()

        if self.exchange_rate_override:
            self.locked_exchange_rate = self.calculate_exchange_rate_overide(self.currency, self.exchange_rate_locked_at)
            self.exchange_rate_override = False
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.job.job_name} ({self.job.job_code}) {self.currency}{self.amount} -- {self.vendor.unique_id if self.vendor else ""}'

class Job(models.Model):

    # def get_absolute_url(self):
    #   return reverse('pipeline:costsheet', kwargs={'job_code':self.job_code})

    def get_absolute_url(self):
        return reverse('pipeline:job-detail', kwargs={"pk":self.pk})
    
    job_name = models.CharField(max_length=50)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, blank=False)
    job_code = models.CharField(max_length=15, unique=True,)
    job_code_isFixed = models.BooleanField(default=False)
    job_code_isOverridden = models.BooleanField(default=False)
    custom_job_code = models.CharField(max_length=15, null=True, blank=True)
    isArchived = models.BooleanField(default=False)
    isInvoiced = models.BooleanField(default=False)
    revenue = models.IntegerField()
    vendors = models.ManyToManyField(Vendor, verbose_name='vendors involved', blank=True, related_name = 'jobs_rel')
    # Who the invoice is paid to, if it differs from the client
    paidTo = models.CharField(max_length=100, blank=True)
    # If the client has a job code or special name for the invoice
    invoiceName = models.CharField(max_length=100, blank=True)
    relatedJobs = models.ManyToManyField("self", blank=True)

    # Separating out year and month separately because the day of the month doesn't matter
    # And this was the easiest way to take in and manipulate form data via select widgets
    year = models.CharField(max_length=4, editable=True, default=date.today().year)
    month = models.CharField(max_length=2, editable=True, default=date.today().month)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    job_date = models.DateField(editable=False, null=True, default=timezone.now)


    def get_job_code(self):
        '''
        This should only run once, so the logic runs in the overridden save() function
        Format abcMMnnYYYY

        '''
        jc = ''
        prefix = self.client.job_code_prefix
        month = int(self.month)
        year = int(self.year)
        date = f"{year}-{month:02d}-01"
        # Jobs by the same client in the same month
        sameClientJobs = Job.objects.filter(job_date=date, client__job_code_prefix=prefix)
        for i, job in enumerate(sameClientJobs):
            print(f"job {i}: {job}")

        # 'iterating' part of the code iterates based on the highest job number from
        # the same client in the same month
        i = 1

        while jc == '' and i <= 99:
            if not Job.objects.filter(job_code = f'{prefix}{month:02d}{i:02d}{year}').exists():
                jc = f'{prefix}{month:02d}{i:02d}{year}'
                print(f'{prefix}{month:02d}{i:02d}{year} created')
                return jc
            else:
                print(f'{prefix}{month:02d}{i:02d}{year} exists, trying again')
                i+= 1

            if i > 99:
                print('There is an issue with the job code logic')
                break

    JOB_TYPE_CHOICES = [
        ('ORIGINAL', 'Original'),
        ('RENEWAL', 'Renewal'),
        ('LIBRARY', 'Library'),
        ('LICENSING','Licensing'),
        ('MISC', 'Misc'),
        ('RETAINER', 'Retainer'),
        ]
    job_type = models.CharField(
        max_length=15,
        choices=JOB_TYPE_CHOICES,
        default='Original',
        )

    notes = models.TextField(max_length=300, blank=True)

    # PIC Choices
    # Can these be taken from Users (in Admin)?
    ERIK = 'ER'
    JOE = 'JC'
    KENNY = 'KD'
    MARIA = 'MH'
    RYU = 'RI'
    SEIYA = 'SM'
    TIMO = 'TO'
    PIC_CHOICES = [
        (None, 'Select PIC'),
        (ERIK, 'Erik Reiff'),
        (JOE, 'Joe Connor'),
        (KENNY, 'Kenny Dallas'),
        (MARIA, 'Maria Hasegawa'),
        (RYU, 'Ryu Ishizawa'),
        (SEIYA, 'Seiya Matsumiya'),
        (TIMO, 'Timo Otsuki'),
    ]
    personInCharge = models.CharField(
        max_length=2,
        choices=PIC_CHOICES,
        blank=False,
        )

    # STATUS
    STATUS_CHOICES = [
        ('LEAD', 'Lead'),
        ('ONGOING', 'Ongoing'),
        ('INVOICED', 'Invoiced'),
        ('FINISHED', 'Finished'),
        ('CANCELLED','Cancelled'),
        ('ARCHIVABLE','To be Archived'),
        ('ARCHIVED', 'Archived'),
    ]

    status = models.CharField(
        max_length=14,
        choices=STATUS_CHOICES,
        default='ONGOING',
        )

    isDeleted = models.BooleanField(default=False)

    @property
    def total_cost(self):
        all_costs = Cost.objects.filter(job__job_code = self.job_code)
        total = 0
        
        if all_costs:
            for cost in all_costs:
                print(f'{cost} - {cost.currency} {cost.amount}')
                if cost.currency == "JPY":
                    total += cost.amount
                elif cost.invoice_status == "PAID":
                    total += round(cost.amount * cost.locked_exchange_rate)
                else:
                    try:
                        total += round(forExRate(cost.currency) * cost.amount)
                    except:
                        total += (cost.amount * 10)
                        print('There was an error getting the exchange rate')
        return total

    @property
    def profit(self):
        if self.revenue:
            return self.revenue - self.total_cost
        else:
            return self.revenue

    @property
    def profit_rate(self):
        if self.revenue != 0:
            profit_rate = round(((self.revenue - self.total_cost) / self.revenue)*100, 1)
            return profit_rate
        else:
            return 100

    @property
    def allVendorInvoicesRequested(self):
        costs = Cost.objects.filter(job_id=self.id)
        for cost in costs:
            if cost.invoice_status not in ['REQ','REC','PAID']:
                return False

        else:
            return True

    @property
    def allVendorInvoicesReceived(self):
        costs = Cost.objects.filter(job_id=self.id)
        for cost in costs:
            if cost.invoice_status not in ['REC','PAID']:
                return False
        else:
            return True

    @property
    def allVendorInvoicesPaid(self):
        costs = Cost.objects.filter(job_id=self.id)
        for cost in costs:
            if cost.invoice_status not in ['PAID']:
                return False
        else:
            return True

    def save(self, *args, **kwargs):
        if not self.job_code_isFixed:
            self.job_code = self.get_job_code()
            self.job_code_isFixed = True
        self.job_date = f'{self.year}-{int(self.month):02d}-01'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.job_name} - {self.job_code}'


