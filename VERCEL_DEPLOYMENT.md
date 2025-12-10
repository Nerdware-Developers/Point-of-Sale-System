# Deploy Frontend to Vercel (Free Alternative to Netlify)

Since your Netlify site reached usage limits, here's how to deploy to Vercel instead (free tier available).

## Step 1: Deploy to Vercel

1. Go to https://vercel.com and sign up/login (you can use GitHub to sign in)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

5. Add Environment Variable:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://point-of-sale-system-1.onrender.com/api`
   (Or your Render backend URL)

6. Click "Deploy"
7. Wait 2-3 minutes for deployment
8. Your site will be live at `https://your-project-name.vercel.app`

## Step 2: Update CORS (if needed)

If you get CORS errors, update `backend/server.js` to include your Vercel domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-project-name.vercel.app'
  ],
  credentials: true
}));
```

Then redeploy the backend on Render.

## Vercel vs Netlify

✅ **Vercel Advantages:**
- Free tier with generous limits
- Faster deployments
- Better performance
- Automatic HTTPS
- Easy GitHub integration

✅ **Vercel Free Tier Includes:**
- Unlimited deployments
- 100GB bandwidth/month
- Automatic SSL
- Custom domains

## Alternative: Upgrade Netlify

If you prefer to stay on Netlify:
1. Log into https://app.netlify.com
2. Go to your site → Settings → Billing
3. Upgrade to a paid plan ($19/month for Pro)
4. Your site will be restored automatically

## Alternative: Cloudflare Pages (Also Free)

1. Go to https://pages.cloudflare.com
2. Connect your GitHub repository
3. Configure:
   - **Build command:** `npm run build`
   - **Build output directory:** `frontend/dist`
   - **Root directory:** `frontend`
4. Add environment variable: `VITE_API_URL`
5. Deploy

