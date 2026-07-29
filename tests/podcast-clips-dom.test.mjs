import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(
  new URL('../src/js/podcast-clips.js', import.meta.url),
  'utf8'
);
const showSlug = 'opera-en-la-selva';
const episodeSlug = 'episodio-de-prueba';
const endpoint =
  `http://127.0.0.1:4174/v1/shows/${showSlug}`
  + `/episodes/${episodeSlug}/clips`;
const canonicalUrl =
  `https://dustwave.xyz/news/podcasts/${showSlug}/${episodeSlug}/`;

test('renders a safe bilingual clip card and first-party actions', async () => {
  const payload = publicClipPayload();
  const harness = createHarness({
    language: 'es',
    response: new Response(JSON.stringify(payload))
  });

  vm.runInNewContext(source, harness.context);
  await waitFor(() => harness.root.dataset.state === 'ready');

  assert.equal(harness.root.hidden, false);
  assert.equal(harness.status.hidden, true);
  assert.equal(harness.content.hidden, false);
  assert.deepEqual(harness.fetchEvidence, {
    url: endpoint,
    method: 'GET',
    accept: 'application/json',
    credentials: 'omit',
    referrerPolicy: 'no-referrer'
  });

  const video = findNode(harness.content, (node) => node.tagName === 'video');
  assert(video);
  assert.equal(video.preload, 'none');
  assert.equal(video.playsInline, true);
  assert.equal(video.width, 1_080);
  assert.equal(video.height, 1_920);
  assert.equal(video.src, `${endpoint}/momento-de-lanzamiento.mp4`);
  assert.equal(
    video.attributes.get('aria-label'),
    'Reproducir clip Un momento en la selva'
  );
  assert.equal(video.style.values.get('--podcast-clip-aspect'), '9 / 16');

  const title = findNode(
    harness.content,
    (node) => node.className === 'podcast-clips__title'
  );
  assert.equal(title.textContent, 'Un momento en la selva');
  const metadata = findNode(
    harness.content,
    (node) => node.className === 'podcast-clips__meta'
  );
  assert.equal(
    metadata.textContent,
    'Duración 0:24 · Subtítulos Español · 9:16'
  );

  const download = findNode(
    harness.content,
    (node) => node.tagName === 'a'
  );
  assert.equal(download.textContent, 'Descargar MP4');
  assert.equal(download.href, `${endpoint}/momento-de-lanzamiento.mp4?download=1`);
  assert.equal(download.download, 'momento-de-lanzamiento.mp4');
  assert.equal(download.referrerPolicy, 'no-referrer');

  const copy = findNode(
    harness.content,
    (node) => node.textContent === 'Copiar enlace'
  );
  await copy.dispatch('click');
  assert.equal(
    harness.clipboardText,
    `${canonicalUrl}#clip-momento-de-lanzamiento`
  );
  const copyStatus = findNode(
    harness.content,
    (node) => node.className === 'podcast-clips__copy-status'
  );
  assert.equal(copyStatus.textContent, 'Enlace copiado');
  assert.equal(copyStatus.hidden, false);

  const share = findNode(
    harness.content,
    (node) => node.textContent === 'Compartir'
  );
  await share.dispatch('click');
  assert.equal(
    JSON.stringify(harness.sharePayload),
    JSON.stringify({
      title: 'Un momento en la selva',
      text: 'Un audiograma subtitulado.',
      url: `${canonicalUrl}#clip-momento-de-lanzamiento`
    })
  );
});

test('conceals empty, withdrawn, and invalid clip responses', async (t) => {
  await t.test('empty approved list', async () => {
    const harness = createHarness({
      language: 'en',
      response: new Response(JSON.stringify({
        ...publicClipPayload(),
        clips: []
      }))
    });
    vm.runInNewContext(source, harness.context);
    await waitFor(() => harness.root.dataset.state === 'empty');
    assertConcealed(harness);
  });

  await t.test('withdrawn or missing episode', async () => {
    const harness = createHarness({
      language: 'en',
      response: new Response('{"error":"clip_not_found"}', { status: 404 })
    });
    vm.runInNewContext(source, harness.context);
    await waitFor(() => harness.root.dataset.state === 'empty');
    assertConcealed(harness);
  });

  await t.test('unsafe provider text', async () => {
    const payload = publicClipPayload();
    payload.clips[0].title = '<img src=x onerror=alert(1)>';
    const harness = createHarness({
      language: 'en',
      response: new Response(JSON.stringify(payload))
    });
    vm.runInNewContext(source, harness.context);
    await waitFor(() => harness.root.dataset.state === 'unavailable');
    assertConcealed(harness);
  });
});

function publicClipPayload() {
  return {
    schemaVersion: 1,
    episode: {
      showSlug,
      slug: episodeSlug,
      canonicalUrl
    },
    clips: [{
      slug: 'momento-de-lanzamiento',
      title: 'Un momento en la selva',
      description: 'Un audiograma subtitulado.',
      aspectRatio: '9:16',
      width: 1_080,
      height: 1_920,
      durationMs: 24_000,
      captionLanguage: 'es',
      mediaUrl: `${endpoint}/momento-de-lanzamiento.mp4`,
      downloadUrl: `${endpoint}/momento-de-lanzamiento.mp4?download=1`,
      canonicalUrl
    }],
    truncated: false
  };
}

function createHarness({ language, response }) {
  const root = new FakeNode('section');
  root.hidden = true;
  root.dataset = {
    endpoint,
    showSlug,
    episodeSlug
  };
  const status = new FakeNode('p');
  const content = new FakeNode('div');
  content.hidden = true;
  root.queries.set('[data-podcast-clips-status]', status);
  root.queries.set('[data-podcast-clips-content]', content);
  let clipboardText = null;
  let sharePayload = null;
  let fetchEvidence = null;
  const translations = {
    en: {
      'clips.video': 'Play clip %{title}',
      'clips.duration': 'Duration %{duration}',
      'clips.captions': 'Captions %{language}',
      'clips.download': 'Download MP4',
      'clips.share': 'Share',
      'clips.copy': 'Copy link',
      'clips.copied': 'Link copied',
      'clips.selected': 'Link selected'
    },
    es: {
      'clips.video': 'Reproducir clip %{title}',
      'clips.duration': 'Duración %{duration}',
      'clips.captions': 'Subtítulos %{language}',
      'clips.download': 'Descargar MP4',
      'clips.share': 'Compartir',
      'clips.copy': 'Copiar enlace',
      'clips.copied': 'Enlace copiado',
      'clips.selected': 'Enlace seleccionado'
    }
  };
  const harness = {
    root,
    status,
    content,
    get clipboardText() {
      return clipboardText;
    },
    get sharePayload() {
      return sharePayload;
    },
    get fetchEvidence() {
      return fetchEvidence;
    }
  };
  harness.context = {
    AbortController,
    Response,
    URL,
    clearTimeout,
    console,
    document: {
      baseURI:
        `http://127.0.0.1:4173/news/podcasts/${showSlug}/${episodeSlug}/`,
      createElement: (tagName) => new FakeNode(tagName),
      querySelectorAll: (selector) =>
        selector === '[data-podcast-clips]' ? [root] : []
    },
    fetch: async (url, options) => {
      fetchEvidence = {
        url: url.href,
        method: options.method,
        accept: options.headers.accept,
        credentials: options.credentials,
        referrerPolicy: options.referrerPolicy
      };
      return response.clone();
    },
    location: { origin: 'http://127.0.0.1:4173' },
    navigator: {
      clipboard: {
        async writeText(value) {
          clipboardText = value;
        }
      },
      async share(value) {
        sharePayload = value;
      }
    },
    setTimeout,
    window: {
      DustWaveI18n: {
        t(key) {
          return translations[language][key];
        }
      }
    }
  };
  return harness;
}

class FakeNode {
  constructor(tagName) {
    this.tagName = String(tagName).toLowerCase();
    this.attributes = new Map();
    this.children = [];
    this.className = '';
    this.dataset = {};
    this.hidden = false;
    this.listeners = new Map();
    this.queries = new Map();
    this.style = {
      values: new Map(),
      setProperty: (name, value) => this.style.values.set(name, value)
    };
    this.textContent = '';
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  append(...children) {
    this.children.push(...children);
  }

  async dispatch(type) {
    for (const listener of this.listeners.get(type) || []) {
      await listener({ currentTarget: this, preventDefault() {} });
    }
  }

  focus() {
    this.focused = true;
  }

  querySelector(selector) {
    return this.queries.get(selector) || null;
  }

  replaceChildren(...children) {
    this.children = children;
  }

  select() {
    this.selected = true;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
}

function findNode(root, predicate) {
  if (predicate(root)) return root;
  for (const child of root.children) {
    const match = findNode(child, predicate);
    if (match) return match;
  }
  return null;
}

function assertConcealed(harness) {
  assert.equal(harness.root.hidden, true);
  assert.equal(harness.status.hidden, false);
  assert.equal(harness.content.hidden, true);
  assert.equal(harness.content.children.length, 0);
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error('Timed out waiting for Podcast clip state');
}
