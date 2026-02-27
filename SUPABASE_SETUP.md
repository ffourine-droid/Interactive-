# Supabase Configuration Guide

## Problem
If you're seeing the error **⚠️ Supabase Key Missing**, it means the `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_URL` environment variables are not properly set in your environment.

## Solution

### Step 1: Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Create a new project or select an existing one
3. Navigate to **Settings → API** in the left sidebar
4. Copy:
   - **Project URL** → This is your `VITE_SUPABASE_URL`
   - **Anon Key** → This is your `VITE_SUPABASE_ANON_KEY`

### Step 2: Set Environment Variables

#### For Local Development

Create or edit the `.env` file in the project root:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIs..."

GEMINI_API_KEY="your-gemini-key"
APP_URL="http://localhost:3000"
```

Then run:
```bash
npm run dev
```

#### For Deployment Platforms

**Important:** Environment variables must be set in your deployment platform's settings, NOT in the code.

##### Vercel
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add these variables:
   ```
   VITE_SUPABASE_URL = https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key
   ```
4. Deploy your application

##### Google Cloud Run
1. In the Cloud Run service deployment:
   ```bash
   gcloud run deploy YOUR_SERVICE_NAME \
     --set-env-vars VITE_SUPABASE_URL="https://your-project.supabase.co" \
     --set-env-vars VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```

Or update existing service:
   ```bash
   gcloud run services update YOUR_SERVICE_NAME \
     --set-env-vars VITE_SUPABASE_URL="https://your-project.supabase.co" \
     --set-env-vars VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```

##### Netlify
1. Go to **Site settings → Build & deploy → Environment**
2. Add environment variables:
   ```
   VITE_SUPABASE_URL = https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key
   ```
3. Trigger a new deploy

##### GitHub Pages / Static Hosting
**Note:** Static hosting cannot securely store secrets. Consider:
- Using a backend service to proxy Supabase calls
- Using a service like Netlify or Vercel instead

## Testing

After setting up the environment variables:

1. **Local Development:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` and try searching

2. **Verify Environment Variables:**
   The server logs should show:
   ```
   📌 ENVIRONMENT SETUP:
     - VITE_SUPABASE_URL: ✓ Set
     - VITE_SUPABASE_ANON_KEY: ✓ Set
   ```

## Troubleshooting

### Still seeing "Supabase Key Missing"?

1. **Check the .env file** (local development):
   ```bash
   cat .env
   ```
   Verify the values are correct (not `YOUR_SUPABASE_URL` or `YOUR_SUPABASE_ANON_KEY`)

2. **Check deployment environment variables:**
   For your deployment platform, verify the variables are actually set in the admin panel

3. **Restart the application:**
   - Local: Stop and restart `npm run dev`
   - Deployment: Redeploy or restart the service

4. **Check Supabase project:**
   - Verify your Supabase project is still active
   - Check that you have the correct URL and key
   - Try creating a test table in Supabase and searching

5. **Browser console:**
   Open DevTools (F12) → Console tab and look for error messages

### The key worked previously but stopped working?

- Your Supabase project might have been deleted or the API key was revoked
- Check [supabase.com](https://supabase.com) to verify your project exists
- If needed, create a new project and update your environment variables

## Security Notes

⚠️ **Important:**
- **Never commit `.env` files** to Git (already ignored in `.gitignore`)
- The `VITE_SUPABASE_ANON_KEY` is meant to be public (it's the anonymous/frontend key)
- Use Row Level Security (RLS) in Supabase to protect sensitive data
- Don't put sensitive server-side keys in `VITE_` prefixed variables

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com)
- [Environment Variables in Vite](https://vitejs.dev/guide/env-and-mode.html)
