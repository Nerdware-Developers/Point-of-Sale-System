# Quick Fix: Get Your Backend Working

## The Simplest Solution

Use Supabase's connection string directly. This bypasses all DNS issues.

### Step 1: Get Connection String from Supabase

1. Go to https://supabase.com/dashboard
2. Open your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Find **"Connection pooling"** tab
6. Copy the connection string (looks like):
   ```
   postgresql://postgres.qnygngzfbvcsfhpttjmg:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   OR
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.qnygngzfbvcsfhpttjmg.supabase.co:6543/postgres
   ```

### Step 2: Add to Render Environment Variables

1. Go to Render dashboard → Your service → Environment
2. Add a new variable:
   - **Key:** `DATABASE_URL`
   - **Value:** Paste the connection string you copied
3. **Save Changes** (this will auto-redeploy)

### Step 3: Wait for Deployment

- Render will automatically redeploy (2-5 minutes)
- Check logs - you should see: `✅ Database connected successfully`

### Step 4: Test

Visit: `https://point-of-sale-system-1.onrender.com/api/health/db`

Should show: `✅ Connection successful`

## Why This Works

- Connection strings are handled better by the `pg` library
- Bypasses DNS resolution issues
- Supabase provides the exact format needed
- More reliable than individual host/port/user/password variables

## If You Don't Have Connection String

1. Make sure your Supabase project is **Active** (not paused)
2. Check that you have the correct password
3. Try the direct connection string format:
   ```
   postgresql://postgres:[PASSWORD]@db.qnygngzfbvcsfhpttjmg.supabase.co:6543/postgres
   ```
   Replace `[PASSWORD]` with your actual Supabase database password

## That's It!

The backend code now automatically uses `DATABASE_URL` if it's set, which is the most reliable method.

