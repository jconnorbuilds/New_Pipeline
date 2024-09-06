from django.test import TestCase, Client, RequestFactory
from django.urls import reverse
from pipeline.models import Job, Cost, Vendor
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

    def test_file_upload_POST(self):
        simple_file = SimpleUploadedFile(
            self.test_invoice_filename, b"I am just some content"
        )
        request = RequestFactory().post(
            self.file_upload_url,
            {"invoice_data": self.test_invoice_data, "file": simple_file},
        )
        self.view.setup(request)

        print(request.POST)
        print(request.FILES)
        invoice_data = json.loads(request.POST.get("invoice_data"))
        files = {file.name: file for file in request.FILES.values()}
        successful_invoices, unsuccessful_invoices = self.view.process_invoices(
            invoice_data, files
        )

        print(f"{successful_invoices = }")
        print(f"{unsuccessful_invoices = }")

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
