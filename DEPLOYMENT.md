# Deployment Guide

## Prerequisites
- ✅ Supabase database configured
- ✅ Backend code ready
- ✅ Frontend code ready

## Step 1: Deploy Backend to Render

1. Go to https://render.com and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** `pos-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=5000
   DB_HOST=db.qnygngzfbvcsfhpttjmg.supabase.co
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=[your-supabase-password]
   JWT_SECRET=[generate-a-random-secret]
   JWT_EXPIRE=7d
   ```
6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes)
8. Copy your backend URL (e.g., `https://pos-backend.onrender.com`)

## Step 2: Deploy Frontend to Netlify

1. Go to https://app.netlify.com and sign up/login
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
5. Add Environment Variable:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://your-backend-url.onrender.com/api`
   (Replace with your actual Render backend URL)
6. Click "Deploy site"
7. Wait for deployment (2-5 minutes)
8. Your site will be live at `https://your-site-name.netlify.app`

## Step 3: Update CORS (if needed)

If you get CORS errors, update `backend/server.js` to include your Netlify domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-site-name.netlify.app'
  ],
  credentials: true
}));
```

Then redeploy the backend.

## Step 4: Seed Production Database

After backend is deployed, you can seed the database by:
1. Running the seed script locally with production DB credentials, OR
2. Using Supabase SQL Editor to manually create admin user

## Troubleshooting

### Database Connection Issues
- Ensure Supabase project is active (not paused)
- Verify connection credentials in Render environment variables
- Check SSL is enabled (already configured in database.js)

### CORS Errors
- Update CORS settings in backend/server.js
- Ensure frontend VITE_API_URL points to correct backend URL

### Build Failures
- Check Node version (should be 18+)
- Verify all dependencies are in package.json
- Check build logs in Netlify/Render dashboard

