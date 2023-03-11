# Generated by Django 3.2.15 on 2023-02-15 05:53

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('main_app', '0010_cost_po_number'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cost',
            name='job',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='cost_rel', to='main_app.job'),
        ),
        migrations.AlterField(
            model_name='job',
            name='budget',
            field=models.IntegerField(),
        ),
        migrations.AlterField(
            model_name='job',
            name='job_date',
            field=models.DateField(default=django.utils.timezone.now),
        ),
        migrations.AlterField(
            model_name='job',
            name='job_name',
            field=models.CharField(max_length=50),
        ),
        migrations.AlterField(
            model_name='job',
            name='job_type',
            field=models.CharField(choices=[('ORIGINAL', 'Original'), ('RENEWAL', 'Renewal'), ('LIBRARY', 'Library'), ('LICENSING', 'Licensing'), ('MISC', 'Misc')], default='Original', max_length=15),
        ),
        migrations.AlterField(
            model_name='job',
            name='personInCharge',
            field=models.CharField(choices=[(None, 'Select PIC'), ('ER', 'Erik Reiff'), ('JC', 'Joe Connor'), ('KD', 'Kenny Dallas'), ('MH', 'Maria Hasegawa'), ('RI', 'Ryu Ishizawa'), ('SM', 'Seiya Matsumiya'), ('TO', 'Timo Otsuki')], max_length=2),
        ),
    ]