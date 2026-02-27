# Quick Fix for Vercel Deployment

## The 5-Minute Fix

### Step 1: Check Vercel Settings (1 min)
```
1. vercel.com → Your Project
2. Settings → Environment Variables
3. Verify BOTH exist:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
4. Ensure each is checked for: Production, Preview, Development
```

### Step 2: Clear Cache & Rebuild (1 min)
```
1. Settings → Build & Development Settings
2. Click "Clear Build Cache"
3. Deployments tab
4. Click latest deployment (...)
5. Select "Redeploy"
```

### Step 3: Wait for Build (2 min)
```
Watch the Deployments tab until it says "Deployed" ✓
```

### Step 4: Test (1 min)
```
1. Visit your site
2. Press F12 (DevTools)
3. Console tab - look for "Supabase initialized successfully" ✓
OR look for error message (note what it says)

4. Network tab
5. Reload page
6. Click index.html
7. Response tab
8. Search for "https://" - should show your URL not __PLACEHOLDER__
```

## If Still Broken

### Most Common Issue: Cache Not Cleared
```
Try a full rebuild by forcing git:
1. In VS Code terminal:
   git commit --allow-empty -m "force rebuild"
   git push

2. Watch Vercel deploy again
3. Test again
```

### Check Variable Names (Case Sensitive!)
```
Must be EXACTLY:
✓ VITE_SUPABASE_URL
✓ VITE_SUPABASE_ANON_KEY

NOT:
✗ VITE_supabase_url (wrong case)
✗ SUPABASE_URL (missing VITE_)
✗ VITE_SUPABASE_KEY (wrong name)
```

### Verify Supabase Project
```
1. supabase.com → Your Project
2. Settings → API
3. Copy exact values
4. Paste into Vercel (overwrite existing)
5. Redeploy
```

## Expected Results After Fix

✅ Browser console shows: `"Supabase initialized successfully"`
✅ Search works without "Supabase Key Missing" error
✅ Network tab shows your real URL in index.html (not placeholder)

## Need More Help?

See these files:
- `DEBUG_CHECKLIST.md` - Detailed debugging steps
- `VERCEL_DEPLOYMENT.md` - Complete Vercel guide
- `SUPABASE_SETUP.md` - Supabase setup guide
