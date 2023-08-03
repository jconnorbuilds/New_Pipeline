from django.contrib import admin
from .models import Job, Vendor, Client, Cost
# Register your models here.

# @admin.display(description="Job Date")
# def job_date(obj):
#     return f"{obj.year}年 {obj.month}月"

class JobAdmin(admin.ModelAdmin):
    list_display = ["job_name", "job_code", "job_date", "created_at", "updated_at", "isDeleted"]
    readonly_fields = ("created_at", "updated_at")

admin.site.register(Job, JobAdmin)
admin.site.register(Vendor)
admin.site.register(Client)
admin.site.register(Cost)


    
