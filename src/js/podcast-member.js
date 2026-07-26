import {
  AdminApiClient as PodcastApiClient,
  AdminApiError as PodcastApiError
} from "./dust-wave-admin-shell/api-client.js";
import {
  PasswordlessAdminSession as PasswordlessSession
} from "./dust-wave-admin-shell/passwordless-session.js";

const translate = globalThis.DustWaveI18n?.t || ((key) => key);
const root = document.querySelector("[data-podcast-member]");
if (root) startPodcastMember(root);

function startPodcastMember(rootElement) {
  const client = new PodcastApiClient({
    baseUrl: rootElement.dataset.apiOrigin,
    csrfHeader: "x-podcast-csrf"
  });
  const session = new PasswordlessSession({
    client,
    endpoints: {
      start: "/v1/member/auth/start",
      exchange: "/v1/member/auth/exchange",
      session: "/v1/member/session",
      logout: "/v1/member/logout"
    }
  });
  const authPanel = rootElement.querySelector("[data-podcast-member-auth]");
  const app = rootElement.querySelector("[data-podcast-member-app]");
  const loginForm = rootElement.querySelector("[data-podcast-member-login-form]");
  const logoutButton = rootElement.querySelector("[data-podcast-member-logout]");
  const globalStatus = rootElement.querySelector(
    "[data-podcast-member-global-status]"
  );
  const authStatus = rootElement.querySelector("[data-podcast-member-auth-status]");
  const sessionSummary = rootElement.querySelector(
    "[data-podcast-member-session-summary]"
  );
  const subscriptionList = rootElement.querySelector(
    "[data-podcast-member-subscriptions]"
  );
  const poolRedemptionPanel = rootElement.querySelector(
    "[data-podcast-pool-redemption]"
  );
  const poolRedemptionForm = rootElement.querySelector(
    "[data-podcast-pool-redemption-form]"
  );
  const poolRedemptionStatus = rootElement.querySelector(
    "[data-podcast-pool-redemption-status]"
  );
  let turnstileToken = "";
  let turnstileWidgetId;

  loginForm?.addEventListener("submit", startLogin);
  poolRedemptionForm?.addEventListener("submit", redeemPoolBenefit);
  logoutButton?.addEventListener("click", logout);
  initializeTurnstile();
  restoreOrExchange();

  async function restoreOrExchange() {
    setStatus(globalStatus, translate("member.checkingSession"));
    const token = session.tokenFromFragment();
    if (token) session.clearFragment();
    try {
      const result = token
        ? await session.exchange(token)
        : await session.restore();
      showAuthenticated(result);
      setStatus(globalStatus, "");
    } catch (error) {
      showLoggedOut();
      setStatus(
        globalStatus,
        error instanceof PodcastApiError && error.status === 401
          ? token
            ? translate("member.expiredLink")
            : ""
          : friendlyError(error),
        Boolean(token) || !(error instanceof PodcastApiError && error.status === 401)
      );
    }
  }

  async function startLogin(event) {
    event.preventDefault();
    const submit = loginForm.querySelector("button[type='submit']");
    submit.disabled = true;
    setStatus(authStatus, translate("member.sendingLink"));
    try {
      await session.start({
        email: loginForm.elements.email.value,
        turnstileToken,
        preferredLanguage: document.documentElement.lang || "es"
      });
      setStatus(
        authStatus,
        translate("member.linkSent")
      );
    } catch (error) {
      setStatus(authStatus, friendlyError(error), true);
    } finally {
      submit.disabled = false;
      resetTurnstile();
    }
  }

  async function logout() {
    logoutButton.disabled = true;
    try {
      await session.logout();
      showLoggedOut();
      setStatus(globalStatus, translate("member.signedOut"));
    } catch (error) {
      setStatus(globalStatus, friendlyError(error), true);
    } finally {
      logoutButton.disabled = false;
    }
  }

  function showAuthenticated(result) {
    const identity = result?.identity;
    authPanel.hidden = true;
    app.hidden = false;
    logoutButton.hidden = false;
    poolRedemptionPanel.hidden = result?.poolRedemptionEnabled !== true;
    const subscriptions = Array.isArray(identity?.subscriptions)
      ? identity.subscriptions
      : [];
    sessionSummary.textContent = subscriptions.length
      ? translate(
        subscriptions.length === 1
          ? "member.subscriptionCount"
          : "member.subscriptionCountPlural",
        { count: subscriptions.length }
      )
      : translate("member.noSubscriptions");
    subscriptionList.replaceChildren(
      ...subscriptions.map(subscriptionCard)
    );
  }

  function showLoggedOut() {
    authPanel.hidden = false;
    app.hidden = true;
    logoutButton.hidden = true;
    poolRedemptionPanel.hidden = true;
    poolRedemptionForm?.reset();
    setStatus(poolRedemptionStatus, "");
    subscriptionList.replaceChildren();
    sessionSummary.textContent = "";
  }

  async function redeemPoolBenefit(event) {
    event.preventDefault();
    const submit = poolRedemptionForm.querySelector("button[type='submit']");
    const input = poolRedemptionForm.elements.code;
    submit.disabled = true;
    setStatus(
      poolRedemptionStatus,
      translate("member.checkingCode")
    );
    try {
      const result = await client.request("/v1/member/redemptions/pool", {
        method: "POST",
        body: { code: String(input.value || "").trim().toUpperCase() }
      });
      input.value = "";
      const title = String(
        result?.redemption?.show?.title || "Dust Wave Podcast"
      );
      const success = translate("member.accessActivated", { title });
      setStatus(poolRedemptionStatus, success);
      try {
        showAuthenticated(await session.restore());
        setStatus(poolRedemptionStatus, success);
      } catch {
        setStatus(
          poolRedemptionStatus,
          translate("member.refreshForAccess", { message: success })
        );
      }
    } catch (error) {
      setStatus(poolRedemptionStatus, friendlyError(error), true);
    } finally {
      submit.disabled = false;
    }
  }

  function subscriptionCard(subscription) {
    const card = document.createElement("article");
    card.className = "podcast-member__subscription";

    const heading = document.createElement("h3");
    const showLink = document.createElement("a");
    const localePrefix = document.documentElement.lang === "es" ? "/es" : "";
    showLink.href = `${localePrefix}/podcasts/${encodeURIComponent(
      subscription.show?.slug || ""
    )}/`;
    showLink.textContent = subscription.show?.title || "Dust Wave Podcast";
    heading.append(showLink);

    const badges = document.createElement("p");
    badges.className = "podcast-member__badges";
    badges.append(
      badge(
        subscription.entitled
          ? translate("member.premiumActive")
          : humanStatus(subscription.status)
      ),
      badge(planLabel(subscription.billingPeriod))
    );

    const access = document.createElement("p");
    access.textContent = subscription.entitled
      ? translate("member.accessEnabled")
      : translate("member.accessInactive");

    const feed = document.createElement("p");
    feed.textContent = subscription.hasPrivateFeed
      ? translate("member.feedExists")
      : subscription.entitled
        ? translate("member.feedCreateBody")
        : translate("member.feedRequiresAccess");

    card.append(heading, badges, access, feed);
    if (subscription.entitled) {
      card.append(privateFeedControls(subscription));
    }
    card.append(notificationControls(subscription));
    if (subscription.hasStripeBilling) {
      card.append(billingPortalControls(subscription));
    }
    if (subscription.currentPeriodEnd) {
      const period = document.createElement("p");
      period.className = "podcast-member__fine-print";
      period.textContent = translate("member.currentPeriod", {
        date: formatDate(subscription.currentPeriodEnd)
      });
      card.append(period);
    }
    return card;
  }

  function privateFeedControls(subscription) {
    const controls = document.createElement("div");
    controls.className = "podcast-member__feed-controls";

    const action = document.createElement("button");
    action.type = "button";
    action.className = "btn btn-outline-light";
    action.textContent = subscription.hasPrivateFeed
      ? translate("member.replaceFeed")
      : translate("member.createFeed");

    const status = document.createElement("p");
    status.className = "podcast-member__status podcast-member__fine-print";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    action.addEventListener("click", async () => {
      const rotating = Boolean(subscription.hasPrivateFeed);
      if (
        rotating
        && !globalThis.confirm(
          translate("member.rotateConfirm")
        )
      ) {
        return;
      }
      action.disabled = true;
      controls.querySelector("[data-private-feed-output]")?.remove();
      setStatus(
        status,
        rotating
          ? translate("member.replacingFeed")
          : translate("member.creatingFeed")
      );
      try {
        const slug = encodeURIComponent(subscription.show?.slug || "");
        const result = await client.request(
          `/v1/member/shows/${slug}/feed${rotating ? "/rotate" : ""}`,
          { method: "POST" }
        );
        const url = String(result?.feed?.url || "");
        if (!url) throw new PodcastApiError("private_feed_url_missing");
        subscription.hasPrivateFeed = true;
        action.textContent = translate("member.replaceFeed");
        controls.insertBefore(
          privateFeedOutput(url, subscription.show?.slug || ""),
          status
        );
        setStatus(
          status,
          translate("member.saveFeed")
        );
      } catch (error) {
        setStatus(status, friendlyError(error), true);
      } finally {
        action.disabled = false;
      }
    });
    controls.append(action, status);
    return controls;
  }

  function notificationControls(subscription) {
    const form = document.createElement("form");
    form.className = "podcast-member__notification-controls";

    const heading = document.createElement("h4");
    heading.textContent = translate("member.notifications");

    const explanation = document.createElement("p");
    explanation.className = "podcast-member__fine-print";
    explanation.textContent = translate("member.notificationsBody");

    const consent = document.createElement("label");
    consent.className = "podcast-member__notification-consent";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked =
      subscription.announcementNotificationsEnabled === true;
    const consentText = document.createElement("span");
    consentText.textContent = translate("member.notificationsConsent");
    consent.append(checkbox, consentText);

    const languageLabel = document.createElement("label");
    languageLabel.textContent = translate("member.language");
    const language = document.createElement("select");
    language.replaceChildren(
      new Option("Español", "es"),
      new Option("English", "en")
    );
    language.value = subscription.notificationLanguage === "en"
      ? "en"
      : "es";
    languageLabel.append(language);

    const emailLabel = document.createElement("label");
    emailLabel.className = "podcast-member__notification-email";
    emailLabel.append(translate("member.notificationEmail"));
    const email = document.createElement("input");
    email.type = "email";
    email.name = "notificationEmail";
    email.autocomplete = "email";
    email.inputMode = "email";
    email.maxLength = 254;
    emailLabel.append(email);

    const emailHelp = document.createElement("p");
    emailHelp.className = "podcast-member__fine-print";
    emailHelp.textContent = translate("member.notificationEmailHelp");

    const save = document.createElement("button");
    save.type = "submit";
    save.className = "btn btn-outline-light";
    save.textContent = translate("member.saveNotifications");

    const status = document.createElement("p");
    status.className =
      "podcast-member__status podcast-member__fine-print";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const updateEmailField = () => {
      emailLabel.hidden = !checkbox.checked;
      emailHelp.hidden = !checkbox.checked;
      email.disabled = !checkbox.checked;
      email.required = checkbox.checked;
    };
    checkbox.addEventListener("change", updateEmailField);
    updateEmailField();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      save.disabled = true;
      setStatus(
        status,
        translate("member.saving")
      );
      try {
        const slug = encodeURIComponent(subscription.show?.slug || "");
        const result = await client.request(
          `/v1/member/shows/${slug}/notifications`,
          {
            method: "PUT",
            body: {
              enabled: checkbox.checked,
              language: language.value,
              email: checkbox.checked ? email.value : undefined
            }
          }
        );
        subscription.announcementNotificationsEnabled =
          result.preference?.announcementsEnabled === true;
        subscription.notificationLanguage =
          result.preference?.language || language.value;
        email.value = "";
        setStatus(
          status,
          checkbox.checked
            ? translate("member.notificationsEnabled")
            : translate("member.notificationsDisabled")
        );
      } catch (error) {
        setStatus(status, friendlyError(error), true);
      } finally {
        save.disabled = false;
      }
    });
    form.append(
      heading,
      explanation,
      consent,
      languageLabel,
      emailLabel,
      emailHelp,
      save,
      status
    );
    return form;
  }

  function billingPortalControls(subscription) {
    const controls = document.createElement("div");
    controls.className = "podcast-member__billing-controls";

    const action = document.createElement("button");
    action.type = "button";
    action.className = "btn btn-outline-light";
    action.textContent = translate("member.manageBilling");

    const status = document.createElement("p");
    status.className = "podcast-member__status podcast-member__fine-print";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    action.addEventListener("click", async () => {
      action.disabled = true;
      setStatus(
        status,
        translate("member.openingBilling")
      );
      try {
        const slug = encodeURIComponent(subscription.show?.slug || "");
        const result = await client.request(
          `/v1/member/shows/${slug}/billing/portal`,
          { method: "POST" }
        );
        globalThis.location.assign(
          trustedStripeUrl(result?.portal?.url, "billing.stripe.com")
        );
      } catch (error) {
        setStatus(status, friendlyError(error), true);
        action.disabled = false;
      }
    });
    controls.append(action, status);
    return controls;
  }

  function privateFeedOutput(url, showSlug) {
    const output = document.createElement("div");
    output.className = "podcast-member__feed-output";
    output.dataset.privateFeedOutput = "";

    const id = `podcast-private-feed-${String(showSlug).replace(
      /[^a-z0-9_-]/gi,
      "-"
    )}`;
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = translate("member.privateUrl");

    const row = document.createElement("div");
    row.className = "podcast-member__inline-form";
    const input = document.createElement("input");
    input.id = id;
    input.type = "text";
    input.readOnly = true;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.value = url;
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "btn btn-danger";
    copy.textContent = translate("member.copy");
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url);
        copy.textContent = translate("member.copied");
      } catch {
        input.focus();
        input.select();
        copy.textContent = translate("member.selected");
      }
    });
    row.append(input, copy);
    output.append(label, row);
    return output;
  }

  function initializeTurnstile() {
    const siteKey = rootElement.dataset.turnstileSiteKey;
    if (!siteKey) return;
    let attempts = 0;
    const render = () => {
      attempts += 1;
      if (!globalThis.turnstile) {
        if (attempts < 100) {
          setTimeout(render, 100);
        } else {
          setStatus(
            authStatus,
            translate("member.verificationUnavailable"),
            true
          );
        }
        return;
      }
      turnstileWidgetId = globalThis.turnstile.render(
        "#podcast-member-turnstile",
        {
          sitekey: siteKey,
          action: "podcast_listener_login",
          language: document.documentElement.lang || "en",
          callback: (token) => { turnstileToken = token; },
          "expired-callback": () => { turnstileToken = ""; },
          "error-callback": () => { turnstileToken = ""; }
        }
      );
    };
    render();
  }

  function resetTurnstile() {
    turnstileToken = "";
    if (turnstileWidgetId !== undefined) {
      globalThis.turnstile?.reset?.(turnstileWidgetId);
    }
  }
}

function badge(label) {
  const item = document.createElement("span");
  item.textContent = label;
  return item;
}

function planLabel(period) {
  if (period === "month") return translate("member.monthly");
  if (period === "year") return translate("member.annual");
  return translate("member.benefit");
}

function humanStatus(status) {
  const label = translate(`member.${status}`);
  return label.startsWith("[missing:")
    ? translate("member.inactive")
    : label;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(document.documentElement.lang || "es", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function setStatus(element, message, error = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", error);
}

function trustedStripeUrl(value, expectedHost) {
  try {
    const url = new URL(String(value || ""));
    if (
      url.protocol === "https:"
      && url.hostname === expectedHost
      && !url.port
      && !url.username
      && !url.password
    ) {
      return url.href;
    }
  } catch {
    // Normalize every malformed or unexpected destination to one safe error.
  }
  throw new PodcastApiError("unsafe_billing_destination", {
    code: "unsafe_billing_destination"
  });
}

function friendlyError(error) {
  if (!(error instanceof PodcastApiError)) {
    return translate("member.network");
  }
  const aliases = {
    invalid_redemption_code: "redemption_code_not_available",
    private_feed_already_exists: "private_feed_conflict",
    billing_portal_unavailable: "billing_portal_not_configured"
  };
  const message = translate(`member.${aliases[error.code] || error.code}`);
  return message.startsWith("[missing:")
    ? translate("member.unknown")
    : message;
}
