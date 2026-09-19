import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import nunjucks from 'nunjucks';
import puppeteer from 'puppeteer';

const root = new URL('../', import.meta.url);
const renderer = new nunjucks.Environment(new nunjucks.FileSystemLoader(fileURLToPath(new URL('src/_includes', root))), { autoescape: true });
renderer.addFilter('t', (data, language, key) => key.split('.').reduce((value, part) => value[part], data[language]));
renderer.addFilter('safeJsonLd', value => JSON.stringify(value).replaceAll('<', '\\u003c'));
const i18n = Object.fromEntries(await Promise.all(['en', 'es'].map(async lang => [lang, JSON.parse(await readFile(new URL(`src/_data/i18n/${lang}.json`, root), 'utf8'))])));
const script = await readFile(new URL('src/js/newsletter-signup.js', root), 'utf8');
const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
test.after(() => browser.close());

for (const language of ['en', 'es']) {
  for (const [id, file] of [
    ['newsletter-subscribe-form', 'src/newsletter.njk'],
    ['popup-subscribe-form', 'src/_includes/snippets/footer1.njk'],
    ['big-sword-signup', 'src/_includes/snippets/big-sword-signup.njk'],
  ]) {
    test(`${id} (${language}) validates, prevents duplicates, preserves failures, and confirms`, async () => {
      const source = await readFile(new URL(file, root), 'utf8');
      const form = source.match(new RegExp(`<form id="${id}"[\\s\\S]*?<\\/form>`))[0];
      const page = await browser.newPage();
      try {
        await page.setRequestInterception(true);
        page.on('request', request => request.abort());
        await page.setContent(renderer.renderString(form, { language, es: language === 'es', i18n, projectSignup: id === 'big-sword-signup' ? 'big-sword' : '' }));
        await page.evaluate(() => {
          window.requests = [];
          window.fetch = (url, init) => {
            window.requests.push({ url, body: JSON.parse(init.body) });
            return new Promise(resolve => { window.finish = (success) => resolve(Response.json(success ? { success: true } : { code: 'unavailable' }, { status: success ? 200 : 503 })); });
          };
        });
        await page.addScriptTag({ content: script });
        await page.click('[type="submit"]');
        assert.equal(await page.evaluate(() => window.requests.length), 0);
        await page.type('[name="email"]', 'visitor@example.com');
        if (id === 'big-sword-signup') {
          await page.type('[name="name"]', 'Visitor Name');
          await page.select('[name="interest"]', 'press');
          await page.type('[name="message"]', 'Project inquiry');
          await page.click('[type="submit"]');
          assert.equal(await page.evaluate(() => window.requests.length), 0);
          await page.click('[name="consent"]');
        }
        await page.click('[type="submit"]');
        assert.equal(await page.$eval('form', form => form.getAttribute('aria-busy')), 'true');
        assert.equal(await page.$eval('[name="email"]', input => input.disabled), true);
        await page.$eval('form', form => form.dispatchEvent(new Event('submit', { cancelable: true })));
        assert.equal(await page.evaluate(() => window.requests.length), 1);
        await page.evaluate(() => window.finish(false));
        await page.waitForFunction(() => !document.querySelector('[type="submit"]').disabled);
        assert.equal(await page.$eval('[name="email"]', input => input.value), 'visitor@example.com');
        assert.match(await page.$eval('[data-error]', el => el.textContent), language === 'es' ? /No pudimos/ : /couldn’t confirm/);
        await page.click('[type="submit"]');
        await page.evaluate(() => window.finish(true));
        await page.waitForFunction(() => document.querySelector('[name="email"]').value === '');
        assert.equal(await page.evaluate(() => window.requests.length), 2);
        const body = await page.evaluate(() => window.requests.at(-1).body);
        assert.equal(body.email, 'visitor@example.com');
        if (id === 'big-sword-signup') {
          assert.equal(body.name, 'Visitor Name'); assert.equal(body.interest, 'press'); assert.equal(body.consent, true);
          assert.equal(body.message, 'Project inquiry');
        } else assert.deepEqual(body, { email: 'visitor@example.com' });
        assert.equal(await page.$eval('[data-signup-success], [data-signup-status]', el => el.style.display), 'block');
      } finally { await page.close(); }
    });
  }
}
