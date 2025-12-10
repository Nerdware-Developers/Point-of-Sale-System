# IPv6 Connection Fix for Render Deployment

## Problem
The database connection is failing with `ENETUNREACH` error because it's trying to connect via IPv6, which Render's network cannot reach.

Error example:
```
❌ Database connection error: connect ENETUNREACH 2a05:d019:fa8:a40d:9e38:ec81:dc1e:aebc:6543
```

## Solution
The code has been updated to:
1. Force IPv4 DNS resolution using `dns.setDefaultResultOrder('ipv4first')`
2. Explicitly resolve the hostname to an IPv4 address before creating the connection pool
3. Recreate the pool with the IPv4 address if resolution succeeds

## What Changed
- `backend/config/database.js` now resolves Supabase hostnames to IPv4 addresses
- The connection pool is recreated with the IPv4 address if resolution succeeds
- Better error messages to help diagnose connection issues

## Next Steps

### 1. Verify Environment Variables in Render
Go to your Render dashboard → Your service → Environment and verify:
- `DB_HOST=db.qnygngzfbvcsfhpttjmg.supabase.co`
- `DB_PORT=6543` (connection pooler port)
- `DB_NAME=postgres`
- `DB_USER=postgres`
- `DB_PASSWORD=[your-supabase-password]`

### 2. Redeploy the Backend
1. Commit and push the updated code
2. Render will automatically redeploy, OR
3. Go to Render dashboard → Manual Deploy → Deploy latest commit

### 3. Check Deployment Logs
After deployment, check the logs for:
```
✅ Resolved db.qnygngzfbvcsfhpttjmg.supabase.co to IPv4: [IP_ADDRESS]
✅ Database connected successfully
```

### 4. Test the Connection
Visit: `https://point-of-sale-system-1.onrender.com/api/health/db`

Should show:
- ✅ Connection successful with database details

## If Still Failing

### Option 1: Use Direct IPv4 Address
1. In Render logs, find the IPv4 address that was resolved
2. Set `DB_HOST` to that IP address directly in Render environment variables
3. Redeploy

### Option 2: Check Supabase Project Status
1. Go to https://supabase.com/dashboard
2. Ensure your project is **Active** (not paused)
3. If paused, click "Resume" or "Restore"

### Option 3: Verify Network Access
- Ensure Render service has outbound internet access
- Check if there are any firewall rules blocking port 6543
- Verify Supabase project allows connections from Render's IP ranges

## Why This Happens
- Supabase hostnames resolve to both IPv4 and IPv6 addresses
- Render's network infrastructure may not support IPv6
- The `pg` library may prefer IPv6 if both are available
- Forcing IPv4 resolution ensures compatibility with Render

## Technical Details
The fix:
1. Uses `dns.setDefaultResultOrder('ipv4first')` to prefer IPv4
2. Explicitly resolves hostname to IPv4 using `dns.lookup()` with `family: 4`
3. Creates connection pool with IPv4 address instead of hostname
4. Falls back to hostname if IPv4 resolution fails

