# Generated by Django 4.2.9 on 2025-01-17 08:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pipeline', '0010_alter_job_invoice_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='cost',
            name='invoice_received_date',
            field=models.DateTimeField(null=True),
        ),
        migrations.AlterField(
            model_name='cost',
            name='invoice_status',
            field=models.CharField(choices=[('NR', 'Not requested'), ('REQ', 'Requested'), ('REC', 'Received via upload'), ('REC2', 'Received (direct PDF/paper)'), ('AT', 'Needs attention'), ('ERR', 'Error on upload'), ('QUE', 'Queued for payment'), ('PAID', 'Paid'), ('NA', 'No Invoice')], default='NR', max_length=50),
        ),
        migrations.AlterField(
            model_name='job',
            name='vendors',
            field=models.ManyToManyField(blank=True, related_name='jobs_with_vendor', to='pipeline.vendor', verbose_name='vendors involved'),
        ),
        migrations.AlterField(
            model_name='vendor',
            name='jobs',
            field=models.ManyToManyField(blank=True, to='pipeline.job'),
        ),
    ]
