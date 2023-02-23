import os
from django.conf import settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'New_Pipeline.settings')

import django
django.setup()

from main_app.models import Job, Client, Vendor
from faker import Faker
from datetime import date
from django.utils import timezone
import random
import math

fake = Faker()
fakeJP = Faker('ja_JP')

picChoices = ['Erik', 'Joe', 'Kenny', 'Maria', 'Ryu', 'Seiya', 'Timo']
statusChoices = ['Lead', 'Ongoing', 'Invoiced', 'Finished', 'Cancelled', 'Archivable']
paymentTermChoices = ['Net 30', 'Net 60', 'Net 90']


def get_initials(fullname):
	nameList = fullname.split(' ')
	initials = nameList[0][0] + nameList[1][0]
	return initials


def fake_Vendor():
	fake_full_name = fake.name()
	fake_vendor_initials = get_initials(fake_full_name)
	fake_vendor_unique_id = (random.randint(1,10000000))
	fake_JP_first_name = fakeJP.first_name_pair()
	fake_JP_last_name = fakeJP.last_name_pair()

	v,_ = Vendor.objects.get_or_create(
		full_name = fake_full_name,
		vendor_initials = fake_vendor_initials,
		kanji_name = fake_JP_last_name[0] + fake_JP_first_name[0],
		kana_name = fake_JP_last_name[1] + fake_JP_first_name[1],
		company_name = '',
		notes = ''
		)
	v.save()
	return v


def fake_Client():
	fake_name = fake.company()
	fake_job_code_prefix = (fake_name[3:6].upper())+str(random.randint(10,100))
	fake_paymentTerm = random.choice(paymentTermChoices)

	c,_ = Client.objects.get_or_create(
		name = fake_name,
		proper_name = '',
		job_code_prefix = fake_job_code_prefix,
		paymentTerm = fake_paymentTerm,
		notes = fake.sentence(nb_words=20),
		)
	c.save()
	return c


def fake_Job(c):
	fake_job_name = fake.street_name()
	fake_client = random.choice(c)
	fake_job_code = fake.swift(length = 11)
	JOB_TYPE_CHOICES = ['Renewal','Original','Library','Licensing','Misc']

	fake_budget = math.floor(random.randint(800000, 10000000)/100000)*100000
	fake_personInCharge = random.choice(picChoices)
	fake_status = random.choice(statusChoices)

	

	j,_ = Job.objects.get_or_create(
		job_name = fake_job_name,
		client = fake_client,
		job_code = fake_job_code,
		job_type = random.choice(JOB_TYPE_CHOICES),

		budget = fake_budget,
		notes = fake.sentence(nb_words=10),

		personInCharge = fake_personInCharge,
		status = fake_status,
		job_date = random.choice(['2023-01-01','2023-02-01','2023-03-01'])
		)
	j.save()
	return j


# fake_Clients = []
# fake_Vendors = []

def populate(N=5):
	fake_Clients = [fake_Client() for n in range(3)]
	fake_Vendors = [fake_Vendor() for n in range(3)]
	for entry in range(N):
		j = fake_Job(fake_Clients)
		# vendorSample = random.sample(fake_Vendors, random.randint(0,4))
		# for v in vendorSample:
		# 	j.vendors.add(v)
	

if __name__ == '__main__':
	print("Populating!")
	populate(3)
	print("Populating finished!")





