export function adminText(key, fallbackOrVariables = {}, variables = {}) {
  const fallback = typeof fallbackOrVariables === "string"
    ? fallbackOrVariables
    : "";
  const replacements = (
    fallbackOrVariables
    && typeof fallbackOrVariables === "object"
  )
    ? fallbackOrVariables
    : variables;
  const translated = window.DustWaveI18n?.t(`admin.${key}`, replacements);
  return translated && !translated.startsWith("[missing:")
    ? translated
    : fallback || `[missing: admin.${key}]`;
}

export function editorLabels(label) {
  return {
    formatting: adminText("editorFormatting", { label }),
    bold: adminText("editorBold"),
    italic: adminText("editorItalic"),
    heading: adminText("editorHeading"),
    list: adminText("editorList"),
    link: adminText("editorLink"),
    linkPrompt: adminText("editorLinkPrompt")
  };
}
