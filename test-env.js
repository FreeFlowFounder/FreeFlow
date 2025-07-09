// Quick test to check environment variables
console.log('Testing environment variables...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('All env vars starting with VITE_:', Object.keys(process.env).filter(key => key.startsWith('VITE_')));

// Try to read from .env file directly
import fs from 'fs';
try {
  const envFile = fs.readFileSync('.env', 'utf8');
  console.log('Found .env file with content length:', envFile.length);
  console.log('First 100 chars:', envFile.substring(0, 100));
} catch (error) {
  console.log('Could not read .env file:', error.message);
}