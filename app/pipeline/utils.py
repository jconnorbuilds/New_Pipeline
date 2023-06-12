from .currencies import currencies
from django.conf import settings
from django.core.cache import cache

import requests
from typing import Dict, List, Tuple, Union


USD = "USD"

def forExRate(source_currency):
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
    
    
# seems like the django stuff
def get_forex_rates(currencies:List[Tuple[str, str]]=currencies)-> Dict[str, str]:
    
    # my changes assume a get returns {} if there's nothing cached. 
    # I would pass in currencies just to be clear as to how the variable scope relates to the module variables
    # ideally this kind of utils function supports a composition pattern without depending on the separate currencies module
    
    # in a larger / shared codebase i would even go so far as to pass in forex_rates, and
    # get rid of the below line, because you may want to abstract the getting of the forex_rates from the
    # logic application
    # this would allow you to use something like https://www.educative.io/answers/what-is-the-cache-decorator-in-functools-module-in-python
    forex_rates = cache.get('forex_rates')
     
    # TODO: Oliver - is it possible at all to reduce this check to one?
    if not forex_rates or forex_rates[USD] == 1:
        # I would use this syntax for instantiated dictionaries where possible. Seems like cache is a special Django object.
        # I think what you're doing here is getting forex rates, and 
        # - if none are cached, or if some are, but the USD value equals 1, build them
        # I would put a note clarifying why you have an or statement here
        # also, particularly because overwriting a variable you're writing values into 
        # outside of the if statement (like with cache.get()) is kind of confusing
        
        forex_rates = {}
        for currency in currencies:
            forex_rates[currency[0]] = forExRate(currency[0])
        
        cache.set('forex_rates', forex_rates, timeout=3600)

    return forex_rates

# TODO: Oliver - i get a bit nervous when i see initialization functions outside that aren't associated with a stateful class
# might not be a terrible thing tbh, but given that initialization is a stateful act, 
# it may be best to either pass in a forex_dict (if you expect one to already exist) or instantiate and cache

def initialize_forex_rates(forex_rates:Union[Dict[str,str], None]=None)->Dict[str,str]:
    return get_forex_rates()


# TODO: Oliver - just seeing your note below. yea, if it feels funky, i would suggest having some sort of
# app initializer and making this whole forex rates thing a class that is also instantiated upon app startup
# check out https://refactoring.guru/design-patterns/singleton/python/example

# Only calling this here at the moment, but maybe it would make sense to call in views and models
# so we're not relying on this global variable to be initialized on startup? Doesn't feel good
initialize_forex_rates()