import {
  mountShowSiteProjection as mountProjection
} from "./podcast-admin-show-projection.js";
import {
  mountShowPremiumPrices
} from "./podcast-admin-show-prices.js";

export function mountShowSiteProjection(options) {
  const projection = mountProjection(options);
  let show = null;
  const prices = mountShowPremiumPrices({
    ...options,
    canConfigure: options.canPublish,
    onSaved() {
      projection.setShow(show);
    }
  });
  return {
    setShow(nextShow) {
      show = nextShow || null;
      prices.setShow(show);
      projection.setShow(show);
    }
  };
}

const SHOW_TEXT_FIELDS = [
  "title",
  "description",
  "descriptionEn",
  "authorName",
  "category",
  "artworkUrl",
  "canonicalUrl",
  "feedUrl",
  "youtubeChannelUrl"
];

export function populateShowSettingsForm(form, show) {
  for (const field of SHOW_TEXT_FIELDS) {
    form.elements[field].value = show[field] ?? "";
  }
  form.elements.earlyAccessDays.value = show.earlyAccessDays ?? "";
  form.elements.language.value = show.language === "en" ? "en" : "es";
  form.elements.status.value = [
    "coming_soon",
    "active",
    "archived"
  ].includes(show.status) ? show.status : "coming_soon";
  form.elements.premiumEnabled.checked = Boolean(show.premiumEnabled);
  form.elements.freeMiniEpisodeEnabled.checked = Boolean(
    show.freeMiniEpisodeEnabled
  );
  form.elements.explicit.checked = Boolean(show.explicit);
}

export function readShowSettingsPayload(form) {
  const earlyAccessValue = String(
    form.elements.earlyAccessDays.value ?? ""
  ).trim();
  return {
    title: form.elements.title.value,
    language: form.elements.language.value,
    status: form.elements.status.value,
    authorName: form.elements.authorName.value,
    category: form.elements.category.value,
    description: form.elements.description.value,
    descriptionEn: form.elements.descriptionEn.value,
    artworkUrl: form.elements.artworkUrl.value,
    earlyAccessDays: earlyAccessValue === "" ? null : Number(earlyAccessValue),
    youtubeChannelUrl: form.elements.youtubeChannelUrl.value,
    premiumEnabled: form.elements.premiumEnabled.checked,
    freeMiniEpisodeEnabled: form.elements.freeMiniEpisodeEnabled.checked,
    explicit: form.elements.explicit.checked
  };
}

export function needsShowArchiveConfirmation(show, nextStatus) {
  return nextStatus === "archived" && show?.status !== "archived";
}
