from django import forms
from django.conf import settings
from django.contrib import messages
from django.contrib.messages.views import SuccessMessageMixin
from django.core import serializers
from django.core.mail import send_mail, send_mass_mail
from django.db import IntegrityError
from django.forms import formset_factory, modelformset_factory, Textarea
from django.http import JsonResponse, HttpResponseRedirect, HttpResponse
from django.shortcuts import render, redirect
from django.template.loader import get_template, render_to_string
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.utils.html import strip_tags
from django.views.generic import TemplateView, ListView, DetailView, DeleteView, UpdateView, CreateView
from django.views.generic.dates import MonthMixin
from django.views import View
from .models import Job, Vendor, Cost, Client
from .forms import CostForm, JobForm, PipelineCSVExportForm, JobFilter, PipelineBulkActionsForm, AddVendorToCostForm, UpdateCostForm, UploadInvoiceForm, ClientForm
from .tables import JobTable, CostTable
from django_filters.views import FilterView
import django_tables2 as tables
from django_tables2 import SingleTableView
from django_tables2.views import SingleTableMixin
from django_datatables_view.base_datatable_view import BaseDatatableView
from datetime import date
# import boto3
import json
import os
import calendar
import unicodedata
import csv


# Create your views here.
def index(request):
    return render(request, 'main_app/index.html')

def is_ajax(request):
    return request.headers.get('x-requested-with') == 'XMLHttpRequest'

class pipelineView(ListView, SuccessMessageMixin, FilterView):
    model = Job
    csv_export_form = PipelineCSVExportForm
    form_class = JobForm
    client_form_class = ClientForm
    bulk_actions = PipelineBulkActionsForm
    filterset_class = JobFilter
    template_name = "main_app/pipeline.html"
    table_pagination = False

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        client_id = self.request.GET.get('client_id')
        context['job_form'] = JobForm(initial={'client': client_id})
        context['client_form'] = self.client_form_class
        context['csv_export_form'] = self.csv_export_form
        context['filter'] = JobFilter
        context['bulk_actions'] = self.bulk_actions
        context['jobs'] = Job.objects.all()
        context['headers'] = ["", "Client","Job Name", "Job Code", "Revenue", "Costs", "Profit Rate", "Job Date", "Type", "Status", ""]
        # if settings.DEBUG == True:
        #     context['test_uuid'] = Vendor.objects.get(id=1).uuid
        #     print(context['test_uuid'])
        return context

    def post(self, request, *args, **kwargs):
        if 'addjob' in request.POST:
            job_form = self.form_class(request.POST)
            if job_form.is_valid():
                # Take in the budget in terms of 万
                job_form.instance.budget = job_form.instance.budget * 10000
                instance = job_form.save()
                print(instance)
                print(instance.job_date)
                success_message="Job added!"
                job = Job.objects.get(pk=instance.pk)
                data = {
                    'select': render_to_string('main_app/job_checkbox.html', {"job":job}),
                    'client_name': job.client.friendly_name,
                    'job_name': render_to_string('main_app/job_name.html', {"job":job}),
                    'job_code': job.job_code,
                    'budget': f'¥{job.budget:,}',
                    'total_cost': render_to_string('main_app/job_total_cost.html', {"job":job} ),
                    'profit_rate': job.profit_rate,
                    'job_date': f'{calendar.month_abbr[job.job_date.month]} {job.job_date.year}',
                    'job_type': job.get_job_type_display(),
                    'status': job.get_status_display(),
                    'edit': render_to_string('main_app/job_edit_delete.html', {"job":job}),
                }
                print(data)
                return JsonResponse({"status": "success", "data":data})
            else:
                for error in errors:
                    print(f'errors: {error}')
                return JsonResponse({"status":"error"})

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
                expectedGrossRevenue = sum([job.budget for job in scope])
                actualGrossRevenue = sum([job.budget for job in scope if job.status in ['FINISHED','ARCHIVABLE','ARCHIVED']])

                for job in scope:
                    # Return date in format YYYY-MM
                    date_MY = f'{job.job_date.year}年{job.job_date.month}月'
                    if job.client.proper_name_japanese:
                        client_name = job.client.proper_name_japanese
                    else:
                        client_name = job.client.proper_name
                    data = [client_name, job.job_name, job.job_code, f'{job.budget:,}', f'{job.total_cost:,}', job.job_type, date_MY]
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

        self.object_list = self.get_queryset()
        return render(request, self.template_name, self.get_context_data())


class pipelineMonthView(pipelineView, MonthMixin):
    model = Job
    form_class = JobForm
    bulk_actions = PipelineBulkActionsForm
    template_name = "main_app/pipeline_by_month.html"
    month_format = "%m"
    # month = "2023-02-01"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # currentYear = self.kwargs['year']
        # currentMonth = self.kwargs['month']
        currentDate = f"{self.kwargs['year']}-{self.kwargs['month']:02d}-01"
        print(currentDate)
        context['jobs'] = Job.objects.filter(job_date=currentDate)
        
        return context


class VendorDetailView(DetailView):
    template_name = "main_app/vendors.html"
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
    template_name = "main_app/jobs.html"
    model = Job

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
            cost = Cost.objects.get(id=invoice_id)
            invoice_file = file_dict.get(invoice_filename, None)
            if invoice_file:
                if invoice_file.size < 10 * 1024 * 1024:
                    try:
                        s3.upload_fileobj(invoice_file, 'bcwc-files', invoice_file.name)
                        cost.invoice_status = 'REC'
                        print(f'{cost.PO_number} processed!')
                        cost.save()
                    except Exception as e:
                        print(e)
                        return HttpResponse('error')
                else:
                    print('that shouldnt go through')
                    return JsonResponse({'error': 'File size must be less than 10 MB'})
            else:
                print('why are we seeing this')
        if settings.DEBUG == False:
            return HttpResponse('upload')
        else:
            print('debuggin')
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
        return HttpResponseRedirect(reverse('main_app:no-invoices'))

    else:
        context = {'costs':costs, 'costs_json':json.dumps(costs_json), 'jobs_json':jobs_json, 'vendor_id':vendor.id}
        print(context)
        return render(request, 'main_app/upload_invoice.html', context)

    # if request.method == 'POST' and request.FILES.getlist('file'):
    #     form = UploadInvoiceForm(request.POST, request.FILES, vendor=vendor)
    #     invoices = request.FILES.getlist('file')
    #     for invoice in invoices:
    #         # Check file extension
    #         ext = os.path.splitext(invoice.name)[1]
    #         if ext.lower() not in ['.pdf', '.jpg']:
    #             form.add_error('invoice', 'Only PDF and JPG files are allowed')
    #         # Check file size
    #         if invoice.size > 10 * 1024 * 1024:
    #             form.add_error('invoice', 'File size must be less than 10 MB')
    #     if form.is_valid():
    #         s3 = boto3.client('s3', 
    #                         # MOVE TO .ENV
    #                         aws_access_key_id='90IAMLVRVJ0TZOP1500D',
    #                         aws_secret_access_key='CmzZRJN065MVos9nKifqGRljDmiolUGCbeL7wrQm',
    #                         endpoint_url='https://bcwc-files.ap-south-1.linodeobjects.com')
    #         for invoice in invoices:
    #             print(invoice)
    #             try:
    #                 s3.upload_fileobj(invoice, 'bcwc-files', invoice.name)
                    
    #             except Exception as e:
    #                 print(e)
    #                 return HttpResponse('error')

    #             cost = Cost.objects.get(id=form.cleaned_data['cost'].id)
    #             cost.invoice_status = 'REC'
    #             cost.save()

    #         return HttpResponseRedirect(reverse('main_app:upload-invoice-success'))
    #     else:
    #         print(form.errors)
    # else:
    #     form = UploadInvoiceForm(vendor=vendor)
    # return render(request, 'main_app/upload_invoice.html', {'form':form, 'costs':costs})

# def upload_invoice(request, vendor_id):
#     vendor = Vendor.objects.get(id=vendor_id)
#     costs = Cost.objects.filter(vendor_id=vendor.id, invoice_status='REQ')
#     UploadInvoiceFormset = formset_factory(UploadInvoiceForm, extra=0 ) 
#     for cost in costs:
#         print(cost)
#     print(len(costs))
#     if len(costs) == 0:
#         return HttpResponseRedirect(reverse('main_app:no-invoices'))

#     print(request.FILES.getlist('invoice'))
#     if request.method == 'POST' and request.FILES.getlist('invoice'):
#         formset = UploadInvoiceFormset(request.POST, request.FILES, form_kwargs={'vendor': vendor})
#         for form in formset:
#             invoice = request.FILES['invoice']
#             # Check file extension
#             ext = os.path.splitext(invoice.name)[1]
#             if ext.lower() not in ['.pdf', '.jpg']:
#                 formset.add_error('invoice', 'Only PDF and JPG files are allowed')
#             # Check file size
#             if invoice.size > 10 * 1024 * 1024:
#                 formset.add_error('invoice', 'File size must be less than 10 MB')
#         if formset.is_valid():
#             s3 = boto3.client('s3', 
#                             # MOVE TO .ENV
#                             aws_access_key_id='90IAMLVRVJ0TZOP1500D',
#                             aws_secret_access_key='CmzZRJN065MVos9nKifqGRljDmiolUGCbeL7wrQm',
#                             endpoint_url='https://bcwc-files.ap-south-1.linodeobjects.com')
#             for invoice in invoices:
#                 print(invoice)
#                 try:
#                     s3.upload_fileobj(invoice, 'bcwc-files', invoice.name)
#                 except Exception as e:
#                     print(formset.add_error(e))
#                     return HttpResponse('error')

#                 cost = Cost.objects.get(id=form.cleaned_data['cost'].id)
#                 cost.invoice_status = 'REC'
#                 cost.save()

#             return HttpResponseRedirect(reverse('main_app:upload-invoice-success'))
#         else:
#             print(formset.errors)
#     else:
#         formset = UploadInvoiceFormset(form_kwargs={'vendor': vendor}, initial=[
#             {
#             'cost_id': cost.id,
#             'cost_name': f'{cost.description}, {cost.job.job_name}, {cost.currency}{cost.amount}'} 
#             for cost in costs
#             ])

#     return render(request, 'main_app/upload_invoice.html', {'formset':formset})

def upload_invoice_success(request):
    html = "<html>Upload successful</html>"
    return HttpResponse(html)

def invoice_error(request):
    return render(request, 'main_app/no_invoices.html')

def InvoicesView(request):
    template_name = "main_app/request_invoices.html"
    costs_READY_REQ = Cost.objects.filter(invoice_status__in=['READY','REQ'])
    costs_REC = Cost.objects.filter(invoice_status__in=['REC',])

    def get_files():
        pathname = "/Users/joeconnor_bcwc/Black Cat White Cat Dropbox/Joe Connor/FINANCIAL_Test"
        allFiles = os.listdir(pathname+'/test_dir')
        allVisibleFiles = [file for file in allFiles if file.startswith('.') == False]
        return allVisibleFiles

    def check_for_received_invoices():
        for file in get_files():
            for cost in costs_READY_REQ:
                if cost.job.job_code in file:
                    print(cost.job.job_code)
                    cost.invoice_status = 'REC'
                    cost.save()
                else:
                    print('no match')

    def check_for_missing_invoices():
        missing = []
        for cost in costs_REC:
            missing.append(cost)
            print(f'{cost} appended to missing')
            for file in get_files():
                if cost.job.job_code in file:
                    missing.remove(cost)
                    print(f'{cost} removed from missing')
        for cost in missing:
            cost.invoice_status = 'REQ'
            cost.save()

            # for file in get_files():
            #   if cost.job.job_code in get_files():
            #       print(f'match: {cost.job.job_code}')
            #   else:
            #       print('no match')

    check_for_received_invoices()
    check_for_missing_invoices()

    for cost in costs_READY_REQ:
        print (f'READY or REQ: {cost} - {cost.invoice_status}')
    for cost in costs_REC:
        print (f'REC: {cost} - {cost.invoice_status}')

    context = {
        'files': get_files(),
        'costs_READY_REQ': costs_READY_REQ,
        'costs_REC' : costs_REC,
        }

    return render(request, template_name, context)

def RequestVendorInvoices(request):

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
        recipient_list=[test_recipient_list]
        costs = Cost.objects.filter(invoice_status='READY', vendor__full_name=vendor.full_name)
        subject = f'BCWC invoice request - {calendar.month_abbr[monthNum]}'
        from_email=None

        # creates rich text and plaintext versions to be sent; rich text will be read by default
        html_message = render_to_string("main_app/invoice_request_template.html", context={'vendor_first_name':vendor_first_name, 'vendor':vendor, 'costs':costs})
        with open(settings.TEMPLATE_DIR / "main_app/invoice_request_template.html") as f:
            message = strip_tags(f.read())
        
        send_mail(subject, message, from_email, recipient_list, fail_silently=False, html_message=html_message)
        # message.attach_alternative(html_template, "text/html")
        costCount += len(costs)
        vendorCount += 1
        for cost in costs:
            cost.invoice_status = 'REQ'
            cost.save()

    messages.success(request, f'{costCount} invoices were requested from {vendorCount} vendors!')
    
    return redirect("main_app:invoice-request-page")

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
        expectedGrossRevenue = sum([job.budget for job in scope])
        actualGrossRevenue = sum([job.budget for job in scope if job.status in ['FINISHED','ARCHIVABLE','ARCHIVED']])

        for job in scope:
            # Return date in format YYYY-MM
            date_MY = str(job.job_date)[:-3]
            data = [job.client, job.job_name, job.job_code, job.budget, job.total_cost, job.job_type, date_MY]
            writer.writerow(data)
        writer.writerow('')
        writer.writerow(['','','','','','','','総収入(予想)', expectedGrossRevenue])
        writer.writerow(['','','','','','','','総収入(実際)', actualGrossRevenue])
        # writer.writerow(['','','','','','','','総収入', grossRevenue])
    
    return response

def importClients(request):
    with open('static/main_app/clients.csv', 'r') as myFile:
        template_name = "main_app/client_form.html"
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

    return redirect('main_app:client-add')

def importJobs(request):
    myFile = open('static/main_app/jobs.csv', 'r')
    template_name = "main_app/pipeline.html"
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
        budget = column[8]
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
                budget = budget,
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
    return redirect('main_app:pipeline')

def importVendors(request):
    myFile = open('static/main_app/jobs.csv', 'r')
    template_name = "main_app/pipeline.html"
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
        budget = column[8]
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
                budget = budget,
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
        # for item in itemNotCreated:
        #   messages.info(request, item)

    myFile.close()
    return redirect('main_app:pipeline')

def CostDeleteView(request, cost_id):
    cost = Cost.objects.get(id=cost_id)
    job_id = cost.job.id
    cost.delete()
    return redirect('main_app:cost-add', job_id)

def VendorRemoveFromJob(request, pk, job_id):
    model = Vendor
    job = Job.objects.get(id=job_id)
    vendor = Vendor.objects.get(id=pk)
    job.vendors.remove(vendor)
    job.save()
    return redirect('main_app:cost-add', job_id)

class CostCreateView(SuccessMessageMixin, SingleTableMixin, CreateView):
    model = Cost
    fields = ['vendor','description','amount','currency','invoice_status','notes']
    template_name = "main_app/cost_form.html"
    table_class = CostTable
    simple_add_vendor_form = AddVendorToCostForm
    cost_form = CostForm
    update_vendor_form = UpdateCostForm

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        self.object=None
        currentJob = Job.objects.get(pk=self.kwargs['pk'])
        context['currentJob'] = currentJob
        context['table'] = self.table_class(currentJob.cost_rel.all())
        context['simple_add_vendor_form'] = self.simple_add_vendor_form()
        context['update_vendor_form'] = self.update_vendor_form()
        context['cost_form'] = self.cost_form()
        context['vendors'] = Vendor.objects.filter(jobs_rel = currentJob)
        return context

    def post(self, request, *args, **kwargs):
        self.object = None
        context = self.get_context_data(**kwargs)
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
                print('shit!')
                print(form.errors)

        elif 'update-cost-vendor' in request.POST:
            currentJob = Job.objects.get(pk=self.kwargs['pk'])
            table = self.table_class(currentJob.cost_rel.all())
            forms = []
            print(request.POST)
            print(f"table data: {table.data}")
            for i, cost in enumerate(table.data):
                form = self.update_vendor_form(request.POST, prefix=cost.pk)
                # print(i, form)
                if form.is_valid():
                    cost.vendor = form.cleaned_data['vendor']
                    cost.invoice_status = form.cleaned_data['invoice_status']
                    cost.save()
                else:
                    print(f"{cost.id} went down to the bottom else")
                    for form in forms:
                        print(f'{cost.id}: {form.non_field_errors}')
                        print(f'{cost.id}: {form.errors}')
                forms.append(form)

            return redirect('main_app:cost-add', pk=self.kwargs['pk'])
        
        return render(request, self.template_name, self.get_context_data(**kwargs))

class CostUpdateView(UpdateView):
    model = Cost
    fields = ['vendor','description','amount','currency','invoice_status','notes']
    template_name_suffix = '_update_form'
    def get_success_url(self):
        return reverse_lazy('main_app:cost-add', kwargs={'pk': self.object.job.id})

class JobUpdateView(UpdateView):
    model = Job
    fields = ['job_name','client','job_type','budget','personInCharge','status','month','year','notes']
    template_name_suffix = '_update_form'
    def get_success_url(self):
        return reverse_lazy('main_app:pipeline')

class JobDeleteView(DeleteView):
    model = Job
    success_url = reverse_lazy('main_app:pipeline')

class ClientCreateView(SuccessMessageMixin, CreateView):
    model = Client
    fields = ["friendly_name", "job_code_prefix", "proper_name", "name_japanese", "proper_name_japanese", "paymentTerm", "notes"]

    success_message = "Client added!"
    def get_success_url(self):
        return reverse_lazy('main_app:client-add')

class ClientListView(ListView):
    model = Client

class VendorListView(ListView):
    model = Vendor

class VendorCreateView(SuccessMessageMixin, CreateView):
    model = Vendor
    fields = "__all__"

    success_message = "Vendor added!"
    def get_success_url(self):
        return reverse_lazy('main_app:vendor-add')