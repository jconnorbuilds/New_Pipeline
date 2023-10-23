from .currencies import currencies
from django.conf import settings
from django.contrib import messages
from django.core.cache import cache
from django.db import IntegrityError
from django.http import JsonResponse
from django.shortcuts import redirect
from django.template.loader import render_to_string

import requests


def get_forex_rates():
    print("forExRate is running")
    """
    Calculates the foreign exchange rate via Wise's API
    """

    def create_cache_forex_dict(forex_rates_json):
        target_currency = "JPY"
        currencies_subset = [currency[0] for currency in currencies]
        forex_rates = {
            obj["source"]: obj["rate"]
            for obj in forex_rates_json
            if obj["source"] in currencies_subset and obj["target"] == target_currency
        } | {target_currency: 1}
        cache.set("forex_rates", forex_rates, timeout=120)
        print("RATES: ", forex_rates)
        return forex_rates

    forex_rates = cache.get("forex_rates", None)
    if forex_rates:
        return forex_rates
    else:
        url = "https://api.wise.com/v1/rates/"
        headers = {
            "Authorization": f"Bearer {settings.WISE_API_KEY}",
        }
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                forex_rates = create_cache_forex_dict(response.json())
            else:
                print(f"{response.status_code=}\n{response.errors=}")
                for currency in currencies:
                    forex_rates[currency[0]] = 1
        except Exception as e:
            print(f"{e=}")
            # TODO: implement logging
            forex_rates = {}
            for currency in currencies:
                forex_rates[currency[0]] = 1

    return forex_rates


def getClient(client_code):
    from .models import Client

    if Client.objects.filter(job_code_prefix=client_code).exists():
        return Client.objects.get(job_code_prefix=client_code)
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
        "select": job.id,
        "id": job.id,
        "client_name": job.client.friendly_name,
        "client_id": job.client.id,
        "job_name": job.job_name,
        "job_code": job.job_code,
        "revenue": job.revenue_incl_tax,
        "total_cost": job.total_cost,
        "profit_rate": job.profit_rate,
        "job_date": job.job_date,
        "job_type": job.get_job_type_display(),
        "status": job.status,
        "deposit_date": job.deposit_date,
        "invoice_info_completed": "",
        "invoice_name": job.invoice_name,
        "invoice_month": job.invoice_month,
        "invoice_year": job.invoice_year,
        "job_status_choices": Job.STATUS_CHOICES,
        "invoice_name": job.invoice_name,
        "all_invoices_paid": job.allVendorInvoicesPaid,
    }
    return response


def get_invoice_status_data(job):
    response = {
        "all_invoices_requested": job.allVendorInvoicesRequested,
        "all_invoices_received": job.allVendorInvoicesReceived,
        "all_invoices_paid": job.allVendorInvoicesPaid,
    }
    return response


def get_invoice_data(cost, forex_rates, vendors=None):
    from .models import Cost

    response = {
        "id": cost.id,
        "job_id": cost.job.id,
        "amount_JPY": round(cost.amount * forex_rates[cost.currency])
        if cost.invoice_status not in ["PAID"]
        else round(cost.amount * cost.locked_exchange_rate),
        "amount": cost.amount,
        "currency": cost.currency,
        "job_date": cost.job.job_date,
        "job_name": cost.job.job_name,
        "job_code": cost.job.job_code,
        "vendor_name": cost.vendor.familiar_name if cost.vendor else "",
        "vendor_code": cost.vendor.vendor_code if cost.vendor else "",
        "vendor_id": cost.vendor.id if cost.vendor else "0",
        "description": cost.description,
        "PO_number": cost.PO_number,
        "invoice_status": cost.invoice_status,
        "invoice_status_choices": Cost.INVOICE_STATUS_CHOICES,
        "vendors_dict": {vendor.id: vendor.familiar_name for vendor in vendors}
        if vendors
        else None,
    }
    return response


def process_imported_jobs(csv_file):
    from .models import Job

    errors = {}
    success_created = []
    success_not_created = []
    cant_update = {}
    valid_template = True

    response = {
        "valid_template": valid_template,
        "error": errors,
        "success_created": success_created,
        "success_not_created": success_not_created,
        "cant_update": cant_update,
    }
    f = csv_file.read().decode("utf-8").splitlines()
    for i, line in enumerate(f):
        row = line.split(",")
        if i == 0:
            if row[0] != "job_name":
                valid_template = False
                errors[
                    "TEMPLATE ERROR"
                ] = """
                    Invalid template. To import jobs, please use the Job Import template. 

                    """
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
                    j, created = Job.objects.update_or_create(
                        job_name=job_name.strip(),
                        client=client,
                        job_code=job_code.strip(),
                        job_code_isFixed=job_code_isFixed.strip(),
                        invoice_name=invoice_name.strip(),
                        # TODO: This is a bad solution. Make this cleaner, easier to use
                        invoice_recipient=getInvoiceRecipient(
                            client, invoice_recipient
                        ),
                        isArchived=isArchived.strip(),
                        year=year.strip(),
                        month=month.strip(),
                        job_type=job_type.strip(),
                        revenue=int(revenue),
                        add_consumption_tax=add_consumption_tax.strip(),
                        personInCharge=personInCharge.strip(),
                        status=status.strip(),
                    )
                    j.save()
                    if created:
                        success_created.append(j.job_name)
                    elif not created:
                        success_not_created.append(j.job_name)

                except IntegrityError as e:
                    if Job.objects.filter(job_code=job_code.strip()).exists():
                        errors[
                            f"{job_code}"
                        ] = "A job with that job code already exists, but differs from the info in the uploaded file. Support for updating via bulk upload coming soon."
                    else:
                        errors[f"{job_code}"] = e
                    print("integrityerror", e)
                except NameError as n:
                    errors[f"{job_code}"] = n
                    print("nameerror", n)
                except Exception as e:
                    errors[f"{job_code}"] = e
                    print("otherexception", e)
            else:
                errors[
                    "DATA ERROR"
                ] = f'Could not parse the client "{client_code}". Make sure this client exists and that the code is being used in the import template.'

            # for item in not_created_items:
            #   messages.info(request, item)
    return response
