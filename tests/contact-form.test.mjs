import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import nunjucks from 'nunjucks';
import * as sass from 'sass';
import puppeteer from 'puppeteer';

const root = new URL('../', import.meta.url);
const template = matter(await readFile(new URL('src/contact.njk', root), 'utf8')).content;
const i18n = Object.fromEntries(await Promise.all(['en', 'es'].map(async language =>
  [language, JSON.parse(await readFile(new URL(`src/_data/i18n/${language}.json`, root), 'utf8'))])));
const renderer = new nunjucks.Environment(null, { autoescape: true });
renderer.addFilter('t', (data, language, key) => key.split('.').reduce((value, part) => value[part], data[language]));
const styles = sass.compile(fileURLToPath(new URL('src/scss/theme.scss', root)), { logger: sass.Logger.silent }).css;
const assets = new Map(await Promise.all([
  ...['contact-form', 'turnstile'].map(name => [`/js/${name}.js`, `src/js/${name}.js`]),
  ...['turnstile', 'turnstile-browser'].map(name => [
    `/js/dust-wave-admin-shell/${name}.js`, `shared/dust-wave-platform/packages/admin-shell/src/${name}.js`
  ])
].map(async ([url, file]) => [url, await readFile(new URL(file, root), 'utf8')])));
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (assets.has(url.pathname)) {
    res.setHeader('Content-Type', 'text/javascript'); res.end(assets.get(url.pathname)); return;
  }
  if (url.pathname === '/theme.css') {
    res.setHeader('Content-Type', 'text/css'); res.end(styles); return;
  }
  const language = url.pathname.startsWith('/es/') ? 'es' : 'en';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><html lang="${language}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/theme.css"></head><body>${renderer.renderString(template, {
    language, i18n, title: i18n[language].pages.contact.title, assets: { version: 'fixture' }
  })}</body></html>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });

async function fixture(language = 'en', { scriptFailure = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  // All external requests are blocked. Neither CAPTCHA nor Formspree is contacted.
  await page.setRequestInterception(true);
  page.on('request', request => request.url().startsWith(origin) ? request.continue() : request.abort());
  await page.evaluateOnNewDocument(fail => {
    window.requests = []; window.resets = 0; window.sizes = [];
    let options;
    window.fakeAPI = {
      render(container, config) {
        options = config; window.sizes.push(config.size);
        const frame = document.createElement('iframe'); frame.title = 'Local verification fixture';
        Object.assign(frame.style, { border: '0', width: config.size === 'compact' ? '150px' : '100%', minWidth: config.size === 'compact' ? '150px' : '300px', height: config.size === 'compact' ? '140px' : '65px' });
        container.append(frame); return 'fixture-widget';
      },
      reset() { window.resets++; },
      remove() { document.querySelector('[data-contact-challenge]').replaceChildren(); }
    };
    if (!fail) window.turnstile = window.fakeAPI;
    window.verifyFixture = () => options.callback('local-test-token');
    window.expireFixture = () => options['expired-callback']();
    window.failFixture = () => options['error-callback']();
    window.fetch = async (url, init) => {
      window.requests.push({ url, method: init.method, headers: init.headers, credentials: init.credentials, data: [...init.body] });
      return new Promise((resolve, reject) => {
        window.respond = (status = 200, body = { ok: true }) => resolve(new Response(JSON.stringify(body), { status }));
        window.networkFailure = () => reject(new TypeError('Local simulated network failure'));
        init.signal.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')));
      });
    };
  }, scriptFailure);
  await page.goto(`${origin}/${language === 'es' ? 'es/' : ''}contact.html`);
  if (scriptFailure) await page.waitForSelector('[data-contact-retry]:not([hidden])');
  else await page.waitForSelector('[data-contact-challenge] iframe');
  await page.type('[name="email"]', 'local-test@example.com');
  await page.type('[name="name"]', 'Local fixture');
  await page.type('[name="message"]', 'Retained draft');
  return page;
}
const statusText = page => page.$eval('[role="status"]', el => el.textContent);
const submitDisabled = page => page.$eval('[type="submit"]', el => el.disabled);
async function submit(page) {
  await page.evaluate(() => window.verifyFixture()); await page.click('[type="submit"]');
  await page.waitForFunction(() => window.requests.length > 0);
}
async function finished(page) { await page.waitForFunction(() => !document.querySelector('form').hasAttribute('aria-busy')); }

try {
  for (const language of ['en', 'es']) {
    await test(`${language}: loading clears when the widget mounts and success ends verification permanently`, async () => {
      const page = await fixture(language), originalURL = page.url();
      // The widget is ready for interaction, but has not verified the visitor.
      assert.equal(await statusText(page), '');
      assert.equal(await submitDisabled(page), true);
      assert.equal(await page.$eval('[data-contact-retry]', el => getComputedStyle(el).display), 'none');
      if (process.env.CONTACT_FORM_SCREENSHOTS) await page.screenshot({ path: `${process.env.CONTACT_FORM_SCREENSHOTS}/${language}-ready.png`, fullPage: true });
      await submit(page);
      assert.equal(await submitDisabled(page), true);
      assert.equal(await page.$eval('[name="message"]', el => el.disabled), true);
      // A second submit event during the pending request cannot send twice.
      await page.$eval('form', el => el.dispatchEvent(new Event('submit', { cancelable: true })));
      const requests = await page.evaluate(() => window.requests);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].url, 'https://formspree.io/f/xrgrjbwo');
      assert.equal(requests[0].method, 'POST'); assert.equal(requests[0].headers.Accept, 'application/json');
      assert.equal(requests[0].credentials, 'omit');
      assert.deepEqual(Object.fromEntries(requests[0].data), {
        email: 'local-test@example.com', name: 'Local fixture', message: 'Retained draft',
        _subject: i18n[language].pages.contact.subject, 'cf-turnstile-response': 'local-test-token'
      });
      await page.evaluate(() => window.respond()); await finished(page);
      assert.equal(page.url(), originalURL); assert.equal(await statusText(page), i18n[language].pages.contact.sent);
      assert.equal(await page.$eval('[name="message"]', el => el.value), '');
      assert.equal(await submitDisabled(page), true);
      assert.equal(await page.evaluate(() => window.resets), 0);
      assert.equal(await page.$eval('[data-contact-challenge]', el => getComputedStyle(el).display), 'none');
      assert.equal(await page.$$eval('.contact-form__item', els => els.every(el => getComputedStyle(el).display === 'none')), true);
      assert.equal(await page.$eval('[role="status"]', el => document.activeElement === el), true);
      // Resizing and late callbacks must not recreate verification or overwrite success.
      await page.setViewport({ width: 320, height: 844 });
      await page.evaluate(() => {
        window.expireFixture(); window.failFixture(); window.verifyFixture();
        document.querySelector('[data-contact-retry]').click();
        document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
      });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.$$eval('[data-contact-challenge] iframe', els => els.length), 0);
      assert.deepEqual(await page.evaluate(() => ({ renders: window.sizes.length, resets: window.resets, requests: window.requests.length })), { renders: 1, resets: 0, requests: 1 });
      assert.equal(await statusText(page), i18n[language].pages.contact.sent);
      assert.equal(await page.$eval('[data-contact-retry]', el => el.hidden), true);
      if (process.env.CONTACT_FORM_SCREENSHOTS) await page.screenshot({ path: `${process.env.CONTACT_FORM_SCREENSHOTS}/${language}-success-mobile.png`, fullPage: true });
      await page.close();
    });
  }
  await test('provider and network failures retain the draft and require fresh verification', async () => {
    for (const [status, body, message] of [
      [400, { errors: [{ code: 'FORM_ERROR', field: 'cf-turnstile-response' }] }, 'verificationFailed'],
      [422, { errors: [{ code: 'TYPE_EMAIL', field: 'email' }] }, 'sendFailed'],
      [429, {}, 'rateLimited'], [500, {}, 'sendFailed'], [200, { ok: false }, 'sendFailed'],
      [null, null, 'deliveryUnknown']
    ]) {
      const page = await fixture(); await submit(page);
      await page.evaluate(({ status, body }) => status ? window.respond(status, body) : window.networkFailure(), { status, body });
      await finished(page);
      assert.equal(await statusText(page), i18n.en.pages.contact[message]);
      assert.equal(await page.$eval('[name="message"]', el => el.value), 'Retained draft');
      assert.equal(await page.$eval('[name="message"]', el => el.disabled), false);
      assert.equal(await page.$eval('[name="message"]', el => el.closest('.contact-form__item').hidden), false);
      assert.equal(await page.evaluate(() => window.resets), 1);
      assert.equal(await submitDisabled(page), true); assert.equal(page.url(), `${origin}/contact.html`);
      await page.close();
    }
  });
  await test('verification expiry, errors, and blocked loader can be retried without losing the draft', async () => {
    const page = await fixture('es', { scriptFailure: true });
    assert.equal(await statusText(page), i18n.es.pages.contact.verificationFailed);
    await page.evaluate(() => { window.turnstile = window.fakeAPI; });
    await page.click('[data-contact-retry]'); await page.waitForSelector('[data-contact-challenge] iframe');
    assert.equal(await statusText(page), '');
    await page.evaluate(() => { window.verifyFixture(); window.expireFixture(); });
    assert.equal(await submitDisabled(page), true);
    assert.equal(await statusText(page), i18n.es.pages.contact.verificationExpired);
    await page.evaluate(() => window.failFixture());
    await page.click('[data-contact-retry]'); await page.evaluate(() => window.verifyFixture());
    assert.equal(await submitDisabled(page), false);
    assert.equal(await page.$eval('[name="message"]', el => el.value), 'Retained draft');
    await page.close();
  });
  await test('verification fits the form gutters with at least 24px before submit at mobile and desktop widths', async () => {
    const page = await fixture();
    for (const width of [1440, 390, 320, 375, 768, 1440]) {
      await page.setViewport({ width, height: 1000 });
      await page.waitForFunction(() => {
        const width = document.querySelector('[data-contact-challenge]').getBoundingClientRect().width;
        return window.sizes.at(-1) === (width < 300 ? 'compact' : 'flexible');
      });
      const bounds = await page.evaluate(() => {
        const frame = document.querySelector('[data-contact-challenge] iframe').getBoundingClientRect();
        const field = document.querySelector('[name="message"]').getBoundingClientRect();
        const button = document.querySelector('[type="submit"]').getBoundingClientRect();
        return { left: frame.left, right: frame.right, fieldLeft: field.left, fieldRight: field.right, gap: button.top - frame.bottom, width: document.documentElement.scrollWidth };
      });
      assert(bounds.left >= bounds.fieldLeft && bounds.right <= bounds.fieldRight + 1);
      assert(bounds.right <= width - 24); assert(bounds.gap >= 24); assert.equal(bounds.width, width);
    }
    await page.close();
  });
  await test('without JavaScript the form cannot navigate to Formspree', async () => {
    const page = await browser.newPage(); await page.setJavaScriptEnabled(false);
    await page.goto(`${origin}/contact.html`);
    assert.equal(await submitDisabled(page), true);
    assert.equal(await page.$eval('noscript', el => el.textContent.trim()), i18n.en.pages.contact.javascriptRequired);
    await page.type('[name="email"]', 'local-test@example.com'); await page.keyboard.press('Enter');
    assert.equal(page.url(), `${origin}/contact.html`); await page.close();
  });
} finally {
  const timeout = setTimeout(() => browser.process()?.kill('SIGKILL'), 4000);
  try { await browser.close(); } finally { clearTimeout(timeout); }
  await new Promise(resolve => server.close(resolve));
}
