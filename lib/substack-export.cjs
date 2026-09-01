const SUBSTACK_CARD_MARKER = "__DUST_WAVE_SUBSTACK_CARD__";
const SUBSTACK_MEDIA_IMAGE_STYLE =
  "display:block;width:100%;max-width:450px;height:auto;margin:0 auto;";
const SUBSTACK_FEATURE_IMAGE_STYLE =
  "display:block;width:100%;max-width:500px;height:auto;margin:0 auto;";

function absolutizeRootUrls(html, siteUrl) {
  if (!html) return "";
  return html
    .replace(/src="\/(?!\/)/g, `src="${siteUrl}/`)
    .replace(/src='\/(?!\/)/g, `src='${siteUrl}/`)
    .replace(/href="\/(?!\/)/g, `href="${siteUrl}/`)
    .replace(/href='\/(?!\/)/g, `href='${siteUrl}/`);
}

function sizeSubstackImage(imgTag, maxWidth, style) {
  const withoutSizing = imgTag
    .replace(/\s+(?:width|style)=["'][^"']*["']/gi, "")
    .replace(/\s*\/?>$/, "");
  return `${withoutSizing} width="${maxWidth}" style="${style}">`;
}

function sizeSubstackMediaImage(imgTag) {
  return sizeSubstackImage(imgTag, 450, SUBSTACK_MEDIA_IMAGE_STYLE);
}

function normalizeSubstackFeatureFigures(html) {
  return html
    .replace(
      /<section\b[^>]*\bsubstack-feature=["']true["'][^>]*>([\s\S]*?)<\/section>/gi,
      (_section, content) => {
        const sizedContent = content.replace(
          /<img\b[^>]*>/gi,
          (imgTag) => sizeSubstackImage(imgTag, 500, SUBSTACK_FEATURE_IMAGE_STYLE)
        );
        return `<section>${sizedContent}</section>`;
      }
    )
    .replace(
      /(<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>|<img\b[^>]*>)\s*<figcaption>([\s\S]*?)<\/figcaption>\s*<\/figure>/gi,
      "<figure>$1<figcaption>$2</figcaption></figure>"
    )
    .replace(
      /(<p>\s*https:\/\/(?:www\.youtube\.com\/watch\?v=[^<\s]+|vimeo\.com\/\d+)[^<]*<\/p>)\s*<\/figure>/gi,
      "$1"
    );
}

function normalizeSubstackDigestCard(segment) {
  const articleLinkMatch = segment.match(
    /<h4[^>]*>\s*<a\s+href=["']([^"']+)["']/i
  );
  if (
    articleLinkMatch &&
    /<img\b[^>]*\/img\/digest\//i.test(segment) &&
    !/<a\b[^>]*>\s*<img\b[^>]*\/img\/digest\//i.test(segment)
  ) {
    segment = segment.replace(
      /<img\b[^>]*\/img\/digest\/[^>]*>/i,
      (imgTag) => `<a href="${articleLinkMatch[1]}">${imgTag}</a>`
    );
  }

  const overcastMatch = segment.match(
    /href=["'](https:\/\/overcast\.fm\/[^"']+)["']/i
  );
  if (overcastMatch) {
    segment = segment
      .replace(/<p>\s*https?:\/\/[^\s<]*\.mp3[^\s<]*\s*<\/p>/gi, "")
      .replace(/<img\b[^>]*>/i, (imgTag) => sizeSubstackMediaImage(imgTag));
  }

  const youtubeMatch = segment.match(
    /<p>\s*(https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]+)[^\s<]*)\s*<\/p>/i
  );
  if (youtubeMatch) {
    const [, videoUrl] = youtubeMatch;
    const mediaHtml = `<p>${videoUrl}</p>`;
    const nestedYoutube =
      /<p>\s*<p>\s*https:\/\/www\.youtube\.com\/watch\?v=[^\s<]+\s*<\/p>\s*/i;
    segment = nestedYoutube.test(segment)
      ? segment.replace(nestedYoutube, `${mediaHtml}\n`)
      : segment.replace(youtubeMatch[0], mediaHtml);
  }

  const vimeoMatch = segment.match(
    /<p>\s*(https:\/\/vimeo\.com\/(\d+)[^\s<]*)\s*<\/p>/i
  );
  if (vimeoMatch) {
    const [, videoUrl, videoId] = vimeoMatch;
    const image = sizeSubstackMediaImage(
      `<img src="https://vumbnail.com/${videoId}.jpg" alt="Video thumbnail; open on Vimeo">`
    );
    const mediaHtml = `<p><a href="${videoUrl}">${image}</a></p>`;
    const nestedVimeo = /<p>\s*<p>\s*https:\/\/vimeo\.com\/\d+[^\s<]*\s*<\/p>\s*/i;
    segment = nestedVimeo.test(segment)
      ? segment.replace(nestedVimeo, `${mediaHtml}\n`)
      : segment.replace(vimeoMatch[0], mediaHtml);
  }

  return segment;
}

function addSubstackDigestDividers(html) {
  let activeSection = "";
  let itemCount = 0;
  const tokenPattern = new RegExp(
    `<h2>[\\s\\S]*?<\\/h2>|${SUBSTACK_CARD_MARKER}`,
    "gi"
  );

  return html.replace(tokenPattern, (token) => {
    if (token !== SUBSTACK_CARD_MARKER) {
      const heading = token
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/gi, "&")
        .trim()
        .toLowerCase();
      activeSection = ["articles", "podcasts & videos"].includes(heading)
        ? heading
        : "";
      itemCount = 0;
      return token;
    }

    if (!activeSection) return "";
    itemCount += 1;
    return itemCount === 1 ? "" : "\n<hr>\n";
  });
}

function finalizeSubstackDigestHtml(html) {
  const normalizedCards = html
    .split(SUBSTACK_CARD_MARKER)
    .map((segment) => {
      const nextSection = segment.search(/<h2>/i);
      if (nextSection === -1) return normalizeSubstackDigestCard(segment);
      return (
        normalizeSubstackDigestCard(segment.slice(0, nextSection)) +
        segment.slice(nextSection)
      );
    })
    .join(SUBSTACK_CARD_MARKER);

  return normalizeSubstackFeatureFigures(
    addSubstackDigestDividers(normalizedCards)
  )
    .replace(/<hr>\s*(<h2>(?:Articles|Trailers)<\/h2>)/gi, "$1")
    .replace(/<p>\s*<hr>\s*/gi, "<hr>\n<p>")
    .replace(/<p>\s*<p>/gi, "<p>")
    .replace(/<\/p>\s*<\/p>/gi, "</p>")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function cleanSubstackHtml(
  html,
  { siteUrl, getPlayCacheUrl = (artworkUrl) => artworkUrl }
) {
  if (!html) return "";

  const cleaned = absolutizeRootUrls(html, siteUrl)
    .replace(/href="(project|news|about|members)\//g, `href="${siteUrl}/$1/`)
    .replace(/<!-- more:substack -->/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<section[^>]*class=["'][^"']*\bdigest-feature\b[^"']*["'][^>]*>/gi,
      '<section substack-feature="true">'
    )
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(
      /<div[^>]*class=["'][^"']*\bdigest-card\b[^"']*["'][^>]*>/gi,
      SUBSTACK_CARD_MARKER
    )
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, "")
    .replace(/<audio[^>]*\/>/gi, "")
    .replace(/<audio[^>]*>[^<]*<\/audio>/gi, "")
    .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, "")
    .replace(
      /<a[^>]*href="([^"]*\.mp3[^"]*)"[^>]*download[^>]*>[\s\S]*?<\/a>/gi,
      "\n\n$1\n\n"
    )
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(
      /<div[^>]*class=["'][^"']*caption[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      "<figcaption>$1</figcaption>"
    )
    .replace(/<div[^>]*class="[^"]*date-written[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*class="[^"]*embed-container[^"]*"[^>]*>/gi, "")
    .replace(/<\/div>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/\s*style="[^"]*"/gi, "")
    .replace(/\s*class="[^"]*"/gi, "")
    .replace(/\s*id="[^"]*"/gi, "")
    .replace(/\s*data-[a-z-]+="[^"]*"/gi, "")
    .replace(/\s*loading="[^"]*"/gi, "")
    .replace(/\s*decoding="[^"]*"/gi, "")
    .replace(/\s*target="[^"]*"/gi, "")
    .replace(
      /<div[^>]*class=['"][^'"]*embed-container[^'"]*['"][^>]*><iframe[^>]*src=['"]([^'"]+)['"][^>]*><\/iframe><\/div>[\s\S]*?<div[^>]*class=["']caption["'][^>]*>[\s\S]*?<\/div>/gi,
      (_match, src) => {
        if (src.includes("youtube")) {
          const videoId = src.match(/embed\/([^"'?]+)/)?.[1];
          return videoId
            ? `<p>https://www.youtube.com/watch?v=${videoId}</p>\n`
            : "";
        }
        if (src.includes("vimeo")) {
          const videoId = src.match(/\/(\d+)/)?.[1];
          return videoId ? `<p>https://vimeo.com/${videoId}</p>\n` : "";
        }
        return "";
      }
    )
    .replace(
      /<iframe[^>]*src=["'][^"']*youtube[^"']*embed\/([^"'?]+)[^"']*["'][^>]*>[\s\S]*?<\/iframe>/gi,
      '<p>https://www.youtube.com/watch?v=$1</p>\n'
    )
    .replace(
      /<iframe[^>]*src=["'][^"']*vimeo[^"']*\/(\d+)[^"']*["'][^>]*>[\s\S]*?<\/iframe>/gi,
      '<p>https://vimeo.com/$1</p>\n'
    )
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<\/br>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/<p>\s*\n\s*<\/p>/gi, "")
    .replace(
      /<h3>\s*<strong>Alonso Indacochea<\/strong>\s*<\/h3>\s*<h4>\s*<strong>Dust Wave co-founder<\/strong>\s*<\/h4>/gi,
      ""
    )
    .replace(
      /<h3><strong>Alonso Indacochea<\/strong><\/h3>\s*<h4><strong>Dust Wave co-founder<\/strong><\/h4>/gi,
      ""
    )
    .replace(
      /<center>\s*<img([^>]*)>\s*<\/center>\s*<figcaption>/gi,
      "<figure><img$1><figcaption>"
    )
    .replace(/<\/figcaption>(\s*)(?!<\/figure>)/gi, "</figcaption></figure>$1")
    .replace(
      /(<p>https:\/\/www\.youtube\.com\/watch\?v=[^<]+<\/p>)\s*<figcaption>[\s\S]*?<\/figcaption>/gi,
      "$1"
    )
    .replace(
      /(<p>https:\/\/vimeo\.com\/\d+<\/p>)\s*<figcaption>[\s\S]*?<\/figcaption>/gi,
      "$1"
    )
    .replace(/<h3>/gi, "<hr>\n<h2>")
    .replace(/<\/h3>/gi, "</h2>")
    .replace(
      /<p>\s*<img(\s+src="[^"]*\/img\/digest\/[^"]*"[^>]*)\/>\s*\n*\s*<h4[^>]*><a\s+href="([^"]+)"/gi,
      '<p><a href="$2"><img$1 /></a></p>\n<h4><a href="$2"'
    )
    .replace(
      /<img(\s+src="([^"]*\/img\/podcasts\/[^"]*)"[^>]*)>\s*<\/p>\s*<p>\s*(https?:\/\/[^\s<]+\.mp3[^\s<]*)\s*<\/p>\s*<p>\s*<h4[^>]*><a\s+href="([^"]+)"/gi,
      (_match, imgAttrs, artworkUrl, mp3Url, podcastUrl) => {
        const playCacheUrl = getPlayCacheUrl(artworkUrl);
        const newImgAttrs = imgAttrs.replace(artworkUrl, playCacheUrl);
        return `<a href="${podcastUrl}"><img${newImgAttrs}></a>\n</p>\n<p>\n${mp3Url}\n</p>\n<p>\n<h4><a href="${podcastUrl}"`;
      }
    )
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

  return finalizeSubstackDigestHtml(cleaned);
}

module.exports = {
  SUBSTACK_CARD_MARKER,
  SUBSTACK_MEDIA_IMAGE_STYLE,
  SUBSTACK_FEATURE_IMAGE_STYLE,
  absolutizeRootUrls,
  addSubstackDigestDividers,
  cleanSubstackHtml,
  finalizeSubstackDigestHtml,
  normalizeSubstackDigestCard,
  normalizeSubstackFeatureFigures,
  sizeSubstackImage
};
