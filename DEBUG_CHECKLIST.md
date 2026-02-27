# Supabase Vercel Debugging Checklist

If you're still seeing "⚠️ Supabase Key Missing" on Vercel, use this checklist:

## Step 1: Verify Variables in Vercel ✓

- [ ] Go to Vercel dashboard → Your project
- [ ] Click **Settings** → **Environment Variables**
- [ ] Verify you see both:
  - `VITE_SUPABASE_URL` = your url
  - `VITE_SUPABASE_ANON_KEY` = your key
- [ ] For each variable, click it and verify checkmarks for:
  - [ ] Production
  - [ ] Preview
  - [ ] Development

## Step 2: Force a Clean Rebuild ✓

- [ ] Go to **Settings** → **Build & Development Settings**
- [ ] Scroll down and click **Clear Build Cache** (if shown)
- [ ] Go to **Deployments**
- [ ] Click your latest deployment's 3-dots menu
- [ ] Select **Redeploy**
- [ ] Wait for build to complete (2-3 minutes)
- [ ] Check Deployments tab - look for any build errors

## Step 3: Verify Build Included Variables ✓

- [ ] After deployment, click on your deployment
- [ ] Click **Logs** tab
- [ ] Search for `VITE_SUPABASE` in the logs
- [ ] You should see your actual values (not placeholders)

## Step 4: Check the Live Site ✓

### In Browser Console:
- [ ] Go to your Vercel URL
- [ ] Press `F12` to open Developer Tools
- [ ] Go to **Console** tab
- [ ] Look for any error messages
- [ ] You should see: "Supabase initialized successfully"

### In Network Tab:
- [ ] Go to **Network** tab
- [ ] Reload the page
- [ ] Click on `index.html` request
- [ ] Go to **Response** tab
- [ ] Search for `https://` (search for your actual URL)
- [ ] It should show your real Supabase URL, NOT `__PLACEHOLDER__`

## Step 5: Verify Supabase Project Status ✓

- [ ] Go to [supabase.com](https://supabase.com)
- [ ] Verify your project exists in the dashboard
- [ ] Click on it and verify you can access Settings → API
- [ ] Copy the values again and compare:
  - Are they different from what's in Vercel?
  - Do they look valid (start with `https://` and have real keys)?

## If Variables are NOT in index.html (still showing __PLACEHOLDER__)

This means environment variables didn't get embedded during build. Try:

1. **Clear Vercel cache completely:**
   ```bash
   git commit --allow-empty -m "rebuild"
   git push
   ```
   This forces a fresh build without cache.

2. **Move environment variables to each scope individually:**
   - Delete from Vercel
   - Add to Production only, deploy, test
   - If that works, add to Preview and Development

3. **Check if variables names are EXACTLY correct:**
   - Must be: `VITE_SUPABASE_URL` (not `VITE_SUPABASE_url`)
   - Must be: `VITE_SUPABASE_ANON_KEY` (not `ANON_KEY`)

## If Browser Shows Error

### "Supabase library failed to load"
- Your internet connection might have ad-blockers or CDN issues
- Check browser console for specific error messages
- Try from a different network

### "Supabase Key Missing"
- The key variable didn't get embedded in the HTML
- The key is empty or is still a placeholder
- Follow Step 3 above to verify

### Search returns no results
- Supabase project might not have the `experiments` table
- Go to Supabase dashboard → navigate to the table
- Verify the table exists and has data

## Nuclear Option: Start Fresh

If nothing works:

1. Create a NEW Supabase project at [supabase.com](https://supabase.com)
2. Copy the NEW Project URL and Anon Key
3. Update Vercel environment variables with NEW values
4. Force rebuild
5. Test

## Still Stuck?

Check these files for reference:
- [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) - Detailed Vercel guide
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - Supabase configuration guide
- [index.html](index.html#L280) - Where placeholders are defined
- [vite.config.ts](vite.config.ts) - How variables are exposed

Run this command to see what variables Node can see:
```bash
node -e "console.log(Object.keys(process.env).filter(k => k.includes('SUPABASE')))"
```
