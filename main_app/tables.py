import django_tables2 as tables
from .models import Job, Cost
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

	edit = tables.TemplateColumn(verbose_name='',template_name="main_app/edit_column.html")

	total_cost = tables.Column(orderable=False, linkify=('main_app:costsheet', {'job_code':tables.A("job_code")}))
	profit_rate = tables.Column(orderable=False)
	job_name = tables.Column(linkify=True)
	select = tables.CheckBoxColumn(accessor='pk', attrs={"input":{"class":"form-check-input"}})

	# Doesn't work, cannot resolve keyword 'job_code' into field.
	def order_total_cost(self, queryset, is_descending):
		queryset = queryset.annotate(
			total_cost = sum([cost.amount for cost in Cost.objects.filter(job__job_code = F("job_code"))])
			).order_by(("-" if is_descending else "") + "total_cost")
		return (queryset, True)

	class Meta:
		model = Job
		order_by = 'year','month','client__name'
		template_name = "django_tables2/bootstrap5.html"
		fields = ("select", "client", "job_name", "job_code", "budget", "total_cost", "profit_rate", "job_date", "job_type","status", "edit")

class CostTable(tables.Table):
	pass