from .currencies import currencies
from django.conf import settings
from django.core.cache import cache

import requests

def forExRate(source_currency):
    print('forExRate is running')
    '''
    Calculates the foreign exchange rate via Wise's API
    '''
    # Set the endpoint URL for Wise's rates API'
    url = 'https://api.wise.com/v1/rates/'
    target_currency = 'JPY'
    
    # Set the API headers with API key and specify the response format as JSON
    headers = {
        'Authorization': f'Bearer {settings.WISE_API_KEY}',
        'Content-Type': 'application/json'
    }
    params = {
        'source': source_currency,
        'target': target_currency
    }
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        # print(response.json()[0].get('rate'))
        # print(response.json()[0].get('time'))
        return response.json()[0].get('rate')
    else:
        # return JsonResponse({'error':'Failed to retrieve exchange rate from Wise API.'})
        # make approximation and add warning message
        return 1
    
def get_forex_rates():
    try:
        forex_rates_dict = cache.get('forex_rates')
        print("got the forex cache")
    except Exception as e:
        print("Couldn't get the cached dict")
        print(e)

    if not forex_rates_dict or forex_rates_dict.get("USD") == 1:
        try:
            forex_rates_dict = {}
            for currency in currencies:
                forex_rates_dict[currency[0]] = forExRate(currency[0])
            
            cache.set('forex_rates', forex_rates_dict, timeout=600)
            print("set the forex cache")

        except Exception as e:
            print(e)
            for currency in currencies:
                forex_rates_dict[currency[0]] = 1

    return forex_rates_dict