from django.db import models
from datetime import date
from django.urls import reverse
from django.utils import timezone
import uuid

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

class Vendor(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	unique_id = models.CharField(max_length=10, default = 'NEW00')
	full_name = models.CharField(max_length=30, default='NewVendor')
	vendor_initials = models.CharField(max_length=4)
	kanji_name = models.CharField(max_length=10, blank=True)
	kana_name = models.CharField(max_length=12, blank=True)
	company_name = models.CharField(max_length=12, blank=True)
	notes = models.TextField(max_length=300, blank=True)
	email = models.EmailField(max_length=100, blank=True)
	# slug = models.SlugField(max_length=25)

	def save(self, *args, **kwargs):
		if self.unique_id == 'NEW000':
			self.unique_id = self.vendor_initials + str(next(gen))
		super().save(*args, **kwargs)

	def __str__(self):
		return f'{self.full_name} - {self.unique_id}'

class Client(models.Model):
	name = models.CharField(max_length=100, unique=True)
	proper_name = models.CharField(max_length=100, blank=True)
	name_japanese = models.CharField(max_length=100, blank=True)
	proper_name_japanese = models.CharField(max_length=100, blank=True)
	job_code_prefix = models.CharField(max_length=4, blank=True, unique=True)

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
		)
	notes = models.TextField(max_length=300, blank=True)

	def __str__(self):
		return f'{self.name} - {self.job_code_prefix}'

class Cost(models.Model):
	vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='cost_rel')
	description = models.CharField(max_length=30, blank=True)
	amount = models.IntegerField(default=0, blank=True)
	currency = models.CharField(max_length=10, default='JPY ¥', choices=(
							('¥','JPY ¥'),
							('US$','USD $'),
							('CA$','CAD $'),
							('AU$','AUD $'),
							('€','EUR €'),
							('£','GBP £'),
							)
						)
	invoice_status = models.CharField(max_length=50, default='--invoice status--', choices=(
								('NR','Not ready to request'),
								('READY','Ready to request'),
								('REQ','Requested'),
								('REC','Received'),
								('CHECK','Needs manual check'),
								('PAID','Paid'),
								('NA','No Invoice')
								),
							)

	notes = models.CharField(max_length=300, blank=True)
	job = models.ForeignKey('Job', on_delete=models.CASCADE, related_name='cost_rel', null=True)
	PO_number = models.CharField(max_length=15, null=True, default=None,)
	PO_num_is_fixed = models.BooleanField(default=False)


	def __str__(self):
		return f'{self.job.job_name}  ({self.job.job_code}) / {self.vendor.vendor_initials} ¥{self.amount}'

class Job(models.Model):

	# def get_absolute_url(self):
	# 	return reverse('main_app:costsheet', kwargs={'job_code':self.job_code})

	def get_absolute_url(self):
		return reverse('main_app:job-detail', kwargs={"pk":self.pk})
	
	job_name = models.CharField(max_length=50)
	client = models.ForeignKey(Client, on_delete=models.CASCADE, blank=False)
	job_code = models.CharField(max_length=15, unique=True,)
	job_code_isFixed = models.BooleanField(default=False)
	job_code_isOverridden = models.BooleanField(default=False)
	custom_job_code = models.CharField(max_length=15, null=True, blank=True)
	isArchived = models.BooleanField(default=False)
	allVendorInvoicesReceivd = models.BooleanField(default=False)
	allVendorInvoicesPaid = models.BooleanField(default=False)
	isInvoiced = models.BooleanField(default=False)
	budget = models.IntegerField()
	vendors = models.ManyToManyField(Vendor, verbose_name='vendors involved', blank=True)
	# Who the invoice is paid to, if it differs from the client
	paidTo = models.CharField(max_length=100, blank=True)
	# If the client has a job code or special name for the invoice
	invoiceName = models.CharField(max_length=100, blank=True)
	relatedJobs = models.ManyToManyField("self", blank=True)

	# Separating out year and month separately because the day of the month doesn't matter
	# And this was the easiest way to take in and manipulate form data via select widgets
	year = models.CharField(max_length=4, editable=True, default=date.today().year)
	month = models.CharField(max_length=2, editable=True, default=date.today().month)
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
		# Jobs by the same client in the same month
		sameClientJobs = Job.objects.filter(month=month, year=year,
									client__job_code_prefix=prefix)

		# 'iterating' part of the code iterates based on the highest job number from tha
		# the same client in the same month
		i = 0
		for job in sameClientJobs:
			if int(job.job_code[-6:-4]) > i:
				i = int(job.job_code[-6:-4])
		identifier = i+1
		jc = f'{prefix}{month:02d}{identifier:02d}{year}'

		return jc


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
				total += cost.amount
		return total

	@property
	def profit(self):
		if self.budget:
			return self.budget - self.total_cost
		else:
			return self.budget

	@property
	def profit_rate(self):
		if self.budget != 0:
			profit_rate = round(((self.budget - self.total_cost) / self.budget)*100, 1)
			return profit_rate
		else:
			return 100

	# @property
	# def job_date(self):
	# 	return f'{self.year}-{self.month}-01'


	def save(self, *args, **kwargs):
		if not self.job_code_isFixed:
			self.job_code = self.get_job_code()
			self.job_code_isFixed = True
		self.job_date = f'{self.year}-{int(self.month):02d}-01'
		super().save(*args, **kwargs)

	def __str__(self):
		return f'{self.job_name} - {self.job_code}'


