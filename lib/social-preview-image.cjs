const DEFAULT_SOCIAL_PREVIEW_IMAGE = "/img/og/default.png";

function socialPreviewImage(overrideImage, contentImage, isProject = false) {
  const override = typeof overrideImage === "string" ? overrideImage.trim() : "";
  const image = typeof contentImage === "string" ? contentImage.trim() : "";

  if (isProject && /\.gif(?:[?#].*)?$/iu.test(image)) {
    return image;
  }

  return override || image || DEFAULT_SOCIAL_PREVIEW_IMAGE;
}

module.exports = {
  DEFAULT_SOCIAL_PREVIEW_IMAGE,
  socialPreviewImage
};
