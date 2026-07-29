export function mountShowPremiumPrices({
  root,
  client,
  text,
  setStatus,
  friendlyError,
  canConfigure,
  onSaved
}) {
  const panel = root.querySelector("[data-podcast-show-prices]");
  const summary = root.querySelector("[data-podcast-show-prices-summary]");
  const blockerList = root.querySelector(
    "[data-podcast-show-prices-blockers]"
  );
  const form = root.querySelector("[data-podcast-show-prices-form]");
  const status = root.querySelector("[data-podcast-show-prices-status]");
  const confirmationHint = root.querySelector(
    "[data-podcast-show-prices-confirmation-hint]"
  );
  let show = null;
  let configuration = null;
  let requestId = 0;

  form?.addEventListener("submit", savePrices);

  return { setShow };

  function setShow(nextShow) {
    show = nextShow || null;
    configuration = null;
    requestId += 1;
    const visible = Boolean(show && canConfigure());
    if (panel) panel.hidden = !visible;
    if (summary) summary.replaceChildren();
    if (blockerList) {
      blockerList.hidden = true;
      blockerList.replaceChildren();
    }
    if (form) {
      form.hidden = true;
      form.reset();
    }
    setStatus(status, "");
    if (visible) loadPrices();
  }

  async function loadPrices() {
    if (!show) return;
    const showId = show.id;
    const currentRequest = ++requestId;
    setStatus(status, text("loadingShowPrices"));
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(showId)}/premium-prices`
      );
      if (currentRequest !== requestId || show?.id !== showId) return;
      configuration = payload;
      renderConfiguration(payload);
      setStatus(status, text("showPricesReady"));
    } catch (error) {
      if (currentRequest === requestId) {
        setStatus(status, friendlyError(error), true);
      }
    }
  }

  function renderConfiguration(payload) {
    if (!summary || !blockerList || !form || !confirmationHint || !show) {
      return;
    }
    const formatter = new Intl.NumberFormat(
      document.documentElement.lang === "es" ? "es-US" : "en-US",
      { style: "currency", currency: "USD" }
    );
    summary.replaceChildren();
    appendEvidence(
      summary,
      text("showPricesCurrentLabel"),
      text("showPricesCurrentValue", {
        monthly: formatter.format(Number(payload.monthlyCents || 0) / 100),
        annual: formatter.format(Number(payload.annualCents || 0) / 100)
      })
    );
    appendEvidence(
      summary,
      text("showPricesProviderLabel"),
      text(
        payload.providerReady
          ? "showPricesProviderReady"
          : "showPricesProviderPending"
      )
    );
    appendEvidence(
      summary,
      text("mode"),
      text(payload.providerMode === "live" ? "liveMode" : "testMode")
    );

    const blockers = Array.isArray(payload.blockers) ? payload.blockers : [];
    blockerList.replaceChildren(...blockers.map((blocker) => {
      const item = document.createElement("li");
      item.textContent = text(`showPriceBlocker_${blocker}`);
      return item;
    }));
    blockerList.hidden = blockers.length === 0;

    form.elements.monthlyDollars.value = centsToDollars(
      payload.monthlyCents
    );
    form.elements.annualDollars.value = centsToDollars(
      payload.annualCents
    );
    const confirmation = String(
      payload.confirmation || `CONFIGURE_SHOW_PRICES ${show.id}`
    );
    form.elements.confirmation.value = "";
    form.elements.confirmation.placeholder = confirmation;
    confirmationHint.textContent = text("showPricesConfirmationValue", {
      confirmation
    });
    form.hidden = Boolean(payload.configurationLocked);
  }

  async function savePrices(event) {
    event.preventDefault();
    if (!show || !configuration || !form) return;
    let monthlyCents;
    let annualCents;
    try {
      monthlyCents = dollarsToCents(form.elements.monthlyDollars.value);
      annualCents = dollarsToCents(form.elements.annualDollars.value);
    } catch {
      setStatus(status, text("showPriceAmountInvalid"), true);
      return;
    }
    if (annualCents < monthlyCents) {
      setStatus(status, text("showPriceAnnualBelowMonthly"), true);
      return;
    }
    if (annualCents >= monthlyCents * 12) {
      setStatus(status, text("showPriceAnnualDiscountRequired"), true);
      return;
    }
    const showId = show.id;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(status, text("savingShowPrices"));
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(showId)}/premium-prices`,
        {
          method: "PATCH",
          body: {
            monthlyCents,
            annualCents,
            expectedMonthlyCents: configuration.monthlyCents,
            expectedAnnualCents: configuration.annualCents,
            confirmation: String(form.elements.confirmation.value || "")
              .trim()
          }
        }
      );
      if (show?.id !== showId) return;
      configuration = payload;
      renderConfiguration(payload);
      setStatus(
        status,
        text(
          payload.idempotent
            ? "showPricesUnchanged"
            : "showPricesSavedProviderPending"
        )
      );
      onSaved?.(payload);
    } catch (error) {
      setStatus(status, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  function appendEvidence(list, label, value) {
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    list.append(term, detail);
  }
}

export function dollarsToCents(value) {
  const normalized = String(value ?? "").trim();
  if (!/^\d{1,7}(?:\.\d{1,2})?$/u.test(normalized)) {
    throw new Error("Enter a USD amount with no more than two decimals.");
  }
  const [dollars, cents = ""] = normalized.split(".");
  const amount = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 1_000_000) {
    throw new Error("Enter a USD amount from $1.00 through $10,000.00.");
  }
  return amount;
}

function centsToDollars(value) {
  const cents = Number(value);
  return Number.isSafeInteger(cents) && cents >= 0
    ? (cents / 100).toFixed(2)
    : "";
}
