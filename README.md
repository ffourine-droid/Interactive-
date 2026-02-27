<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4266702e-bd8c-475a-a5db-76632acb30c2

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with your Supabase credentials and Gemini API key:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   GEMINI_API_KEY=your-gemini-key
   APP_URL=http://localhost:3000
   ```
3. Run the app:
   ```bash
   npm run dev
   ```

## Deploy

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. In **Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL` → Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → Your Supabase anonymous key
   - `GEMINI_API_KEY` → Your Gemini API key (optional)
4. Deploy and wait for the build to complete

**⚠️ Seeing "Supabase Key Missing"?** See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for detailed troubleshooting.

### Setup Supabase

For detailed setup instructions, see [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

Quick steps:
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy your Project URL and Anon Key
3. Set these as environment variables in your deployment platform
