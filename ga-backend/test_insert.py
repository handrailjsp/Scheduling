import os
import requests
from database import supabase

print('client ready')
print('env service key length', len(os.getenv('SUPABASE_SERVICE_ROLE_KEY') or ''))
print('env anon key length', len(os.getenv('SUPABASE_KEY') or ''))

try:
    resp = supabase.table('generated_schedules').insert({
        'fitness_score': -123.45,
        'hard_constraint_violations': 0,
        'soft_constraint_score': 0.0,
        'status': 'pending'
    }).execute()
    print('response object:', resp)
    try:
        print('resp.data:', resp.data)
    except Exception as e:
        print('error accessing data:', e)
    if hasattr(resp, 'error'):
        print('resp.error:', resp.error)
    if hasattr(resp, 'status_code'):
        print('status_code:', resp.status_code)
except Exception as e:
    print('exception raised during supabase client call:', type(e), e)
    # continue to raw HTTP inspection below

# Now raw HTTP request
print('\n--- raw request using requests ---')
url = os.getenv('SUPABASE_URL') + '/rest/v1/generated_schedules'
headers = {
    'apikey': os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY'),
    'Authorization': 'Bearer ' + (os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')),
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}
payload = {
    'fitness_score': -123.45,
    'hard_constraint_violations': 0,
    'soft_constraint_score': 0.0,
    'status': 'pending'
}
raw = requests.post(url, headers=headers, json=payload)
print('raw status', raw.status_code)
print('raw text', repr(raw.text))
print('raw headers', raw.headers)
