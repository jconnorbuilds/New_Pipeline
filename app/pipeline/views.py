from django import forms
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.views import LoginView
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.core import serializers
from django.core.exceptions import ValidationError
from django.core.mail import send_mail, send_mass_mail
from django.db import IntegrityError
from django.db.models import Sum, F, Q
from django.http import JsonResponse, HttpResponseRedirect, HttpResponse, HttpResponseServerError
from django.shortcuts import render, redirect
from django.template.loader import get_template, render_to_string
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.utils.html import strip_tags
from django.views.generic import TemplateView, ListView, DetailView, DeleteView, UpdateView, CreateView
from django.views import View
from .models import Job, Vendor, Cost, Client
from .forms import CostForm, JobForm, JobImportForm, PipelineCSVExportForm, PipelineBulkActionsForm, AddVendorToCostForm, UpdateCostForm, ClientForm, SetInvoiceInfoForm, SetDepositDateForm
from datetime import date
from dateutil.relativedelta import relativedelta
from urllib.parse import urlencode
import dropbox
from dropbox.exceptions import ApiError, AuthError
from .utils import get_forex_rates, process_imported_jobs, get_job_data, get_invoice_status_data

import json
import calendar
import csv

class RedirectToPreviousMixin:
    default_redirect = '/'
    def get(self, request, *args, **kwargs):
        request.session['previous_page'] = request.META.get(
            'HTTP_REFERER', self.default_redirect)
        return super().get(request, *args, **kwargs)

    def get_success_url(self):
        return self.request.session['previous_page']

def index(request):
    return redirect('pipeline:index')

def is_ajax(request):
    return request.headers.get('x-requested-with') == 'XMLHttpRequest'
    
class pipelineView(LoginRequiredMixin, SuccessMessageMixin, TemplateView):
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
        client_id = self.request.GET.get('client_id')
        context['job_form'] = JobForm(initial={'client': client_id})
        context['job_import_form'] = JobImportForm()
        context['set_invoice_info_form'] = self.set_invoice_info_form_class
        context['set_deposit_date_form'] = self.set_deposit_date_form_class
        context['client_form'] = self.client_form_class
        context['csv_export_form'] = self.csv_export_form
        context['bulk_actions'] = self.bulk_actions
        context['headers'] = ["", "ID", "クライアント名", "クライアントID", "案件名", "ジョブコード", "収入（税込）", "出費", "利益率（税抜）", "請求期間", "種目", "ステータス", "入金日", "Invoice Info Completed"]
        return context
    
    def get_queryset(self):
        queryset = Job.objects.filter(isDeleted=False)
        return queryset

    def post(self, request, *args, **kwargs):
        if 'addjob' in request.POST:
            job_form = self.form_class(request.POST)
            if job_form.is_valid():
                # Take in the revenue in terms of 万
                job_form.instance.revenue = job_form.instance.revenue * 10000
                instance = job_form.save()
                job = Job.objects.get(pk=instance.pk)
                data = get_job_data(job)
                return JsonResponse({"status": "success", "data":data})
            else:
                for error in job_form.errors:
                    print(f'errors: {error}')
                return JsonResponse({"status":"error"})

        elif 'update-job' in request.POST:
            job = Job.objects.get(id=request.POST.get('job_id'))
            form_data_job_status = request.POST.get('status')

            if form_data_job_status:
                print(form_data_job_status)
                job.status = form_data_job_status
            else:
                print("There was a problem getting the form data.")
            job.save()

            data = get_job_data(job)
            return JsonResponse({"status": "success", "data": data})

        elif 'bulk-actions' in request.POST:
            bulk_form = self.bulk_actions(request.POST)
            checked_jobs = Job.objects.filter(id__in=request.POST.getlist('select'))
            if bulk_form.is_valid():
                action = bulk_form.cleaned_data["actions"]
                if action == "NEXT":
                    for job in checked_jobs:
                        if job.month == '12':
                            job.month = '1'
                            job.year = str(int(job.year) + 1)
                        else:   
                            job.month = str(int(job.month) + 1)
                        job.save()
                elif action == "PREVIOUS":
                    for job in checked_jobs:
                        if job.month == '1':
                            job.month = '12'
                            job.year = str(int(job.year) - 1)
                        else:   
                            job.month = str(int(job.month) - 1)
                        job.save()
                elif action == "DEL":
                    i = 0
                    for job in checked_jobs:
                        job.isDeleted = True
                        job.save()
                        i += 1
                    if i > 0:
                        messages.warning(request, f'{i} jobs were deleted. They can be restored from the admin panel.')
                    else:
                        messages.error(request, 'No jobs were deleted.')
                elif action == "RELATE":
                    if len(checked_jobs) > 1:
                        checked_jobs[0].relatedJobs.set([job for job in checked_jobs[1::]])
                elif action == "UNRELATE":
                    i = 1
                    while i < len(checked_jobs):
                        if checked_jobs[i] in checked_jobs[0].relatedJobs.all():
                            checked_jobs[0].relatedJobs.remove(checked_jobs[i])
                            i += 1
                        else:
                            i += 1
                else:
                    return(HttpResponse("error")) #TODO: use a better error message

        elif 'new_client' in request.POST:
            form = self.client_form_class(request.POST)
            if form.is_valid():
                instance = form.save()
                return JsonResponse({"id":instance.id, "value":instance.friendly_name, "prefix":instance.job_code_prefix, "status": "success"})
            return JsonResponse({"errors":form.errors})
        
        elif "import-jobs" in request.POST:
            if request.method == "POST": #TODO : I don't think this if statement is necessary? double check
                form = JobImportForm(request.POST, request.FILES)
                if form.is_valid():
                    response = process_imported_jobs(request.FILES["file"])
                    if response["valid_template"] == True:
                        created_items = response["success_created"]
                        not_created_items = response["success_not_created"]
                        errors = response["error"]
                        cant_update = response["cant_update"]
                        if created_items:
                            messages.success(request, f'{len(created_items)} jobs were added successfully!')

                        if not_created_items:
                            messages.info(request, f'{len(not_created_items)} items were already in the database, so they were left alone.')

                        for err,message in errors.items():
                            messages.error(request, f'{err}: {message}')

                        for code,message in cant_update.items():
                            messages.error(request, f'{code}: {message}')
                    else:
                        messages.error(request,f'{response["errors"]}')

                else:
                    context = self.get_context_data()
                    context["job_import_form"] = form
                    return render(request, self.template_name, context)
        
        elif "set_invoice_info" in request.POST:
            job_id = request.POST.get('job_id')
            job = Job.objects.get(id=job_id)
            form = self.set_invoice_info_form_class(request.POST, instance=job)
            if form.is_valid():
                form.save()
                return JsonResponse({"status":"success"})
            
        elif "set_deposit_date" in request.POST:
            job_id = request.POST.get('job_id')
            job = Job.objects.get(id=job_id)
            print(request.POST)
            form = self.set_deposit_date_form_class(request.POST, instance=job)
            if form.is_valid():
                form.save()
                data = get_job_data(job)
                return JsonResponse({"status":"success", "data": data})
            else:
                print(form.errors)

        return render(request, self.template_name, self.get_context_data())

def pipeline_data(request, year=None, month=None):
    jobs = Job.objects.filter(isDeleted=False)
    if year is not None and month is not None:
        jobs = Job.objects.filter(job_date__month=month, job_date__year=year, isDeleted=False)

    data = {
        "data":[get_job_data(job) for job in jobs],
        "invoice_status_data":[get_invoice_status_data(job) for job in jobs]
    }
    return JsonResponse(data, safe=False,)

def revenue_display_data(request, year=None, month=None):
    jobs = Job.objects.filter(isDeleted=False)
    if year is not None and month is not None:
        jobs = Job.objects.filter(job_date__month=month, job_date__year=year, isDeleted=False)
    jobs_from_current_year = Job.objects.filter(job_date__year=date.today().year, isDeleted=False)

    """
    total revenue ytd 
    aggregate revenue for each job
    aggregate revenue * 0.1 for all jobs with add_consumption_tax == True
    """

    total_base_revenue_ytd = jobs_from_current_year.aggregate(total_base_revenue=Sum('revenue'))['total_base_revenue'] or 0
    total_revenue_ytd = jobs_from_current_year.aggregate(total_revenue=Sum('revenue_incl_tax'))['total_revenue']
    total_revenue_monthly_expected = jobs.aggregate(total_revenue=Sum('revenue_incl_tax'))['total_revenue'] or 0
    total_revenue_monthly_actual = jobs.filter(
        status__in=["INVOICED1","INVOICED2","FINISHED","ARCHIVED"]).aggregate(
        total_revenue=Sum('revenue_incl_tax'))['total_revenue'] or 0
    
    data = {
        "total_revenue_ytd":f'¥{total_revenue_ytd:,}',
        "avg_monthly_revenue_ytd":f'¥{round(total_revenue_ytd/(date.today().month)):,}',
        "total_revenue_monthly_expected":f'¥{total_revenue_monthly_expected:,}',
        "total_revenue_monthly_actual":f'¥{total_revenue_monthly_actual:,}',
    }
    return JsonResponse(data)

def cost_data(request, job_id):
    forex_rates = get_forex_rates()
    costs = Cost.objects.filter(job=job_id)
    vendors = Vendor.objects.filter(jobs_rel=job_id)

    for cost in costs:
        print(cost.currency)
        print(cost.invoice_status)
    
    status_options = Cost.INVOICE_STATUS_CHOICES

    data = {"data": [
        {
        "amount_JPY": f'¥{round(cost.amount * forex_rates[cost.currency]):,}' if cost.invoice_status not in ["PAID"] else f'¥{round(cost.amount * cost.locked_exchange_rate):,}',
        "amount_local": f'{cost.currency}{cost.amount}',
        "vendor": render_to_string("pipeline/costsheet/cost_table_vendor_select.html", context={"vendors": vendors.all(), "selectedVendor": cost.vendor}),
        "description":cost.description,
        "PO_number":cost.PO_number,
        "invoice_status": render_to_string("pipeline/costsheet/cost_table_invoice_status.html", {"cost": cost, "options": status_options, "currentStatus": cost.invoice_status}),
        "request_invoice": render_to_string("pipeline/costsheet/invoice_request_btn.html", {"cost_id": cost.id}),
        "edit": render_to_string("pipeline/costsheet/cost_edit_delete_btns.html", {"cost_id":cost.id}),
        "id": cost.id,
        }
        for cost in costs
    ]}
    return JsonResponse(data, safe=False,)

class VendorDetailView(LoginRequiredMixin, DetailView):
    template_name = "pipeline/vendors.html"
    model = Vendor
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['costs'] = Cost.objects.filter(vendor__id=self.kwargs['pk'])
        print(self.kwargs['pk'])
        currentJobs = Job.objects.filter(vendors__id = self.kwargs['pk'])
        for job in currentJobs:
            print(job)
        context['jobs'] = Job.objects.filter(vendors__id=self.kwargs['pk'])

        return context

class JobDetailView(DetailView):
    template_name = "pipeline/job_details.html"
    model = Job

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['job_id'] = self.kwargs['pk']
        return context

class InvoiceView(LoginRequiredMixin, TemplateView):
    # Will need to make more efficient for the long term
    forex_rates = get_forex_rates()
    print(forex_rates)
    model = Cost
    template_name = "pipeline/invoices_list.html"
    costs = Cost.objects.all()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['headers'] = ["", "", "Amt. (¥)", "Amt.(local)", "Job Date", "Job", "Job Code", "Vendor", "Description",
                              "PO Number", "Invoice Status", "", "Edit", "ID"]
        return context

    def post(self, request, *args, **kwargs):
        print(request.POST)
        form_data_id = request.POST.get('cost_id')
        form_data_vendor = request.POST.get('vendor')
        form_data_status = request.POST.get('status')
        all_costs = Cost.objects.all()
        cost = Cost.objects.get(id=request.POST.get('cost_id'))
        print(f"cost amount: {cost.amount}")
        print(f"cost currency: {cost.currency}")

        if form_data_vendor:
            cost.vendor = Vendor.objects.get(id=form_data_vendor)

        if form_data_status:
            cost.invoice_status = form_data_status
        cost.save()

        status_options = Cost.INVOICE_STATUS_CHOICES
        data = {
                "select": render_to_string("pipeline/costsheet/checkbox.html", {"cost_id": cost.id}),
                "costsheet_link": f'<a href="{reverse("pipeline:cost-add", args=[cost.job.id])}">Cost Sheet</a>',
                "amount_JPY": f'¥{round(cost.amount * self.forex_rates[cost.currency]):,}' if cost.invoice_status not in ["PAID"] else f'¥{round(cost.amount * cost.locked_exchange_rate):,}',
                "amount_local": f'{cost.currency}{cost.amount}',
                "job_date": f'{calendar.month_abbr[cost.job.job_date.month]} {cost.job.job_date.year}',
                "job_name": cost.job.job_name,
                "job_code": cost.job.job_code,
                "vendor": cost.vendor.familiar_name,
                "description": cost.description,
                "PO_number": cost.PO_number,
                "invoice_status": render_to_string("pipeline/costsheet/cost_table_invoice_status.html", {"cost": cost, "options": status_options, "currentStatus": cost.invoice_status}),
                "request_invoice": render_to_string("pipeline/costsheet/invoice_request_btn.html", {"cost_id": cost.id}),
                "edit": render_to_string("pipeline/costsheet/cost_edit_delete_btns.html", {"cost_id": cost.id}),
                "id": cost.id,
            }
        
        return JsonResponse({"status": "success", "data":data}, safe=False,)

def all_invoices_data(request):
    costs = Cost.objects.all()
    print(request.POST)
    forex_rates=get_forex_rates()
    print(forex_rates)

    status_options = Cost.INVOICE_STATUS_CHOICES

    data = {"data": [
        {
            "select": render_to_string('pipeline/costsheet/checkbox.html', {"cost_id": cost.id}),
            "costsheet_link": f'<a href="{reverse("pipeline:cost-add", args=[cost.job.id])}">Cost Sheet</a>',
            "amount_JPY": f'¥{round(cost.amount * forex_rates[cost.currency]):,}' if cost.invoice_status not in ["PAID"] else f'¥{round(cost.amount * cost.locked_exchange_rate):,}',
            "amount_local": f'{cost.currency}{cost.amount}',
            "job_date": f'{calendar.month_abbr[cost.job.job_date.month]} {cost.job.job_date.year}',
            "job_name": cost.job.job_name,
            "job_code": cost.job.job_code,
            "vendor": cost.vendor.familiar_name if cost.vendor else "",
            "description": cost.description,
            "PO_number": cost.PO_number,
            "invoice_status": render_to_string("pipeline/costsheet/cost_table_invoice_status.html", {"cost": cost, "options": status_options, "currentStatus": cost.invoice_status}),
            "request_invoice": render_to_string("pipeline/costsheet/invoice_request_btn.html", {"cost_id": cost.id}),
            "edit": render_to_string("pipeline/costsheet/cost_edit_delete_btns.html", {"cost_id": cost.id}),
            "id": cost.id,
        }
        for cost in costs
    ]}
    return JsonResponse(data, safe=False,)

def dropbox_connect():
    """Create a connection to Dropbox."""
    headers = {'Dropbox-API-Select-User': settings.DROPBOX_USER_ID}
    
    refresh_token = settings.DROPBOX_REFRESH_TOKEN
    app_key = settings.DROPBOX_APP_KEY
    app_secret = settings.DROPBOX_APP_SECRET

    try:
        dbx = dropbox.Dropbox(
            oauth2_refresh_token=refresh_token, 
            app_key=app_key, 
            app_secret=app_secret, 
            headers=headers)
        dbx.check_and_refresh_access_token()

    except AuthError as e:
        print('Error connecting to Dropbox with access token: ' + str(e))
    return dbx

# def dropbox_team_connect():
#     """Create a connection to Dropbox."""
#     try:
#         dbx_team = dropbox.DropboxTeam(settings.DROPBOX_ACCESS_TOKEN)
#     except AuthError as e:
#         print('Error connecting to Dropbox Team with access token: ' + str(e))
#     return dbx_team

def dropbox_upload_file(file_to_upload, dropbox_file_path):

    try:
        dbx = dropbox_connect()
        meta = dbx.with_path_root(
            #namespace_id of the root folder of the Team Space in dropbox (e.g. "Black Cat White Cat Dropbox")
            #this MAY change when a new team member is added so we should really assign it programatically.
            path_root=dropbox.common.PathRoot.namespace_id("9004345616")).files_upload(
                f=file_to_upload.read(),
                path=dropbox_file_path,
                mode=dropbox.files.WriteMode("overwrite"))
        return meta
    
    except dropbox.exceptions.ApiError as e:
        print(f'Error uploading file to Dropbox: {e.error}')

def process_uploaded_vendor_invoice(request):
    print(f'FILES:{request.FILES}')
    print(f'POST:{request.POST}')

    successful_invoices = []
    unsuccessful_invoices = []

    if request.POST and "invoices" in request.POST:
        print("we've got invoices!")

        s3 = settings.LINODE_STORAGE

        invoice_data = json.loads(request.POST['invoices'])
        file_dict = {}
        

        for file in request.FILES.values():
            file_dict[file.name] = file

        for invoice_id, invoice_filename in invoice_data.items():
            print(invoice_filename)
            cost = Cost.objects.get(id=invoice_id)
            bucket_name = "bcwc-files"
            payment_month = timezone.now() + relativedelta(months=+1)
            date_folder_name = payment_month.strftime('%Y年%-m月')
            currency_folder_name = "_" + cost.currency
            file_extension = "." + invoice_filename.split('.')[-1]
            invoice_file = file_dict.get(invoice_filename, None)

            if invoice_file and invoice_file.size < 10 * 1024 * 1024:
                if invoice_file.size < 10 * 1024 * 1024:
                    try:
                        invoice_folder = '/Financial/_ INVOICES/_VENDOR INVOICES' if not settings.DEBUG else '/Financial/TEST/_ INVOICES/_VENDOR INVOICES'
                        full_filepath = (invoice_folder + "/" + date_folder_name + "/" + currency_folder_name + "/" + cost.PO_number + file_extension)
                        dropbox_upload_file(invoice_file, full_filepath)
                        cost.invoice_status = 'REC'
                        cost.save()
                        successful_invoices.append(cost)
                            
                    except Exception as e:
                        print(e)
                        # Maybe to get rid of Linode Object Storage we can just get the invoice as an email attachment
                        s3.upload_fileobj(
                            invoice_file, bucket_name,
                            date_folder_name + "/" + cost.PO_number + file_extension)
                        cost.invoice_status = 'ERR'
                        cost.save()
                        unsuccessful_invoices.append(cost)
                else:
                    return JsonResponse({'error': 'File size must be less than 10 MB'})
            else:
                return JsonResponse({'status':'error', 'message':'There was an error'})
        
        print(successful_invoices)
        request.session['successful_invoices'] = json.dumps([cost.id for cost in successful_invoices])
        request.session['unsuccessful_invoices'] = json.dumps([cost.id for cost in unsuccessful_invoices])
        return HttpResponse('success')
    
    # UPDATE THIS to return an actual error page
    elif request.POST and "invoices" not in request.POST:
        return HttpResponse('error')

    else:
        return HttpResponse('error')
    
def upload_invoice_confirmation_email(request):
    """
    Sends a confirmation email to the vendor after their invoice submission.
    There shouldn't really be any cases where 'unsuccessful_invoice_ids' is populated,
    but left in as a safeguard at the moment.

    vendor: should just be a single vendor, as all invoices cost.vendor should be the same.
    """
    successful_invoice_ids = json.loads(request.session.get('successful_invoices'))
    unsuccessful_invoice_ids = json.loads(request.session.get('unsuccessful_invoices'))

    successful_invoices = Cost.objects.filter(id__in=successful_invoice_ids)
    unsuccessful_invoices = Cost.objects.filter(id__in=unsuccessful_invoice_ids)
    context = {'successful_invoices':successful_invoices, 'unsuccessful_invoices':unsuccessful_invoices}

    vendor_ids = []
    for invoice in successful_invoices:
        vendor_ids.append(invoice.vendor.id)
    if len(list(set(vendor_ids))) == 1:
        vendor = Vendor.objects.get(id = list(set(vendor_ids))[0])
    else:
        vendor = None
        return HttpResponseServerError('Multiple recipients detected. Internal error occurred.')
    
    if vendor.use_company_name:
        vendor_name = vendor.familiar_name
    else:
        vendor_name = vendor.first_name
    
    recipient_list = [vendor.email] if not settings.DEBUG else ["joe@bwcatmusic.com"]
    success_subj = 'Confirmation - invoices received!'
    error_subj = 'Confirmation - attention needed'
    subject = success_subj if not unsuccessful_invoices else error_subj
    from_email = None

    # creates rich text and plaintext versions to be sent; rich text will be read by default
    html_message = render_to_string("invoice_uploader/invoice_confirmation_email_template.html", 
                                    context={
                                    'vendor_name': vendor_name, 
                                    'vendor': vendor, 
                                    'successful_invoices': successful_invoices, 
                                    'unsuccessful_invoices': unsuccessful_invoices, 
                                    'request':request
                                    })
    with open(settings.TEMPLATE_DIR / "invoice_uploader/invoice_confirmation_email_template.html") as f:
        message = strip_tags(f.read())

    send_mail(subject, message, from_email, recipient_list,
                fail_silently=False, html_message=html_message)

    return redirect('upload-thanks')

def invoice_upload_view(request, vendor_uuid):
    vendor = Vendor.objects.get(uuid=vendor_uuid)
    requested_invoices = Cost.objects.filter(vendor_id=vendor.id, invoice_status='REQ').select_related('job')
    jobs = list(Job.objects.filter(cost_rel__in=requested_invoices).values('pk','job_name', 'job_code'))
    jobs_json = json.dumps(jobs)
    invoices_json = serializers.serialize('json', requested_invoices)
    for invoice in requested_invoices:
        print(invoice)
    
    context = {'requested_invoices':requested_invoices, 'invoices_json':json.dumps(invoices_json), 'jobs_json':jobs_json, 'vendor_id':vendor.id}
    return render(request, 'pipeline/upload_invoice.html', context)

def upload_invoice_success_landing_page(request):
    return render(request, 'invoice_uploader/upload_invoice_success.html')

def invoice_error(request):
    return render(request, 'pipeline/no_invoices.html')

def RequestVendorInvoiceSingle(request, cost_id):
    # Creates a list of vendors who have invoices ready to be requested, no dupes
    vendor = Vendor.objects.get(vendor_rel__id=cost_id)
    cost = Cost.objects.get(id = cost_id)
    protocol = "http" if settings.DEBUG else "https"

    if cost.invoice_status not in ["REQ", "REC", "REC2", "PAID", "NA"]:
        # TODO: prepare a separate email for Japanese clients
        if vendor.use_company_name:
            vendor_name = vendor.familiar_name
        else:
            vendor_name = vendor.first_name

        # args for use in send_mail
        recipient_list = [vendor.email] if not settings.DEBUG else ["joe@bwcatmusic.com"]
        subject = f'BCWC invoice request - {cost.PO_number} {cost.job.job_name}'
        from_email = None

        # creates rich text and plaintext versions to be sent; rich text will be read by default
        html_message = render_to_string("invoice_uploader/invoice_request_email_template.html", context={
                                        'vendor_name': vendor_name, 'vendor': vendor, 'cost': cost, 'request':request, 'protocol':protocol})
        print(request)
        with open(settings.TEMPLATE_DIR / "invoice_uploader/invoice_request_email_template.html") as f:
            message = strip_tags(f.read())

        send_mail(subject, message, from_email, recipient_list,
                    fail_silently=False, html_message=html_message)
        cost.invoice_status = 'REQ'
        cost.save()

        messages.success(
            request, f'The invoice for {cost.PO_number} was requested from {vendor.familiar_name}!'
            )
        
        return JsonResponse({"status":"success", "message":"success!"})
    else:
        #Return an error if the invoice has already been requested
        #This could be more robust, right now it's based on the setting of the
        #invoice status dropdown
        return JsonResponse({"status":"error", "message": "error :("})

# Simple CSV Write Operation
def jobs_csv_export(request):
    csv_export_form = PipelineCSVExportForm(request.POST)
    if csv_export_form.is_valid():
        print('hello dude')
        useRange = csv_export_form.cleaned_data["useRange"]
        fromYear = csv_export_form.cleaned_data["fromYear"]
        fromMonth = csv_export_form.cleaned_data["fromMonth"]
        fromDate = f'{fromYear}-{fromMonth}'+'-01'
        if useRange:
            thruYear = csv_export_form.cleaned_data["thruYear"]
            # add an extra month to calculate from the first day of the next month
            # to save from having to calculate the last day of each month
            thruMonth = str(int(csv_export_form.cleaned_data["thruMonth"]))
        else:
            thruYear = fromYear
            thruMonth = fromMonth
        if thruMonth != "12":
            thruYear = thruYear
            thruMonth = str(int(thruMonth) + 1)
        else:
            thruYear = str(int(thruYear) + 1)
            thruMonth = "1"
        thruDate = f'{thruYear}-{thruMonth}'+'-01'
        print(f'from: {fromDate}\nthru: {thruDate}')
        
        response = HttpResponse(
            content_type='text/csv',
            headers = {'Content-Disposition': 'attachment; filename ="csv_simple_write.csv"'},
            )
        writer = csv.writer(response)
        fields = ['クライアント', '案件名', 'ジョブコード', '予算 (¥)', '総費用', '案件タイプ', '日付']
        writer.writerow(fields) 

        scope = Job.objects.filter(job_date__gte=fromDate, job_date__lt=thruDate)
        print(scope)

        expectedGrossRevenue = sum([job.revenue for job in scope])
        actualGrossRevenue = sum([job.revenue for job in scope if job.status in ['FINISHED','ARCHIVED']])

        for job in scope:
            # Return date in format YYYY年MM月
            date_MY = f'{job.job_date.year}年{job.job_date.month}月'
            if job.client.proper_name_japanese:
                client_name = job.client.proper_name_japanese
            else:
                client_name = job.client.proper_name
            data = [client_name, job.job_name, job.job_code, f'{job.revenue:,}', f'{job.total_cost:,}', job.job_type, date_MY]
            writer.writerow(data)
        writer.writerow('')
        writer.writerow(['','','','','','','','総収入(予想)', f'¥{expectedGrossRevenue:,}'])
        writer.writerow(['','','','','','','','総収入(実際)', f'¥{actualGrossRevenue:,}'])

        return response
    else:
        print('something bad happened')

def create_batch_payment_file(request):
    '''
    Create a WISE batch payment file from the template in /static. 
    Each payment can be maximum 1m JPY, so anything over ¥950k is split into multiple payments.
    
    '''
    forex_rates = get_forex_rates()
    if request.method == "POST":
        invoices = Cost.objects.filter(invoice_status__in=["REC", "REC2"])
        processing_status = {} # format: invoice PO number {status (success/error), message} 
        print(invoices)
        response = HttpResponse(
            content_type='text/csv',
            headers = {'Content-Disposition': 'attachment; filename = "WISE_BATCH_PAYMENT.csv"'},
        )

        def split_into_even_parts(amount, num_of_parts):
            parts = []
            base_amount = amount // num_of_parts
            remainder = amount % num_of_parts
            parts = [base_amount] * num_of_parts
            for i in range(remainder):
                parts[i] += 1
            print(f"new parts: {parts}")
            return parts

        csvfile = 'static/pipeline/Recipients-Batch-File test.csv'
        try:
            with open(csvfile, newline='') as templateCSV:
                reader = csv.reader(templateCSV)
                writer = csv.writer(response)
                
                column_names = ""
                for row in reader:
                    column_names = row #create header row with column names
                    break
                writer.writerow(column_names)
                recipient_id_idx = column_names.index('recipientId')
                source_currency_idx = column_names.index('sourceCurrency')
                target_currency_idx = column_names.index('targetCurrency')
                amount_currency_idx = column_names.index('amountCurrency')
                amount_idx = column_names.index('amount')
                payment_reference_idx = column_names.index('paymentReference')

                for row in reader:
                    recipient_id = int(row[recipient_id_idx])
                    if recipient_id not in [invoice.vendor.payment_id for invoice in invoices]:
                        continue

                    invoices_from_vendor = [invoice for invoice in invoices if invoice.vendor.payment_id == recipient_id]
                    for invoice in invoices_from_vendor:
                        '''
                        Account for large payments over ¥1m JPY. 
                        To avoid errors, split anything over ¥950k into two or more payments.
                        '''
                        if invoice.currency != row[target_currency_idx]:
                            processing_status[invoice.PO_number] = {"status":"error", "message": f"Currency mismatch. Invoices for this vendor should be in {row[target_currency_idx]}."}
                            continue

                        upper_limit_for_JPY = 950000
                        approx_amount_in_JPY = invoice.amount * forex_rates[row[target_currency_idx]]
                        print(f"approx_amount_in_JPY: {approx_amount_in_JPY}")
                        
                        if approx_amount_in_JPY > upper_limit_for_JPY:
                            print("over the limit")
                            split_into = 2
                            within_limit = False
                            while not within_limit:
                                print(f"amount {approx_amount_in_JPY:,} to split_into: {split_into} == {approx_amount_in_JPY / split_into:,}")
                                print(f"under 950k? {within_limit}")
                                if (approx_amount_in_JPY / split_into) < upper_limit_for_JPY:
                                    within_limit = True
                                else:
                                    split_into += 1
                            
                            split_payments = split_into_even_parts(invoice.amount, split_into)
                            i = 0
                            while i < len(split_payments):
                                print(f"{i}: processing row")
                                row[amount_idx] = split_payments[i]
                                row[source_currency_idx] = "JPY"
                                row[amount_currency_idx] = row[target_currency_idx]

                                # Wanted to include "n of n" when payments are split into multiple parts,
                                # but payments in USD have a char limit of 10, so I accommodate for that. 
                                # Our PO numbers are limited to 10 characters.
                                row[payment_reference_idx] = f"{invoice.PO_number}"
                                writer.writerow(row)
                                i += 1

                            invoice.invoice_status = "QUE"
                            invoice.save()
                            processing_status[invoice.PO_number] = { "status":"success", "message": f"Successfully processed as {split_into} payments!" }

                        else:
                            row[amount_idx] = invoice.amount
                            row[source_currency_idx] = "JPY"
                            row[amount_currency_idx] = row[target_currency_idx]
                            row[payment_reference_idx] = invoice.PO_number
                            
                            writer.writerow(row)
                            invoice.invoice_status = "QUE"
                            invoice.save()
                            processing_status[invoice.PO_number] = { "status":"success", "message": "Successfully processed!" }

            for key in processing_status:
                print(key, processing_status[key])

            data = processing_status
            response['X-Processing-Status'] = json.dumps(data)
            print(json.dumps(data))
            return response

        except FileNotFoundError:
            return HttpResponse(f"Template file not found in the expected location: {csvfile}", status=404)
        
def importClients(request):
    with open('static/pipeline/clients.csv', 'r') as myFile:
        created_items = []
        not_created_items = []
        reader = csv.reader(myFile, delimiter=',')
        next(reader) # Skip the header row
        for column in reader:
            friendly_name = column[0]
            job_code_prefix = column[1]
            proper_name = column[2]
            proper_name_japanese = column[3]
            notes = column[4]
            if Client.objects.filter(friendly_name__iexact=friendly_name).exists():
                not_created_items.append(f'{column[0]} - {column[1]}')
                continue
            else:
                try:
                    # These lines were importing with invisble spaces, so
                    # I used .strip() import them without the spaces
                    temp,created = Client.objects.get_or_create(
                            friendly_name = friendly_name.strip(),
                            job_code_prefix = job_code_prefix.strip(),
                            proper_name = proper_name.strip(),
                            proper_name_japanese = proper_name_japanese.strip(),
                            notes = notes.strip(),
                            )
                    temp.save()
                    if created:
                        created_items.append(f'{friendly_name} - {job_code_prefix}')
                    elif not created:
                        not_created_items.append(f'{friendly_name} - {job_code_prefix}')

                except IntegrityError as e:
                    print(f'{friendly_name} - {job_code_prefix}: {e}')
                    messages.error(request, f"{friendly_name} - {job_code_prefix} wasn't added.\n{e}")
                except NameError as n:
                    print(f'{friendly_name} - {job_code_prefix}: {n}')
                    messages.error(request, f"{friendly_name} - {job_code_prefix} wasn't added.\n{e}")
                except Exception as e:
                    print(e)
                    messages.error(request, f"{friendly_name} - {job_code_prefix} wasn't added - something bad happened! \n{e}")
            
        if created_items:
            messages.success(request, f'{len(created_items)} clients were added successfully!')

        if not_created_items:
            messages.info(request, f'{len(not_created_items)} items were already in the database, so they were left alone.')

    return redirect('pipeline:client-add')
    

def importVendors(request):
    with open('static/pipeline/vendors.csv', 'r') as myFile:
        created_items = []
        not_created_items = []
        reader = csv.reader(myFile, delimiter=',')
        next(reader) # Skip the header row
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
                familiar_name = " ".join([first_name, last_name]) if last_name else first_name
            
            if Vendor.objects.filter(first_name__iexact=first_name, last_name__iexact=last_name).exists():
                not_created_items.append(f'{familiar_name} {email if email else ""}')
                continue
            
            if Vendor.objects.filter(company_name__iexact=company_name, use_company_name=True).exists():
                not_created_items.append(f'{familiar_name} {email if email else ""}')
                continue

            try:
            # These lines can sometimes be imported with invisble spaces, so
            # I used .strip() to mitigate
                obj,created = Vendor.objects.get_or_create(
                    first_name = first_name.strip() if first_name else None,
                    last_name = last_name.strip() if last_name else None,
                    vendor_code = vendor_code.strip(),
                    company_name = company_name.strip() if company_name else None,
                    use_company_name = use_company_name,
                    email = email.strip() if email else None,
                    payment_id = payment_id.strip() if payment_id else None,
                    )
                obj.save()
                if created:
                    created_items.append(f'{familiar_name} {email if email else ""}')
                elif not created:
                    not_created_items.append(f'{familiar_name} {email if email else ""}')
                print(obj)

            except IntegrityError as e:
                print(f'{familiar_name} {email if email else "" }: {e}')
                messages.error(request, f'{familiar_name} {email if email else ""} was not added.\n{e}')
            except NameError as n:
                print(f'{familiar_name} {email if email else ""}: {n}')
                messages.error(request, f'{familiar_name} {email if email else ""} was not added.\n{e}')
            except Exception as e:
                print(e)
                messages.error(request, f'{familiar_name} {email if email else ""} was not added - something bad happened! \n{e}')
    
        if created_items:
            messages.success(request, f'{len(created_items)} vendors were added successfully!')

        if not_created_items:
            messages.info(request, f'{len(not_created_items)} vendors were already in the database, so they were left alone. If you need to update vendor information, go to Vendors -> View Vendors and click the update link.')

    return redirect('pipeline:vendor-add')

def CostDeleteView(request, cost_id):
    cost = Cost.objects.get(id=cost_id)
    job_id = cost.job.id
    cost.delete()
    return redirect('pipeline:cost-add', job_id)

def VendorRemoveFromJob(request, pk, job_id):
    model = Vendor
    job = Job.objects.get(id=job_id)
    vendor = Vendor.objects.get(id=pk)
    job.vendors.remove(vendor)
    job.save()
    return redirect('pipeline:cost-add', job_id)

class CostCreateView(LoginRequiredMixin, CreateView):
    model = Cost
    fields = ['vendor','description','amount','currency','invoice_status','notes']
    template_name = "pipeline/cost_form.html"
    simple_add_vendor_form = AddVendorToCostForm
    cost_form = CostForm
    update_cost_form = UpdateCostForm
    forex_rates = get_forex_rates()

    from .currencies import currencies
    print(json.dumps(currencies))
    print(json.dumps(forex_rates))
    
    # print(f"Team folder ID in here {dropbox_team_connect().team_team_folder_list().team_folders}")
    
    def get_context_data(self, **kwargs):
        from .currencies import currencies
        context = super().get_context_data(**kwargs)
        self.object=None
        currentJob = Job.objects.get(pk=self.kwargs['pk'])
        context['currencyList'] = json.dumps(currencies)
        context['forexRates'] = json.dumps(self.forex_rates)
        current_url = self.request.build_absolute_uri()
        # update_cost_url = reverse('pipeline:update-cost', kwargs={'pk': my_cost.pk}) + \
        #     '?' + urlencode({'return_to': current_url})
        context['currentJob'] = currentJob
        context['headers'] = ["金額(¥)", "金額(現地)", "ベンダー名", "作業の内容", "PO番号", "請求書ステータス", "", "編集", "ID"]
        context['simple_add_vendor_form'] = self.simple_add_vendor_form()
        context['update_cost_form'] = self.update_cost_form()
        context['cost_form'] = self.cost_form()
        # context['update_cost_url'] = update_cost_url
        return context

    def post(self, request, *args, **kwargs):
        print(request.POST)
        self.object = None
        currentJob = Job.objects.get(pk=self.kwargs['pk'])

        if 'add-cost' in request.POST:
            print(request.POST)
            form = self.cost_form(request.POST)
            if form.is_valid():
                instance = form.save()
                instance.job = currentJob
                instance.save()
                print('added job!')
            else:
                print(f'errors: {form.errors}')

        elif 'add-vendor' in request.POST:
            form = self.simple_add_vendor_form(request.POST)
            if form.is_valid():
                newVendor = form.cleaned_data['addVendor']
                currentJob.vendors.add(Vendor.objects.get(pk=newVendor))
                currentJob.save()
            else:
                print(f'errors: {form.errors}')

        elif 'update' in request.POST:
            currentJob = Job.objects.get(pk=self.kwargs['pk'])
            vendors = Vendor.objects.filter(jobs_rel=currentJob.id)
            form_data_id = request.POST.get('cost_id')
            form_data_vendor = request.POST.get('vendor')
            form_data_status = request.POST.get('status')
            cost = Cost.objects.get(id=form_data_id)

            if form_data_vendor:
                print(form_data_vendor)
                if form_data_vendor != "0":
                    cost.vendor = Vendor.objects.get(id=form_data_vendor)
                else:
                    cost.vendor = None
                    cost.PO_number = ""
                
            if form_data_status:
                cost.invoice_status = form_data_status
                if form_data_status in ["PAID"]:
                    '''
                    This will give a close approximation for the amount actually paid to the vendor.
                    I'm thinking we need to incorporate Wise payments more closely to get more accuracy.
                    '''
                    cost.locked_exchange_rate = self.forex_rates[cost.currency]
                    cost.exchange_rate_locked_at = timezone.now()

            cost.save()

            status_options = Cost.INVOICE_STATUS_CHOICES

            data = {
                "amount_JPY": f'¥{round(cost.amount * self.forex_rates[cost.currency]):,}',
                "amount_local": f'{cost.currency}{cost.amount}',
                "vendor": render_to_string("pipeline/costsheet/cost_table_vendor_select.html", context={"vendors": vendors.all(), "selectedVendor": cost.vendor}),
                "description":cost.description,
                "PO_number":cost.PO_number,
                "invoice_status": render_to_string("pipeline/costsheet/cost_table_invoice_status.html", {"cost": cost, "options": status_options, "currentStatus": cost.invoice_status}),
                "request_invoice": render_to_string("pipeline/costsheet/invoice_request_btn.html", {"cost_id": cost.id}),
                "edit": render_to_string("pipeline/costsheet/cost_edit_delete_btns.html", {"cost_id": cost.id}),
                "id": cost.id,
                }
            return JsonResponse({"status":"success", "data":data})
        
        return HttpResponseRedirect(self.request.path_info)
        # return render(request, self.template_name, self.get_context_data(**kwargs))


class CostUpdateView(RedirectToPreviousMixin, UpdateView):
    model = Cost
    fields = ['vendor','description','amount','currency','invoice_status','notes', 'locked_exchange_rate', 'exchange_rate_locked_at', 'exchange_rate_override']
    template_name_suffix = '_update_form'
    # def get_success_url(self):
    #     # return_to = self.request.GET.get('return_to', '/')
    #     # Redirect the user back to the original page
    #     # return redirect(return_to)
    #     # else:
    #     return reverse_lazy('pipeline:cost-add', kwargs={'pk': self.object.job.id})
    
    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        if self.get_object().invoice_status == "PAID":
            form.fields['currency'].widget.attrs['disabled'] = 'true'
        form.fields['locked_exchange_rate'].widget.attrs['disabled'] = 'true'
        return form

class JobUpdateView(LoginRequiredMixin, SuccessMessageMixin, UpdateView):
    model = Job
    fields = ['job_name','client', 'job_code', 'job_type','revenue','add_consumption_tax','personInCharge','month','year','notes','invoice_name','invoice_recipient']
    template_name_suffix = '_update_form'
    success_message= "Job updated!"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['job_id'] = self.kwargs['pk']
        return context
    
    def get_success_url(self):
        return reverse('pipeline:job-detail', kwargs={'pk':self.kwargs['pk']})
    
    def form_valid(self, form):
        if form.has_changed() and 'client' in form.changed_data:
            form.instance.job_code_isFixed = False
        return super().form_valid(form)

class JobDeleteView(DeleteView):
    model = Job
    success_url = reverse_lazy('pipeline:index')

class ClientCreateView(LoginRequiredMixin, SuccessMessageMixin, CreateView):
    model = Client
    fields = ["friendly_name", "job_code_prefix", "proper_name", "proper_name_japanese", "paymentTerm", "notes"]

    success_message = "Client added!"
    def get_success_url(self):
        return reverse_lazy('pipeline:client-add')

class ClientListView(LoginRequiredMixin, ListView):
    model = Client

class VendorListView(LoginRequiredMixin, ListView):
    model = Vendor
    template_name = 'pipeline/vendor_list.html'

    def get_queryset(self):
        queryset = super().get_queryset()
        sorted_vendors = sorted(queryset, key=lambda vendor: vendor.familiar_name)
        return sorted_vendors
    
class VendorUpdateView(LoginRequiredMixin, SuccessMessageMixin, UpdateView):
    model = Vendor
    template_name = 'pipeline/vendor_update.html'
    fields = ["first_name", "last_name", "email", "vendor_code", "use_company_name", "company_name", "notes", "payment_id"]
    success_message = "The details for %(familiar_name)s have been updated"

    def get_success_message(self, cleaned_data):
        return self.success_message % dict(
            cleaned_data,
            familiar_name = self.object.familiar_name,
        )
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["pk"] = self.object.id
        return context
        
    def get_success_url(self):
        return reverse('pipeline:vendor-list')
    
class VendorCreateView(LoginRequiredMixin, SuccessMessageMixin, CreateView):
    model = Vendor
    fields = "__all__"

    success_message = "Vendor added!"
    def get_success_url(self):
        return reverse_lazy('pipeline:vendor-add')
    
