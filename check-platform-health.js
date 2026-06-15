#!/usr/bin/env node
import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function log(status, category, message) {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} [${category}] ${message}`);
  
  if (status === 'pass') results.passed.push({ category, message });
  else if (status === 'fail') results.failed.push({ category, message });
  else results.warnings.push({ category, message });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ENVIRONMENT VARIABLES CHECK
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🔍 CHECKING ENVIRONMENT VARIABLES...\n');

const requiredEnvVars = [
  { name: 'DATABASE_URL', required: true },
  { name: 'SESSION_SECRET', required: true },
  { name: 'APP_URL', required: true },
  { name: 'PORT', required: false }
];

const apiKeys = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'META_APP_ID',
  'META_APP_SECRET',
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
  'TWITTER_CLIENT_ID',
  'TWITTER_CLIENT_SECRET',
  'YOUTUBE_CLIENT_ID',
  'YOUTUBE_CLIENT_SECRET',
  'GROQ_API_KEY',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC2_API_KEY',
  'OPENROUTER_API_KEY',
  'RUNWARE_API_KEY',
  'GOOGLE_API_KEY_IMAGE',
  'APIFY_TOKEN',
  'APIFY_INSTAGRAM_TOKEN',
  'TOKEN_ENCRYPTION_KEY',
  'EMAIL_USER',
  'EMAIL_PASS',
  'LIVEKIT_URL',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET'
];

// Check required env vars
requiredEnvVars.forEach(({ name, required }) => {
  if (process.env[name]) {
    log('pass', 'ENV', `${name} is set`);
  } else {
    if (required) {
      log('fail', 'ENV', `${name} is MISSING (required)`);
    } else {
      log('warn', 'ENV', `${name} is not set (optional)`);
    }
  }
});

// Check API keys
console.log('\n🔑 CHECKING API KEYS...\n');
apiKeys.forEach(key => {
  if (process.env[key]) {
    const value = process.env[key];
    const masked = value.substring(0, 4) + '...' + value.substring(value.length - 4);
    log('pass', 'API_KEY', `${key} is configured (${masked})`);
  } else {
    log('warn', 'API_KEY', `${key} is not configured`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. DATABASE CONNECTION CHECK
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🗄️  CHECKING DATABASE CONNECTION...\n');

async function checkDatabase() {
  if (!process.env.DATABASE_URL) {
    log('fail', 'DATABASE', 'DATABASE_URL not configured');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const client = await pool.connect();
    log('pass', 'DATABASE', 'Successfully connected to PostgreSQL');
    
    // Check database version
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version.split(' ')[1];
    log('pass', 'DATABASE', `PostgreSQL version: ${version}`);
    
    // Check if critical tables exist
    const tables = [
      'users',
      'content_posts',
      'onboarding_survey',
      'community_posts',
      'community_likes',
      'session'
    ];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        log('pass', 'DATABASE', `Table '${table}' exists`);
      } else {
        log('fail', 'DATABASE', `Table '${table}' is MISSING`);
      }
    }
    
    // Check users table
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    log('pass', 'DATABASE', `Total users: ${userCount.rows[0].count}`);
    
    client.release();
    await pool.end();
  } catch (error) {
    log('fail', 'DATABASE', `Connection failed: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. FILE SYSTEM CHECKS
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📁 CHECKING FILE SYSTEM...\n');

const criticalFiles = [
  'package.json',
  'server/index.ts',
  'server/routes.ts',
  'server/auth.ts',
  'server/storage.ts',
  'client/src/App.tsx',
  'shared/schema.ts',
  'drizzle.config.ts'
];

criticalFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    log('pass', 'FILES', `${file} exists`);
  } else {
    log('fail', 'FILES', `${file} is MISSING`);
  }
});

// Check uploads directory
const uploadsDir = path.join(process.cwd(), 'uploads');
if (fs.existsSync(uploadsDir)) {
  log('pass', 'FILES', 'uploads/ directory exists');
  const uploadFiles = fs.readdirSync(uploadsDir);
  log('pass', 'FILES', `uploads/ contains ${uploadFiles.length} files`);
} else {
  log('warn', 'FILES', 'uploads/ directory does not exist');
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. NPM DEPENDENCIES CHECK
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📦 CHECKING NPM DEPENDENCIES...\n');

const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  log('pass', 'DEPS', 'node_modules/ exists');
  
  const criticalDeps = [
    'express',
    'react',
    'drizzle-orm',
    'passport',
    'pg',
    '@anthropic-ai/sdk',
    '@google/generative-ai',
    'livekit-server-sdk',
    'twilio',
    'nodemailer'
  ];
  
  criticalDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
      log('pass', 'DEPS', `${dep} is installed`);
    } else {
      log('fail', 'DEPS', `${dep} is NOT installed`);
    }
  });
} else {
  log('fail', 'DEPS', 'node_modules/ does NOT exist - run npm install');
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. PORT AVAILABILITY CHECK
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🌐 CHECKING PORT AVAILABILITY...\n');

const port = parseInt(process.env.PORT || '5001', 10);
import { createServer } from 'http';

function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        log('warn', 'PORT', `Port ${port} is already in use`);
        resolve(false);
      } else {
        log('fail', 'PORT', `Port ${port} check failed: ${err.message}`);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      log('pass', 'PORT', `Port ${port} is available`);
      resolve(true);
    });
    
    server.listen(port);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN ALL CHECKS
// ═══════════════════════════════════════════════════════════════════════════
(async () => {
  await checkDatabase();
  await checkPort(port);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('📊 HEALTH CHECK SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log('='.repeat(70) + '\n');
  
  if (results.failed.length > 0) {
    console.log('❌ CRITICAL ISSUES:\n');
    results.failed.forEach(({ category, message }) => {
      console.log(`   • [${category}] ${message}`);
    });
    console.log('');
  }
  
  if (results.warnings.length > 0) {
    console.log('⚠️  WARNINGS (non-critical):\n');
    results.warnings.forEach(({ category, message }) => {
      console.log(`   • [${category}] ${message}`);
    });
    console.log('');
  }
  
  if (results.failed.length === 0) {
    console.log('🎉 ALL CRITICAL CHECKS PASSED!\n');
    console.log('Your Oravini platform is properly configured.\n');
  } else {
    console.log('⚠️  PLEASE FIX THE ISSUES ABOVE BEFORE RUNNING THE PLATFORM\n');
    process.exit(1);
  }
})();
