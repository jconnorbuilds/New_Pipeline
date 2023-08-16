from django.urls import path, include
from pipeline import views
from .models import Job

# Template tag
app_name = 'pipeline'

urlpatterns = [
	path('', views.pipelineView.as_view(), name="index"),
	path('cost-add/<pk>/', views.CostCreateView.as_view(), name="cost-add"),
    path('cost-data/<job_id>/', views.cost_data, name="cost-data"),
	path('<cost_id>/delete-cost/', views.CostDeleteView, name="cost-delete"),
	path('<pk>/update-cost/', views.CostUpdateView.as_view(), name="cost-update"),
	path('<pk>/delete-job/', views.JobDeleteView.as_view(), name="job-delete"),
	path('<pk>/update-job/', views.JobUpdateView.as_view(), name="job-update"),
	path('<pk>/job-detail/', views.JobDetailView.as_view(), name="job-detail"),
	path('jobs-csv-export/', views.jobs_csv_export, name="jobs-csv-export"),
    path('prepare-batch-payment/', views.create_batch_payment_file, name="prepare-batch-payment"),
	path('import-client/', views.importClients, name="import-client"),
	# path('import-job/', views.import_jobs, name="import-job"),
	path('import-vendor/', views.importVendors, name="import-vendor"),
    path('request-single-invoice/<cost_id>/', views.RequestVendorInvoiceSingle, name="request-single-invoice"),
	path('add-client/', views.ClientCreateView.as_view(), name="client-add"),
	path('client-list/', views.ClientListView.as_view(), name="client-list"),
    path('client-details/<pk>', views.ClientDetailView.as_view(), name="client-details"),
    path('client-update/<pk>', views.ClientUpdateView.as_view(), name="client-update"),
	path('vendors/<pk>', views.VendorDetailView.as_view(), name="vendors-detail"),
	path('add-vendor/', views.VendorCreateView.as_view(), name="vendor-add"),
	path('vendor-list/', views.VendorListView.as_view(), name="vendor-list"),
    path('vendor-list/<pk>', views.VendorListView.as_view(), name="vendor-list-id"),
    path('vendor-update/<pk>', views.VendorUpdateView.as_view(), {"success": None}, name="vendor-update"),
	path('remove-vendor-from-job/<job_id>/<pk>/', views.VendorRemoveFromJob, name="remove-vendor-from-job"),
	path('no-invoices/', views.invoice_error, name="no-invoices"),
	path('process-uploaded-vendor-invoice/', views.process_uploaded_vendor_invoice, name="process-uploaded-vendor-invoice"),
	path('pipeline-data/<int:year>/<int:month>/', views.pipeline_data, name="pipeline-data"),
	path('pipeline-data/', views.pipeline_data, name="pipeline-data"),
    path('revenue-data/<int:year>/<int:month>/', views.revenue_display_data, name="revenue-data"),
	path('revenue-data/', views.revenue_display_data, name="revenue-data"),
    path('invoices/', views.InvoiceView.as_view(), name="invoices"),
    path('all-invoices-data/',views.all_invoices_data, name="all-invoices-data")

]

