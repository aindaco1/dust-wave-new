// Real decoded audio checks; no play(), muting, or autoplay-policy overrides.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const origin = process.argv[2] || 'http://127.0.0.1:8799/';
const browser = await puppeteer.launch({ headless: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = [];
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
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
    await page.evaluate(() => {
      const context = new AudioContext();
      window.transitionMeters = new WeakMap();
      const attach = () => {
        for (const video of document.querySelectorAll('video')) {
          if (window.transitionMeters.has(video)) continue;
          const source = context.createMediaElementSource(video);
          const analyser = context.createAnalyser();
          analyser.fftSize = 1024;
          source.connect(analyser); analyser.connect(context.destination);
          const meter = { maximum: 0, samples: new Float32Array(analyser.fftSize) };
          window.transitionMeters.set(video, meter);
          const measure = () => {
            analyser.getFloatTimeDomainData(meter.samples);
            const rms = Math.sqrt(meter.samples.reduce((sum, value) => sum + value * value, 0) / meter.samples.length);
            meter.maximum = Math.max(meter.maximum, rms);
            if (video.isConnected) requestAnimationFrame(measure);
          };
          requestAnimationFrame(measure);
        }
      };
      new MutationObserver(attach).observe(document, { childList: true, subtree: true });
      for (const event of ['keydown', 'pointerdown', 'touchstart']) document.addEventListener(event, () => context.resume(), { capture: true });
      attach();
    });
    const waitSlide = async slide => {
      await page.waitForFunction(expected => window.pitchSlide === expected, { timeout: 60000 }, slide);
      await pause(300);
    };
    const select = async slide => {
      await pause(350);
      await page.keyboard.type(String(slide)); await page.keyboard.press('Enter');
      await waitSlide(slide);
    };
    const advance = async () => {
      if (mobile) {
        const box = await (await page.$('#stage')).boundingBox();
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      } else await page.keyboard.press('ArrowRight');
    };
    for (const slide of [3, 10, 14, 27]) {
      await select(slide - 1);
      // Allow the normal neighboring-slide preload to finish before entering.
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 60000 });
      await advance();
      await page.waitForFunction(expected => window.pitchSlide === expected &&
        window.transitionMeters.get(document.querySelector('#stage video'))?.maximum > 0.005,
      { timeout: 15000 }, slide);
      const video = await page.$('#stage video');
      const state = await video.evaluate(element => ({
        muted: element.muted, volume: element.volume, controls: element.controls,
        inline: element.playsInline, loop: element.loop, paused: element.paused,
        time: element.currentTime, duration: element.duration,
        audioRms: window.transitionMeters.get(element).maximum,
      }));
      assert.equal(state.muted, false); assert.ok(state.volume > 0);
      assert.equal(state.controls, false); assert.equal(state.inline, true);
      assert.equal(state.loop, false); assert.equal(state.paused, false);
      assert.ok(state.time < state.duration, 'Navigation check must happen during playback');
      if (slide === 27) await page.keyboard.press('ArrowLeft');
      else await advance();
      await waitSlide(slide === 27 ? 26 : slide + 1);
      assert.equal(await video.evaluate(element => element.paused), true, 'Departed transition audio must stop');
      await video.dispose();
      await select(slide - 1); await advance();
      await page.waitForFunction(expected => window.pitchSlide === expected &&
        document.querySelector('#stage video')?.ended, { timeout: 15000 }, slide);
      const end = await page.$eval('#stage video', element => element.currentTime);
      await pause(400);
      assert.equal(await page.$eval('#stage video', element => element.currentTime), end, 'Transition must remain ended');
      results.push({ viewport: mobile ? 'phone' : 'desktop', slide, ...state, stopsOnDeparture: true, endsOnceOnRevisit: true });
      console.log(`Verified audible transition ${slide} (${mobile ? 'phone tap' : 'desktop key'}), departure and one-shot replay`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
