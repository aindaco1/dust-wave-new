const { DateTime } = require("luxon");
const { peopleJsonLd, safeJsonLd } = require("./lib/safe-json-ld.cjs");
const { socialPreviewImage } = require("./lib/social-preview-image.cjs");
const navigationPlugin = require('@11ty/eleventy-navigation');
const rssPlugin = require('@11ty/eleventy-plugin-rss');
const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const { SitemapStream, streamToPromise } = require("sitemap");
const legacySlugify = require("@sindresorhus/slugify");
const crypto = require("crypto");
const {
  renderIcon,
  replaceLegacyFontAwesomeIcons
} = require("./lib/inline-icon.cjs");

// WebP URLs are emitted only for the GitHub Pages build. Local builds keep
// source image URLs so development never depends on generated assets.
const useWebp = process.env.USE_WEBP === "true";
const DEFAULT_LANGUAGE = "en";
const PROJECT_STATUS_TAGS = new Set(["released", "coming-soon"]);

function projectTypeFor(projectTaxonomy, projectSlug) {
  const typeSlug = projectTaxonomy?.projects?.[projectSlug];
  return (projectTaxonomy?.types || []).find(({ slug }) => slug === typeSlug) || null;
}

function projectTypeLabel(projectTaxonomy, projectSlug, language = DEFAULT_LANGUAGE) {
  const type = projectTypeFor(projectTaxonomy, projectSlug);
  return type?.labels?.[language] || type?.labels?.[DEFAULT_LANGUAGE] || "";
}

function canonicalProjectSlug(projectTaxonomy, projectSlug, language = DEFAULT_LANGUAGE) {
  if (projectTaxonomy?.projects?.[projectSlug]) return projectSlug;
  const localizedSlugs = projectTaxonomy?.localizedSlugs?.[language] || {};
  return Object.entries(localizedSlugs).find(([, localizedSlug]) =>
    localizedSlug === projectSlug
  )?.[0] || projectSlug;
}

function localizedProjectUrl(
  projectTaxonomy,
  projectSlug,
  language = DEFAULT_LANGUAGE
) {
  const localizedSlug = projectTaxonomy?.localizedSlugs?.[language]?.[projectSlug] || projectSlug;
  const languagePrefix = language === DEFAULT_LANGUAGE ? "" : `/${language}`;
  return `${languagePrefix}/project/${localizedSlug}.html`;
}

function projectDisplayTags(tags, typeSlug) {
  const typeTags = new Set([typeSlug]);
  if (["event", "exhibition", "installation"].includes(typeSlug)) {
    typeTags.add("event");
  }

  return (Array.isArray(tags) ? tags : []).filter((tag) =>
    !PROJECT_STATUS_TAGS.has(tag) &&
    !["all", "nav", "post", "posts", "new", "news"].includes(tag) &&
    !typeTags.has(tag)
  );
}

function humanizeProjectTag(tag) {
  return String(tag || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function projectFilterLabels(projectTaxonomy, language = DEFAULT_LANGUAGE) {
  return {
    types: Object.fromEntries((projectTaxonomy?.types || []).map((type) => [
      type.slug,
      type.labels?.[language] || type.labels?.[DEFAULT_LANGUAGE] || type.slug
    ])),
    tags: Object.fromEntries(Object.entries(projectTaxonomy?.tagLabels || {}).map(([tag, labels]) => [
      tag,
      labels?.[language] || labels?.[DEFAULT_LANGUAGE] || humanizeProjectTag(tag)
    ]))
  };
}

function valueAtPath(source, key) {
  return String(key || "")
    .split(".")
    .filter(Boolean)
    .reduce((value, part) => value?.[part], source);
}

function interpolateTranslation(value, variables = {}) {
  if (typeof value !== "string") return value;
  return Object.entries(variables || {}).reduce(
    (result, [key, replacement]) =>
      result.replaceAll(`%{${key}}`, String(replacement ?? "")),
    value
  );
}

function translate(i18n, language, key, variables = {}) {
  const requestedLanguage = i18n?.config?.supportedLangs?.includes(language)
    ? language
    : i18n?.config?.defaultLang || DEFAULT_LANGUAGE;
  const fallbackLanguage = i18n?.config?.defaultLang || DEFAULT_LANGUAGE;
  const translated = valueAtPath(i18n?.[requestedLanguage], key);
  const fallback = valueAtPath(i18n?.[fallbackLanguage], key);
  return interpolateTranslation(translated ?? fallback ?? `[missing: ${key}]`, variables);
}

function localizedUrl(i18n, language, translationKey, fallback = "/") {
  const requestedLanguage = i18n?.config?.supportedLangs?.includes(language)
    ? language
    : i18n?.config?.defaultLang || DEFAULT_LANGUAGE;
  return i18n?.config?.pages?.[translationKey]?.[requestedLanguage] || fallback;
}

function runtimeTranslations(runtime, sections = []) {
  if (!Array.isArray(sections) || sections.length === 0) return runtime || {};
  return Object.fromEntries(
    sections
      .filter((section) => typeof section === "string" && runtime?.[section])
      .map((section) => [section, runtime[section]])
  );
}

function localizedPodcastPrice(
  cents,
  language = DEFAULT_LANGUAGE,
  currency = "USD"
) {
  const amount = Number(cents);
  if (!Number.isSafeInteger(amount) || amount < 0) return "";
  const locale = language === "es" ? "es-US" : "en-US";
  const fractionDigits = amount % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(amount / 100);
}

function resolveImagePath(imgPath) {
  if (!useWebp || !imgPath) return imgPath;

  // Already a WebP path.
  if (imgPath.includes('/webp/') || imgPath.endsWith('.webp')) {
    return imgPath;
  }

  // /img/subdir/filename.ext -> /img/webp/subdir/filename.webp
  const match = imgPath.match(/^\/img\/(.+)\.(jpg|jpeg|png)$/i);
  return match ? `/img/webp/${match[1]}.webp` : imgPath;
}

// Helper: Generate play-cache filename from artwork URL (matches make_newsletter_email.py)
// Format: play-{md5(url|dim=True)[:12]}.jpg
// Returns absolute URL for Substack export
const siteUrl = "https://dustwave.xyz";

async function renderSitemap(items) {
  const stream = new SitemapStream({ hostname: siteUrl });
  const seenUrls = new Set();

  for (const item of items || []) {
    const sitemapData = item.data?.sitemap || {};
    if (sitemapData.ignore) continue;

    const pagination = item.data?.pagination;
    const urls = pagination?.pages
      ? pagination.pages.map((page, index) => page?.url || pagination.hrefs?.[index])
      : [item.url];

    for (const url of urls) {
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);

      const { ignore, ...entryData } = sitemapData;
      stream.write({
        ...entryData,
        url,
        lastmod: entryData.lastmod || item.date?.toISOString()
      });
    }
  }

  stream.end();
  return (await streamToPromise(stream)).toString();
}

function getPlayCacheUrl(artworkUrl) {
  const cacheKey = `${artworkUrl}|dim=True`;
  const urlHash = crypto.createHash('md5').update(cacheKey).digest('hex').slice(0, 12);
  const ext = artworkUrl.toLowerCase().includes('.png') ? '.png' : '.jpg';
  return `${siteUrl}/img/news/play-cache/play-${urlHash}${ext}`;
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addGlobalData(
    "environment",
    process.env.ELEVENTY_ENV || "development"
  );

  // Eleventy 3 removes apostrophes when slugifying. Preserve Eleventy 2's
  // hyphen replacement so existing public URLs and CSS hooks do not change.
  eleventyConfig.addFilter("slugify", (value, options = {}) => legacySlugify(
    String(value),
    { decamelize: false, ...options }
  ));

  // Universal Shortcodes (Adds to Liquid, Nunjucks, Handlebars)
  eleventyConfig.addShortcode("bgImg", function(imgName, extension = "jpg") {
    const imagePath = resolveImagePath(`/img/${imgName}.${extension}`);
    return `  style="background-image: url('${imagePath}');"`;
  });

  // Inline the exact Font Awesome Free vector paths at build time. Legacy
  // content is transformed too, so no icon font or runtime icon script is
  // required by the public site.
  eleventyConfig.addShortcode("icon", renderIcon);
  eleventyConfig.addTransform("inline-font-awesome-icons", function(content) {
    if (typeof this.page.outputPath !== "string" || !this.page.outputPath.endsWith(".html")) {
      return content;
    }
    return replaceLegacyFontAwesomeIcons(content);
  });

  // YouTube embed shortcode - responsive video player
  // Usage: {% youtube "VIDEO_ID" %}
  // Example: {% youtube "5JyyQVF0cAI" %}
  eleventyConfig.addShortcode("youtube", function(videoId) {
    return `<style>.embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; } .embed-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }</style><div class="embed-container"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  });

  // Vimeo embed shortcode - responsive video player
  // Usage: {% vimeo "VIDEO_ID" %}
  eleventyConfig.addShortcode("vimeo", function(videoId) {
    return `<style>.embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; } .embed-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }</style><div class="embed-container"><iframe src="https://player.vimeo.com/video/${videoId}" title="Vimeo video player" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  });

  // Styled image shortcode - single image with standard classes
  // Usage: {% img "/img/photo.jpg", "description" %}
  // Optional width: {% img "/img/photo.jpg", "description", "w-75" %}
  eleventyConfig.addShortcode("img", function(src, alt, width = "w-100") {
    return `<img src="${resolveImagePath(src)}" class="${width}" alt="${alt || ''}" loading="lazy" decoding="async">`;
  });

  // Masonry gallery shortcode (paired)
  // Usage: {% gallery %}...images...{% endgallery %}
  eleventyConfig.addPairedShortcode("gallery", function(content) {
    return `<div class="masonry-gallery">
${content}
</div>`;
  });

  // Gallery column shortcode - use inside gallery
  // Usage: {% col %}{% img "..." %}{% img "..." %}{% endcol %}
  eleventyConfig.addPairedShortcode("col", function(content) {
    return `  <div class="masonry-gallery__column">
${content}
  </div>`;
  });

  //Base Plugin
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // RSS
  eleventyConfig.addPlugin(pluginRss);

  // Sitemap. This local shortcode avoids the abandoned Eleventy 2 plugin,
  // which reads templateContent before Eleventy 3 has rendered it.
  eleventyConfig.addNunjucksAsyncShortcode("sitemap", renderSitemap);

  eleventyConfig.setDataDeepMerge(true);

  function filterTagList(tags) {
    return (tags || []).filter(tag => ["all", "nav", "post", "posts", "event", "event", "new", "news"].indexOf(tag) === -1);
  };

  eleventyConfig.addFilter("filterTagList", filterTagList);
  eleventyConfig.addFilter("projectTypeFor", projectTypeFor);
  eleventyConfig.addFilter("projectTypeLabel", projectTypeLabel);
  eleventyConfig.addFilter("projectTypeSlug", (projectTaxonomy, projectSlug) =>
    projectTypeFor(projectTaxonomy, projectSlug)?.slug || ""
  );
  eleventyConfig.addFilter("projectTypeCount", (posts, projectTaxonomy, typeSlug) =>
    (Array.isArray(posts) ? posts : []).filter((post) =>
      projectTypeFor(projectTaxonomy, post?.fileSlug)?.slug === typeSlug
    ).length
  );
  eleventyConfig.addFilter("projectBySlug", (posts, projectSlug) =>
    (Array.isArray(posts) ? posts : []).find((post) => post?.fileSlug === projectSlug) || null
  );
  eleventyConfig.addFilter("canonicalProjectSlug", canonicalProjectSlug);
  eleventyConfig.addFilter("localizedProjectUrl", localizedProjectUrl);
  eleventyConfig.addFilter("projectDisplayTags", projectDisplayTags);
  eleventyConfig.addFilter("projectTagLabel", (projectTaxonomy, tag, language = DEFAULT_LANGUAGE) =>
    projectTaxonomy?.tagLabels?.[tag]?.[language] ||
    projectTaxonomy?.tagLabels?.[tag]?.[DEFAULT_LANGUAGE] ||
    humanizeProjectTag(tag)
  );
  eleventyConfig.addFilter("projectFilterLabels", projectFilterLabels);

  // Convert image paths only in the GitHub Pages build, preserving structure:
  // /img/stills/stalldstill.jpg -> /img/webp/stills/stalldstill.webp
  // /img/digest/header/file.jpg -> /img/webp/digest/header/file.webp
  // /img/somefile.jpg -> /img/webp/somefile.webp
  eleventyConfig.addFilter("toWebp", resolveImagePath);
  eleventyConfig.addFilter("socialPreviewImage", socialPreviewImage);
  eleventyConfig.addPassthroughCopy("src/fonts");
  // Members collection for about page
  eleventyConfig.addCollection("members", collectionAPI => {
    return collectionAPI.getFilteredByGlob("src/members/*.md").sort((a, b) => {
      // Sort by column first (left before right), then by order
      if (a.data.column !== b.data.column) {
        return a.data.column === "left" ? -1 : 1;
      }
      return (a.data.order || 0) - (b.data.order || 0);
    });
  });

  eleventyConfig.addCollection("tagList", collectionAPI => {
    const tagsObject = {}
    collectionAPI.getAll().forEach(item => {
      if (!item.data.tags) return;
      item.data.tags
        .filter(tag => !['post', 'new', 'event', 'all'].includes(tag))
        .forEach(tag => {
          if(typeof tagsObject[tag] === 'undefined') {
            tagsObject[tag] = 1
          } else {
            tagsObject[tag] += 1
          }
        });
    });

    const tagList = []
    Object.keys(tagsObject).forEach(tag => {
      tagList.push({ tagName: tag, tagCount: tagsObject[tag] })
    })

    return tagList.sort((a, b) => b.tagCount - a.tagCount)

  });

  eleventyConfig.addFilter("readableDate", dateObj => {
    return DateTime.fromJSDate(dateObj, {
      zone: 'utc'
    }).toFormat("dd LLL yyyy");
  });

  // Long date format: "July 4, 2025"
  eleventyConfig.addFilter("longDate", dateObj => {
    return DateTime.fromJSDate(dateObj, {
      zone: 'utc'
    }).toFormat("LLLL d, yyyy");
  });

  // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
  eleventyConfig.addFilter('htmlDateString', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {
      zone: 'utc'
    }).toFormat('yyyy-LL-dd');
  });

  // RFC 822 date format in Mountain Time for RSS feeds
  eleventyConfig.addFilter('dateToRfc822MT', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {
      zone: 'America/Denver'
    }).toFormat('ccc, dd LLL yyyy HH:mm:ss ZZZ');
  });

  // RFC 3339 / ISO 8601 date format in Mountain Time for JSON feeds
  eleventyConfig.addFilter('dateToRfc3339MT', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {
      zone: 'America/Denver'
    }).toISO();
  });

  // Absolute URL filter for canonical links
  eleventyConfig.addFilter("absoluteUrl", (url) => {
    if (!url) return siteUrl;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return siteUrl + (url.startsWith('/') ? url : '/' + url);
  });

  // URL encode filter for share links
  eleventyConfig.addFilter("urlencode", (str) => {
    return encodeURIComponent(str || '');
  });

  // Head filter - returns first n items from array
  eleventyConfig.addFilter("head", (array, n) => {
    if (!Array.isArray(array) || !n) return array;
    return n < 0 ? array.slice(n) : array.slice(0, n);
  });

  eleventyConfig.addFilter("podcastEpisodesForShow", (episodes, showSlug) => {
    return (Array.isArray(episodes) ? episodes : [])
      .filter((episode) => episode?.showSlug === showSlug)
      .sort((left, right) => String(right.publicAt || '').localeCompare(String(left.publicAt || '')));
  });

  eleventyConfig.addFilter("podcastShowBySlug", (shows, showSlug) => {
    return (Array.isArray(shows) ? shows : []).find((show) => show?.slug === showSlug) || null;
  });

  eleventyConfig.addFilter("readablePodcastDate", (value, language = DEFAULT_LANGUAGE) => {
    const parsed = DateTime.fromISO(String(value || ''), { setZone: true });
    const locale = language === "es" ? "es-US" : "en-US";
    return parsed.isValid
      ? parsed.setZone('America/Denver').setLocale(locale).toFormat('LLLL d, yyyy')
      : '';
  });
  eleventyConfig.addFilter("t", translate);
  eleventyConfig.addFilter("localizedUrl", localizedUrl);
  eleventyConfig.addFilter("runtimeTranslations", runtimeTranslations);
  eleventyConfig.addFilter("localizedPodcastPrice", localizedPodcastPrice);
  eleventyConfig.addFilter("localizedDate", (dateObj, language = DEFAULT_LANGUAGE, format = "dd LLL yyyy") => {
    const locale = language === "es" ? "es-US" : "en-US";
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).setLocale(locale).toFormat(format);
  });
  eleventyConfig.addFilter("peopleJsonLd", peopleJsonLd);
  eleventyConfig.addFilter("safeJsonLd", safeJsonLd);

  // Substack excerpt filter - splits content at <!-- more:substack --> marker
  // Returns only the content before the marker for the Substack feed
  eleventyConfig.addFilter("substackExcerpt", (html) => {
    if (!html) return '';
    const marker = '<!-- more:substack -->';
    const markerIndex = html.indexOf(marker);
    if (markerIndex === -1) {
      // No marker found - return first paragraph as fallback
      // Look for first </p> tag
      const firstParaEnd = html.indexOf('</p>');
      if (firstParaEnd !== -1) {
        return html.substring(0, firstParaEnd + 4).trim();
      }
      // If no <p> tags, try to find content up to first double line break
      const firstBreak = html.indexOf('<br><br>');
      if (firstBreak !== -1) {
        return html.substring(0, firstBreak).trim();
      }
      // Last resort: return first 500 chars
      const stripped = html.replace(/<[^>]+>/g, '');
      return stripped.substring(0, 500) + (stripped.length > 500 ? '...' : '');
    }
    return html.substring(0, markerIndex).trim();
  });

  // Remove the substack marker from content for website display
  eleventyConfig.addFilter("removeSubstackMarker", (html) => {
    if (!html) return '';
    return html.replace(/<!-- more:substack -->/g, '');
  });

  // Clean HTML for Substack copy/paste - removes unsupported elements
  eleventyConfig.addFilter("substackClean", (html) => {
    if (!html) return '';
    return html
      // Convert relative URLs to absolute (both /path and path formats)
      .replace(/src="\/(?!\/)/g, `src="${siteUrl}/`)
      .replace(/src='\/(?!\/)/g, `src='${siteUrl}/`)
      .replace(/href="\/(?!\/)/g, `href="${siteUrl}/`)
      .replace(/href='\/(?!\/)/g, `href='${siteUrl}/`)
      // Also catch relative URLs without leading slash (e.g., "project/...")
      .replace(/href="(project|news|about|members)\//g, `href="${siteUrl}/$1/`)
      // Remove substack marker
      .replace(/<!-- more:substack -->/g, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove nav elements entirely (TOC won't work in Substack)
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      // Remove script tags
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove audio players and buttons (podcasts)
      .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '')
      .replace(/<audio[^>]*\/>/gi, '')
      .replace(/<audio[^>]*>[^<]*<\/audio>/gi, '')
      .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '')
      // Convert podcast download links to plain URLs (Substack embeds MP3s)
      .replace(/<a[^>]*href="([^"]*\.mp3[^"]*)"[^>]*download[^>]*>[\s\S]*?<\/a>/gi, '\n\n$1\n\n')
      // Remove SVGs
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
      // Convert caption divs to figcaption BEFORE removing other divs (Substack supports this)
      .replace(/<div[^>]*class=["'][^"']*caption[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi, '<figcaption><em>$1</em></figcaption>')
      // Remove custom divs (keep content)
      .replace(/<div[^>]*class="[^"]*date-written[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*embed-container[^"]*"[^>]*>/gi, '')
      .replace(/<\/div>/gi, '')
      // Remove style tags
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove inline styles
      .replace(/\s*style="[^"]*"/gi, '')
      // Remove class/id/data attributes
      .replace(/\s*class="[^"]*"/gi, '')
      .replace(/\s*id="[^"]*"/gi, '')
      .replace(/\s*data-[a-z-]+="[^"]*"/gi, '')
      .replace(/\s*loading="[^"]*"/gi, '')
      .replace(/\s*decoding="[^"]*"/gi, '')
      .replace(/\s*target="[^"]*"/gi, '')
      // Remove captions that follow video embeds (Substack doesn't support video captions)
      // Match embed-container (with any additional classes) followed by caption div
      .replace(/<div[^>]*class=['"][^'"]*embed-container[^'"]*['"][^>]*><iframe[^>]*src=['"]([^'"]+)['"][^>]*><\/iframe><\/div>[\s\S]*?<div[^>]*class=["']caption["'][^>]*>[\s\S]*?<\/div>/gi, (match, src) => {
        if (src.includes('youtube')) {
          const videoId = src.match(/embed\/([^"'?]+)/)?.[1];
          return videoId ? `<p>https://www.youtube.com/watch?v=${videoId}</p>\n` : '';
        }
        if (src.includes('vimeo')) {
          const videoId = src.match(/\/(\d+)/)?.[1];
          return videoId ? `<p>https://vimeo.com/${videoId}</p>\n` : '';
        }
        return '';
      })
      // Convert iframes to plain YouTube/Vimeo URLs (Substack auto-embeds these)
      // Handle both single and double quotes, add line break after
      .replace(/<iframe[^>]*src=["'][^"']*youtube[^"']*embed\/([^"'?]+)[^"']*["'][^>]*>[\s\S]*?<\/iframe>/gi, '<p>https://www.youtube.com/watch?v=$1</p>\n')
      .replace(/<iframe[^>]*src=["'][^"']*vimeo[^"']*\/(\d+)[^"']*["'][^>]*>[\s\S]*?<\/iframe>/gi, '<p>https://vimeo.com/$1</p>\n')
      // Remove remaining iframes
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      // Fix invalid </br> tags
      .replace(/<\/br>/gi, '')
      // Convert <br> to newlines for cleaner output
      .replace(/<br\s*\/?>/gi, '\n')
      // Clean up row/col divs (Bootstrap grid)
      .replace(/<div[^>]*>/gi, '')
      // Remove empty paragraphs
      .replace(/<p>\s*<\/p>/gi, '')
      .replace(/<p>\s*\n\s*<\/p>/gi, '')
      // Remove author signature block at end
      .replace(/<h3>\s*<strong>Alonso Indacochea<\/strong>\s*<\/h3>\s*<h4>\s*<strong>Dust Wave co-founder<\/strong>\s*<\/h4>/gi, '')
      .replace(/<h3><strong>Alonso Indacochea<\/strong><\/h3>\s*<h4><strong>Dust Wave co-founder<\/strong><\/h4>/gi, '')
      // Wrap image + figcaption in figure element
      .replace(/<center>\s*<img([^>]*)>\s*<\/center>\s*<figcaption>/gi, '<figure><img$1><figcaption>')
      .replace(/<\/figcaption>(\s*)(?!<\/figure>)/gi, '</figcaption></figure>$1')
      // Remove figcaptions that follow video URLs (Substack doesn't support video captions)
      .replace(/(<p>https:\/\/www\.youtube\.com\/watch\?v=[^<]+<\/p>)\s*<figcaption>[\s\S]*?<\/figcaption>/gi, '$1')
      .replace(/(<p>https:\/\/vimeo\.com\/\d+<\/p>)\s*<figcaption>[\s\S]*?<\/figcaption>/gi, '$1')
      // Convert h3 to h2 with divider before
      .replace(/<h3>/gi, '<hr>\n<h2>')
      .replace(/<\/h3>/gi, '</h2>')
      // Link digest article images to their article URLs (after stripping divs/classes)
      // Pattern: <img src="...img/digest/..."> followed by <h4><a href="URL">
      // Output clean HTML: linked image in its own paragraph, then h4 title
      .replace(/<p>\s*<img(\s+src="[^"]*\/img\/digest\/[^"]*"[^>]*)\/>\s*\n*\s*<h4[^>]*><a\s+href="([^"]+)"/gi, 
        '<p><a href="$2"><img$1 /></a></p>\n<h4><a href="$2"')
      // Link podcast images to their podcast URLs AND swap to play-cache images
      // Pattern: <img src="...img/podcasts/..."> followed by MP3 URL then <h4><a href="URL">
      .replace(/<img(\s+src="([^"]*\/img\/podcasts\/[^"]*)"[^>]*)>\s*<\/p>\s*<p>\s*(https?:\/\/[^\s<]+\.mp3[^\s<]*)\s*<\/p>\s*<p>\s*<h4[^>]*><a\s+href="([^"]+)"/gi, 
        (match, imgAttrs, artworkUrl, mp3Url, podcastUrl) => {
          // Convert artwork URL to play-cache URL
          const playCacheUrl = getPlayCacheUrl(artworkUrl);
          // Replace the src in imgAttrs with play-cache URL
          const newImgAttrs = imgAttrs.replace(artworkUrl, playCacheUrl);
          return `<a href="${podcastUrl}"><img${newImgAttrs}></a>\n</p>\n<p>\n${mp3Url}\n</p>\n<p>\n<h4><a href="${podcastUrl}"`;
        })
      // Clean up excessive newlines
      .replace(/\n{4,}/g, '\n\n\n')
      // Trim
      .trim();
  });

  // Convert relative URLs to absolute for feeds (images, links)
  // Only converts paths starting with / that aren't already absolute (http/https)
  eleventyConfig.addFilter("absoluteUrls", (html) => {
    if (!html) return '';
    return html
      // src="/path" but not src="//domain" or src="http"
      .replace(/src="\/(?!\/)/g, `src="${siteUrl}/`)
      .replace(/src='\/(?!\/)/g, `src='${siteUrl}/`)
      // href="/path" but not href="//domain" or href="http"  
      .replace(/href="\/(?!\/)/g, `href="${siteUrl}/`)
      .replace(/href='\/(?!\/)/g, `href='${siteUrl}/`);
  });

  // Clean HTML for RSS feeds - fix common issues that break feed parsers
  eleventyConfig.addFilter("cleanHtmlForFeed", (html) => {
    if (!html) return '';
    return html
      // Fix invalid </br> tags (should be <br> or <br/>)
      .replace(/<\/br>/gi, '')
      // Remove standalone <br> tags at start of content or after other br tags
      .replace(/^(\s*<br\s*\/?>\s*)+/gi, '')
      .replace(/(<br\s*\/?>\s*)+$/gi, '')
      // Remove empty paragraphs
      .replace(/<p>\s*<br\s*\/?>\s*<br\s*\/?>\s*<\/p>/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
      // Remove custom div classes that might confuse parsers
      .replace(/<div class="date-written">[\s\S]*?<\/div>/gi, '')
      // Clean up multiple line breaks
      .replace(/(<br\s*\/?>\s*){2,}/gi, '<br/>')
      // Trim whitespace
      .trim();
  });

  // Syndicatable collection - combines news + posts that have syndicate field
  eleventyConfig.addCollection("syndicatable", (collectionAPI) => {
    const news = collectionAPI.getFilteredByGlob("src/news/**/*.md");
    const posts = collectionAPI.getFilteredByGlob("src/posts/**/*.md");
    return [...news, ...posts]
      .filter(item => item.data.syndicate && item.data.syndicate.length > 0)
      .sort((a, b) => b.date - a.date);
  });

  // Collection for Substack feed - items with syndicate containing "substack"
  eleventyConfig.addCollection("syndicatableForSubstack", (collectionAPI) => {
    const news = collectionAPI.getFilteredByGlob("src/news/**/*.md");
    const posts = collectionAPI.getFilteredByGlob("src/posts/**/*.md");
    return [...news, ...posts]
      .filter(item => item.data.syndicate && item.data.syndicate.includes("substack"))
      .sort((a, b) => b.date - a.date);
  });

  // Collection for Fediverse - items with syndicate containing "fediverse"
  eleventyConfig.addCollection("syndicatableForFediverse", (collectionAPI) => {
    const news = collectionAPI.getFilteredByGlob("src/news/**/*.md");
    const posts = collectionAPI.getFilteredByGlob("src/posts/**/*.md");
    return [...news, ...posts]
      .filter(item => item.data.syndicate && item.data.syndicate.includes("fediverse"))
      .sort((a, b) => b.date - a.date);
  });

  return {
    dir: {
      input: "src",
      output: "dev"
    }
  };
};
