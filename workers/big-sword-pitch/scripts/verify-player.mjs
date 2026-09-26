// Browser acceptance against a locally served, private prepared export.
// Uses the website's existing Puppeteer dependency; no private fixtures in Git.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const origin = process.argv[2] || 'http://127.0.0.1:8799/';
const browser = await puppeteer.launch({ headless: true });
let page = await browser.newPage();
const errors = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const observePage = async () => {
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(() => {
    document.addEventListener('ShowController:SlideIndexDidChangeEvent', event => {
      window.pitchSlide = event.detail.slideIndex + 1;
    });
  });
};
await observePage();
const waitForSlide = async slide => {
  await page.waitForFunction(expected => window.pitchSlide === expected, { timeout: 15000 }, slide);
  await pause(250);
  console.log(`Verified slide ${slide}`);
};
const selectSlide = async slide => {
  await page.keyboard.type(String(slide));
  await page.keyboard.press('Enter');
  await waitForSlide(slide);
};
const step = async (key, slide) => {
  await page.keyboard.press(key);
  await waitForSlide(slide);
};
const videoNavigation = async (slide, input, destination) => {
  await selectSlide(slide);
  await page.waitForSelector('#stage video');
  const video = await page.$('#stage video');
  // Muting is confined to this test so autoplay policy cannot produce a false
  // pass by testing a paused clip. Production retains the original audio.
  await video.evaluate(async element => { element.muted = true; await element.play(); });
  await page.waitForFunction(() => {
    const element = document.querySelector('#stage video');
    return element && !element.paused && !element.ended && element.currentTime > 0.15;
  });
  const box = await video.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  // Dispatch too: a hover listener must not re-enable controls even if the
  // browser sends a media event directly rather than hit-testing the slide.
  await video.evaluate(element => element.dispatchEvent(new MouseEvent('mouseover')));
  assert.deepEqual(await video.evaluate(element => ({ controls: element.controls, inline: element.playsInline })),
    { controls: false, inline: true });
  assert.equal(await video.evaluate(element => !element.paused && !element.ended), true);
  if (input === 'click') await page.mouse.click(x, y);
  else if (input === 'tap') await page.touchscreen.tap(x, y);
  else await page.keyboard.press(input);
  await waitForSlide(destination);
  assert.equal(await video.evaluate(element => element.paused), true, 'Departed video must stop, including audio');
  await video.dispose();
  console.log(`Verified playing video on slide ${slide}: ${input}`);
};
try {
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await waitForSlide(1);
  for (const slide of [1, 3, 10, 14]) await videoNavigation(slide, 'click', slide + 1);
  await videoNavigation(27, 'ArrowLeft', 26);
  await videoNavigation(1, 'ArrowRight', 2);
  await videoNavigation(1, 'Space', 2);
  await selectSlide(25);
  const stage = await page.$('#stage');
  const early = await stage.screenshot();
  await pause(6000);
  const final = await stage.screenshot();
  assert.notDeepEqual(early, final, 'Team collage must animate on entry');
  await pause(6000);
  assert.deepEqual(await stage.screenshot(), final, 'Team collage must hold its final frame past two cycles');
  await step('ArrowLeft', 24);
  await step('ArrowRight', 25);
  await pause(6000);
  assert.deepEqual(await stage.screenshot(), final, 'Revisiting the team collage must still finish on the full team');
  await selectSlide(27);
  for (let slide = 26; slide >= 1; slide--) await step('ArrowLeft', slide);
  await step('ArrowLeft', 1);
  for (let slide = 2; slide <= 27; slide++) await step('ArrowRight', slide);
  await step('ArrowRight', 27);
  await selectSlide(15);
  await page.mouse.click(720, 450, { button: 'right' });
  await waitForSlide(14);
  // Keynote detects touch support during startup, so test a fresh phone page
  // rather than enabling touch after the desktop player has initialized.
  await page.close();
  page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await observePage();
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await waitForSlide(1);
  await videoNavigation(1, 'tap', 2);
  await selectSlide(15);
  for (const [direction, fingers, expected] of [['right', 1, 14], ['left', 1, 15], ['right', 2, 14]]) {
    await page.evaluate(({ direction, fingers }) => {
      document.dispatchEvent(new CustomEvent('TouchController:SwipeEvent', {
        detail: { direction, fingers, swipeStartX: 80 },
      }));
    }, { direction, fingers });
    await waitForSlide(expected);
  }
  const bounds = await page.$eval('#stage', element => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  assert.ok(Math.abs(bounds.width - 390) < 1, JSON.stringify(bounds));
  assert.ok(Math.abs(bounds.width / bounds.height - 16 / 9) < 0.01);
  assert.deepEqual(errors, []);
  console.log('PASS: no video controls, click/key/tap navigation during playback, departed videos stop; team animates once and holds; all 27 slides navigate both ways; first/last boundaries; right-click; phone swipe events; viewport fit; no page errors.');
} finally {
  await browser.close();
}
