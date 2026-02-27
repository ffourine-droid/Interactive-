# Vercel Deployment Guide - Supabase Fix

## The Problem
Your environment variables are set in Vercel, but they're not being used by the app. This usually happens because:
1. **server.ts doesn't run on Vercel** - Vercel only hosts static files by default
2. **Environment variables need to be available at BUILD TIME** for Vite to embed them

## Solution: Step-by-Step

### 1. Verify Your Vercel Project Settings

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. **You should see BOTH of these:**
   ```
   VITE_SUPABASE_URL       = https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY  = eyJhbGciOiJIUzI1NiIs...
   ```

⚠️ **Important:** Make sure they're available for **Production**, **Preview**, and **Development** environments. Click each variable and check all checkboxes.

### 2. Force a Rebuild on Vercel

Even though you've redeployed, do this to ensure the new env vars are used:

1. In your Vercel project dashboard, go to **Deployments**
2. Find your latest deployment
3. Click the **three dots (...)** menu
4. Select **Redeploy**
5. Choose **Use existing build cache? NO** (or just "Redeploy")

**Wait 2-3 minutes** for the deployment to complete.

### 3. Verify the Build Included Your Variables

1. After deployment completes, click on your deployment
2. Go to the **Logs** tab
3. Look for something like:
   ```
   VITE_SUPABASE_URL: https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY: eyJhbGciOi...
   ```

4. If you see them, great! ✅ The variables are embedded.
5. If not, the environment variables weren't available during build.

### 4. Check Your Live Site

1. Visit your Vercel deployment URL (e.g., `https://your-project.vercel.app`)
2. **Open DevTools** (F12)
3. Go to **Console** tab
4. Look for log messages like:
   ```
   Supabase initialized successfully with URL: https://your-project.supabase.co
   ```
   OR
   ```
   ⚠️ Supabase Key Missing
   ```

### 5. Still Not Working? Rebuild Without Cache

Your build cache might be stale. Force a clean rebuild:

1. In Vercel dashboard, go to **Settings** → **Projects**
2. Scroll down to **Build & Development Settings**
3. Look for **Build Cache** section
4. Click **Clear Build Cache** button
5. Go back to **Deployments**
6. Click **Deploy** button and choose to redeploy main branch

### 6. Check Browser Network Tab

1. Visit your site
2. Open **DevTools** → **Network** tab
3. Look at the `index.html` request
4. In the **Response** tab, search for `SUPABASE_URL`
5. It should show your actual URL, **NOT** a placeholder

If it shows:
- `__SUPABASE_URL_PLACEHOLDER__` → Variables not embedded ❌
- `https://your-project.supabase.co` → Variables properly embedded ✅

## Still Seeing "Supabase Key Missing"?

### Option A: Check Vercel's Environment Variable Scope

Your environment variables might not be set for all environments.

**Fix:**
1. Go to **Settings** → **Environment Variables**
2. Click each variable
3. Make sure **Production**, **Preview**, and **Development** are all checked
4. Redeploy

### Option B: Recheck Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Go to your project → **Settings** → **API**
3. Copy the exact values:
   - Project URL → `VITE_SUPABASE_URL`
   - Anon Key → `VITE_SUPABASE_ANON_KEY`
4. Update in Vercel
5. Redeploy

### Option C: Temporary Test with Hardcoded Values

To confirm the setup is working:

1. **Temporarily** add these to your [index.html](index.html) (line ~280):
   ```javascript
   let SUPABASE_URL = 'https://nfttlgbkdvuutrgmthkz.supabase.co';  // Known working project
   let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mdHRsZ2JrZHZ1dXRyZ210aGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjA2NzEsImV4cCI6MjA4NzA5NjY3MX0.7f_WwInRQn81PZzqWVBNtOKNWo7l2XbQ8dhYIuDap2Q';
   ```
2. Commit and push
3. If it works, the environment variable injection is the issue
4. If it still fails, Supabase itself might have a problem

### Option D: Check if Project Exists

Your Supabase project might have been deleted or suspended:

1. Go to [supabase.com](https://supabase.com)
2. Check if your project is listed
3. Try to access the Supabase dashboard
4. If missing, create a new project and update Vercel

## Common Mistakes

❌ Don't do this:
- Set variables in a local `.env` file and expect them to work on Vercel
- Use different URL or key values locally vs. in Vercel
- Forget to redeploy after changing environment variables
- Forget to check all environment scopes (Production, Preview, Development)

✅ Do this:
- Always set environment variables in **Vercel's dashboard**
- Always **redeploy** after changing them
- Test by checking browser console for error messages
- Verify in Network tab that variables are in the HTML

## Alternative: Use .env.production.local

For testing locally before Vercel:

```bash
# Create this file (don't commit it)
echo 'VITE_SUPABASE_URL=https://your-project.supabase.co' > .env.production.local
echo 'VITE_SUPABASE_ANON_KEY=your-key' >> .env.production.local

# Test build locally
npm run build

# Then check dist/index.html
grep "SUPABASE_URL" dist/index.html
```

## Need Help?

1. **Check Deployments section** for error logs during build
2. **Check Console tab** in browser DevTools for runtime errors
3. **Check Network tab** to see if variables are in HTML
4. Verify these in Vercel: Variables, Build settings, Deployment logs
