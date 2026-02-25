import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use('/src', express.static(path.join(__dirname, 'src')));

app.get('/', (req, res) => {
  console.log('Root request received, injecting environment variables...');
  
  try {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    // Inject environment variables into the HTML
    let supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
    
    // If it's just the project ref (no dots or slashes), construct the full URL
    if (supabaseUrl && !supabaseUrl.includes('.') && !supabaseUrl.startsWith('http')) {
      supabaseUrl = `https://${supabaseUrl}.supabase.co`;
    }
    
    // Default fallback if empty or placeholder
    if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
      supabaseUrl = 'https://nfttlgbkdvuutrgmthkz.supabase.co';
    }
    
    let supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    if (!supabaseKey || supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
      supabaseKey = '__SUPABASE_KEY_PLACEHOLDER__'; // Keep placeholder if no key provided
    }
    
    console.log(`Injecting URL: ${supabaseUrl}`);
    
    html = html.replace(/__SUPABASE_URL_PLACEHOLDER__/g, supabaseUrl);
    html = html.replace(/__SUPABASE_KEY_PLACEHOLDER__/g, supabaseKey);
    
    res.send(html);
  } catch (err) {
    console.error('Error serving index.html:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
