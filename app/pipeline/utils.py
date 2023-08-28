from .currencies import currencies
from django.conf import settings
from django.contrib import messages
from django.core.cache import cache
from django.db import IntegrityError
from django.http import JsonResponse
from django.shortcuts import redirect
from django.template.loader import render_to_string

import requests

def forExRate(source_currency):
    print('forExRate is running')
    '''
    Calculates the foreign exchange rate via Wise's API
    '''
    url = 'https://api.wise.com/v1/rates/'
    target_currency = 'JPY'
    
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
        # print(response.json()[0].get('rate'))
        # print(response.json()[0].get('time'))
        return response.json()[0].get('rate')
    else:
        # return JsonResponse({'error':'Failed to retrieve exchange rate from Wise API.'})
        # make approximation and add warning message
        return 1
    
def get_forex_rates():
    try:
        forex_rates_dict = cache.get('forex_rates', None)
    except Exception as e:
        print(e)

    if not forex_rates_dict or forex_rates_dict.get("USD") == 1:
        try:
            forex_rates_dict = {}
            for currency in currencies:
                forex_rates_dict[currency[0]] = forExRate(currency[0])
            cache.set('forex_rates', forex_rates_dict, timeout=600)

        except Exception as e:
            print(e)
            for currency in currencies:
                forex_rates_dict[currency[0]] = 1

    return forex_rates_dict

def getClient(client_code):
    from .models import Client
    if Client.objects.filter(job_code_prefix = client_code).exists():
        return Client.objects.get(job_code_prefix = client_code)
    else:
        return False

def getInvoiceRecipient(client, invoice_recipient):
    from .models import Client
    if invoice_recipient:
        return getClient(invoice_recipient)
    else:
        return client
    
def get_job_data(job):
    from .models import Job
    response = {
        'select': render_to_string('pipeline/job_checkbox.html', {"job_id":job.id}),
        'id': job.id,
        'client_name': job.client.friendly_name,
        'client_id': job.client.id,
        'job_name': render_to_string(
            'pipeline/job_name.html', 
            { "job_name":job.job_name, "job_id":job.id }),
        'job_code': job.job_code,
        'revenue': job.revenue_incl_tax,
        'total_cost': render_to_string(
            'pipeline/job_total_cost.html', 
            { "job_id":job.id, "job_total_cost":job.total_cost }),
        'profit_rate': f'{job.profit_rate}%',
        'job_date': job.job_date,
        'job_type': job.get_job_type_display(),
        'status': render_to_string(
            'pipeline/jobs/pipeline_table_job_status_select.html', 
            {"options":Job.STATUS_CHOICES, "currentStatus":job.status}),
        'deposit_date': job.deposit_date,
        'invoice_info_completed': job.invoice_name != '',
    }
    return response

def get_invoice_status_data(job):
    response = {
        "all_invoices_requested":job.allVendorInvoicesRequested,
        "all_invoices_received":job.allVendorInvoicesReceived,
        "all_invoices_paid":job.allVendorInvoicesPaid,
    }
    return response

def process_imported_jobs(csv_file):
    from .models import Job
    errors = {}
    success_created = []
    success_not_created = []
    cant_update = {}
    valid_template = True
    
    response = {"valid_template":valid_template,
        "error":errors,
        "success_created":success_created, 
        "success_not_created":success_not_created,
        "cant_update":cant_update,
        }
    f = csv_file.read().decode('utf-8').splitlines()
    for i,line in enumerate(f):
        row = line.split(',')
        if i == 0:
            if row[0] != "job_name":
                valid_template = False
                errors["TEMPLATE ERROR"] = \
                    '''
                    Invalid template. To import jobs, please use the Job Import template. 
                    You can download it from the 'Get Template' button at the bottom of the page.
                    '''
                print("should return invalid")
                return response
            continue
        if valid_template:
            print(i, "only print if valid")
            job_name = row[0]
            client_code = row[1]
            job_code = row[2]
            job_code_isFixed = row[3]
            invoice_name = row[4]
            invoice_recipient = row[5]
            isArchived = row[6]
            year = row[7]
            month = row[8]
            job_type = row[9]
            revenue = row[10]
            add_consumption_tax = row[11]
            personInCharge = row[12]
            status = row[13]

            client = getClient(client_code.strip())

            if client:
                try:
                    # These lines were importing with invisble spaces, so I used .strip()
                    j,created = Job.objects.update_or_create(
                        job_name = job_name.strip(),
                        client = client,
                        job_code = job_code.strip(),
                        job_code_isFixed = job_code_isFixed.strip(),
                        invoice_name = invoice_name.strip(),
                        invoice_recipient = getInvoiceRecipient(client, invoice_recipient),# TODO: This is a bad solution. Make this cleaner, easier to use
                        isArchived = isArchived.strip(),
                        year = year.strip(),
                        month = month.strip(),
                        job_type = job_type.strip(),
                        revenue = int(revenue),
                        add_consumption_tax = add_consumption_tax.strip(),
                        personInCharge = personInCharge.strip(),
                        status = status.strip()
                    )
                    j.save()
                    if created:
                        success_created.append(j.job_name)
                    elif not created:
                        success_not_created.append(j.job_name)

                except IntegrityError as e:
                    if Job.objects.filter(job_code = job_code.strip()).exists():
                        errors[f'{job_code}'] = "A job with that job code already exists, but differs from the info in the uploaded file. Support for updating via bulk upload coming soon."
                    else:
                        errors[f'{job_code}'] = e
                    print("integrityerror", e)
                except NameError as n:
                    errors[f'{job_code}'] = n
                    print("nameerror", n)
                except Exception as e:
                    errors[f'{job_code}'] = e
                    print("otherexception", e)
            else:
                errors['DATA ERROR'] = f'Could not parse the client "{client_code}". Make sure this client exists and that the code is being used in the import template.'
            
            # for item in not_created_items:
            #   messages.info(request, item)
    return response