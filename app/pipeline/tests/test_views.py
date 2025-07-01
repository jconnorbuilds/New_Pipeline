from datetime import date
from dateutil.relativedelta import relativedelta
from django.test import TestCase, Client, RequestFactory
from django.urls import reverse
from django.utils import timezone
from pipeline.models import Job, Cost, Vendor, Client as ClientModel
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from pipeline.views import FileUploadView
import json


class TestViews(TestCase):
    def setUp(self):
        self.client = Client()

        self.user = User.objects.create_user(username="testuser", password="password")
        self.client.login(username="testuser", password="password")

        # urls
        self.pipeline_url = reverse("pipeline:index")
        self.file_upload_url = reverse("pipeline:process-uploaded-vendor-invoice")

    def test_pipeline_GET(self):
        response = self.client.get(self.pipeline_url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "pipeline/pipeline.html")


class FileUploadTest(TestCase):

    def setUp(self):
        self.client = Client()
        self.file_upload_url = reverse("pipeline:process-uploaded-vendor-invoice")

        self.view = FileUploadView()
        self.empty_invoice_data = {}
        self.empty_files = {}
        self.test_invoice_filename = "test_invoice.pdf"
        self.test_invoice_data = json.dumps(
            {self.test_invoice_filename: {"cost_id": 1}}
        )

        self.simple_file = SimpleUploadedFile(
            self.test_invoice_filename, b"I am just some content"
        )

        self.request_with_file = RequestFactory().post(
            self.file_upload_url,
            {"invoice_data": self.test_invoice_data, "file": self.simple_file},
        )

    @classmethod
    def setUpTestData(self):

        self.test_client = ClientModel.objects.create(
            friendly_name="test client",
            proper_name="Test Client, Ltd.",
            job_code_prefix="TCL",
        )

        self.test_vendor = Vendor.objects.create(
            first_name="John",
            last_name="Doe",
            vendor_code="JND",
            email="jnd@fakeemail.com",
        )

        self.test_job = Job.objects.create(
            job_name="test job",
            revenue=1000000,
            client=ClientModel.objects.get(friendly_name="test client"),
        )
        self.test_job.vendors.add(1)

        self.test_cost = Cost.objects.create(
            vendor=Vendor.objects.get(id=1),
            description="test cost",
            amount=10000,
            job=Job.objects.get(id=1),
            currency="JPY",
        )

    def test_file_upload_POST(self):
        self.view.setup(self.request_with_file)

    # invoice_data = json.loads(request.POST.get("invoice_data"))
    # files = {file.name: file for file in request.FILES.values()}
    # processing_result = self.view.process_invoices(invoice_data, files)

    # print(request.POST)
    # print(request.FILES)
    # print(f"{processing_result["successful"] = }")
    # print(f"{processing_result["failed"] = }")

    def test_set_date_folder_with_pay_period(self):
        # 1. No pay period, before 25th
        result = self.view.set_date_folder(date(2024, 11, 11))
        self.assertEqual(result, "2024年11月")

        # 2. No pay period, on or after 25th
        result = self.view.set_date_folder(date(2024, 11, 25))
        self.assertEqual(result, "2024年12月")

        # 3. pay_period in future, today >= 25
        result = self.view.set_date_folder(date(2024, 11, 25), date(2025, 3, 25))
        self.assertEqual(result, "2025年3月")

        # 4. pay_period in future, today < 25
        result = self.view.set_date_folder(date(2024, 11, 11), date(2024, 12, 25))
        self.assertEqual(result, "2024年11月")

        # 5. pay_period in the past, today < 25
        result = self.view.set_date_folder(date(2024, 10, 24), date(2024, 10, 23))
        self.assertEqual(result, "2024年10月")

        # 6. pay_period in the past, today >= 25
        result = self.view.set_date_folder(date(2024, 10, 26), date(2024, 10, 25))
        self.assertEqual(result, "2024年11月")

    # def test_file_upload_POST_no_data(self):
    #     invoice_data = {}
    #     files = {}
    #     empty_request = RequestFactory().post(
    #         self.file_upload_url,
    #         {"invoice_data": self.empty_invoice_data, "FILES": self.empty_files},
    #     )
    #     self.view.setup(empty_request)

    #     processed_invoices = self.view.process_invoices(
    #         self.empty_invoice_data, self.empty_files
    #     )

    #     print(processed_invoices)
