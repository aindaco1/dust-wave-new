const { DateTime } = require("luxon");
const navigationPlugin = require('@11ty/eleventy-navigation');
const rssPlugin = require('@11ty/eleventy-plugin-rss');
const Image = require("@11ty/eleventy-img");
const EleventyFetch = require("@11ty/eleventy-fetch");
const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const sitemap = require("@quasibit/eleventy-plugin-sitemap");

module.exports = function(eleventyConfig) {
  // Universal Shortcodes (Adds to Liquid, Nunjucks, Handlebars)
  eleventyConfig.addShortcode("bgImg", function(imgName, test) {
    return `  style="background-image: url('./img/webp/${imgName}.webp');"`;
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
    return `<img src="${src}" class="${width} shadow-1-strong rounded mb-2" alt="${alt || ''}" loading="lazy">`;
  });

  // Two-column gallery shortcode (paired)
  // Usage: {% gallery %}...images...{% endgallery %}
  eleventyConfig.addPairedShortcode("gallery", function(content) {
    return `<div class="row g-2">
${content}
</div>`;
  });

  // Gallery column shortcode - use inside gallery
  // Usage: {% col %}{% img "..." %}{% img "..." %}{% endcol %}
  eleventyConfig.addPairedShortcode("col", function(content) {
    return `  <div class="col-lg-6 col-md-12 mb-6 mb-lg-0">
${content}
  </div>`;
  });

  //Base Plugin
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // RSS
  eleventyConfig.addPlugin(pluginRss);

  // Sitemap
  eleventyConfig.addPlugin(sitemap, {
    sitemap: {
      hostname: "https://dustwave.xyz",
    },
  });

  eleventyConfig.setDataDeepMerge(true);

  function filterTagList(tags) {
    return (tags || []).filter(tag => ["all", "nav", "post", "posts", "event", "event", "new", "news"].indexOf(tag) === -1);
  };

  eleventyConfig.addFilter("filterTagList", filterTagList);

  // Convert image path to webp, preserving subdirectory structure:
  // /img/stills/stalldstill.jpg -> /img/webp/stills/stalldstill.webp
  // /img/digest/header/file.jpg -> /img/webp/digest/header/file.webp
  // /img/somefile.jpg -> /img/webp/somefile.webp
  eleventyConfig.addFilter("toWebp", (imgPath) => {
    if (!imgPath) return imgPath;
    // Already a webp path
    if (imgPath.includes('/webp/') || imgPath.endsWith('.webp')) {
      return imgPath;
    }
    // Handle /img/subdir/filename.ext -> /img/webp/subdir/filename.webp
    const match = imgPath.match(/^\/img\/(.+)\.(jpg|jpeg|png)$/i);
    if (match) {
      return `/img/webp/${match[1]}.webp`;
    }
    // Fallback: return original if pattern doesn't match
    return imgPath;
  });
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
  const siteUrl = "https://dustwave.xyz";
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