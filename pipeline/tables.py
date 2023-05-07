import django_tables2 as tables
from django_tables2 import A
from .models import Job, Cost, Vendor
from .forms import UpdateCostForm
from django.utils.html import format_html
from django.db.models import F
import calendar

class JobTable(tables.Table):
	def render_budget(self, value):
		return f"¥{value:,}"

	def render_profit_rate(self, value):
		return f"{value}%"

	def render_job_date(self, value, record):
		return f"{calendar.month_abbr[value.month]} {value.year}"

	def render_total_cost(self, value):
		return f"¥{value:,}"

	def render_client(self, value):
		return f"{value.friendly_name}"

	edit = tables.TemplateColumn(verbose_name='',template_name="main_app/tables_jobs_edit_column.html")

	total_cost = tables.Column(orderable=False, linkify=('pipeline:cost-add', {'pk':tables.A("pk")}),attrs={"td":{"style":"text-align:right;", "class":"px-3"},"th":{"style":"text-align:right;", "class":"px-3"}})
	budget = tables.Column(attrs={"td":{"style":"text-align:right;", "class":"px-3"},"th":{"style":"text-align:right;","class":"px-3"}})
	job_code = tables.Column(attrs={"td":{"class":"px-3", "width":"100px"},"th":{"class":"px-3"}})
	profit_rate = tables.Column(orderable=False)
	job_name = tables.Column(linkify=True,attrs={"td":{"width":"auto"}})
	select = tables.CheckBoxColumn(accessor='pk', attrs={"input":{"class":"form-check-input"}})

	# Doesn't work, cannot resolve keyword 'job_code' into field.
	# def order_total_cost(self, queryset, is_descending):
	# 	queryset = queryset.annotate(
	# 		total_cost = sum([cost.amount for cost in Cost.objects.filter(job__job_code = F("job_code"))])
	# 		).order_by(("-" if is_descending else "") + "total_cost")
	# 	return (queryset, True)

	class Meta:
		model = Job
		order_by = '-job_date','client__job_code'
		template_name = "django_tables2/bootstrap5-responsive.html"
		fields = ("select", "client","job_name","job_code", "budget", "total_cost", "profit_rate", "job_date", "job_type","status", "edit")

class CostTable(tables.Table):
	edit = tables.TemplateColumn(verbose_name='', template_name="main_app/tables_costsheet_edit_column.html")
	vendor = tables.Column(empty_values=(), verbose_name='Vendor', order_by=('vendor',),attrs={"td":{"width":"250px"}})
	invoice_status = tables.Column(empty_values=(), verbose_name='Invoice Status', order_by=('invoice_status',), attrs={"td":{"width":"auto"}},)
	amount = tables.Column(attrs={"td":{"style":"text-align:right;","width":"120px","class":"px-5"},"th":{"style":"text-align:right;", "class":"px-5"}})

	def render_vendor(self, value, record):
		form = UpdateCostForm(initial={'vendor':value or None, 'cost':record}, prefix=record.pk)
		vendor_html = form['vendor'].as_widget()
		cost_html = form['cost'].as_hidden()
		return format_html('{}\n{}',vendor_html, cost_html)

	def render_invoice_status(self, value, record):
		form = UpdateCostForm(initial={'invoice_status':record.invoice_status or None}, prefix=record.pk)
		return form['invoice_status'].as_widget()

	def render_amount(self, value):
		return f'¥{value:,}'

	def __init__(self, *args, **kwargs):
		# job_instance = kwargs.pop('job_instance')
		super().__init__(*args, **kwargs)
		self.prefix = f"{id(self)}"
		
	class Meta:
		model = Cost
		order_by = 'vendor_initials'
		fields = ("amount","vendor", "description", "PO_number", "invoice_status", "edit")
		row_attrs = {
		            "class": "align-middle"
		        }