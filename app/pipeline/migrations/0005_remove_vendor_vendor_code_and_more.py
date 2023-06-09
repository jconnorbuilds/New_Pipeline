# Generated by Django 4.2.1 on 2023-05-23 12:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pipeline', '0004_alter_cost_currency'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='vendor',
            name='vendor_code',
        ),
        migrations.RemoveField(
            model_name='vendor',
            name='vendor_code_prefix',
        ),
        migrations.AddField(
            model_name='vendor',
            name='vendor_code_letters',
            field=models.CharField(max_length=4, null=True, unique=True),
        ),
    ]