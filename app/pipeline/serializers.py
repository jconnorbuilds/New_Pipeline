from rest_framework import serializers

from .models import Vendor, Job


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = '__all__'


class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = '__all__'


# class PipelineTableSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Job
#         fields = ['select', 'id', 'client_name', client_id]
