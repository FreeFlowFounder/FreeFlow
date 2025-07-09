#!/usr/bin/env node

// Frontend-only build script for Vercel
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function buildFrontend() {
  console.log('Building frontend with Vite...');
  try {
    const { stdout, stderr } = await execAsync('npx vite build');
    console.log('Build output:', stdout);
    if (stderr) console.error('Build warnings:', stderr);
    console.log('Frontend build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildFrontend();