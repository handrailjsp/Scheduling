import os
from dotenv import load_dotenv
load_dotenv()
print('service key present?', os.getenv('SUPABASE_SERVICE_ROLE_KEY') is not None)
print('service key value length', len(os.getenv('SUPABASE_SERVICE_ROLE_KEY') or ''))
print('anon key present?', os.getenv('SUPABASE_KEY') is not None)
print('anon key value length', len(os.getenv('SUPABASE_KEY') or ''))
