# Deployment Troubleshooting Guide

## Common Deployment Failures on Render

### Issue: "Exited with status 1"

This usually means the server crashed during startup. Common causes:

#### 1. Database Connection Failure
**Symptoms:** Server can't connect to Supabase database

**Solutions:**
- ✅ Ensure Supabase project is **active** (not paused)
- ✅ Verify all environment variables are set correctly in Render:
  - `DB_HOST=db.qnygngzfbvcsfhpttjmg.supabase.co`
  - `DB_PORT=5432`
  - `DB_NAME=postgres`
  - `DB_USER=postgres`
  - `DB_PASSWORD=[your-password]`
- ✅ Check SSL is enabled (already configured in code)

#### 2. Missing Environment Variables
**Symptoms:** Server crashes on startup

**Required Variables:**
```
NODE_ENV=production
PORT=5000
DB_HOST=db.qnygngzfbvcsfhpttjmg.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[your-password]
JWT_SECRET=[random-secret]
JWT_EXPIRE=7d
```

#### 3. Canvas Package Dependencies
**Symptoms:** Build fails with canvas-related errors

**Solution:** The `canvas` package requires system libraries. Render should handle this automatically, but if it fails:
- The barcode generation feature might not work
- Consider making canvas optional or using an alternative

#### 4. Missing Uploads Directory
**Fixed:** Server now creates uploads directory automatically

## How to Check Deployment Logs

1. Go to your Render dashboard
2. Click on your service
3. Go to "Logs" tab
4. Look for error messages

## Quick Fixes

### If deployment keeps failing:

1. **Check the logs** - Look for the specific error message
2. **Verify environment variables** - Make sure all are set correctly
3. **Test database connection** - Ensure Supabase project is active
4. **Try manual deploy** - Click "Manual Deploy" in Render dashboard

### Health Check Endpoint

Once deployed, test if server is running:
```
GET https://your-backend.onrender.com/api/health
```

Should return:
```json
{
  "status": "OK",
  "message": "POS API is running"
}
```

## Render-Specific Settings

### Build Command
```
npm install
```

### Start Command
```
npm start
```

### Root Directory
```
backend
```

### Environment
```
Node
```

## Next Steps After Successful Deployment

1. ✅ Test health endpoint
2. ✅ Verify database connection (check logs)
3. ✅ Seed database if needed
4. ✅ Update frontend `VITE_API_URL` to point to Render backend
5. ✅ Deploy frontend to Netlify

