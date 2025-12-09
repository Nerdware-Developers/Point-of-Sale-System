# Database Connection Fix Guide

## Current Issue
The database connection is failing with `ENETUNREACH` error because it's trying to use IPv6, which isn't reachable from Render.

## Solution: Use Supabase Connection Pooler

### Step 1: Update Render Environment Variables

Go to your Render dashboard → Your service → Environment and update:

**Change:**
- `DB_PORT=5432` → `DB_PORT=6543` (This is the connection pooler port)

**Keep the same:**
- `DB_HOST=db.qnygngzfbvcsfhpttjmg.supabase.co` (or change to `aws-0-qnygngzfbvcsfhpttjmg.supabase.co`)
- `DB_NAME=postgres`
- `DB_USER=postgres`
- `DB_PASSWORD=[your-actual-password]`

### Step 2: Alternative - Use Pooler Hostname

If port 6543 doesn't work, also change the host:
- `DB_HOST=aws-0-qnygngzfbvcsfhpttjmg.supabase.co`

### Step 3: Save and Redeploy

1. Click "Save Changes" in Render
2. This will trigger an automatic redeploy
3. Wait 2-5 minutes for deployment to complete

### Step 4: Test Connection

After deployment, test:
```
https://point-of-sale-system-1.onrender.com/api/health/db
```

This will show:
- ✅ Connection successful - if database is working
- ❌ Connection failed - with detailed error information

## Why Connection Pooler?

The connection pooler (port 6543) is designed for serverless/server environments and:
- Handles IPv4/IPv6 better
- More reliable connections
- Better for Render's infrastructure
- Recommended by Supabase for production

## If Still Not Working

1. **Check Supabase Project Status:**
   - Go to https://supabase.com/dashboard
   - Ensure project is **active** (not paused)
   - If paused, click "Resume" or "Restore"

2. **Verify Environment Variables:**
   - All DB_* variables must be set correctly
   - Password must match your Supabase password

3. **Check Render Logs:**
   - Go to Render dashboard → Logs
   - Look for database connection errors
   - Check for any error messages

4. **Test Database Health:**
   - Visit: `https://point-of-sale-system-1.onrender.com/api/health/db`
   - This will show detailed connection information

## Quick Checklist

- [ ] `DB_PORT` set to `6543` in Render
- [ ] Supabase project is active (not paused)
- [ ] All environment variables are set correctly
- [ ] Deployment completed successfully
- [ ] Test `/api/health/db` endpoint

