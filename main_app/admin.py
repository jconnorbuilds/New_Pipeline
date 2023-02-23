from django.contrib import admin
from .models import Job, Vendor, Client, Cost
# Register your models here.

class VendorAdmin(admin.ModelAdmin):
	# prepopulated_fields = {"slug": ("unique_id",)}
	pass
admin.site.register(Job)
admin.site.register(Vendor, VendorAdmin)
admin.site.register(Client)
admin.site.register(Cost)
