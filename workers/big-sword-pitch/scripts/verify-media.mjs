// Browser checks for the private, optimized export. Optional live gate login
// uses PITCH_PASSWORD from the environment; credentials are never printed.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const origin = process.argv[2] || 'http://127.0.0.1:8799/';
const browser = await puppeteer.launch({ headless: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage();
    const errors = [], requests = [], finished = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));
    page.on('requestfinished', request => finished.push(request.url()));
    await page.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
    await page.evaluateOnNewDocument(() => {
      document.addEventListener('ShowController:SlideIndexDidChangeEvent', event => { window.pitchSlide = event.detail.slideIndex + 1; });
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    if (await page.$('#password')) {
      assert.ok(process.env.PITCH_PASSWORD, 'Set PITCH_PASSWORD for live acceptance');
      await page.type('#password', process.env.PITCH_PASSWORD);
      await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('button[type=submit]')]);
    }
    await page.waitForFunction(() => window.pitchSlide === 1, { timeout: 60000 });
    await page.waitForSelector('#stage video');
    const opening = await page.$eval('#stage video', video => ({ src: video.src, muted: video.muted, controls: video.controls }));
    assert.match(opening.src, /opening-captioned\.mp4$/);
    assert.equal(opening.muted, false, 'The opening teaser must retain audio');
    assert.equal(opening.controls, false);
    const select = async slide => {
      await pause(350);
      await page.keyboard.type(String(slide)); await page.keyboard.press('Enter');
      await page.waitForFunction(expected => window.pitchSlide === expected, { timeout: 60000 }, slide);
      await pause(350);
    };
    // Wait on the preceding slide until its lookahead has completed, then time
    // first presented video frame. No test calls play() or mutes these loops.
    await select(15);
    const deadline = Date.now() + 60000;
    while (!finished.some(url => url.includes('slide-10-loop') && url.endsWith('.mp4'))) {
      if (Date.now() > deadline) throw new Error('Large animation was not prefetched from the preceding slide');
      await pause(100);
    }
    await pause(1000);
    const countBefore = requests.filter(url => url.includes('slide-10-loop') && url.endsWith('.mp4')).length;
    const start = performance.now();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => window.pitchSlide === 16 && document.querySelector('#stage video')?.readyState >= 2, { timeout: 60000 });
    const frame = await page.$eval('#stage video', video => new Promise(resolve => {
      video.requestVideoFrameCallback(() => resolve({ source: video.currentSrc, time: video.currentTime, muted: video.muted, loop: video.loop, controls: video.controls }));
    }));
    const firstFrameMs = Math.round(performance.now() - start);
    assert.match(frame.source, /^blob:/);
    assert.equal(frame.muted, true); assert.equal(frame.loop, true); assert.equal(frame.controls, false);
    assert.equal(requests.filter(url => url.includes('slide-10-loop') && url.endsWith('.mp4')).length, countBefore);
    assert.ok(firstFrameMs < 2000, `Prefetched animation first frame: ${firstFrameMs}ms`);
    for (const [slide, count] of [[2, 1], [13, 4], [15, 3], [16, 1], [17, 3], [22, 1], [23, 1]]) {
      await select(slide);
      await page.waitForFunction(expected => {
        const videos = [...document.querySelectorAll('#stage video')];
        return videos.length === expected && videos.every(video => !video.paused && !video.ended && video.currentTime > 0.1 && video.muted && video.loop && !video.controls && video.playsInline);
      }, { timeout: 60000 }, count);
      console.log(`Verified ${count} silent autoplay loop(s) on slide ${slide} (${mobile ? 'phone' : 'desktop'})`);
    }
    await select(6);
    await page.waitForNetworkIdle({ idleTime: 700, timeout: 60000 });
    await select(7);
    await page.waitForFunction(() => {
      const gifs = [...document.querySelectorAll('#stage img[id$="-video"]')];
      return gifs.length === 21 && new Set(gifs.map(image => image.src)).size === 8
        && gifs.every(image => image.complete && image.naturalWidth > 0 && image.src.startsWith('blob:'));
    }, { timeout: 60000 });
    console.log(`Verified eight prefetched transparent GIFs (${mobile ? 'phone' : 'desktop'})`);
    assert.deepEqual(errors, []);
    results.push({ viewport: mobile ? 'phone' : 'desktop', firstFrameMs, prefetchedSourceReused: true, automaticLoopsVerified: 14, errors });
    await page.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
