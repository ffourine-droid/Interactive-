#!/usr/bin/env node

// Post-build script to inject environment variables into the built HTML
import fs from 'fs';
import path from 'path';
import { loadEnv } from 'vite';

const env = loadEnv('production', '.', 'VITE');

const distPath = path.join(process.cwd(), 'dist', 'index.html');
let html = fs.readFileSync(distPath, 'utf8');

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://nfttlgbkdvuutrgmthkz.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || '';

console.log('[Build] Injecting environment variables...');
console.log(`[Build] Supabase URL: ${supabaseUrl.substring(0, 40)}...`);
console.log(`[Build] Supabase Key: ${supabaseKey ? '✓ Present' : '✗ Missing'}`);

// Replace the placeholders with actual values
html = html.replace(/__VITE_SUPABASE_URL__/g, JSON.stringify(supabaseUrl));
html = html.replace(/__VITE_SUPABASE_KEY__/g, JSON.stringify(supabaseKey));

fs.writeFileSync(distPath, html);
console.log('[Build] ✅ Environment variables injected successfully');
