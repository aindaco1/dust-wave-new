#!/usr/bin/env node
/**
 * OG Card Generator for Dust Wave
 * 
 * Generates Open Graph images (1200×630) for news and project pages.
 * Uses Puppeteer to render an HTML template to PNG.
 * 
 * Usage: node scripts/render-og-cards.mjs
 * 
 * Sources:
 * - Projects: uses src/img/stills/<slug>.jpg as background
 * - News: uses src/img/news/<slug>.jpg as background
 * - Fallback: uses a branded template with title overlay
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Directories
const POSTS_DIR = path.join(ROOT, 'src/posts');
const NEWS_DIR = path.join(ROOT, 'src/news');
const STILLS_DIR = path.join(ROOT, 'src/img/stills');
const NEWS_IMG_DIR = path.join(ROOT, 'src/img/news');
const OUTPUT_DIR = path.join(ROOT, 'docs/img/og');
const DEV_OUTPUT_DIR = path.join(ROOT, 'dev/img/og');

// Ensure output directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Parse frontmatter from markdown file
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  
  const frontmatter = {};
  const lines = match[1].split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
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

// Find source image for a post
function findSourceImage(slug, type) {
  const imgDir = type === 'post' ? STILLS_DIR : NEWS_IMG_DIR;
  const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
  
  for (const ext of extensions) {
    const imgPath = path.join(imgDir, slug + ext);
    if (fs.existsSync(imgPath)) {
      return imgPath;
    }
  }
  
  // Try common naming patterns
  const patterns = [
    slug + 'still',
    slug.replace(/-/g, ''),
  ];
  
  for (const pattern of patterns) {
    for (const ext of extensions) {
      const imgPath = path.join(imgDir, pattern + ext);
      if (fs.existsSync(imgPath)) {
        return imgPath;
      }
    }
  }
  
  return null;
}

// Generate HTML template for OG card
function generateOgHtml(title, summary, backgroundImage) {
  const bgStyle = backgroundImage 
    ? `background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('file://${backgroundImage}'); background-size: cover; background-position: center;`
    : 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700;900&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 1200px;
      height: 630px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 60px;
      font-family: 'Inter', 'Gambado-Sans', system-ui, sans-serif;
      color: white;
      ${bgStyle}
    }
    
    .content {
      max-width: 900px;
    }
    
    .brand {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-bottom: 20px;
      opacity: 0.9;
    }
    
    .title {
      font-size: 64px;
      font-weight: 900;
      line-height: 1.1;
      margin-bottom: 20px;
      text-shadow: 2px 2px 8px rgba(0,0,0,0.5);
    }
    
    .summary {
      font-size: 24px;
      font-weight: 400;
      line-height: 1.4;
      opacity: 0.9;
      max-width: 700px;
    }
    
    .logo {
      position: absolute;
      top: 40px;
      right: 60px;
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 32px;
      color: #1a1a2e;
    }
  </style>
</head>
<body>
  <div class="logo">DW</div>
  <div class="content">
    <div class="brand">DUST WAVE</div>
    <div class="title">${escapeHtml(title)}</div>
    ${summary ? `<div class="summary">${escapeHtml(summary)}</div>` : ''}
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Get all markdown files from a directory
function getMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && !f.endsWith('.json'))
    .map(f => path.join(dir, f));
}

async function main() {
  console.log('🎨 Generating OG cards for Dust Wave...\n');
  
  // Check if Puppeteer is available
  let puppeteer;
  try {
    puppeteer = await import('puppeteer');
  } catch (e) {
    console.log('⚠️  Puppeteer not installed. Skipping OG card generation.');
    console.log('   To enable OG cards, run: npm install puppeteer');
    console.log('   Or install as dev dependency: npm install -D puppeteer\n');
    
    // Create placeholder default OG image using a simple approach
    ensureDir(OUTPUT_DIR);
    ensureDir(DEV_OUTPUT_DIR);
    console.log('📁 Created output directories for future use.\n');
    return;
  }
  
  ensureDir(OUTPUT_DIR);
  ensureDir(DEV_OUTPUT_DIR);
  
  // Collect all posts/news
  const items = [];
  
  // Process posts
  for (const file of getMarkdownFiles(POSTS_DIR)) {
    const content = fs.readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm.title) continue;
    
    const slug = slugify(fm.title);
    const sourceImg = fm.img 
      ? path.join(ROOT, 'src', fm.img.replace(/^\//, ''))
      : findSourceImage(slug, 'post');
    
    items.push({
      type: 'post',
      slug,
      title: fm.title,
      summary: fm.summary || fm.description || '',
      sourceImg: sourceImg && fs.existsSync(sourceImg) ? sourceImg : null
    });
  }
  
  // Process news
  for (const file of getMarkdownFiles(NEWS_DIR)) {
    const content = fs.readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm.title) continue;
    
    const slug = slugify(fm.title);
    const sourceImg = fm.img 
      ? path.join(ROOT, 'src', fm.img.replace(/^\//, ''))
      : findSourceImage(slug, 'news');
    
    items.push({
      type: 'news',
      slug,
      title: fm.title,
      summary: fm.summary || fm.description || '',
      sourceImg: sourceImg && fs.existsSync(sourceImg) ? sourceImg : null
    });
  }
  
  console.log(`Found ${items.length} items to process\n`);
  
  // Launch browser
  const browser = await puppeteer.default.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  
  let generated = 0;
  let skipped = 0;
  
  for (const item of items) {
    const outputPath = path.join(OUTPUT_DIR, `${item.slug}.png`);
    const devOutputPath = path.join(DEV_OUTPUT_DIR, `${item.slug}.png`);
    
    // Skip if already exists (for incremental builds)
    if (fs.existsSync(outputPath) && fs.existsSync(devOutputPath)) {
      skipped++;
      continue;
    }
    
    try {
      const html = generateOgHtml(item.title, item.summary, item.sourceImg);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Save to both output directories
      await page.screenshot({ path: outputPath, type: 'png' });
      fs.copyFileSync(outputPath, devOutputPath);
      
      console.log(`✅ Generated: ${item.slug}.png`);
      generated++;
    } catch (err) {
      console.error(`❌ Error generating ${item.slug}:`, err.message);
    }
  }
  
  await browser.close();
  
  console.log(`\n📊 Summary: ${generated} generated, ${skipped} skipped (already exist)`);
  console.log(`📁 Output: ${OUTPUT_DIR}\n`);
}

main().catch(console.error);
