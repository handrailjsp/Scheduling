# Getting Your Supabase Service Role Key

The backend needs the **Service Role Key** to bypass RLS (Row Level Security) policies when saving generated schedules to the database.

## Steps to Get Your Service Role Key:

1. **Open Supabase Dashboard:**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to API Keys:**
   - Click **Settings** (gear icon) in the left sidebar
   - Click **API** 
   - You'll see two keys:
     - **anon public** (currently in use - allows limited inserts)
     - **service_role secret** (what we need - bypasses RLS)

3. **Copy the Service Role Key:**
   - Click the copy icon next to "service_role secret"
   - It starts with `eyJhb...` (a long JWT token)

4. **Add to `.env` File:**
   - Open `ga-backend/.env`
   - Add this line:
     ```
     SUPABASE_SERVICE_ROLE_KEY=<paste_the_key_you_copied_here>
     ```
   - Example:
     ```env
     SUPABASE_URL=https://fqsjsbjsmehayldmyezt.supabase.co
     SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```

5. **Restart the Backend:**
   ```bash
   # Kill the running backend with Ctrl+C
   cd ga-backend
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

## Why This Is Needed:

- **anon key**: Subject to Row-Level Security (RLS) policies. Limited permissions for public users.
- **service_role key**: Bypasses RLS. Used by backend services that need full database access.

The schedule generation GA algorithm needs to insert schedules and slots into the database, which requires the service role key if your RLS policies restrict anonymous inserts.

## Verification:

Once you've added the key and restarted, you should see:
```
[INIT] Using SUPABASE_SERVICE_ROLE_KEY (RLS bypassed)
```

in the backend logs.
