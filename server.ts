import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use('/src', express.static(path.join(__dirname, 'src')));

app.get('/', (req, res) => {
  console.log('Root request received, injecting environment variables...');
  
  try {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    // Get Supabase configuration from environment variables
    // Support both VITE_ prefixed and non-prefixed variants
    let supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    let supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
    
    // If it's just the project ref (no dots or slashes), construct the full URL
    if (supabaseUrl && !supabaseUrl.includes('.') && !supabaseUrl.startsWith('http')) {
      supabaseUrl = `https://${supabaseUrl}.supabase.co`;
    }
    
    // Default fallback if empty or placeholder
    if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
      supabaseUrl = 'https://nfttlgbkdvuutrgmthkz.supabase.co';
    }
    
    if (!supabaseKey || supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
      supabaseKey = '__SUPABASE_KEY_PLACEHOLDER__'; // Keep placeholder if no key provided
    }
    
    console.log(`[Supabase Config] URL: ${supabaseUrl}`);
    console.log(`[Supabase Config] Key provided: ${supabaseKey !== '__SUPABASE_KEY_PLACEHOLDER__' ? 'Yes' : 'No'}`);
    
    // Replace placeholders in HTML
    html = html.replace(/__SUPABASE_URL_PLACEHOLDER__/g, supabaseUrl);
    html = html.replace(/__SUPABASE_KEY_PLACEHOLDER__/g, supabaseKey);
    
    res.send(html);
  } catch (err) {
    console.error('Error serving index.html:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log('\n📌 ENVIRONMENT SETUP:');
  console.log('  - VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✓ Set' : '✗ Not set');
  console.log('  - VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not set');
  console.log('\n💡 To fix the "Supabase Key Missing" error:');
  console.log('  Environment variables should be set in your deployment platform.');
  console.log('  For local development, add them to the .env file.');
});
