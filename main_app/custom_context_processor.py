from datetime import date

def get_year_month(request):

    year = request.GET.get('year', date.today().year)
    month = request.GET.get('month', date.today().month)
    return {
       'year': year,
       'month': month
    }