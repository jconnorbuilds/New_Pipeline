# Generated by Django 4.1 on 2023-04-09 07:22

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main_app', '0006_rename_budget_job_revenue'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cost',
            name='currency',
            field=models.CharField(choices=[('JPY', 'JPY ¥'), ('USD', 'USD $'), ('CAD', 'CAD $'), ('AUD', 'AUD $'), ('EUR', 'EUR €'), ('GBP', 'GBP £')], default='¥', max_length=10),
        ),
    ]