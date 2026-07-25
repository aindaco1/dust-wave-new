import {
  AdminApiClient as PodcastApiClient,
  AdminApiError as PodcastApiError
} from "./dust-wave-admin-shell/api-client.js";

const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI "
  + "BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM "
  + "CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI "
  + "FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW "
  + "GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG "
  + "KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD "
  + "ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE "
  + "NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW "
  + "PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS "
  + "ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG "
  + "UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

const root = document.querySelector("[data-podcast-checkout-root]");
if (root) startPodcastCheckout(root);

function startPodcastCheckout(rootElement) {
  const form = rootElement.querySelector("[data-podcast-checkout-form]");
  const unavailable = rootElement.querySelector(
    "[data-podcast-checkout-unavailable]"
  );
  const status = rootElement.querySelector("[data-podcast-checkout-status]");
  const submit = rootElement.querySelector("[data-podcast-checkout-submit]");
  const quotePanel = rootElement.querySelector("[data-podcast-checkout-quote]");
  const country = form?.elements.country;
  const usState = form?.elements.usState;
  const region = form?.elements.region;
  const usStateField = rootElement.querySelector("[data-podcast-us-state-field]");
  const regionField = rootElement.querySelector("[data-podcast-region-field]");
  const turnstileContainer = rootElement.querySelector(
    "#podcast-checkout-turnstile"
  );
  const slug = String(rootElement.dataset.showSlug || "");
  const apiOrigin = String(rootElement.dataset.apiOrigin || "");
  const siteKey = String(rootElement.dataset.turnstileSiteKey || "");
  if (
    !form
    || !unavailable
    || !status
    || !submit
    || !quotePanel
    || !country
    || !usState
    || !region
    || !usStateField
    || !regionField
    || !turnstileContainer
    || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    || !apiOrigin
  ) {
    return;
  }

  const client = new PodcastApiClient({ baseUrl: apiOrigin });
  const prices = new Map();
  let quoteSignature = "";
  let quotePriceId = "";
  let turnstileToken = "";
  let turnstileWidgetId;
  let submitting = false;

  populateCountries(country);
  country.value = "US";
  toggleRegionFields();
  form.addEventListener("submit", handleSubmit);
  form.addEventListener("input", invalidateQuote);
  form.addEventListener("change", handleChange);
  showCanceledCheckoutStatus();
  loadCheckoutState();

  async function loadCheckoutState() {
    try {
      const payload = await client.request(
        `/v1/shows/${encodeURIComponent(slug)}`,
        { csrf: false }
      );
      if (
        payload?.show?.slug !== slug
        || payload.checkoutEnabled !== true
        || !siteKey
      ) {
        return;
      }
      const configuredPrices = Array.isArray(payload.show.prices)
        ? payload.show.prices
        : [];
      for (const price of configuredPrices) {
        if (
          (price?.billing_period === "month" || price?.billing_period === "year")
          && /^[A-Za-z0-9_-]+$/.test(String(price.id || ""))
          && Number.isSafeInteger(price.amount_cents)
          && price.amount_cents > 0
          && price.currency === "USD"
        ) {
          prices.set(price.billing_period, {
            id: String(price.id),
            amountCents: price.amount_cents
          });
        }
      }
      if (!configurePlanChoices()) return;
      unavailable.hidden = true;
      form.hidden = false;
    } catch {
      // The static coming-soon state is the deliberate fail-closed fallback.
    }
  }

  function configurePlanChoices() {
    let firstAvailable;
    for (const period of ["month", "year"]) {
      const label = rootElement.querySelector(`[data-podcast-plan="${period}"]`);
      const input = label?.querySelector("input");
      const amount = rootElement.querySelector(
        `[data-podcast-plan-price="${period}"]`
      );
      const price = prices.get(period);
      if (!label || !input || !amount) continue;
      label.hidden = !price;
      input.disabled = !price;
      if (price) {
        firstAvailable ||= input;
        amount.textContent = `${
          formatMoney(price.amountCents)
        } / ${period === "month" ? "mes · month" : "año · year"}`;
      }
    }
    const selected = form.querySelector(
      "input[name='billingPeriod']:checked:not(:disabled)"
    );
    if (!selected && firstAvailable) firstAvailable.checked = true;
    return Boolean(firstAvailable);
  }

  function handleChange(event) {
    if (event.target === country) toggleRegionFields();
    invalidateQuote();
  }

  function toggleRegionFields() {
    const isUnitedStates = country.value === "US";
    usStateField.hidden = !isUnitedStates;
    usState.disabled = !isUnitedStates;
    usState.required = isUnitedStates;
    regionField.hidden = isUnitedStates;
    region.disabled = isUnitedStates;
  }

  function invalidateQuote() {
    if (!quoteSignature) return;
    quoteSignature = "";
    quotePriceId = "";
    quotePanel.hidden = true;
    submit.textContent = "Calcular total / Review total";
    resetTurnstile();
    setStatus(status, "Los datos cambiaron; calcula el total otra vez. / Details changed; review the total again.");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const selection = selectedPrice();
    if (!selection) {
      setStatus(
        status,
        "Este plan no está disponible. / This plan is not available.",
        true
      );
      return;
    }
    const signature = formSignature();
    submitting = true;
    submit.disabled = true;
    try {
      if (quoteSignature !== signature || quotePriceId !== selection.id) {
        await requestQuote(selection, signature);
      } else {
        await startCheckout(selection);
      }
    } finally {
      submitting = false;
      submit.disabled = false;
    }
  }

  async function requestQuote(selection, signature) {
    setStatus(status, "Calculando el total… / Calculating total…");
    quotePanel.hidden = true;
    try {
      const payload = await client.request(
        `/v1/shows/${encodeURIComponent(slug)}/tax/quote`,
        {
          method: "POST",
          csrf: false,
          body: {
            priceId: selection.id,
            destination: destinationFromForm()
          }
        }
      );
      const quote = validQuote(payload?.quote, selection.id);
      if (!quote || payload.checkoutEnabled !== true) {
        throw new PodcastApiError("checkout_not_available", {
          status: 503,
          code: "checkout_not_available"
        });
      }
      renderQuote(quote);
      quoteSignature = signature;
      quotePriceId = selection.id;
      submit.textContent = "Continuar al pago seguro / Continue to secure payment";
      setStatus(
        status,
        "Revisa el total y continúa cuando estés listo. / Review the total and continue when ready."
      );
      await initializeTurnstile();
    } catch (error) {
      quoteSignature = "";
      quotePriceId = "";
      setStatus(status, friendlyCheckoutError(error), true);
    }
  }

  async function startCheckout(selection) {
    if (!turnstileToken) {
      setStatus(
        status,
        "Completa la verificación segura. / Complete the secure verification.",
        true
      );
      return;
    }
    setStatus(status, "Abriendo el pago seguro… / Opening secure checkout…");
    try {
      const payload = await client.request(
        `/v1/shows/${encodeURIComponent(slug)}/checkout`,
        {
          method: "POST",
          csrf: false,
          body: {
            email: String(form.elements.email.value || "").trim(),
            priceId: selection.id,
            destination: destinationFromForm(),
            turnstileToken
          }
        }
      );
      const checkoutUrl = trustedStripeUrl(
        payload?.checkout?.url,
        "checkout.stripe.com"
      );
      globalThis.location.assign(checkoutUrl);
    } catch (error) {
      resetTurnstile();
      setStatus(status, friendlyCheckoutError(error), true);
    }
  }

  function selectedPrice() {
    const period = String(
      new FormData(form).get("billingPeriod") || ""
    );
    return prices.get(period);
  }

  function destinationFromForm() {
    const isUnitedStates = country.value === "US";
    return {
      country: String(country.value || "").toUpperCase(),
      state: String(isUnitedStates ? usState.value : region.value).trim(),
      postalCode: String(form.elements.postalCode.value || "").trim(),
      city: String(form.elements.city.value || "").trim(),
      line1: String(form.elements.line1.value || "").trim(),
      line2: String(form.elements.line2.value || "").trim()
    };
  }

  function formSignature() {
    return JSON.stringify({
      billingPeriod: new FormData(form).get("billingPeriod"),
      email: String(form.elements.email.value || "").trim().toLowerCase(),
      destination: destinationFromForm()
    });
  }

  function renderQuote(quote) {
    rootElement.querySelector("[data-podcast-quote-subtotal]").textContent =
      formatMoney(quote.subtotalCents);
    rootElement.querySelector("[data-podcast-quote-tax]").textContent =
      formatMoney(quote.taxCents);
    rootElement.querySelector("[data-podcast-quote-total]").textContent =
      formatMoney(quote.totalCents);
    rootElement.querySelector("[data-podcast-quote-jurisdiction]").textContent =
      `Jurisdicción fiscal / Tax jurisdiction: ${quote.jurisdictionCode}`;
    quotePanel.hidden = false;
  }

  async function initializeTurnstile() {
    turnstileContainer.hidden = false;
    try {
      await loadTurnstile();
      if (turnstileWidgetId !== undefined) return;
      turnstileWidgetId = globalThis.turnstile.render(
        "#podcast-checkout-turnstile",
        {
          sitekey: siteKey,
          action: "podcast_subscription_checkout",
          callback: (token) => {
            turnstileToken = token;
            setStatus(status, "Verificación completa. / Verification complete.");
          },
          "expired-callback": () => {
            turnstileToken = "";
            setStatus(
              status,
              "La verificación venció; complétala otra vez. / Verification expired; complete it again.",
              true
            );
          },
          "error-callback": () => {
            turnstileToken = "";
            setStatus(
              status,
              "No se pudo completar la verificación. / Verification could not be completed.",
              true
            );
          }
        }
      );
    } catch {
      setStatus(
        status,
        "No se pudo cargar la verificación segura. Recarga la página. / Secure verification could not load. Refresh the page.",
        true
      );
    }
  }

  function resetTurnstile() {
    turnstileToken = "";
    if (turnstileWidgetId !== undefined) {
      globalThis.turnstile?.reset?.(turnstileWidgetId);
    }
  }

  function showCanceledCheckoutStatus() {
    const query = new URLSearchParams(globalThis.location.search);
    if (query.get("checkout") === "canceled") {
      unavailable.textContent =
        "El pago fue cancelado; no se realizó ningún cargo. / Checkout was canceled; no charge was made.";
    }
  }
}

let turnstileLoader;

function loadTurnstile() {
  if (globalThis.turnstile) return Promise.resolve();
  if (turnstileLoader) return turnstileLoader;
  turnstileLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      if (globalThis.turnstile) resolve();
      else reject(new Error("turnstile_unavailable"));
    }, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.append(script);
  });
  return turnstileLoader;
}

function populateCountries(select) {
  let displayNames;
  try {
    displayNames = new Intl.DisplayNames(
      [document.documentElement.lang || "es", "en"],
      { type: "region" }
    );
  } catch {
    displayNames = null;
  }
  const options = COUNTRY_CODES.map((code) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = displayNames?.of(code) || code;
    return option;
  }).sort((left, right) => left.textContent.localeCompare(right.textContent));
  select.append(...options);
}

function validQuote(quote, priceId) {
  if (
    !quote
    || quote.priceId !== priceId
    || quote.currency !== "USD"
    || !Number.isSafeInteger(quote.subtotalCents)
    || !Number.isSafeInteger(quote.taxCents)
    || !Number.isSafeInteger(quote.totalCents)
    || quote.subtotalCents < 0
    || quote.taxCents < 0
    || quote.totalCents < 0
    || !/^[A-Z0-9-]{2,64}$/.test(String(quote.jurisdictionCode || ""))
  ) {
    return null;
  }
  return quote;
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
  throw new PodcastApiError("unsafe_checkout_destination", {
    code: "unsafe_checkout_destination"
  });
}

function formatMoney(cents) {
  return new Intl.NumberFormat(document.documentElement.lang || "es", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

function setStatus(element, message, error = false) {
  element.textContent = message;
  element.classList.toggle("is-error", error);
  if (error) {
    element.tabIndex = -1;
    element.focus({ preventScroll: true });
  }
}

function friendlyCheckoutError(error) {
  if (!(error instanceof PodcastApiError)) {
    return "No se pudo contactar el servicio. Inténtalo de nuevo. / The service could not be reached. Please retry.";
  }
  const messages = {
    checkout_not_available:
      "La suscripción todavía no está disponible. / Subscription checkout is not available yet.",
    subscription_price_not_found:
      "Este plan ya no está disponible. / This plan is no longer available.",
    subscription_price_not_ready:
      "Este plan todavía no está listo para pagos. / This plan is not ready for checkout yet.",
    tax_rate_not_approved:
      "Todavía no podemos calcular impuestos para esta dirección. / Tax is not yet configured for this address.",
    tax_configuration_mismatch:
      "La configuración fiscal necesita revisión. / The tax configuration needs review.",
    tax_configuration_invalid:
      "No pudimos calcular el impuesto de forma segura. / We could not calculate tax safely.",
    subscription_already_active:
      "Ya existe una suscripción activa con este correo. Abre tu cuenta. / An active subscription already exists for this email. Open your account.",
    checkout_already_started:
      "Ya hay un pago abierto para este correo. Usa los mismos datos o espera a que venza. / Checkout is already open for this email. Use the same details or wait for it to expire.",
    invalid_turnstile_token:
      "La verificación segura falló. Inténtalo otra vez. / Secure verification failed. Try again.",
    turnstile_verification_failed:
      "La verificación segura falló. Inténtalo otra vez. / Secure verification failed. Try again.",
    rate_limited:
      "Demasiados intentos. Espera y vuelve a intentar. / Too many attempts. Wait and retry.",
    checkout_provider_unavailable:
      "El pago seguro no está disponible en este momento. / Secure checkout is temporarily unavailable.",
    unsafe_checkout_destination:
      "La dirección del servicio de pago no pasó la verificación. / The checkout destination failed verification."
  };
  return messages[error.code]
    || "No pudimos continuar de forma segura. Inténtalo de nuevo. / We could not continue securely. Please retry.";
}
