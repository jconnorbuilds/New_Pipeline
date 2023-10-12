from django.test import TestCase
from django.utils import timezone
import random
import factory
from pipeline.models import Job, Client, Vendor, Cost

# Create your tests here.


class ClientFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Client
    friendly_name = factory.Faker('company')
    proper_name = factory.lazy_attribute(
        lambda o: o.friendly_name + ", Inc.")
    proper_name_japanese = "株式会社オレンジ"
    job_code_prefix = factory.lazy_attribute(
        lambda o: ''.join(random.choices(
            [*o.friendly_name.replace(' ', '').upper()], k=3))
    )


class VendorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Vendor

    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    vendor_code = factory.lazy_attribute(
        lambda o: o.first_name[0] + o.last_name[0] + o.last_name[1])
    preferred_currency = "USD"


class JobFactory(factory.django.DjangoModelFactory):

    class Meta:
        model = Job

    job_name = factory.Faker('text', max_nb_chars=50)
    client = factory.SubFactory(ClientFactory)
    job_code_isFixed = False
    job_code_isOverridden = False
    isArchived = False
    isInvoiced = False
    revenue = round((random.randint(50000, 3000000))/10000) * 10000
    granular_revenue = False
    add_consumption_tax = True
    consumption_tax_amt = revenue * 0.1 if add_consumption_tax else 0
    revenue_incl_tax = revenue + consumption_tax_amt
    invoice_recipient = client
    invoice_year = random.randint(timezone.now().year - 2, timezone.now().year)
    invoice_month = random.randint(1, 12)
    job_type = Job.JOB_TYPE_CHOICES[random.randint(
        0, len(Job.JOB_TYPE_CHOICES))][0]
    personInCharge = "JC"
    status = "ONGOING"
    isDeleted = False


class CostFactory(factory.django.DjangoModelFactory):

    class Meta:
        model = Cost

    job = factory.SubFactory(JobFactory)
    vendor = factory.SubFactory(VendorFactory)
    description = "mock final fee"
    amount = random.randint(100, 10000)
    currency = "USD"
    invoice_status = "REC"


class JobTestCase(TestCase):
    def setUp(self):
        self.client = ClientFactory()
        self.job = JobFactory()
        self.cost = CostFactory()

    def test_job_creation(self):
        j = JobFactory()
        self.assertTrue(isinstance(j, Job))

    def test_job_title_matches(self):
        j = JobFactory(job_name="Test Job 1")
        self.assertEqual(j.job_name, "Test Job 1")

    def test_set_job_code(self):
        job_codes = {}
        for i in range(0, 3):
            job_codes[f'jc{i}'] = self.job.set_job_code(
                prefix="AAA", year=2023, month=10)
            JobFactory(job_code=job_codes[f'jc{i}'], job_code_isFixed=True)

        job_codes['jc3'] = self.job.set_job_code(
            prefix="BBB", year=2023, month=10)
        JobFactory(job_code=job_codes['jc3'], job_code_isFixed=True)

        job_codes['jc4'] = self.job.set_job_code(
            prefix="BBB", year=2023, month=11)
        JobFactory(job_code=job_codes['jc4'], job_code_isFixed=True)

        self.assertEqual(job_codes['jc0'], 'AAA10012023')
        self.assertEqual(job_codes['jc1'], 'AAA10022023')
        self.assertEqual(job_codes['jc2'], 'AAA10032023')
        self.assertEqual(job_codes['jc3'], 'BBB10012023')
        self.assertEqual(job_codes['jc4'], 'BBB11012023')


# class ClientTestCase(TestCase):
#     def setUp(self):
#         default_client = ClientFactory()
#         default_job = JobFactory()
#         default_cost = CostFactory()

#     def test_job_code_prefix(self):
#         pass
