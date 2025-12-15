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

  // Convert image path to webp: 
  // /img/stills/stalldstill.jpg -> /img/webp/stills/stalldstill.webp
  // /img/somefile.jpg -> /img/webp/somefile.webp
  eleventyConfig.addFilter("toWebp", (imgPath) => {
    if (!imgPath) return imgPath;
    // Already a webp path
    if (imgPath.includes('/webp/') || imgPath.endsWith('.webp')) {
      return imgPath;
    }
    // Handle /img/stills/filename.ext -> /img/webp/stills/filename.webp
    const stillsMatch = imgPath.match(/^\/img\/stills\/(.+)\.(jpg|jpeg|png)$/i);
    if (stillsMatch) {
      return `/img/webp/stills/${stillsMatch[1]}.webp`;
    }
    // Handle /img/filename.ext -> /img/webp/filename.webp (legacy paths)
    const match = imgPath.match(/^\/img\/(.+)\.(jpg|jpeg|png)$/i);
    if (match) {
      return `/img/webp/${match[1]}.webp`;
    }
    // Fallback: return original if pattern doesn't match
    return imgPath;
  });
  eleventyConfig.addPassthroughCopy("src/fonts");
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
  return {
    dir: {
      input: "src",
      output: "dev"
    }
  };
};