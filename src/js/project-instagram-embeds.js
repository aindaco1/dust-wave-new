// Instagram replaces each blockquote with an untitled iframe. Keep the
// localized project heading as the accessible name of the resulting frame.
for (const embed of document.querySelectorAll('.project-instagram-embed')) {
  const labelFrame = () => {
    const frame = embed.querySelector('iframe');
    if (!frame) return false;
    frame.title = embed.dataset.embedTitle;
    return true;
  };

  if (!labelFrame()) {
    const observer = new MutationObserver(() => {
      if (labelFrame()) observer.disconnect();
    });
    observer.observe(embed, { childList: true });
  }
}
