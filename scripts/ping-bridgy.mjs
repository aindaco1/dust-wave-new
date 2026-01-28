#!/usr/bin/env node
/**
 * Bridgy Fed Webmention Ping Script
 * 
 * Sends webmentions to Bridgy Fed for posts marked with syndicate: ["fediverse"]
 * This triggers federation to the Fediverse via Bridgy Fed.
 * 
 * Usage: node scripts/ping-bridgy.mjs [--all | --changed]
 * 
 * Options:
 *   --all      Send webmentions for all fediverse-enabled posts
 *   --changed  Only send for recently changed posts (default, uses git diff)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SITE_URL = 'https://dustwave.xyz';
const BRIDGY_FED_URL = 'https://fed.brid.gy/';

// Parse frontmatter from markdown file
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  
  const frontmatter = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let inArray = false;
  let arrayItems = [];
  
  for (const line of lines) {
    // Check for array items
    if (line.trim().startsWith('- ') && currentKey) {
      const item = line.trim().substring(2).trim();
      // Remove quotes if present
      const cleanItem = item.replace(/^["']|["']$/g, '');
      arrayItems.push(cleanItem);
      continue;
    }
    
    // If we were building an array, save it
    if (inArray && arrayItems.length > 0) {
      frontmatter[currentKey] = arrayItems;
      arrayItems = [];
      inArray = false;
    }
    
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      currentKey = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // Check if this is the start of an array
      if (value === '' || value === '[]') {
        inArray = true;
        arrayItems = [];
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array like syndicate: ["fediverse", "substack"]
        try {
          frontmatter[currentKey] = JSON.parse(value.replace(/'/g, '"'));
        } catch {
          frontmatter[currentKey] = value;
        }
      } else {
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        frontmatter[currentKey] = value;
      }
    }
  }
  
  // Handle trailing array
  if (inArray && arrayItems.length > 0 && currentKey) {
    frontmatter[currentKey] = arrayItems;
  }
  
  return frontmatter;
}

// Slugify a title (matches Eleventy's slugify filter)
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Get changed files from git
function getChangedFiles() {
  try {
    // Get files changed in the last commit or staged changes
    const output = execSync('git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only --cached 2>/dev/null || echo ""', {
      cwd: ROOT,
      encoding: 'utf-8'
    });
    return output.split('\n').filter(f => f.trim());
  } catch (e) {
    console.log('Could not get git diff, falling back to all files');
    return null;
  }
}

// Get all markdown files from a directory (recursive)
function getMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Send webmention to Bridgy Fed with retry logic
async function sendWebmention(sourceUrl, retries = 2) {
  console.log(`📤 Sending webmention for: ${sourceUrl}`);
  
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const response = await fetch(BRIDGY_FED_URL + 'webmention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          source: sourceUrl,
          target: BRIDGY_FED_URL
        })
      });
      
      if (response.ok) {
        const text = await response.text();
        console.log(`   ✅ Success: ${response.status} - ${text.substring(0, 60)}`);
        return true;
      } else {
        const text = await response.text();
        console.log(`   ⚠️  Response: ${response.status} - ${text.substring(0, 100)}`);
        if (attempt <= retries) {
          console.log(`   🔄 Retrying in 3s (attempt ${attempt + 1}/${retries + 1})...`);
          await delay(3000);
        }
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      if (attempt <= retries) {
        console.log(`   🔄 Retrying in 3s (attempt ${attempt + 1}/${retries + 1})...`);
        await delay(3000);
      }
    }
  }
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const sendAll = args.includes('--all');
  
  console.log('🌐 Bridgy Fed Webmention Ping\n');
  
  // Collect all fediverse-enabled posts
  const fediversePosts = [];
  const dirs = [
    { path: path.join(ROOT, 'src/posts'), urlPrefix: '/project/' },
    { path: path.join(ROOT, 'src/news'), urlPrefix: '/' }
  ];
  
  for (const dir of dirs) {
    for (const file of getMarkdownFiles(dir.path)) {
      const content = fs.readFileSync(file, 'utf-8');
      const fm = parseFrontmatter(content);
      
      if (!fm.title) continue;
      
      // Check if post is marked for fediverse syndication
      const syndicate = fm.syndicate || [];
      if (!Array.isArray(syndicate) || !syndicate.includes('fediverse')) {
        continue;
      }
      
      const slug = slugify(fm.title);
      // posts use /project/<slug>.html, news use /<slug>.html
      const url = dir.urlPrefix === '/project/' 
        ? `${SITE_URL}/project/${slug}.html`
        : `${SITE_URL}/${slug}.html`;
      
      fediversePosts.push({
        file: path.relative(ROOT, file),
        title: fm.title,
        url
      });
    }
  }
  
  console.log(`Found ${fediversePosts.length} fediverse-enabled post(s)\n`);
  
  if (fediversePosts.length === 0) {
    console.log('No posts to federate. Add syndicate: ["fediverse"] to post frontmatter.\n');
    return;
  }
  
  // Filter to changed files if not --all
  let postsToSend = fediversePosts;
  if (!sendAll) {
    const changedFiles = getChangedFiles();
    if (changedFiles) {
      postsToSend = fediversePosts.filter(p => 
        changedFiles.some(f => f.includes(path.basename(p.file, '.md')))
      );
      console.log(`Filtering to ${postsToSend.length} changed post(s)\n`);
    }
  }
  
  if (postsToSend.length === 0) {
    console.log('No changed posts to federate.\n');
    console.log('Use --all to send webmentions for all fediverse-enabled posts.\n');
    return;
  }
  
  // Send webmentions with delay between each to avoid rate limiting
  let success = 0;
  let failed = 0;
  const DELAY_BETWEEN_POSTS_MS = 5000; // 5 seconds between posts
  
  for (let i = 0; i < postsToSend.length; i++) {
    const post = postsToSend[i];
    console.log(`\n📝 [${i + 1}/${postsToSend.length}] ${post.title}`);
    const result = await sendWebmention(post.url);
    if (result) success++;
    else failed++;
    
    // Wait between posts (but not after the last one)
    if (i < postsToSend.length - 1) {
      console.log(`   ⏳ Waiting ${DELAY_BETWEEN_POSTS_MS / 1000}s before next post...`);
      await delay(DELAY_BETWEEN_POSTS_MS);
    }
  }
  
  console.log(`\n📊 Summary: ${success} sent, ${failed} failed\n`);
}

main().catch(console.error);
