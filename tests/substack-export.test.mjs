import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  SUBSTACK_CARD_MARKER,
  finalizeSubstackDigestHtml
} = require('../lib/substack-export.cjs');

test('digest Substack export separates items without edge dividers', () => {
  const input = [
    '<hr>',
    '<h2>Articles</h2>',
    SUBSTACK_CARD_MARKER,
    '<p>Article one</p>',
    SUBSTACK_CARD_MARKER,
    '<p>Article two</p>',
    '<h2>Podcasts &amp; Videos</h2>',
    SUBSTACK_CARD_MARKER,
    '<p><img src="https://dustwave.xyz/img/podcasts/show.jpg"></p>',
    '<p>https://media.example.com/episode.mp3</p>',
    '<h4><a href="https://overcast.fm/+example">Episode</a></h4>',
    SUBSTACK_CARD_MARKER,
    '<p>https://www.youtube.com/watch?v=video_123</p>',
    '<h4><a href="https://www.youtube.com/watch?v=video_123">Video</a></h4>',
    '<hr>',
    '<h2>Trailers</h2>',
    '<p>https://www.youtube.com/watch?v=trailer_456</p>'
  ].join('\n');

  const output = finalizeSubstackDigestHtml(input);
  const articleSection = output.match(/<h2>Articles<\/h2>([\s\S]*?)<h2>Podcasts/)[1];
  const mediaSection = output.match(/<h2>Podcasts &amp; Videos<\/h2>([\s\S]*?)<h2>Trailers/)[1];

  assert.equal((articleSection.match(/<hr>/g) || []).length, 1);
  assert.equal((mediaSection.match(/<hr>/g) || []).length, 1);
  assert.doesNotMatch(articleSection, /^\s*<hr>/);
  assert.doesNotMatch(articleSection, /<hr>\s*$/);
  assert.doesNotMatch(mediaSection, /^\s*<hr>/);
  assert.doesNotMatch(mediaSection, /<hr>\s*$/);
  assert.doesNotMatch(output, /<hr>\s*<h2>(?:Articles|Trailers)<\/h2>/);
  assert.doesNotMatch(output, new RegExp(SUBSTACK_CARD_MARKER));
});

test('digest Substack export uses Overcast artwork and native YouTube embed URLs', () => {
  const input = [
    '<h2>Podcasts &amp; Videos</h2>',
    SUBSTACK_CARD_MARKER,
    '<p><a href="https://overcast.fm/+example"><img src="https://dustwave.xyz/show.jpg"></a></p>',
    '<p>https://media.example.com/episode.mp3</p>',
    '<h4><a href="https://overcast.fm/+example">Episode</a></h4>',
    SUBSTACK_CARD_MARKER,
    '<p>https://www.youtube.com/watch?v=video_123</p>',
    '<h4><a href="https://www.youtube.com/watch?v=video_123">Video</a></h4>',
    '<h2>Trailers</h2>',
    '<p>https://www.youtube.com/watch?v=trailer_456</p>'
  ].join('\n');

  const output = finalizeSubstackDigestHtml(input);

  assert.doesNotMatch(output, /episode\.mp3/);
  assert.doesNotMatch(output, /<p>https:\/\/overcast\.fm\/\+example<\/p>/);
  assert.equal((output.match(/href="https:\/\/overcast\.fm\/\+example"/g) || []).length, 2);
  assert.equal((output.match(/width="450"/g) || []).length, 1);
  assert.equal((output.match(/max-width:450px/g) || []).length, 1);
  assert.match(output, /<p>https:\/\/www\.youtube\.com\/watch\?v=video_123<\/p>/);
  assert.doesNotMatch(output, /i\.ytimg\.com\/vi\/video_123/);
  assert.match(output, /<p>https:\/\/www\.youtube\.com\/watch\?v=trailer_456<\/p>/);
  assert.doesNotMatch(output, /i\.ytimg\.com\/vi\/trailer_456/);
});

test('digest promo and postface images use semantic captions and a 500px maximum', () => {
  const input = [
    '<section substack-feature="true">',
    '<a href="https://dustwave.xyz/project/example.html">',
    '<img src="https://dustwave.xyz/example.jpg" alt="Example image">',
    '</a>',
    '<figcaption>A real <em>caption.</em></figcaption></figure>',
    '<p>Feature copy.</p>',
    '</section>'
  ].join('\n');

  const output = finalizeSubstackDigestHtml(input);

  assert.match(output, /<figure>\s*<a[^>]*>\s*<img[^>]*>\s*<\/a>\s*<figcaption>/);
  assert.match(output, /<figcaption>A real <em>caption\.<\/em><\/figcaption>/);
  assert.equal((output.match(/<figure>/g) || []).length, 1);
  assert.equal((output.match(/<\/figure>/g) || []).length, 1);
  assert.match(output, /width="500"/);
  assert.match(output, /max-width:500px/);
  assert.doesNotMatch(output, /substack-feature/);
});
