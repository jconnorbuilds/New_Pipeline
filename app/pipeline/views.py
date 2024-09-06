from django.conf import settings
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.core import serializers
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.db import IntegrityError
from django.db.models import Sum, Q
from django.http import (
    JsonResponse,
    HttpResponseRedirect,
    HttpResponse,
    HttpResponseServerError,
    HttpResponseBadRequest,
)
from django.shortcuts import render, redirect
from django.template.loader import render_to_string
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.utils.html import strip_tags
from django.views.decorators.http import require_http_methods
from django.views.generic import (
    View,
    TemplateView,
    ListView,
    DetailView,
    DeleteView,
    UpdateView,
    CreateView,
)
from django.views.generic.edit import FormMixin
from .models import Job, Vendor, Cost, Client
from .forms import (
    CostForm,
    JobForm,
    JobImportForm,
    PipelineCSVExportForm,
    PipelineBulkActionsForm,
    AddVendorToCostForm,
    UpdateCostForm,
    ClientForm,
    SetInvoiceInfoForm,
    SetDepositDateForm,
    PipelineJobUpdateForm,
    CostPayPeriodForm,
)
from .currencies import currencies
from datetime import date
from dateutil.relativedelta import relativedelta
import dropbox
from dropbox.exceptions import AuthError
import pprint
from rest_framework import generics
from rest_framework.renderers import TemplateHTMLRenderer
from .serializers import VendorSerializer, JobSerializer
from urllib.parse import unquote
from .utils import (
    get_forex_rates,
    process_imported_jobs,
    get_job_data,
    get_invoice_status_data,
    get_invoice_data,
    update_cost_addtl_row_data,
)


import json
import csv
import logging
import smtplib

logger = logging.getLogger(__name__)


class RedirectToPreviousMixin:
    default_redirect = "/"

    def get(self, request, *args, **kwargs):
        request.session["previous_page"] = request.META.get(
            "HTTP_REFERER", self.default_redirect
        )
        return super().get(request, *args, **kwargs)

    def get_success_url(self):
        return self.request.session["previous_page"]


def index(request):
    return redirect("pipeline:index")


def forex_rates(request):
    forex_rates = get_forex_rates()
    return JsonResponse(forex_rates)


def currency_list(request):
    print({currencies})
    return JsonResponse(currencies, safe=False)


class PipelineViewBase(LoginRequiredMixin, SuccessMessageMixin, TemplateView):
    renderer_classes = [TemplateHTMLRenderer]
    model = Job
    csv_export_form = PipelineCSVExportForm
    form_class = JobForm
    client_form_class = ClientForm
    set_invoice_info_form_class = SetInvoiceInfoForm
    bulk_actions = PipelineBulkActionsForm
    set_deposit_date_form_class = SetDepositDateForm
    template_name = "pipeline/pipeline.html"
    table_pagination = False

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        client_id = self.request.GET.get("client_id")
        context["job_form"] = JobForm(initial={"client": client_id})
        context["job_import_form"] = JobImportForm()
        context["set_invoice_info_form"] = self.set_invoice_info_form_class
        context["set_deposit_date_form"] = self.set_deposit_date_form_class
        context["client_form"] = self.client_form_class
        context["csv_export_form"] = self.csv_export_form
        context["bulk_actions"] = self.bulk_actions
        context["headers"] = [
            "",
            "クライアント名",
            "案件名",
            "ジョブコード",
            "収入（税込）",
            "出費",
            "利益率（税抜）",
            "請求期間",
            "種目",
            "ステータス",
            "入金日",
            "Invoice Info Completed",
        ]
        return context

    def get_queryset(self):
        queryset = Job.objects.filter(isDeleted=False)
        return queryset

    def post(self, request, *args, **kwargs):
        if "bulk-actions" in request.POST:
            # TODO: Clean up this mess
            bulk_form = self.bulk_actions(request.POST)
            checked_jobs = Job.objects.filter(id__in=request.POST.getlist("select"))
            if bulk_form.is_valid():
                action = bulk_form.cleaned_data["actions"]
                if action == "NEXT":
                    for job in checked_jobs:
                        if job.invoice_month:
                            if job.invoice_month == "12":
                                job.invoice_month = "1"
                                job.invoice_year = str(int(job.invoice_year) + 1)
                            else:
                                job.invoice_month = str(int(job.invoice_month) + 1)
                                job.save()
                        return HttpResponseRedirect("/pipeline/")
                elif action == "PREVIOUS":
                    for job in checked_jobs:
                        if job.invoice_month:
                            if job.invoice_month == "1":
                                job.invoice_month = "12"
                                job.invoice_year = str(int(job.invoice_year) - 1)
                            else:
                                job.invoice_month = str(int(job.invoice_month) - 1)
                            job.save()
                        return HttpResponseRedirect("/pipeline/")
                elif action == "DEL":
                    i = 0
                    for job in checked_jobs:
                        job.isDeleted = True
                        job.save()
                        i += 1
                    if i > 0:
                        messages.warning(
                            request,
                            f"{i} jobs were deleted. They can be restored from the admin panel.",
                        )
                    else:
                        messages.error(request, "No jobs were deleted.")
                elif action == "RELATE":
                    if len(checked_jobs) > 1:
                        checked_jobs[0].relatedJobs.set(
                            [job for job in checked_jobs[1::]]
                        )
                elif action == "UNRELATE":
                    i = 1
                    while i < len(checked_jobs):
                        if checked_jobs[i] in checked_jobs[0].relatedJobs.all():
                            checked_jobs[0].relatedJobs.remove(checked_jobs[i])
                            i += 1
                        else:
                            i += 1
                else:
                    # TODO: use a better error message
                    return HttpResponse("error")
            return HttpResponseRedirect("/pipeline/")
        elif "import-jobs" in request.POST:
            if (
                request.method == "POST"
            ):  # TODO : I don't think this if statement is necessary? double check
                form = JobImportForm(request.POST, request.FILES)
                if form.is_valid():
                    response = process_imported_jobs(request.FILES["file"])
                    if response["valid_template"] == True:
                        created_items = response["success_created"]
                        not_created_items = response["success_not_created"]
                        errors = response["error"]
                        cant_update = response["cant_update"]
                        if created_items:
                            messages.success(
                                request,
                                f"{len(created_items)} jobs were added successfully!",
                            )

                        if not_created_items:
                            messages.info(
                                request,
                                f"{len(not_created_items)} items were already in the database, so they were left alone.",
                            )

                        for err, message in errors.items():
                            messages.error(request, f"{err}: {message}")

                        for code, message in cant_update.items():
                            messages.error(request, f"{code}: {message}")
                    else:
                        messages.error(request, f'{response["errors"]}')

                else:
                    context = self.get_context_data()
                    context["job_import_form"] = form
                    return render(request, self.template_name, context)

        return render(request, self.template_name, self.get_context_data())


class AddJobView(PipelineViewBase):
    def post(self, request, *args, **kwargs):
        job_form = JobForm(request.POST)
        if job_form.is_valid():
            if not job_form.instance.granular_revenue:
                job_form.instance.revenue = job_form.instance.revenue * 10000
            instance = job_form.save()
            job = Job.objects.get(pk=instance.pk)
            data = get_job_data(job)
            return JsonResponse({"status": "success", "data": data})
        else:
            return JsonResponse({"status": "error"})


# TODO: rewrite this so we send back the whole client list and refresh on frontend
# instead of 'patching in' just the new info into the list? Simpler but a tiny bit more costly...
class NewClientView(PipelineViewBase):
    def post(self, request, *args, **kwargs):
        form = self.client_form_class(request.POST)
        if form.is_valid():
            instance = form.save()
            return JsonResponse(
                {
                    "status": "success",
                    "id": instance.id,
                    "client_friendly_name": instance.friendly_name,
                    "prefix": instance.job_code_prefix,
                }
            )
        return JsonResponse({"errors": form.errors}, status=400)


class SetInvoiceInfoView(PipelineViewBase):
    def post(self, request, *args, **kwargs):
        job_id = kwargs["pk"]
        job = Job.objects.get(id=job_id)
        form = SetInvoiceInfoForm(request.POST, instance=job)
        if form.is_valid():
            form.save()
            return JsonResponse({"status": "success", "data": get_job_data(job)})
        else:
            # TODO: make helpful error message
            return JsonResponse({"status": "error", "message": form.errors})


class SetDepositDateView(PipelineViewBase):
    def post(self, request, *args, **kwargs):
        job_id = kwargs["pk"]
        job = Job.objects.get(id=job_id)
        form = SetDepositDateForm(request.POST, instance=job)
        if form.is_valid():
            form.save()
            return JsonResponse({"status": "success", "data": get_job_data(job)})
        else:
            for error in form.errors:
                print(error)
            return JsonResponse({"status": "error", "message": json.dumps(form.errors)})


class PipelineJobUpdateView(PipelineViewBase):
    def post(self, request, *args, **kwargs):
        job = Job.objects.get(id=kwargs["pk"])
        form = PipelineJobUpdateForm(json.loads(request.body), instance=job)
        if form.is_valid():
            form.save()
            return JsonResponse(
                {"status": "success", "data": get_job_data(job)}, status=200
            )
        else:
            return JsonResponse({"status": "error", "message": form.errors}, status=400)


def pipeline_data(request, year=None, month=None):
    """
    Returns data for jobs queried based on the date set on the pipeline.
    All non-(soft)-deleted jobs from the set month and year will be returned,
    and if the set date is the current month and year, then all ongoing jobs will also be returned.
    """
    # bandaid fix, need to implement better timezone handling
    today = timezone.now()

    jobs = Job.objects.filter(isDeleted=False)
    if year == today.year and month == today.month:
        jobs = jobs.filter(
            Q(job_date__month=month, job_date__year=year) | Q(job_date=None)
        )
    elif year != None and month != None:
        jobs = jobs.filter(job_date__month=month, job_date__year=year)

    data = {
        "data": [get_job_data(job) for job in jobs],
        "invoice_status_data": [get_invoice_status_data(job) for job in jobs],
    }
    return JsonResponse(
        data,
        safe=False,
    )


def revenue_display_data(request, year=None, month=None):
    """
    Calculates the revenue displayed on the pipeline page.

    variables:

    all_jobs_in_current_year: All jobs in the current fiscal year (Jan - Dec)
    jobs_in_year_excl_this_month: All jobs in the current fiscal year excluding this month.
                                  Used to calculate average monthly revenue
    total_revenue_ytd: Sum of the revenue of all completed jobs year-to-date
    total_revenue_for_monthly_avg: A sum of jobs_in_year_excl_this_month
    total_revenue_monthly_expected: Revenue of all jobs in the current month + all ongoing jobs
    total_revenue_monthly_actual: Revenue of all COMPLETED jobs in the current month
    """
    today = timezone.now()

    jobs = Job.objects.filter(isDeleted=False)
    if year == today.year and month == today.month:
        jobs = jobs.filter(
            Q(job_date__month=month, job_date__year=year) | Q(job_date=None)
        )
    elif year != None and month != None:
        jobs = jobs.filter(job_date__month=month, job_date__year=year)

    prev_month = today.month - 1 if today.month > 1 else 1
    all_jobs_in_current_year = Job.objects.filter(
        job_date__year=date.today().year, isDeleted=False
    )

    jobs_in_year_excl_this_month = all_jobs_in_current_year.filter(
        job_date__month__lt=date.today().month
    )

    total_revenue_ytd = (
        all_jobs_in_current_year.filter(
            status__in=["INVOICED1", "INVOICED2", "FINISHED", "ARCHIVED"]
        ).aggregate(total_revenue=Sum("revenue_incl_tax"))["total_revenue"]
        or 0
    )
    total_revenue_for_monthly_avg = (
        jobs_in_year_excl_this_month.filter(
            status__in=["INVOICED1", "INVOICED2", "FINISHED", "ARCHIVED"]
        ).aggregate(total_revenue=Sum("revenue_incl_tax"))["total_revenue"]
        or 0
    )
    total_revenue_monthly_expected = (
        jobs.aggregate(total_revenue=Sum("revenue_incl_tax"))["total_revenue"] or 0
    )
    total_revenue_monthly_actual = (
        jobs.filter(
            status__in=["INVOICED1", "INVOICED2", "FINISHED", "ARCHIVED"]
        ).aggregate(total_revenue=Sum("revenue_incl_tax"))["total_revenue"]
        or 0
    )

    data = {
        "total_revenue_ytd": f"¥{total_revenue_ytd:,}",
        "avg_monthly_revenue_ytd": f"¥{round(total_revenue_for_monthly_avg/(prev_month)):,}",
        "total_revenue_monthly_expected": f"¥{total_revenue_monthly_expected:,}",
        "total_revenue_monthly_actual": f"¥{total_revenue_monthly_actual:,}",
    }
    return JsonResponse(data)


def cost_data(request, job_id):
    forex_rates = get_forex_rates()
    costs = Cost.objects.filter(job=job_id)
    vendors = Vendor.objects.filter(jobs_with_vendor=job_id)

    data = {"data": [get_invoice_data(cost, forex_rates, vendors) for cost in costs]}

    return JsonResponse(
        data,
        safe=False,
    )


class VendorDetailView(LoginRequiredMixin, DetailView):
    template_name = "pipeline/vendors.html"
    model = Vendor

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["costs"] = Cost.objects.filter(vendor__id=self.kwargs["pk"])
        currentJobs = Job.objects.filter(vendors__id=self.kwargs["pk"])
        context["jobs"] = Job.objects.filter(vendors__id=self.kwargs["pk"])

        return context


class ClientDetailView(LoginRequiredMixin, DetailView):
    template_name = "pipeline/vendors.html"
    model = Client


class JobDetailView(UpdateView):
    template_name = "pipeline/job_details.html"
    model = Job
    fields = ["is_extension_of"]

    def get_success_url(self):
        return reverse("pipeline:job-detail", kwargs={"pk": self.object.pk})


@require_http_methods(["GET"])
def get_job_list(request):
    jobs = Job.objects.all().values("id", "job_name", "job_code")
    return JsonResponse(list(jobs), safe=False)


class InvoiceView(LoginRequiredMixin, TemplateView):
    forex_rates = get_forex_rates()
    model = Cost
    template_name = "pipeline/invoices_list.html"
    costs = Cost.objects.all()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["headers"] = [
            "",
            "金額",
            "現地",
            "請求期間",
            "案件名",
            "ジョブコード",
            "作家",
            "作業内容",
            "PO番号",
            "請求書ステータス",
            "支払予定期間",
            "",
            "PIC",
            "PIC",
        ]
        context["pay_period_form"] = CostPayPeriodForm()
        return context


def update_invoice_table_row(request):
    if request.method == "POST":
        data = json.loads(request.body)
        print(data)
        form_data_vendor = data.get("vendor")
        form_data_status = data.get("invoice_status")
        cost = Cost.objects.get(id=data.get("cost_id"))
        vendors = Vendor.objects.filter(jobs_with_vendor=cost.job.id)
        forex_rates = get_forex_rates()

        if form_data_vendor:
            cost.vendor = (
                Vendor.objects.get(id=form_data_vendor)
                if form_data_vendor != "0"
                else None
            )

        if form_data_status:
            cost.invoice_status = form_data_status
        cost.save()

        update_cost_addtl_row_data(cost)

        return JsonResponse(
            {
                "status": "success",
                "data": get_invoice_data(cost, forex_rates, vendors),
            },
        )


@require_http_methods(["GET"])
def all_invoices_data(request):
    costs = Cost.objects.all()
    forex_rates = get_forex_rates()
    data = {"data": [get_invoice_data(cost, forex_rates) for cost in costs]}
    return JsonResponse(data)


def dropbox_connect():
    """Create a connection to Dropbox."""
    headers = {"Dropbox-API-Select-User": settings.DROPBOX_USER_ID}

    refresh_token = settings.DROPBOX_REFRESH_TOKEN
    app_key = settings.DROPBOX_APP_KEY
    app_secret = settings.DROPBOX_APP_SECRET

    try:
        dbx = dropbox.Dropbox(
            oauth2_refresh_token=refresh_token,
            app_key=app_key,
            app_secret=app_secret,
            headers=headers,
        )
        dbx.check_and_refresh_access_token()

    except AuthError as e:
        logger.error(f"Unable to connect to dropbox. {str(e)}")
    return dbx


def dropbox_upload_file(dbx, file_to_upload, dropbox_file_path):
    meta = dbx.with_path_root(
        path_root=dropbox.common.PathRoot.namespace_id("3267726691")
    ).files_upload(
        f=file_to_upload.read(),
        path=dropbox_file_path,
        mode=dropbox.files.WriteMode("overwrite"),
    )

    return meta


class FileUploadView(View):
    MIB = 1024 * 1024
    MAX_ALLOWED_FILESIZE = 10 * MIB  # 10 MiB
    MAX_ALLOWED_FILESIZE_MiB_STRING = f"{MAX_ALLOWED_FILESIZE / MIB } MiB"
    ALLOWED_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg"]
    INVOICE_FOLDER = (
        "/Financial/_ INVOICES/_VENDOR INVOICES"
        if not settings.DEBUG
        else "/Financial/TEST/_ INVOICES/_VENDOR INVOICES"
    )

    def post(self, request, *args, **kwargs):
        if not request.FILES:
            return HttpResponseBadRequest("No files found")

        if not request.POST.get("invoice_data"):
            return HttpResponseBadRequest("No invoice data found")

        invoice_data = json.loads(request.POST.get("invoice_data"))
        logger.info(f"INVOICE DATA: {invoice_data}")
        logger.info(f"INVOICE DATA ITEMS: {invoice_data.items()}")

        files = {file.name: file for file in request.FILES.values()}
        result = self.process_invoices(invoice_data, files)

        if result["successful"]:
            self.update_database(*result, write=True)
            self.send_confirmation_email(result["successful"])

        return JsonResponse(
            {
                "invoices": {
                    "successful": [
                        invoice["filename"] for invoice in result["successful"]
                    ],
                    "unsuccessful": result["failed"],
                },
            },
        )

    def process_invoices(self, invoice_data, files):
        build_result = self.build_upload_queue(invoice_data, files)
        upload_result = self.upload_files_to_dropbox(build_result["successful"])

        successful_invoices = upload_result["successful"]
        failed_invoices = build_result["failed"] + upload_result["failed"]

        logger.info({"SUCCESS": successful_invoices, "FAILED": failed_invoices})
        return [successful_invoices, failed_invoices]

    def update_database(self, successful_inv, unsuccessful_inv, write=True):
        for invoice in successful_inv:
            cost_obj = invoice["cost_obj"]
            cost_obj.invoice_status = "REC"
            if write:
                cost_obj.save()

    def build_upload_queue(self, invoice_data, files):
        result = {"successful": [], "failed": []}
        for filename, form_data in invoice_data.items():
            validity_result = self.check_file_validity(filename, form_data, files)

            if not validity_result.get("is_valid"):
                result["failed"].append(validity_result)
            else:
                result["successful"].append(
                    {
                        "file": validity_result.get("file"),
                        "cost_id": form_data.get("cost_id"),
                    }
                )

        return result

    def handle_upload_results(self, uploaded_files):
        result = {"successful": [], "unsuccessful": []}

        for file in uploaded_files:
            if file["success"]:
                result["successful"].append(file)
            else:
                result["unsuccessful"].append(file)

        return result

    def check_file_validity(self, filename, form_data, files):
        invoice_file = files.get(filename)
        if not invoice_file:
            return self.handle_missing_file(filename, form_data)

        # If the file is an acceptable size and filetype, upload to dropbox
        if not self.is_valid_file(invoice_file):
            return self.handle_invalid_file(filename, invoice_file, form_data)

        return {"filename": filename, "is_valid": True, "file": invoice_file}

    def upload_files_to_dropbox(self, file_dict_list):
        dbx = dropbox_connect()
        uploaded_files = []
        for data in file_dict_list:
            try:
                file = data["file"]
                cost = Cost.objects.get(id=data["cost_id"])
                file_full_path = self.get_full_filepath(file, cost)
                dropbox_upload_file(dbx, file, file_full_path)
                uploaded_files.append(
                    {"filename": file.name, "success": True, "cost_obj": cost}
                )
            except ObjectDoesNotExist as e:
                self.handle_file_upload_error(
                    f"{str(e)} {data['cost_id']}", file, uploaded_files
                )

            except dropbox.exceptions.ApiError as e:
                self.handle_file_upload_error(str(e), file, uploaded_files)

        return uploaded_files

    def handle_file_upload_error(self, error_message, file, file_list):
        failed_file = self.log_unsuccessful_upload_attempt(
            error_message, invoice_file=file
        )
        file_list.append(failed_file)

    def get_full_filepath(self, invoice_file, cost):
        date_folder_name = self.set_date_folder(cost.pay_period)
        currency_folder_name = "_" + cost.currency
        file_extension = f".{invoice_file.name.split('.')[-1]}"
        full_filepath = f"{self.INVOICE_FOLDER}/{date_folder_name}/{currency_folder_name}/{cost.PO_number}{file_extension}"

        return full_filepath

    def is_valid_file(self, file):
        return file.size <= self.MAX_ALLOWED_FILESIZE and any(
            file.name.lower().endswith(ext) for ext in self.ALLOWED_FILE_EXTENSIONS
        )

    def handle_missing_file(self, filename, data):
        error_msg = f"Unable to find uploaded file. Are there special characters in the filename? {filename}: {data}"
        logger.warning(error_msg)
        return {"filename": filename, "message": error_msg, "is_valid": False}

    def handle_invalid_file(self, filename, file, data):
        if file.size > self.MAX_ALLOWED_FILESIZE:
            error_msg = f"Unable to find uploaded file. Are there special characters in the filename? {filename}: {data}"
        elif not all(
            filename.lower().endswith(ext) for ext in self.ALLOWED_FILE_EXTENSIONS
        ):
            error_msg = f"Filetype not allowed. Allowed extensions: {self.ALLOWED_FILE_EXTENSIONS}"
        else:
            error_msg = "Unknown error"

        logger.warning(error_msg)
        return {"filename": filename, "message": error_msg, "is_valid": False}

    def log_unsuccessful_upload_attempt(self, message, invoice_file=None):
        logger.error(message)
        return {
            "filename": invoice_file.name if invoice_file else "Unknown",
            "message": message,
            "success": False,
        }

    def set_date_folder(self, pay_period):
        return (
            pay_period.strftime("%Y年%-m月")
            if pay_period
            else (timezone.now() + relativedelta(months=+1)).strftime("%Y年%-m月")
        )

    def send_confirmation_email(self, successful_invoices):
        try:
            recipient = self.get_email_recipient(successful_invoices)
        except Exception as e:
            logger.critical(str(e))
            return

        to_emails = [recipient.email]
        subject = "Confirmation - invoices received!"
        from_email = None
        html_message, plaintext_message = self.get_email_message(
            recipient, successful_invoices
        )

        try:
            send_mail(
                subject,
                plaintext_message,
                from_email,
                to_emails,
                fail_silently=False,
                html_message=html_message,
            )
        except smtplib.SMTPException as e:
            logger.error(str(e), stack_info=True)
        except Exception as e:
            logger.error(f"Unable to send out confirmation email: {str(e)}")

    def get_email_message(self, recipient, successful_invoices):
        recipient_name = (
            recipient.use_familiar_name
            if recipient.use_company_name
            else recipient.first_name
        )

        html_message = render_to_string(
            "invoice_uploader/invoice_confirmation_email_template.html",
            context={
                "vendor_name": recipient_name,
                "vendor": recipient,
                "successful_invoices": [
                    invoice["cost_obj"] for invoice in successful_invoices
                ],
                "request": self.request,
            },
        )

        plaintext_message = strip_tags(html_message)

        return html_message, plaintext_message

    def get_email_recipient(self, successful_invoices):
        vendor_ids = [invoice["cost_obj"].vendor.id for invoice in successful_invoices]
        vendor = (
            Vendor.objects.get(id=vendor_ids.pop())
            if len(set(vendor_ids)) == 1
            else None
        )
        if not vendor:
            raise Exception(
                f"Invoices for costs belonging to multiple vendors were found in a single upload. {[{invoice['filename']: invoice['cost_obj'].vendor.id} for invoice in successful_invoices]}"
            )

        return vendor


def invoice_upload_view(request, vendor_uuid):
    vendor = Vendor.objects.get(uuid=vendor_uuid)
    requested_invoices = Cost.objects.filter(
        vendor_id=vendor.id, invoice_status="REQ"
    ).select_related("job")
    jobs = list(
        Job.objects.filter(costs_of_job__in=requested_invoices).values(
            "pk", "job_name", "job_code"
        )
    )
    jobs_json = json.dumps(jobs)
    invoices_json = serializers.serialize("json", requested_invoices)

    context = {
        "requested_invoices": requested_invoices,
        "invoices_json": json.dumps(invoices_json),
        "jobs_json": jobs_json,
        "vendor_id": vendor.id,
    }
    return render(request, "pipeline/upload_invoice.html", context)


@require_http_methods(["GET"])
def get_vendor_requested_invoices_data(request, vendor_uuid):
    vendor = Vendor.objects.get(uuid=vendor_uuid)
    requested_invoices = Cost.objects.filter(
        vendor_id=vendor.id, invoice_status="REQ"
    ).select_related("job")
    jobs = Job.objects.filter(costs_of_job__in=requested_invoices)

    data = {}
    jobs_json = list(jobs.values("pk", "job_name", "job_code"))
    invoices_json = list(
        requested_invoices.values(
            "pk",
            "PO_number",
            "amount",
            "currency",
            "description",
            "job",
            "job__job_name",
            "job__job_code",
        )
    )

    data["jobs"] = jobs_json
    data["vendor_id"] = vendor.id
    data["requested_invoices"] = invoices_json

    return JsonResponse(data, safe=False)


def upload_invoice_success_landing_page(request):
    return render(request, "invoice_uploader/upload_invoice_success.html")


def invoice_error(request):
    return render(request, "pipeline/no_invoices.html")


def RequestVendorInvoiceSingle(request, cost_id):
    # Creates a list of vendors who have invoices ready to be requested, no dupes
    vendor = Vendor.objects.get(costs_by_vendor__id=cost_id)
    cost = Cost.objects.get(id=cost_id)
    protocol = "http" if settings.DEBUG else "https"

    if cost.invoice_status not in ["REQ", "REC", "REC2", "PAID", "NA"]:
        # TODO: prepare a separate email for Japanese clients
        if vendor.use_company_name:
            vendor_name = vendor.familiar_name
        else:
            vendor_name = vendor.first_name

        # args for use in send_mail
        recipient_list = [vendor.email]
        subject = f"BCWC invoice request - {cost.PO_number} {cost.job.job_name}"
        from_email = None

        # creates rich text and plaintext versions to be sent; rich text will be read by default
        html_message = render_to_string(
            "invoice_uploader/invoice_request_email_template.html",
            context={
                "vendor_name": vendor_name,
                "vendor": vendor,
                "cost": cost,
                "request": request,
                "protocol": protocol,
            },
        )

        plaintext_message = strip_tags(html_message)

        try:
            send_mail(
                subject,
                plaintext_message,
                from_email,
                recipient_list,
                fail_silently=False,
                html_message=html_message,
            )
        except smtplib.SMTPException as e:
            logger.error(str(e), stack_info=True)
        except Exception as e:
            logger.error(f"Unable to send out invoice request email: {str(e)}")

        today = date.today()

        # TODO: find a nicer way to do this
        rel_pay_period = json.loads(request.body).get("pay_period")
        if rel_pay_period == "this":
            cost.pay_period = today.strftime("%Y-%-m-25")
        elif rel_pay_period == "next":
            cost.pay_period = (today + relativedelta(months=1)).strftime("%Y-%-m-25")
        elif rel_pay_period == "next-next":
            cost.pay_period = (today + relativedelta(months=2)).strftime("%Y-%-m-25")
        cost.invoice_status = "REQ"
        cost.save()

        messages.success(
            request,
            f"The invoice for {cost.PO_number} was requested from {vendor.familiar_name}! \n It's scheduled to be paid around {cost.pay_period}.",
        )

        return JsonResponse(
            {
                "status": "success",
                "message": "success!",
                "response": get_invoice_data(
                    cost,
                    get_forex_rates(),
                    vendors=Vendor.objects.filter(jobs_with_vendor=cost.job.id),
                ),
            }
        )
    else:
        # Return an error if the invoice has already been requested
        # This could be more robust, right now it's based on the setting of the
        # invoice status dropdown
        return JsonResponse({"status": "error", "message": "error :("})


def email_test_view(request, cost_id):
    vendor = Vendor.objects.get(costs_by_vendor__id=cost_id)
    cost = Cost.objects.get(id=cost_id)
    protocol = "http" if settings.DEBUG else "https"

    template = "invoice_uploader/invoice_request_email_template.html"

    return render(
        request,
        template,
        {
            "vendor_name": vendor.familiar_name,
            "vendor": vendor,
            "cost": cost,
            "request": request,
            "protocol": protocol,
        },
    )


# def jobs_csv_export(request):
#     csv_export_form = PipelineCSVExportForm(request.POST)
#     if csv_export_form.is_valid():
#         useRange = csv_export_form.cleaned_data["useRange"]
#         fromYear = csv_export_form.cleaned_data["fromYear"]
#         fromMonth = csv_export_form.cleaned_data["fromMonth"]
#         fromDate = f"{fromYear}-{fromMonth}" + "-01"
#         if useRange:
#             thruYear = csv_export_form.cleaned_data["thruYear"]
#             # add an extra month to calculate from the first day of the next month
#             # to save from having to calculate the last day of each month
#             thruMonth = str(int(csv_export_form.cleaned_data["thruMonth"]))
#         else:
#             thruYear = fromYear
#             thruMonth = fromMonth
#         if thruMonth != "12":
#             thruYear = thruYear
#             thruMonth = str(int(thruMonth) + 1)
#         else:
#             thruYear = str(int(thruYear) + 1)
#             thruMonth = "1"
#         thruDate = f"{thruYear}-{thruMonth}" + "-01"
#         print(f"from: {fromDate}\nthru: {thruDate}")

#         response = HttpResponse(
#             content_type="text/csv",
#             headers={
#                 "Content-Disposition": 'attachment; filename ="csv_simple_write.csv"'
#             },
#         )
#         writer = csv.writer(response)
#         fields = [
#             "クライアント",
#             "案件名",
#             "ジョブコード",
#             "予算 (¥)",
#             "総費用",
#             "案件タイプ",
#             "日付",
#         ]
#         writer.writerow(fields)

#         scope = Job.objects.filter(job_date__gte=fromDate, job_date__lt=thruDate)

#         expectedGrossRevenue = sum([job.revenue for job in scope])
#         actualGrossRevenue = sum(
#             [job.revenue for job in scope if job.status in ["FINISHED", "ARCHIVED"]]
#         )

#         for job in scope:
#             # Return date in format YYYY年MM月
#             date_MY = f"{job.job_date.year}年{job.job_date.month}月"
#             if job.client.proper_name_japanese:
#                 client_name = job.client.proper_name_japanese
#             else:
#                 client_name = job.client.proper_name
#             data = [
#                 client_name,
#                 job.job_name,
#                 job.job_code,
#                 f"{job.revenue:,}",
#                 f"{job.total_cost:,}",
#                 job.job_type,
#                 date_MY,
#             ]
#             writer.writerow(data)
#         writer.writerow("")
#         writer.writerow(
#             ["", "", "", "", "", "", "", "総収入(予想)", f"¥{expectedGrossRevenue:,}"]
#         )
#         writer.writerow(
#             ["", "", "", "", "", "", "", "総収入(実際)", f"¥{actualGrossRevenue:,}"]
#         )

#         return response
#     else:
#         print("something bad happened")


# def create_batch_payment_file(request):
#     """
#     Currently, WISE doesn't support batch payments from JPY accounts, so this is shelved until it's supported.

#     Create a WISE batch payment file from the template in /static.
#     Each payment can be maximum 1m JPY, so anything over ¥950k is split into multiple payments.
#     """
#     forex_rates = get_forex_rates()
#     if request.method == "POST":
#         invoices = Cost.objects.filter(invoice_status__in=["REC", "REC2"])
#         # format: invoice PO number {status (success/error), message}
#         processing_status = {}
#         response = HttpResponse(
#             content_type="text/csv",
#             headers={
#                 "Content-Disposition": 'attachment; filename = "WISE_BATCH_PAYMENT.csv"'
#             },
#         )

#         def split_into_even_parts(amount, num_of_parts):
#             parts = []
#             base_amount = amount // num_of_parts
#             remainder = amount % num_of_parts
#             parts = [base_amount] * num_of_parts
#             for i in range(remainder):
#                 parts[i] += 1
#             return parts

#         csvfile = "static/pipeline/Recipients-Batch-File test.csv"
#         try:
#             with open(csvfile, newline="") as templateCSV:
#                 reader = csv.reader(templateCSV)
#                 writer = csv.writer(response)

#                 column_names = ""
#                 for row in reader:
#                     column_names = row  # create header row with column names
#                     break
#                 writer.writerow(column_names)
#                 recipient_id_idx = column_names.index("recipientId")
#                 source_currency_idx = column_names.index("sourceCurrency")
#                 target_currency_idx = column_names.index("targetCurrency")
#                 amount_currency_idx = column_names.index("amountCurrency")
#                 amount_idx = column_names.index("amount")
#                 payment_reference_idx = column_names.index("paymentReference")

#                 for row in reader:
#                     recipient_id = int(row[recipient_id_idx])
#                     if recipient_id not in [
#                         invoice.vendor.payment_id for invoice in invoices
#                     ]:
#                         continue

#                     invoices_from_vendor = [
#                         invoice
#                         for invoice in invoices
#                         if invoice.vendor.payment_id == recipient_id
#                     ]
#                     for invoice in invoices_from_vendor:
#                         """
#                         Account for large payments over ¥1m JPY.
#                         To avoid errors, split anything over ¥950k into two or more payments.
#                         """
#                         if invoice.currency != row[target_currency_idx]:
#                             processing_status[invoice.PO_number] = {
#                                 "status": "error",
#                                 "message": f"Currency mismatch. Invoices for this vendor should be in {row[target_currency_idx]}.",
#                             }
#                             continue

#                         upper_limit_for_JPY = 950000
#                         approx_amount_in_JPY = (
#                             invoice.amount * forex_rates[row[target_currency_idx]]
#                         )

#                         if approx_amount_in_JPY > upper_limit_for_JPY:
#                             print("over the limit")
#                             split_into = 2
#                             within_limit = False
#                             while not within_limit:
#                                 print(
#                                     f"amount {approx_amount_in_JPY:,} to split_into: {split_into} == {approx_amount_in_JPY / split_into:,}"
#                                 )
#                                 print(f"under 950k? {within_limit}")
#                                 if (
#                                     approx_amount_in_JPY / split_into
#                                 ) < upper_limit_for_JPY:
#                                     within_limit = True
#                                 else:
#                                     split_into += 1

#                             split_payments = split_into_even_parts(
#                                 invoice.amount, split_into
#                             )
#                             i = 0
#                             while i < len(split_payments):
#                                 print(f"{i}: processing row")
#                                 row[amount_idx] = split_payments[i]
#                                 row[source_currency_idx] = "JPY"
#                                 row[amount_currency_idx] = row[target_currency_idx]

#                                 # Wanted to include "n of n" when payments are split into multiple parts,
#                                 # but payments in USD have a char limit of 10, so I accommodate for that.
#                                 # Our PO numbers are limited to 10 characters.
#                                 row[payment_reference_idx] = f"{invoice.PO_number}"
#                                 writer.writerow(row)
#                                 i += 1

#                             invoice.invoice_status = "QUE"
#                             invoice.save()
#                             processing_status[invoice.PO_number] = {
#                                 "status": "success",
#                                 "message": f"Successfully processed as {split_into} payments!",
#                             }

#                         else:
#                             row[amount_idx] = invoice.amount
#                             row[source_currency_idx] = "JPY"
#                             row[amount_currency_idx] = row[target_currency_idx]
#                             row[payment_reference_idx] = invoice.PO_number

#                             writer.writerow(row)
#                             invoice.invoice_status = "QUE"
#                             invoice.save()
#                             processing_status[invoice.PO_number] = {
#                                 "status": "success",
#                                 "message": "Successfully processed!",
#                             }

#             for key in processing_status:
#                 print(key, processing_status[key])

#             data = processing_status
#             response["X-Processing-Status"] = json.dumps(data)
#             print(json.dumps(data))
#             return response

#         except FileNotFoundError:
#             return HttpResponse(
#                 f"Template file not found in the expected location: {csvfile}",
#                 status=404,
#             )


def importClients(request):
    with open("static/pipeline/clients.csv", "r") as myFile:
        created_items = []
        not_created_items = []
        reader = csv.reader(myFile, delimiter=",")
        next(reader)  # Skip the header row
        for column in reader:
            friendly_name = column[0]
            job_code_prefix = column[1]
            proper_name = column[2]
            proper_name_japanese = column[3]
            notes = column[4]
            if Client.objects.filter(friendly_name__iexact=friendly_name).exists():
                not_created_items.append(f"{column[0]} - {column[1]}")
                continue
            else:
                try:
                    # These lines were importing with invisble spaces, so
                    # I used .strip() import them without the spaces
                    temp, created = Client.objects.get_or_create(
                        friendly_name=friendly_name.strip(),
                        job_code_prefix=job_code_prefix.strip(),
                        proper_name=proper_name.strip(),
                        proper_name_japanese=proper_name_japanese.strip(),
                        notes=notes.strip(),
                    )
                    temp.save()
                    if created:
                        created_items.append(f"{friendly_name} - {job_code_prefix}")
                    elif not created:
                        not_created_items.append(f"{friendly_name} - {job_code_prefix}")

                except IntegrityError as e:
                    print(f"{friendly_name} - {job_code_prefix}: {e}")
                    messages.error(
                        request,
                        f"{friendly_name} - {job_code_prefix} wasn't added.\n{e}",
                    )
                except NameError as n:
                    print(f"{friendly_name} - {job_code_prefix}: {n}")
                    messages.error(
                        request,
                        f"{friendly_name} - {job_code_prefix} wasn't added.\n{e}",
                    )
                except Exception as e:
                    print(e)
                    messages.error(
                        request,
                        f"{friendly_name} - {job_code_prefix} wasn't added - something bad happened! \n{e}",
                    )

        if created_items:
            messages.success(
                request, f"{len(created_items)} clients were added successfully!"
            )

        if not_created_items:
            messages.info(
                request,
                f"{len(not_created_items)} items were already in the database, so they were left alone.",
            )

    return redirect("pipeline:client-add")


def importVendors(request):
    with open("static/pipeline/vendors.csv", "r") as myFile:
        created_items = []
        not_created_items = []
        reader = csv.reader(myFile, delimiter=",")
        next(reader)  # Skip the header row
        for row in reader:
            first_name = row[0]
            last_name = row[1]
            vendor_code = row[2]
            company_name = row[3]
            use_company_name = True if row[4] == "TRUE" else False
            email = None if row[5] == "" else row[5]
            payment_id = row[6]

            familiar_name = ""
            if use_company_name == True:
                familiar_name = company_name
            else:
                familiar_name = (
                    " ".join([first_name, last_name]) if last_name else first_name
                )

            if Vendor.objects.filter(
                first_name__iexact=first_name, last_name__iexact=last_name
            ).exists():
                not_created_items.append(f'{familiar_name} {email if email else ""}')
                continue

            if Vendor.objects.filter(
                company_name__iexact=company_name, use_company_name=True
            ).exists():
                not_created_items.append(f'{familiar_name} {email if email else ""}')
                continue

            try:
                # These lines can sometimes be imported with invisble spaces, so
                # I used .strip() to mitigate
                obj, created = Vendor.objects.get_or_create(
                    first_name=first_name.strip() if first_name else None,
                    last_name=last_name.strip() if last_name else None,
                    vendor_code=vendor_code.strip(),
                    company_name=company_name.strip() if company_name else None,
                    use_company_name=use_company_name,
                    email=email.strip() if email else None,
                    payment_id=payment_id.strip() if payment_id else None,
                )
                obj.save()
                if created:
                    created_items.append(f'{familiar_name} {email if email else ""}')
                elif not created:
                    not_created_items.append(
                        f'{familiar_name} {email if email else ""}'
                    )
                print(obj)

            except IntegrityError as e:
                print(f'{familiar_name} {email if email else "" }: {e}')
                messages.error(
                    request,
                    f'{familiar_name} {email if email else ""} was not added.\n{e}',
                )
            except NameError as n:
                print(f'{familiar_name} {email if email else ""}: {n}')
                messages.error(
                    request,
                    f'{familiar_name} {email if email else ""} was not added.\n{e}',
                )
            except Exception as e:
                print(e)
                messages.error(
                    request,
                    f'{familiar_name} {email if email else ""} was not added - something bad happened! \n{e}',
                )

        if created_items:
            messages.success(
                request, f"{len(created_items)} vendors were added successfully!"
            )

        if not_created_items:
            messages.info(
                request,
                f"{len(not_created_items)} vendors were already in the database, so they were left alone. If you need to update vendor information, go to Vendors -> View Vendors and click the update link.",
            )

    return redirect("pipeline:vendor-add")


class CostDeleteView(LoginRequiredMixin, RedirectToPreviousMixin, DeleteView):
    model = Cost


def VendorRemoveFromJob(request, pk, job_id):
    model = Vendor
    job = Job.objects.get(id=job_id)
    vendor = Vendor.objects.get(id=pk)
    job.vendors.remove(vendor)
    job.save()
    return redirect("pipeline:cost-add", job_id)


class CostsheetViewBase(LoginRequiredMixin, CreateView):
    model = Cost
    template_name_suffix = "sheet"
    fields = ["vendor", "description", "amount", "currency", "invoice_status", "notes"]
    template_name = "pipeline/costsheet.html"
    simple_add_vendor_form = AddVendorToCostForm
    cost_form = CostForm
    update_cost_form = UpdateCostForm
    forex_rates = get_forex_rates()

    from .currencies import currencies

    # print(f"Team folder ID in here {dropbox_team_connect().team_team_folder_list().team_folders}")

    def get_context_data(self, **kwargs):
        from .currencies import currencies

        context = super().get_context_data(**kwargs)
        self.object = None
        currentJob = Job.objects.get(pk=self.kwargs["pk"])
        context["currencyList"] = json.dumps(currencies)
        context["forexRates"] = json.dumps(self.forex_rates)
        context["currentJob"] = currentJob
        context["headers"] = [
            "金額",
            "現地",
            "ベンダー名",
            "作業の内容",
            "PO番号",
            "請求書ステータス",
            "支払い期間",
            "",
            "編集",
            "ID",
        ]
        context["simple_add_vendor_form"] = self.simple_add_vendor_form()
        context["update_cost_form"] = self.update_cost_form()
        context["cost_form"] = self.cost_form()
        context["pay_period_form"] = CostPayPeriodForm()
        return context

    def post(self, request, *args, **kwargs):
        print(request.POST)
        self.object = None
        currentJob = Job.objects.get(pk=self.kwargs["pk"])

        if "add-cost" in request.POST:
            print(request.POST)
            form = self.cost_form(request.POST)
            if form.is_valid():
                instance = form.save()
                instance.job = currentJob
                instance.save()
                print("added job!")
            else:
                print(f"errors: {form.errors}")

        elif "add-vendor" in request.POST:
            form = self.simple_add_vendor_form(request.POST)
            if form.is_valid():
                newVendor = form.cleaned_data["addVendor"]
                currentJob.vendors.add(Vendor.objects.get(pk=newVendor))
                currentJob.save()
            else:
                print(f"errors: {form.errors}")

        return HttpResponseRedirect(self.request.path_info)


class CostUpdateView(RedirectToPreviousMixin, UpdateView):
    model = Cost
    fields = [
        "vendor",
        "description",
        "amount",
        "currency",
        "invoice_status",
        "notes",
        "locked_exchange_rate",
        "exchange_rate_locked_at",
        "exchange_rate_override",
        "pay_period",
    ]
    template_name_suffix = "_update_form"

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        if self.get_object().invoice_status == "PAID":
            form.fields["currency"].widget.attrs["disabled"] = ""
        form.fields["locked_exchange_rate"].widget.attrs["disabled"] = "true"
        return form


class JobUpdateView(LoginRequiredMixin, SuccessMessageMixin, UpdateView):
    model = Job
    fields = [
        "job_name",
        "client",
        "job_code",
        "job_type",
        "revenue",
        "add_consumption_tax",
        "personInCharge",
        "invoice_month",
        "invoice_year",
        "notes",
        "invoice_name",
        "invoice_recipient",
    ]
    template_name_suffix = "_update_form"
    success_message = "Job updated!"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["job_id"] = self.kwargs["pk"]
        return context

    def get_success_url(self):
        return reverse("pipeline:job-detail", kwargs={"pk": self.kwargs["pk"]})

    def form_valid(self, form):
        if form.has_changed() and "client" in form.changed_data:
            form.instance.job_code_isFixed = False
        return super().form_valid(form)


class JobDeleteView(LoginRequiredMixin, DeleteView):
    model = Job
    success_url = reverse_lazy("pipeline:index")


class ClientCreateView(LoginRequiredMixin, SuccessMessageMixin, CreateView):
    model = Client
    fields = [
        "friendly_name",
        "job_code_prefix",
        "proper_name",
        "proper_name_japanese",
        "paymentTerm",
        "notes",
    ]

    success_message = "Client added!"

    def get_success_url(self):
        return reverse_lazy("pipeline:client-add")


class ClientListView(LoginRequiredMixin, ListView):
    model = Client


class VendorListView(LoginRequiredMixin, ListView):
    model = Vendor
    template_name = "pipeline/vendor_list.html"

    def get_queryset(self):
        queryset = super().get_queryset()
        sorted_vendors = sorted(queryset, key=lambda vendor: vendor.familiar_name)
        return sorted_vendors


class VendorUpdateView(LoginRequiredMixin, SuccessMessageMixin, UpdateView):
    model = Vendor
    template_name = "pipeline/vendor_update.html"
    fields = [
        "first_name",
        "last_name",
        "email",
        "vendor_code",
        "use_company_name",
        "company_name",
        "notes",
        "payment_id",
    ]
    success_message = "The details for %(familiar_name)s have been updated"

    def get_success_message(self, cleaned_data):
        return self.success_message % dict(
            cleaned_data,
            familiar_name=self.object.familiar_name,
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["pk"] = self.object.id
        return context

    def get_success_url(self):
        return reverse("pipeline:vendor-list")


class ClientUpdateView(LoginRequiredMixin, SuccessMessageMixin, UpdateView):
    model = Client
    template_name = "pipeline/client_update.html"
    fields = [
        "proper_name",
        "proper_name_japanese",
        "friendly_name",
        "job_code_prefix",
    ]
    success_message = "The details for %(friendly_name)s have been updated"

    def get_success_message(self, cleaned_data):
        return self.success_message % dict(
            cleaned_data,
            familiar_name=self.object.friendly_name,
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["pk"] = self.object.id
        return context

    def get_success_url(self):
        return reverse("pipeline:client-list")


class VendorCreateView(LoginRequiredMixin, SuccessMessageMixin, CreateView):
    model = Vendor
    fields = "__all__"

    success_message = "Vendor added!"

    def get_success_url(self):
        return reverse_lazy("pipeline:vendor-add")
