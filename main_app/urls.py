from django.urls import path, include
from main_app import views
from .models import Job

# Template tag
app_name = 'main_app'

urlpatterns = [
	path('', views.pipelineView.as_view(model=Job), name="pipeline"),
	path('pipeline/<int:year>/<int:month>/', views.pipelineMonthView.as_view(), name="pipeline-by-month"),
	# path('costsheet/<str:job_code>/', views.costsheetView.as_view(), name="costsheet"),
	path('cost-add/<pk>/', views.CostCreateView.as_view(), name="cost-add"),
	path('<cost_id>/delete-cost/', views.CostDeleteView, name="cost-delete"),
	path('<pk>/update-cost/', views.CostUpdateView.as_view(), name="cost-update"),
	path('<pk>/delete-job/', views.JobDeleteView.as_view(), name="job-delete"),
	path('<pk>/update-job/', views.JobUpdateView.as_view(), name="job-update"),
	path('<pk>/job-detail/', views.JobDetailView.as_view(), name="job-detail"),
	path('export/', views.CSV_Write, name="csv-write"),
	path('import-client/', views.importClients, name="import-client"),
	path('import-job/', views.importJobs, name="import-job"),
	path('import-vendor/', views.importVendors, name="import-vendor"),
	path('invoice-request/', views.InvoicesView, name="invoice-request-page"),
	path('invoice-request-submit/', views.RequestVendorInvoices, name="invoice-request-send"),
	path('add-client/', views.ClientCreateView.as_view(), name="client-add"),
	path('client-list/', views.ClientListView.as_view(), name="client-list"),
	path('vendors/<pk>', views.VendorDetailView.as_view(), name="vendors-detail"),
	path('add-vendor/', views.VendorCreateView.as_view(), name="vendor-add"),
	path('vendor-list/', views.VendorListView.as_view(), name="vendor-list"),
]

