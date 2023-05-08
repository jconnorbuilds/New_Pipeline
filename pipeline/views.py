from django import forms
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.views import LoginView
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.core import serializers
from django.core.mail import send_mail, send_mass_mail
from django.db import IntegrityError
from django.db.models import Sum
from django.forms import formset_factory, modelformset_factory, Textarea
from django.http import JsonResponse, HttpResponseRedirect, HttpResponse
from django.shortcuts import render, redirect
from django.template.loader import get_template, render_to_string
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.utils.html import strip_tags
from django.views.generic import TemplateView, ListView, DetailView, DeleteView, UpdateView, CreateView
# from django.views.generic.dates import MonthMixin
from django.views import View
from .models import Job, Vendor, Cost, Client
from .forms import CostForm, JobForm, PipelineCSVExportForm, JobFilter, PipelineBulkActionsForm, AddVendorToCostForm, UpdateCostForm, UploadInvoiceForm, ClientForm
# from .tables import JobTable, CostTable
# from django_filters.views import FilterView
# import django_tables2 as tables
# from django_tables2 import SingleTableView
# from django_tables2.views import SingleTableMixin
from django_datatables_view.base_datatable_view import BaseDatatableView
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from urllib.parse import urlencode
import dropbox
from dropbox.exceptions import ApiError, AuthError

# import boto3
import json
# import os
import calendar
# import unicodedata
import csv
import requests


class RedirectToPreviousMixin:
    default_redirect = '/'

    def get(self, request, *args, **kwargs):
        request.session['previous_page'] = request.META.get(
            'HTTP_REFERER', self.default_redirect)
        return super().get(request, *args, **kwargs)

    def get_success_url(self):
        return self.request.session['previous_page']

def index(request):
    return render(request, 'pipeline/index.html')

def is_ajax(request):
    return request.headers.get('x-requested-with') == 'XMLHttpRequest'

class LoginView(LoginView):
    pass
    
class pipelineView(LoginRequiredMixin, SuccessMessageMixin, TemplateView):
    # login_url = "/login/"
    # redirect_field_name = "redirect_to"
    model = Job
    csv_export_form = PipelineCSVExportForm
    form_class = JobForm
    client_form_class = ClientForm
    bulk_actions = PipelineBulkActionsForm
    filterset_class = JobFilter
    template_name = "pipeline/pipeline.html"
    table_pagination = False

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        client_id = self.request.GET.get('client_id')
        context['job_form'] = JobForm(initial={'client': client_id})
        context['client_form'] = self.client_form_class
        context['csv_export_form'] = self.csv_export_form
        context['filter'] = JobFilter
        context['bulk_actions'] = self.bulk_actions
        # context['jobs'] = Job.objects.all()
        context['headers'] = ["", "ID", "Client","Job Name", "Job Code", "Revenue", "Costs", "Profit Rate", "Job Date", "Type", "Status", ""]
        return context

    def post(self, request, *args, **kwargs):
        if 'addjob' in request.POST:
            job_form = self.form_class(request.POST)
            if job_form.is_valid():
                # Take in the revenue in terms of 万
                job_form.instance.revenue = job_form.instance.revenue * 10000
                instance = job_form.save()
                print(instance)
                print(instance.job_date)
                success_message="Job added!"
                job = Job.objects.get(pk=instance.pk)

                data = {
                    'select': render_to_string('pipeline/job_checkbox.html', {"job_id":job.id}),
                    'id': job.id,
                    'client_name': job.client.friendly_name,
                    'job_name': render_to_string('pipeline/job_name.html', {"job_name":job.job_name, "job_id":job.id}),
                    'job_code': job.job_code,
                    'revenue': f'¥{job.revenue:,}',
                    'total_cost': render_to_string('pipeline/job_total_cost.html', {"job_id":job.id, "job_total_cost":job.total_cost} ),
                    'profit_rate': f'{job.profit_rate}%',
                    'job_date': job.job_date,
                    'job_type': job.get_job_type_display(),
                    'status': render_to_string('pipeline/jobs/pipeline_table_job_status_select.html', {"options":Job.STATUS_CHOICES, "currentStatus":job.status}),
                    'edit': render_to_string('pipeline/job_edit_delete.html', {"job_id":job.id}),
                }
                return JsonResponse({"status": "success", "data":data})
            else:
                for error in job_form.errors:
                    print(f'errors: {error}')
                return JsonResponse({"status":"error"})
        elif 'update-job' in request.POST:
            job = Job.objects.get(id=request.POST.get('job_id'))
            print(request.POST)
            form_data_job_status = request.POST.get('status')

            if form_data_job_status:
                print(form_data_job_status)
                job.status = form_data_job_status
            else:
                print("There was a problem getting the form data.")
            job.save()

            data = {
                    'select': render_to_string('pipeline/job_checkbox.html', {"job_id":job.id}),
                    'id': job.id,
                    'client_name': job.client.friendly_name,
                    'job_name': render_to_string('pipeline/job_name.html', {"job_name":job.job_name, "job_id":job.id}),
                    'job_code': job.job_code,
                    'revenue': f'¥{job.revenue:,}',
                    'total_cost': render_to_string('pipeline/job_total_cost.html', {"job_id":job.id, "job_total_cost":job.total_cost} ),
                    'profit_rate': f'{job.profit_rate}%',
                    'job_date': job.job_date,
                    'job_type': job.get_job_type_display(),
                    'status': render_to_string('pipeline/jobs/pipeline_table_job_status_select.html', {"options":Job.STATUS_CHOICES, "currentStatus":job.status}),
                    'edit': render_to_string('pipeline/job_edit_delete.html', {"job_id":job.id}),
                }
            return JsonResponse({"status": "success", "data": data})
            
        elif 'csvexport' in request.POST:
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
                
                response = HttpResponse(content_type='text/csv',
                headers = {'Content-Disposition': 'attachment; filename ="csv_simple_write.csv"'},
                )
                writer = csv.writer(response)
                fields = ['クライアント', '案件名', 'ジョブコード', '予算 (¥)', '総費用', '案件タイプ', '日付']
                writer.writerow(fields) 

                scope = Job.objects.filter(job_date__gte=fromDate, job_date__lt=thruDate)
                print(scope)

                # receivedInvoices = Cost.objects.filter(job__job_date__gte=fromDate, job__job_date__lt=thruDate,invoice_status='PAID')
                expectedGrossRevenue = sum([job.revenue for job in scope])
                actualGrossRevenue = sum([job.revenue for job in scope if job.status in ['FINISHED','ARCHIVABLE','ARCHIVED']])

                for job in scope:
                    # Return date in format YYYY-MM
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

        elif 'bulk-actions' in request.POST:
            bulk_form = self.bulk_actions(request.POST)
            # all_items = self.table_class(request.POST)
            print(request.POST)
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
                        print(f'this job is now a {job.month}/{job.year} job')
                elif action == "PREVIOUS":
                    for job in checked_jobs:
                        if job.month == '1':
                            job.month = '12'
                            job.year = str(int(job.year) - 1)
                        else:   
                            job.month = str(int(job.month) - 1)
                        job.save()
                        print(f'this job is now a {job.month}/{job.year} job')
                elif action == "DELETE":
                    i = 0
                    for job in checked_jobs:
                        job.isDeleted = True;
                        job.save()
                        i += 1
                    if i > 0:
                        messages.error(request, f'{i} jobs were deleted. You can restore them from the admin panel.')
                    else:
                        messages.warning(request, 'No jobs were deleted.')
                        print('No jobs were deleted.')
                elif action == "RELATE":
                    if len(checked_jobs) > 1:
                        checked_jobs[0].relatedJobs.set([job for job in checked_jobs[1::]])
                    else:
                        print('nothing happened')
                elif action == "UNRELATE":
                    i = 1
                    while i < len(checked_jobs):
                        if checked_jobs[i] in checked_jobs[0].relatedJobs.all():
                            checked_jobs[0].relatedJobs.remove(checked_jobs[i])
                            print('success!')
                            i += 1
                        else:
                            print("jobs aren't related")
                            i += 1

                else:
                    print('hmmmmm')

        elif 'new_client' in request.POST:
            form = self.client_form_class(request.POST)
            if form.is_valid():
                instance = form.save()
                return JsonResponse({"id":instance.id, "value":instance.friendly_name, "status": "success"})
            else:
                print("client add didn't work")
                return JsonResponse({"errors":form.errors})
        else:
            print(f'post request contents: {request.POST}')

        # self.object_list = self.get_queryset()
        return render(request, self.template_name, self.get_context_data())

def pipeline_data(request, year=None, month=None):
    jobs = Job.objects.all()
    # Calculate total revenue
    total_revenue_ytd = Job.objects.filter(job_date__year=date.today().year).aggregate(total_revenue=Sum('revenue'))['total_revenue'] or 0
    if year is not None and month is not None:
        jobs = Job.objects.filter(job_date__month=month, job_date__year=year)

    total_revenue_monthly_expected = jobs.aggregate(total_revenue=Sum('revenue'))['total_revenue'] or 0
    avg_monthly_revenue_ytd = 0
    total_revenue_monthly_actual = jobs.filter(
        status__in=["INVOICED","FINISHED","ARCHIVABLE","ARCHIVED"]).aggregate(
        total_revenue=Sum('revenue'))['total_revenue'] or 0
    # print(f"trma: {total_revenue_monthly_actual}")

    data = {"data":[
        {
            'select': render_to_string('pipeline/job_checkbox.html', {"job_id":job.id}),
            'id': job.id,
            'client_name': job.client.friendly_name,
            'job_name': render_to_string('pipeline/job_name.html', {"job_name":job.job_name, "job_id":job.id}),
            'job_code': job.job_code,
            'revenue': f'¥{job.revenue:,}',
            'total_cost': render_to_string('pipeline/job_total_cost.html', {"job_id":job.id, "job_total_cost":job.total_cost} ),
            'profit_rate': f'{job.profit_rate}%',
            'job_date': job.job_date,
            'job_type': job.get_job_type_display(),
            'status': render_to_string('pipeline/jobs/pipeline_table_job_status_select.html', {"options": Job.STATUS_CHOICES, "currentStatus": job.status}),
            'edit': render_to_string('pipeline/job_edit_delete.html', {"job_id":job.id}),
        }
        for job in jobs
    ],
    "total_revenue_ytd":f'¥{total_revenue_ytd:,}',
    "avg_monthly_revenue_ytd":f'¥{round(total_revenue_ytd/(date.today().month)):,}',
    "total_revenue_monthly_expected":f'¥{total_revenue_monthly_expected:,}',
    "total_revenue_monthly_actual":f'¥{total_revenue_monthly_actual:,}',
    "invoice_info":[{
        "all_invoices_requested":job.allVendorInvoicesRequested,
        "all_invoices_received":job.allVendorInvoicesReceived,
        "all_invoices_paid":job.allVendorInvoicesPaid,
        }
        for job in jobs
    ]
    }
    return JsonResponse(data, safe=False,)

def forExRate(source_currency):
    '''
    Calculates the foreign exchange rate via Wise's API
    '''
    print("FOR EX RATE IS RUNNING")
    # Set the endpoint URL for Wise's rates API'
    url = 'https://api.wise.com/v1/rates/'
    target_currency = 'JPY'
    
    # Set the API headers with API key and specify the response format as JSON
    headers = {
        'Authorization': f'Bearer {settings.WISE_API_KEY}',
        'Content-Type': 'application/json'
    }
    params = {
        'source': source_currency,
        'target': target_currency
    }
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        print(response.json()[0].get('rate'))
        print(response.json()[0].get('time'))
        return response.json()[0].get('rate')
    else:
        # return JsonResponse({'error':'Failed to retrieve exchange rate from Wise API.'})
        # make approximation and add warning message
        return 1

def cost_data(request, job_id):
    costs = Cost.objects.filter(job=job_id)
    vendors = Vendor.objects.filter(jobs_rel=job_id)

    for cost in costs:
        print(cost.currency)
        print(cost.invoice_status)
    
    status_options = Cost.INVOICE_STATUS_CHOICES

    data = {"data": [
        {
        "amount_JPY": f'¥{round(cost.amount * forExRate(cost.currency)):,}' if cost.invoice_status not in ["PAID"] else f'¥{round(cost.amount * cost.locked_exchange_rate):,}',
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

class VendorDetailView(DetailView):
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
    template_name = "pipeline/jobs.html"
    model = Job

class InvoiceView(ListView):
    # Will need to make more efficient for the long term
    model = Cost
    template_name = "pipeline/invoices_list.html"
    costs = Cost.objects.all()
    # vendors = Vendor.objects.all()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        current_url = self.request.build_absolute_uri()
        # update_cost_url = reverse('update-cost') + \
        #     '?' + urlencode({'return_to': current_url})
        context['headers'] = ["", "Link", "Amt. (¥)", "Amt.(local)", "Job Date", "Job", "Job Code", "Vendor", "Description",
                              "PO Number", "Invoice Status", "Request Invoice", "Edit", "ID"]
        # context['update-cost-url'] = update_cost_url
        return context

    def post(self, request, *args, **kwargs):
        # currentJob = Job.objects.get(pk=self.kwargs['pk'])
        print(request.POST)
        # vendors = Vendor.objects.filter(jobs_rel=currentJob.id)
        form_data_id = request.POST.get('cost_id')
        form_data_vendor = request.POST.get('vendor')
        form_data_status = request.POST.get('status')
          # form_data_status = request.POST.get('status')
        all_costs = Cost.objects.all()
        cost = Cost.objects.get(id=request.POST.get('cost_id'))
        print(f"cost amount: {cost.amount}")
        print(f"cost currency: {cost.currency}")


        # print(request.POST.get('cost_id'))
        if form_data_vendor:
            cost.vendor = Vendor.objects.get(id=form_data_vendor)

        if form_data_status:
            cost.invoice_status = form_data_status
        cost.save()

        status_options = [
            ('NR', 'Not ready to request'),
            ('READY', 'Ready to request'),
            ('REQ', 'Requested'),
            ('REC', 'Received via upload'),
            ('REC2', 'Received (direct PDF/paper)'),
            ('PAID', 'Paid'),
            ('NA', 'No Invoice'),
        ]
        data = {
                "select": render_to_string("pipeline/costsheet/checkbox.html", {"cost_id": cost.id}),
                "costsheet_link": f'<a href="{reverse("pipeline:cost-add", args=[cost.job.id])}">Cost Sheet</a>',
                "amount_JPY": f'¥{round(cost.amount * forExRate(cost.currency)):,}' if cost.invoice_status not in ["PAID"] else f'¥{round(cost.amount * cost.locked_exchange_rate):,}',
                "amount_local": f'{cost.currency}{cost.amount}',
                "job_date": f'{calendar.month_abbr[cost.job.job_date.month]} {cost.job.job_date.year}',
                "job_name": cost.job.job_name,
                "job_code": cost.job.job_code,
                "vendor": cost.vendor.full_name,
                "description": cost.description,
                "PO_number": cost.PO_number,
                "invoice_status": render_to_string("pipeline/costsheet/cost_table_invoice_status.html", {"cost": cost, "options": status_options, "currentStatus": cost.invoice_status}),
                "request_invoice": render_to_string("pipeline/costsheet/invoice_request_btn.html", {"cost_id": cost.id}),
                "edit": render_to_string("pipeline/costsheet/cost_edit_delete_btns.html", {"cost_id": cost.id}),
                "id": cost.id,
            }
        return JsonResponse({"status": "success", "data":data}, safe=False,)
        # return render(request, self.template_name, self.get_context_data(**kwargs))

    # 
def all_invoices_data(request):
    costs = Cost.objects.all()
    print(request.POST)

    status_options = Cost.INVOICE_STATUS_CHOICES

    data = {"data": [
        {
            "select": render_to_string('pipeline/costsheet/checkbox.html', {"cost_id": cost.id}),
            "costsheet_link": f'<a href="{reverse("pipeline:cost-add", args=[cost.job.id])}">Cost Sheet</a>',
            "amount_JPY": f'¥{round(cost.amount * forExRate(cost.currency)):,}' if cost.invoice_status not in ["PAID"] else f'¥{round(cost.amount * cost.locked_exchange_rate):,}',
            "amount_local": f'{cost.currency}{cost.amount}',
            "job_date": f'{calendar.month_abbr[cost.job.job_date.month]} {cost.job.job_date.year}',
            "job_name": cost.job.job_name,
            "job_code": cost.job.job_code,
            "vendor": cost.vendor.full_name if cost.vendor else "",
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
        # access_token = access_token.access_token
        # dbx = dropbox.Dropbox(access_token, headers=headers)
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
                # path=dropbox_file_path,
                mode=dropbox.files.WriteMode("overwrite"))
        return meta
    
    except dropbox.exceptions.ApiError as e:
        print(f'Error uploading file to Dropbox: {e.error}')

def handle_uploaded_file(request):
    print(f'FILES:{request.FILES}')
    print(f'POST:{request.POST}')

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

            if invoice_file and invoice_file.size <10 * 1024 * 1024:
                if invoice_file.size < 10 * 1024 * 1024:
                    try:
                        invoice_folder = '/Financial/_ INVOICES/_VENDOR INVOICES'
                        full_filepath = (invoice_folder + "/" + date_folder_name + "/" + cost.currency + "/" + cost.PO_number + file_extension)
                        dropbox_upload_file(invoice_file, full_filepath)
                        cost.invoice_status = 'REC'
                        cost.save()
                    except Exception as e:
                        print(e)
                        s3.upload_fileobj(
                            invoice_file, bucket_name,
                            date_folder_name + cost.PO_number + file_extension)
                        print("cost status should be ERR")
                        cost.invoice_status = 'ERR'
                        cost.save()
                        return HttpResponse('error')
                    
                    
                else:
                    return JsonResponse({'error': 'File size must be less than 10 MB'})
            else:
                return JsonResponse({'status':'error', 'message':'There was an error'})
            
        if settings.DEBUG == False:
            return HttpResponse('upload')
        else:
            return HttpResponse('uploaded')
    else:
        print("not quite")

def invoice_upload_view(request, vendor_uuid):
    vendor = Vendor.objects.get(uuid=vendor_uuid)
    costs = Cost.objects.filter(vendor_id=vendor.id, invoice_status='REQ').select_related('job')
    print(f'VENDOR ID: {vendor.id}')
    jobs = list(Job.objects.filter(cost_rel__in=costs).values('pk','job_name', 'job_code'))
    jobs_json = json.dumps(jobs)
    costs_json = serializers.serialize('json', costs)
    for cost in costs:
        print(cost)
    print("Amt of costs: " + str(len(costs)))
    
    if len(costs) == 0:
        return HttpResponseRedirect(reverse('pipeline:no-invoices'))

    else:
        context = {'costs':costs, 'costs_json':json.dumps(costs_json), 'jobs_json':jobs_json, 'vendor_id':vendor.id}
        print(context)
        return render(request, 'pipeline/upload_invoice.html', context)

def upload_invoice_success(request):
    html = "<html>Upload successful</html>"
    return HttpResponse(html)

def invoice_error(request):
    return render(request, 'pipeline/no_invoices.html')

# def InvoicesView(request):
#     template_name = "pipeline/request_invoices.html"
#     costs_READY_REQ = Cost.objects.filter(invoice_status__in=['READY','REQ'])
#     costs_REC = Cost.objects.filter(invoice_status__in=['REC',])

#     def get_files():
#         pathname = "/Users/joeconnor_bcwc/Black Cat White Cat Dropbox/Joe Connor/FINANCIAL_Test"
#         allFiles = os.listdir(pathname+'/test_dir')
#         allVisibleFiles = [file for file in allFiles if file.startswith('.') == False]
#         return allVisibleFiles

#     def check_for_received_invoices():
#         for file in get_files():
#             for cost in costs_READY_REQ:
#                 if cost.job.job_code in file:
#                     print(cost.job.job_code)
#                     cost.invoice_status = 'REC'
#                     cost.save()
#                 else:
#                     print('no match')

#     def check_for_missing_invoices():
#         missing = []
#         for cost in costs_REC:
#             missing.append(cost)
#             print(f'{cost} appended to missing')
#             for file in get_files():
#                 if cost.job.job_code in file:
#                     missing.remove(cost)
#                     print(f'{cost} removed from missing')
#         for cost in missing:
#             cost.invoice_status = 'REQ'
#             cost.save()

#             # for file in get_files():
#             #   if cost.job.job_code in get_files():
#             #       print(f'match: {cost.job.job_code}')
#             #   else:
#             #       print('no match')

#     check_for_received_invoices()
#     check_for_missing_invoices()

#     for cost in costs_READY_REQ:
#         print (f'READY or REQ: {cost} - {cost.invoice_status}')
#     for cost in costs_REC:
#         print (f'REC: {cost} - {cost.invoice_status}')

#     context = {
#         'files': get_files(),
#         'costs_READY_REQ': costs_READY_REQ,
#         'costs_REC' : costs_REC,
#         }

#     return render(request, template_name, context)

def RequestVendorInvoicesMultiple(request):

    '''
    Currently set up to send out emails, triggered by button press, to any vendors who have invoices that have
    the 'READY' status. Then it sets the status of each of the requested invoices to 'REQ'.

    '''
    # Creates a list of vendors who have invoices ready to be requested, no dupes
    vendors = set(Vendor.objects.filter(vendor_rel__invoice_status='READY'))
    costCount = 0
    vendorCount = 0

    # Returns the month 'number' with no leading zeroes
    # For use in calendar.month_abbr'
    monthNum = int(str(timezone.now()).split('-')[1])
    for vendor in vendors:
    #   if vendor.isCompany():
    #       pass
    #   if vendor.prefersJapanese():
    #       pass
        vendor_first_name = vendor.full_name.split(' ')[0]
        
        # args for use in send_mail
        test_recipient_list = 'joe@bwcatmusic.com'
        # CHANGE TO vendor.email!!
        if settings.DEBUG == True:
            recipient_list=[test_recipient_list]
        else:
            recipient_list=[vendor.email]
        costs = Cost.objects.filter(invoice_status='READY', vendor__full_name=vendor.full_name)
        subject = f'BCWC invoice request - {calendar.month_abbr[monthNum]}'
        from_email=None

        # creates rich text and plaintext versions to be sent; rich text will be read by default
        html_message = render_to_string("pipeline/invoice_request_email_template.html", context={'vendor_first_name':vendor_first_name, 'vendor':vendor, 'costs':costs})
        with open(settings.TEMPLATE_DIR / "pipeline/invoice_request_email_template.html") as f:
            message = strip_tags(f.read())
        
        send_mail(subject, message, from_email, recipient_list, fail_silently=False, html_message=html_message)
        # message.attach_alternative(html_template, "text/html")
        costCount += len(costs)
        vendorCount += 1
        for cost in costs:
            cost.invoice_status = 'REQ'
            cost.save()

    messages.success(request, f'{costCount} invoices were requested from {vendorCount} vendors!')
    
    return redirect("pipeline:invoice-request-page")

def RequestVendorInvoiceSingle(request, cost_id):
    # Creates a list of vendors who have invoices ready to be requested, no dupes
    vendor = Vendor.objects.get(vendor_rel__id=cost_id)
    cost = Cost.objects.get(id = cost_id)
    print(vendor)
    print(cost)

    if cost.invoice_status not in ["REQ", "REC", "REC2", "PAID", "NA"]:
        #   if vendor.isCompany():
        #       pass
        #   if vendor.prefersJapanese():
        #       pass
        vendor_first_name = vendor.full_name.split(' ')[0]

        # args for use in send_mail
        test_recipient_list = 'joe@bwcatmusic.com'
        # CHANGE TO vendor.email!!
        if settings.DEBUG == True:
            recipient_list = [test_recipient_list]
        else:
            recipient_list = [vendor.email]
        subject = f'BCWC invoice request - {cost.PO_number} {cost.job.job_name}'
        from_email = None

        # creates rich text and plaintext versions to be sent; rich text will be read by default
        html_message = render_to_string("pipeline/invoice_request_email_template.html", context={
                                        'vendor_first_name': vendor_first_name, 'vendor': vendor, 'cost': cost})
        with open(settings.TEMPLATE_DIR / "pipeline/invoice_request_email_template.html") as f:
            message = strip_tags(f.read())

        send_mail(subject, message, from_email, recipient_list,
                    fail_silently=False, html_message=html_message)
        cost.invoice_status = 'REQ'
        cost.save()

        messages.success(
            request, f'The invoice for {cost.PO_number} was requested from {vendor.full_name}!'
            )
        
        # return redirect("pipeline:cost-add", cost.job.id)
        return JsonResponse({"status":"success", "message":"success!"})
    else:
        #Return an error if the invoice has already been requested
        #This could be more robust, right now it's based on the setting of the
        #invoice status dropdown
        return JsonResponse({"status":"error", "message": "error :("})

# Simple CSV Write Operation
def CSV_Write(request):
    if request.method == "POST":
        # Create the HttpResponse object with the appropriate CSV header.
        response = HttpResponse(content_type='text/csv',
        headers = {'Content-Disposition': 'attachment; filename ="csv_simple_write.csv"'},
        )
        writer = csv.writer(response)
        fields = ['クライアント', '案件名', 'ジョブコード', '予算', '総合費用', '案件タイプ', '日付（月年）']
        writer.writerow(fields) 
        scope = Job.objects.filter(job_date__gte=fromDate, job_date__lte=thruDate)
        receivedInvoices = Cost.objects.filter(job__job_date__gte=fromDate, job__job_date__lte=thruDate,invoice_status='PAID')
        expectedGrossRevenue = sum([job.revenue for job in scope])
        actualGrossRevenue = sum([job.revenue for job in scope if job.status in ['FINISHED','ARCHIVABLE','ARCHIVED']])

        for job in scope:
            # Return date in format YYYY-MM
            date_MY = str(job.job_date)[:-3]
            data = [job.client, job.job_name, job.job_code, job.revenue, job.total_cost, job.job_type, date_MY]
            writer.writerow(data)
        writer.writerow('')
        writer.writerow(['','','','','','','','総収入(予想)', expectedGrossRevenue])
        writer.writerow(['','','','','','','','総収入(実際)', actualGrossRevenue])
        # writer.writerow(['','','','','','','','総収入', grossRevenue])
    
    return response

def importClients(request):
    with open('static/pipeline/clients.csv', 'r') as myFile:
        template_name = "pipeline/client_form.html"
        itemCreated = []
        itemNotCreated = []
        reader = csv.reader(myFile, delimiter=',')
        next(reader) # Skip the header row
        for column in reader:
                friendly_name = column[0]
                job_code_prefix = column[1]
                proper_name = column[2]
                proper_name_japanese = column[3]
                notes = column[4]
                if Client.objects.filter(friendly_name__iexact=friendly_name).exists():
                    itemNotCreated.append(f'{column[0]} - {column[1]}')
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
                            itemCreated.append(f'{friendly_name} - {job_code_prefix}')
                        elif not created:
                            itemNotCreated.append(f'{friendly_name} - {job_code_prefix}')
                        # elif not created:
                        #   itemUpdated.append(f'{name} - {job_code_prefix}')
                        # else:
                        #   messages.warning.append(f'{name} - {job_code_prefix} !!! SOMETHING ELSE HAPPENED')

                    except IntegrityError as e:
                        print(f'{friendly_name} - {job_code_prefix}: {e}')
                        messages.error(request, f"{friendly_name} - {job_code_prefix} wasn't added.\n{e}")
                    except NameError as n:
                        print(f'{friendly_name} - {job_code_prefix}: {n}')
                        messages.error(request, f"{friendly_name} - {job_code_prefix} wasn't added.\n{e}")
                    except Exception as e:
                        print(e)
                        messages.error(request, f"{friendly_name} - {job_code_prefix} wasn't added - something bad happened! \n{e}")
            
        if itemCreated:
            messages.success(request, f'{len(itemCreated)} clients were added successfully!')

        if itemNotCreated:
            messages.info(request, f'{len(itemNotCreated)} items were already in the database, so they were left alone.')
            # for item in itemNotCreated:
            #   messages.info(request, item)

    return redirect('pipeline:client-add')

def importJobs(request):
    myFile = open('static/pipeline/jobs.csv', 'r')
    template_name = "pipeline/pipeline.html"
    itemCreated = []
    itemNotCreated = []
    def getClient(job_code):
        if Client.objects.filter(job_code_prefix = job_code[:3]).exists():
            return Client.objects.get(job_code_prefix = job_code[:3])
        elif Client.objects.filter(job_code_prefix = job_code[:2]).exists():
            return Client.objects.get(job_code_prefix = job_code[:2])
        elif Client.objects.filter(job_code_prefix = job_code[:4]).exists():
            return Client.objects.get(job_code_prefix = job_code[:4])
        elif Client.objects.filter(friendly_name__iexact=client).exists():
            return Client.objects.get(friendly_name__iexact=client)
        else:
            return False
    for line in myFile:
        column = line.split(',')
        if column[0] == "job_name":
            continue
        job_name = column [0]
        client = column[1]
        job_code = column[2]
        job_code_isFixed = column[3]
        isArchived = column[4]
        year = column[5]
        month = column[6]
        job_type = column[7]
        revenue = column[8]
        personInCharge = column[9]
        status = column[10]
        try:
            # These lines were importing with invisble spaces, so
            # I used .strip() import them without the spaces
            temp,created = Job.objects.update_or_create(
                job_name = job_name.strip(),
                client = getClient(job_code),
                job_code = job_code.strip(),
                job_code_isFixed = job_code_isFixed.strip(),
                isArchived = isArchived.strip(),
                year = year.strip(),
                month = month.strip(),
                job_type = job_type.strip(),
                revenue = revenue,
                personInCharge = personInCharge.strip(),
                status = status.strip()
            )
            temp.save()
            if created:
                itemCreated.append(f'{job_name} - {client}')
            elif not created:
                itemNotCreated.append(f'{job_name} - {client}')
            # elif not created:
            #   itemUpdated.append(f'{name} - {job_code_prefix}')
            # else:
            #   messages.warning.append(f'{name} - {job_code_prefix} !!! SOMETHING ELSE HAPPENED')

        except IntegrityError as e:
            print(f'{job_name} - {client}: {e}')
            messages.error(request, f"{job_name} - {client} wasn't added.\n{e}")
        except NameError as n:
            print(f'{job_name} - {client}: {n}')
            messages.error(request, f"{job_name} - {client} wasn't added.\n{e}")
        except Exception as e:
            messages.error(request, f"{job_name} - {client} wasn't added - something bad happened!")
            print(e)
        
    if itemCreated:
        messages.success(request, f'{len(itemCreated)} jobs were added successfully!')

    if itemNotCreated:
        messages.info(request, f'{len(itemNotCreated)} items were already in the database, so they were left alone.')
        # for item in itemNotCreated:
        #   messages.info(request, item)

    myFile.close()
    return redirect('pipeline:index')

def importVendors(request):
    myFile = open('static/pipeline/jobs.csv', 'r')
    template_name = "pipeline/pipeline.html"
    itemCreated = []
    itemNotCreated = []
    def getClient(job_code):
        if Client.objects.filter(job_code_prefix = job_code[:3]).exists():
            return Client.objects.get(job_code_prefix = job_code[:3])
        elif Client.objects.filter(job_code_prefix = job_code[:2]).exists():
            return Client.objects.get(job_code_prefix = job_code[:2])
        elif Client.objects.filter(job_code_prefix = job_code[:4]).exists():
            return Client.objects.get(job_code_prefix = job_code[:4])
        elif Client.objects.filter(friendly_name__iexact=client).exists():
            return Client.objects.get(friendly_name__iexact=client)
        else:
            return False
    for line in myFile:
        column = line.split(',')
        if column[0] == "job_name":
            continue
        job_name = column [0]
        client = column[1]
        job_code = column[2]
        job_code_isFixed = column[3]
        isArchived = column[4]
        year = column[5]
        month = column[6]
        job_type = column[7]
        revenue = column[8]
        personInCharge = column[9]
        status = column[10]
        try:
            # These lines were importing with invisble spaces, so
            # I used .strip() import them without the spaces
            temp,created = Job.objects.update_or_create(
                job_name = job_name.strip(),
                client = getClient(job_code),
                job_code = job_code.strip(),
                job_code_isFixed = job_code_isFixed.strip(),
                isArchived = isArchived.strip(),
                year = year.strip(),
                month = month.strip(),
                job_type = job_type.strip(),
                revenue = revenue,
                personInCharge = personInCharge.strip(),
                status = status.strip()
            )
            temp.save()
            if created:
                itemCreated.append(f'{job_name} - {client}')
            elif not created:
                itemNotCreated.append(f'{job_name} - {client}')

        except IntegrityError as e:
            print(f'{job_name} - {client}: {e}')
            messages.error(request, f"{job_name} - {client} wasn't added.\n{e}")
        except NameError as n:
            print(f'{job_name} - {client}: {n}')
            messages.error(request, f"{job_name} - {client} wasn't added.\n{e}")
        except Exception as e:
            messages.error(request, f"{job_name} - {client} wasn't added - something bad happened!")
            print(e)
        
    if itemCreated:
        messages.success(request, f'{len(itemCreated)} jobs were added successfully!')

    if itemNotCreated:
        messages.info(request, f'{len(itemNotCreated)} items were already in the database, so they were left alone.')

    myFile.close()
    return redirect('pipeline:index')

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

class CostCreateView(CreateView):
    model = Cost
    fields = ['vendor','description','amount','currency','invoice_status','notes']
    template_name = "pipeline/cost_form.html"
    simple_add_vendor_form = AddVendorToCostForm
    cost_form = CostForm
    update_cost_form = UpdateCostForm

    
    # print(f"Team folder ID in here {dropbox_team_connect().team_team_folder_list().team_folders}")
    

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        self.object=None
        currentJob = Job.objects.get(pk=self.kwargs['pk'])
        current_url = self.request.build_absolute_uri()
        # update_cost_url = reverse('pipeline:update-cost', kwargs={'pk': my_cost.pk}) + \
        #     '?' + urlencode({'return_to': current_url})
        context['currentJob'] = currentJob
        context['headers'] = ["Amt. (¥)", "Amt. (local)", "Vendor", "Description", "PO Number", "Invoice Status", "Request Invoice", "Edit", "ID"]
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
                currentJob.vendors.add(Vendor.objects.get(unique_id=newVendor))
                currentJob.save()
            else:
                print(f'errors: {form.errors}')

        elif 'update' in request.POST:
            currentJob = Job.objects.get(pk=self.kwargs['pk'])
            print(request.POST)
            vendors = Vendor.objects.filter(jobs_rel=currentJob.id)
            form_data_id = request.POST.get('cost_id')
            form_data_vendor = request.POST.get('vendor')
            form_data_status = request.POST.get('status')
            # form_data_status = request.POST.get('status')
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
                    cost.locked_exchange_rate = forExRate(cost.currency)
                    cost.exchange_rate_locked_at = timezone.now()

            cost.save()

            status_options = Cost.INVOICE_STATUS_CHOICES

            data = {
                "amount_JPY": f'¥{round(cost.amount * forExRate(cost.currency)):,}',
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
        
        return render(request, self.template_name, self.get_context_data(**kwargs))


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

class JobUpdateView(UpdateView):
    model = Job
    fields = ['job_name','client','job_type','revenue','personInCharge','status','month','year','notes']
    template_name_suffix = '_update_form'
    def get_success_url(self):
        return reverse_lazy('pipeline:index')

class JobDeleteView(DeleteView):
    model = Job
    success_url = reverse_lazy('pipeline:index')

class ClientCreateView(SuccessMessageMixin, CreateView):
    model = Client
    fields = ["friendly_name", "job_code_prefix", "proper_name", "name_japanese", "proper_name_japanese", "paymentTerm", "notes"]

    success_message = "Client added!"
    def get_success_url(self):
        return reverse_lazy('pipeline:client-add')

class ClientListView(ListView):
    model = Client

class VendorListView(ListView):
    model = Vendor

class VendorCreateView(SuccessMessageMixin, CreateView):
    model = Vendor
    fields = "__all__"

    success_message = "Vendor added!"
    def get_success_url(self):
        return reverse_lazy('pipeline:vendor-add')
    
