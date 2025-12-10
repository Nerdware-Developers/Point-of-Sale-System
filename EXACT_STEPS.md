# Exact Steps to Fix Database Connection

## The Problem
Render cannot resolve Supabase hostnames (`ENOTFOUND`). This is a DNS issue that we'll bypass using connection strings.

## Solution: Use Supabase Connection String

### Step 1: Get Your Connection String from Supabase

1. **Go to:** https://supabase.com/dashboard
2. **Sign in** to your account
3. **Click on your project** (the one with ID: `qnygngzfbvcsfhpttjmg`)
4. **Click "Settings"** (gear icon in left sidebar)
5. **Click "Database"** in the settings menu
6. **Scroll down** to find **"Connection string"** section
7. **Click the "Connection pooling" tab** (NOT "URI" or "Session")
8. **Copy the connection string** - it will look like one of these:

   **Option A (Pooler):**
   ```
   postgresql://postgres.qnygngzfbvcsfhpttjmg:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

   **Option B (Direct):**
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.qnygngzfbvcsfhpttjmg.supabase.co:6543/postgres
   ```

   **Important:** Replace `[YOUR-PASSWORD]` with your actual Supabase database password.

### Step 2: Add to Render

1. **Go to:** https://dashboard.render.com
2. **Click on your service:** `point-of-sale-system-1` (or whatever you named it)
3. **Click "Environment"** in the left sidebar
4. **Click "Add Environment Variable"**
5. **Add this variable:**
   - **Key:** `DATABASE_URL`
   - **Value:** Paste the connection string you copied from Supabase
6. **Click "Save Changes"**

### Step 3: Remove Old Variables (Optional but Recommended)

You can remove these if you're using DATABASE_URL:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

**OR** keep them as backup - the code will prefer `DATABASE_URL` if it exists.

### Step 4: Wait for Auto-Deploy

- Render will automatically redeploy when you save environment variables
- Wait 2-5 minutes
- Check the **Logs** tab

### Step 5: Check Logs

You should see:
```
✅ Using DATABASE_URL connection string
✅ Database connected successfully
✅ Database tables initialized
```

If you see errors, continue to troubleshooting below.

## If You Can't Find Connection String

### Alternative: Build It Manually

If Supabase dashboard doesn't show the connection string, build it yourself:

1. **Get your password:**
   - Go to Supabase Dashboard → Settings → Database
   - Look for "Database password" or reset it if needed

2. **Build the connection string:**
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.qnygngzfbvcsfhpttjmg.supabase.co:6543/postgres
   ```
   
   Replace `[YOUR-PASSWORD]` with your actual password.

3. **URL encode special characters in password:**
   - If your password has special characters, you may need to URL encode them
   - Common encodings:
     - `@` → `%40`
     - `#` → `%23`
     - `$` → `%24`
     - `%` → `%25`
     - `&` → `%26`
     - `+` → `%2B`
     - `=` → `%3D`

### Example:
If your password is `MyP@ss#123`, the connection string would be:
```
postgresql://postgres:MyP%40ss%23123@db.qnygngzfbvcsfhpttjmg.supabase.co:6543/postgres
```

## Check Supabase Project Status

**CRITICAL:** Make sure your Supabase project is **Active**:

1. Go to https://supabase.com/dashboard
2. Check your project status
3. If it says **"Paused"**:
   - Click **"Resume"** or **"Restore"**
   - Wait 2-3 minutes for it to become active
   - Then try the connection again

## Test Connection

After deployment, test:
```
https://point-of-sale-system-1.onrender.com/api/health/db
```

Should return:
```json
{
  "status": "OK",
  "message": "Database connection successful"
}
```

## Still Not Working?

### Check 1: Password
- Make sure password is correct (case-sensitive)
- Try resetting password in Supabase dashboard
- Make sure no extra spaces in the connection string

### Check 2: Project Status
- Verify project is **Active** in Supabase dashboard
- If paused, resume it

### Check 3: Connection String Format
- Must start with `postgresql://`
- Must include password (URL encoded if needed)
- Port should be `6543` (pooler) or `5432` (direct)
- Database name should be `postgres`

### Check 4: Render Logs
- Check Render logs for the exact error
- Look for authentication errors vs connection errors

## Quick Test Connection String Format

Your connection string should match this pattern:
```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

Example:
```
postgresql://postgres:myPassword123@db.qnygngzfbvcsfhpttjmg.supabase.co:6543/postgres
```

