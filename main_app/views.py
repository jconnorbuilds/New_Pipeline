from django.shortcuts import render, redirect
from django.db import IntegrityError
from django.urls import reverse, reverse_lazy
from django import forms
from django.forms import formset_factory, modelformset_factory, Textarea
from .models import Job, Vendor, Cost, Client
from .forms import CostForm, JobForm, PipelineCSVExportForm, JobFilter, PipelineBulkActionsForm, AddVendorToCostForm, UpdateCostForm, UploadInvoiceForm, ClientForm
from .tables import JobTable, CostTable
from django.views.generic import TemplateView, ListView, DetailView, DeleteView, UpdateView, CreateView
from django.views import View
from django_filters.views import FilterView
from django.views.generic.dates import MonthMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.http import HttpResponseRedirect, HttpResponse
from django_tables2 import SingleTableView
from django.core.mail import send_mail, send_mass_mail
from django.template.loader import get_template, render_to_string
from django.utils.html import strip_tags
from django.utils import timezone
from django.conf import settings
from django.contrib import messages
import django_tables2 as tables
from django_tables2.views import SingleTableMixin
from datetime import date
import os
import calendar
import unicodedata
import csv

# Create your views here.
def index(request):
    return render(request, 'main_app/index.html')

class pipelineView(SingleTableMixin, SuccessMessageMixin, FilterView):
    model = Job
    table_class = JobTable
    csv_export_form = PipelineCSVExportForm
    form_class = JobForm
    client_form_class = ClientForm
    bulk_actions = PipelineBulkActionsForm
    filterset_class = JobFilter
    template_name = "main_app/pipeline.html"
    table_pagination = False

    # def get_queryset(self):
    #         queryset = super().get_queryset()
    #         queryset = Job.objects.all()
    #         print(len(queryset))
    #         return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        client_id = self.request.GET.get('client_id')
        print(client_id)
        context['job_form'] = JobForm(initial={'client': client_id})
        context['client_form'] = self.client_form_class
        context['csv_export_form'] = self.csv_export_form
        context['filter'] = JobFilter
        context['bulk_actions'] = self.bulk_actions

        return context

    def post(self, request, *args, **kwargs):
        if 'addjob' in request.POST:
            print(f'post request contents for successful addjob {request.POST}')
            print('ajax request got here!')
            job_form = self.form_class(request.POST)
            print(request.POST)
            if job_form.is_valid():
                # Take in the budget in terms of 万
                job_form.instance.budget = job_form.instance.budget * 10000
                print(f'{job_form.instance.month},{job_form.instance.year}')
                instance = job_form.save()
                print(instance.job_date)
                success_message="Job added!"
            else:
                errors = {}
                for field, error in job_form.errors.items():
                    errors[field] = error[0]
                for error in errors:
                    print(f'error: {error}')


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
                    ß
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

        elif 'new-client' in request.POST:
            form = self.client_form_class(request.POST)
            if form.is_valid():
                instance = form.save()
                return redirect(reverse("main_app:pipeline") +f"?client_id={instance.id}")
            else:
                print("client add didn't work")
                print(form.errors)

        else:
            print(f'post request contents: {request.POST}')

        self.object_list = self.get_queryset()
        return render(request, self.template_name, self.get_context_data())


class pipelineMonthView(SingleTableMixin, MonthMixin, ListView):
    model = Job
    table_class = JobTable
    form_class = JobForm
    bulk_actions = PipelineBulkActionsForm
    template_name = "main_app/pipeline_by_month.html"
    month_format = "%m"
    # month = "2023-02-01"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['job_form'] = self.form_class
        context['bulk_actions'] = self.bulk_actions
        context['year'] = 2099
        context['month'] = 2
        return context

    def get_queryset(self):
        queryset = super().get_queryset()
        print(f'the result of self.get_month: {self.get_month()}')
        queryset = queryset.filter()
        return queryset

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

def handle_uploaded_file(f):
    file_dir = f"invoices/Financial_TEST/{date.today().year}_{date.today().month}"
    # file_dir = f"/Users/joeconnor_bcwc/Desktop/FINANCIAL_Test/{date.today().year}_{date.today().month}"
    try:
        if not os.path.exists(file_dir):
            os.makedirs(file_dir)
        file_path = os.path.join(file_dir, f.name)
        with open(file_path, 'wb+') as destination:
            # Write the contents of the uploaded file to the new file
            for chunk in f.chunks():
                destination.write(chunk)
                print(f'{file_path}')
        return file_path
    except:
        print('it looks like the filepath is configured incorrectly')

def UploadInvoiceView(request):
    if request.method == 'POST':
        form = UploadInvoiceForm(request.POST, request.FILES)
        if form.is_valid():
            for file in request.FILES.getlist('file'):
                print(file)
                handle_uploaded_file(file)
            return HttpResponseRedirect(reverse('main_app:invoice-upload-success'))
        else:
            print(form.errors)
    else:
        form = UploadInvoiceForm()
    return render(request, 'main_app/invoice_upload.html', {'form': form})

def UploadSuccessView(request):
    html = "<html>Upload successful</html>"
    return HttpResponse(html)

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
        html_message = render_to_string("main_app/invoice_request_template.html", context={'vendor_first_name':vendor_first_name, 'costs':costs})
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
                name = column[0]
                job_code_prefix = column[1]
                proper_name = column[2]
                proper_name_japanese = column[3]
                notes = column[4]
                if Client.objects.filter(name__iexact=name).exists():
                    itemNotCreated.append(f'{column[0]} - {column[1]}')
                    continue
                else:
                    try:
                        # These lines were importing with invisble spaces, so
                        # I used .strip() import them without the spaces
                        temp,created = Client.objects.get_or_create(
                                name = name.strip(),
                                job_code_prefix = job_code_prefix.strip(),
                                proper_name = proper_name.strip(),
                                proper_name_japanese = proper_name_japanese.strip(),
                                notes = notes.strip(),
                                )
                        temp.save()
                        if created:
                            itemCreated.append(f'{name} - {job_code_prefix}')
                        elif not created:
                            itemNotCreated.append(f'{name} - {job_code_prefix}')
                        # elif not created:
                        #   itemUpdated.append(f'{name} - {job_code_prefix}')
                        # else:
                        #   messages.warning.append(f'{name} - {job_code_prefix} !!! SOMETHING ELSE HAPPENED')

                    except IntegrityError as e:
                        print(f'{name} - {job_code_prefix}: {e}')
                        messages.error(request, f"{name} - {job_code_prefix} wasn't added.\n{e}")
                    except NameError as n:
                        print(f'{name} - {job_code_prefix}: {n}')
                        messages.error(request, f"{name} - {job_code_prefix} wasn't added.\n{e}")
                    except Exception as e:
                        messages.error(request, f"{name} - {job_code_prefix} wasn't added - something bad happened! \n{e}")
            
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
        elif Client.objects.filter(name__iexact=client).exists():
            return Client.objects.get(name__iexact=client)
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
        elif Client.objects.filter(name__iexact=client).exists():
            return Client.objects.get(name__iexact=client)
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