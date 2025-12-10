# DNS Resolution Fix for Render + Supabase

## Current Issue
The deployment shows:
```
⚠️  Could not resolve db.qnygngzfbvcsfhpttjmg.supabase.co to IPv4, using hostname: getaddrinfo ENOTFOUND
❌ Database connection error: connect ENETUNREACH [IPv6_ADDRESS]:6543
```

This indicates Render's DNS resolver cannot resolve Supabase hostnames.

## Solutions (Try in Order)

### Solution 1: Verify Supabase Project is Active

1. Go to https://supabase.com/dashboard
2. Open your project: `qnygngzfbvcsfhpttjmg`
3. Check if it shows **"Active"** or **"Paused"**
4. If paused:
   - Click "Resume" or "Restore"
   - Wait 2-3 minutes for the project to become active
   - Redeploy on Render

### Solution 2: Get Direct Connection String from Supabase

1. In Supabase Dashboard → Your Project → Settings → Database
2. Find **"Connection string"** or **"Connection pooling"**
3. Copy the connection string (it will look like):
   ```
   postgresql://postgres:[PASSWORD]@db.qnygngzfbvcsfhpttjmg.supabase.co:6543/postgres
   ```
4. Extract the IP address or use the connection string directly

### Solution 3: Use Supabase Connection Pooler URL

Try using the pooler connection string format. In Render environment variables, you can set:

**Option A: Use Connection String (if supported)**
- Check if your code supports `DATABASE_URL` environment variable
- Set it to: `postgresql://postgres:[PASSWORD]@db.qnygngzfbvcsfhpttjmg.supabase.co:6543/postgres`

**Option B: Try Alternative Hostname Format**
In Render environment variables, change:
- `DB_HOST=aws-0-qnygngzfbvcsfhpttjmg.supabase.co`

Sometimes the `aws-0-` prefix works better than `db.` prefix.

### Solution 4: Get IPv4 Address Manually

1. From your local machine (not Render), run:
   ```bash
   nslookup db.qnygngzfbvcsfhpttjmg.supabase.co
   ```
   Or:
   ```bash
   ping db.qnygngzfbvcsfhpttjmg.supabase.co
   ```
2. Note the IPv4 address (e.g., `54.123.45.67`)
3. In Render environment variables, set:
   - `DB_HOST=[THE_IPV4_ADDRESS]` (use the IP directly, not the hostname)

### Solution 5: Check Supabase Network Settings

1. Go to Supabase Dashboard → Settings → Database
2. Check **"Connection Pooling"** settings
3. Ensure **"Connection Pooler"** is enabled
4. Verify the pooler mode is set to **"Transaction"** or **"Session"**

### Solution 6: Verify Render Environment Variables

Double-check all variables in Render dashboard:

```
DB_HOST=db.qnygngzfbvcsfhpttjmg.supabase.co
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[YOUR_ACTUAL_PASSWORD]
```

**Important:** 
- Password must match exactly (case-sensitive)
- No extra spaces or quotes
- Port must be `6543` (connection pooler)

### Solution 7: Check Supabase IP Allowlist

1. Go to Supabase Dashboard → Settings → Database → Network Restrictions
2. If IP allowlist is enabled, you may need to:
   - Add Render's IP ranges (contact Render support for IP ranges)
   - Or disable IP allowlist for testing

### Solution 8: Use Supabase Direct Connection (Port 5432)

If connection pooler (6543) doesn't work, try direct connection:

In Render environment variables:
- `DB_PORT=5432` (instead of 6543)
- Keep `DB_HOST=db.qnygngzfbvcsfhpttjmg.supabase.co`

**Note:** Direct connection (5432) has connection limits and may not work well for serverless, but it's worth trying.

## Testing After Changes

1. Redeploy on Render (automatic after env var changes, or manual deploy)
2. Check logs for:
   ```
   ✅ Resolved [hostname] to IPv4: [IP_ADDRESS]
   ✅ Database connected successfully
   ```
3. Test the health endpoint:
   ```
   https://point-of-sale-system-1.onrender.com/api/health/db
   ```

## Most Likely Causes

1. **Supabase project is paused** - Most common issue
2. **Incorrect password** - Double-check DB_PASSWORD
3. **DNS resolution issue on Render** - Try using IP address directly
4. **Network restrictions** - Check Supabase network settings

## Next Steps

1. **First:** Verify Supabase project is active
2. **Second:** Try alternative hostname (`aws-0-` prefix)
3. **Third:** Get IPv4 address manually and use it directly
4. **Fourth:** Contact Supabase support if project is active but still failing

## Contact Information

- Supabase Support: https://supabase.com/support
- Render Support: https://render.com/docs/support

