# Deploy Frontend to GitHub Pages (Free)

GitHub Pages is a free hosting service provided by GitHub. Here's how to set it up:

## Step 1: Enable GitHub Pages in Repository Settings

1. Go to your GitHub repository: `https://github.com/Nerdware-Developers/Point-of-Sale-System`
2. Click **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**, select:
   - **Source:** `GitHub Actions`
5. Click **Save**

## Step 2: Add Environment Variable (Optional)

If your backend URL is different, you can add it as a secret:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `VITE_API_URL`
4. Value: `https://point-of-sale-system-1.onrender.com/api`
5. Click **Add secret**

**Note:** The workflow already has a default value, so this is optional.

## Step 3: Push to GitHub

The GitHub Actions workflow will automatically deploy when you push to the `main` branch:

```bash
git add .
git commit -m "Add GitHub Pages deployment"
git push origin main
```

## Step 4: Wait for Deployment

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. You'll see the "Deploy to GitHub Pages" workflow running
4. Wait 2-3 minutes for it to complete
5. Once done, your site will be live at:
   ```
   https://nerdware-developers.github.io/Point-of-Sale-System/
   ```

## Step 5: Update CORS (if needed)

If you get CORS errors, update `backend/server.js` to include your GitHub Pages domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://nerdware-developers.github.io'
  ],
  credentials: true
}));
```

Then redeploy the backend on Render.

## Custom Domain (Optional)

If you have a custom domain:

1. Go to **Settings** → **Pages**
2. Under **Custom domain**, enter your domain
3. Follow GitHub's instructions to configure DNS

## Troubleshooting

### Build Fails
- Check the **Actions** tab for error messages
- Ensure `VITE_API_URL` is set correctly
- Verify Node.js version (should be 18+)

### 404 Errors on Routes
- This is normal for React Router - the workflow handles it
- All routes should redirect to `index.html`

### CORS Errors
- Update backend CORS settings to include GitHub Pages domain
- Redeploy backend on Render

## Advantages of GitHub Pages

✅ **Free forever**
✅ **Unlimited bandwidth**
✅ **Automatic HTTPS**
✅ **Custom domain support**
✅ **Automatic deployments on push**
✅ **No credit card required**

## Your Site URL

After deployment, your site will be available at:
```
https://nerdware-developers.github.io/Point-of-Sale-System/
```

