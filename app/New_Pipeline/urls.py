"""New_Pipeline URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from pipeline import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('pipeline/', include('pipeline.urls', namespace='pipeline')),
    path("accounts/", include("django.contrib.auth.urls")),
    path("invoice-uploader/<vendor_uuid>", views.invoice_upload_view, name="upload-invoice"),
    path("invoice-uploader/thanks/", views.upload_invoice_success_landing_page, name="upload-thanks"),
    path("invoice-uploader/send-email/", views.upload_invoice_confirmation_email, name="upload-confirmation-email"),
    path('', views.index, name='index'),
]