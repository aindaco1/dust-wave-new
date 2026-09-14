import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHeadingSpacing } from '../lib/heading-spacing.cjs';

test('legacy spacer variants do not accumulate around an editorial heading', () => {
  const content = '<p>Intro</p>\n</br><br />\n<p><br><br></p>\n<h2 id="film">Film</h2>\n<br><p><br /></p><figure>Poster</figure>';
  assert.equal(normalizeHeadingSpacing(content), '<p>Intro</p>\n<h2 id="film">Film</h2>\n<figure>Poster</figure>');
});

test('trim paragraph-edge spacers next to headings without changing credit lines', () => {
  const content = '<p>Cast<br>Actor A<br>Actor B<br><br></p>\n<h3>Crew</h3>\n<p><br>Director<br>Camera</p>';
  assert.equal(normalizeHeadingSpacing(content), '<p>Cast<br>Actor A<br>Actor B</p>\n<h3>Crew</h3>\n<p>Director<br>Camera</p>');
});

test('preserve intentional breaks, linked captions, code, and spacers away from headings', () => {
  const content = '<h3>Credits</h3><p>First<br>Second<br><br>Third</p><figure><img src="/poster.jpg"><figcaption><a href="/artist">Artwork</a><br>Artist</figcaption></figure><br><br><p>Next</p><pre>&lt;h2&gt;Example&lt;/h2&gt;\n&lt;br&gt;</pre>';
  assert.equal(normalizeHeadingSpacing(content), content);
});
