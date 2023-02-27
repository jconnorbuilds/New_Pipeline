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
		return f"{value.name}"

	edit = tables.TemplateColumn(verbose_name='',template_name="main_app/tables_jobs_edit_column.html")

	total_cost = tables.Column(orderable=False, linkify=('main_app:cost-add', {'pk':tables.A("pk")}))
	profit_rate = tables.Column(orderable=False)
	job_name = tables.Column(linkify=True)
	select = tables.CheckBoxColumn(accessor='pk', attrs={"input":{"class":"form-check-input"}})

	# Doesn't work, cannot resolve keyword 'job_code' into field.
	# def order_total_cost(self, queryset, is_descending):
	# 	queryset = queryset.annotate(
	# 		total_cost = sum([cost.amount for cost in Cost.objects.filter(job__job_code = F("job_code"))])
	# 		).order_by(("-" if is_descending else "") + "total_cost")
	# 	return (queryset, True)

	class Meta:
		model = Job
		order_by = 'year','month','client__name'
		template_name = "django_tables2/bootstrap5.html"
		fields = ("select", "client", "job_name", "job_code", "budget", "total_cost", "profit_rate", "job_date", "job_type","status", "edit")

class CostTable(tables.Table):
	edit = tables.TemplateColumn(verbose_name='', template_name="main_app/tables_costsheet_edit_column.html")
	# job = tables.Column(accessor='job.job_name')
	vendor = tables.Column(empty_values=(), verbose_name='Vendor', order_by=('vendor',),)

	def render_vendor(self, value, record):
		form = UpdateCostForm(initial={'vendor':value or None, 'cost':record}, prefix=record.pk)
		print(f'form.as_p ran for {record.pk}')
		return form.as_p()

	def __init__(self, *args, **kwargs):
			super().__init__(*args, **kwargs)
			self.prefix = f"{id(self)}"

	class Meta:
		model = Cost
		order_by = 'vendor_initials'
		# template_name = "django_tables2/bootstrap5.html"
		fields = ("vendor", "description", "amount", "invoice", "PO_number", "edit")