export function mountPodcastAudienceBilling({
  root,
  client,
  apiOrigin,
  text: adminText,
  setStatus,
  friendlyError,
  escapeHtml,
  humanizeCode,
  getSelectedShowId,
  isSuperAdmin,
  ApiError,
  requestCredentialedBlob,
  triggerBlobDownload,
  fetchImpl = window.fetch
}) {
  const billingRoot = root.querySelector("[data-podcast-billing]");
  const billingStatus = root.querySelector("[data-podcast-billing-status]");
  const billingRefresh = root.querySelector("[data-podcast-billing-refresh]");
  const billingExport = root.querySelector("[data-podcast-billing-export]");
  const subscribersRoot = root.querySelector("[data-podcast-subscribers]");
  const subscribersStatus = root.querySelector(
    "[data-podcast-subscribers-status]"
  );
  const subscribersFilters = root.querySelector(
    "[data-podcast-subscribers-filters]"
  );
  const subscribersRefresh = root.querySelector(
    "[data-podcast-subscribers-refresh]"
  );
  const subscribersExport = root.querySelector(
    "[data-podcast-subscribers-export]"
  );
  const subscribersMore = root.querySelector(
    "[data-podcast-subscribers-more]"
  );
  let billingRequestId = 0;
  let subscriberRows = [];
  let subscriberSummary = null;
  let subscriberCursor = null;
  let subscriberLoading = false;
  let subscriberRequestId = 0;

  billingRefresh?.addEventListener("click", loadBilling);
  billingExport?.addEventListener("click", exportBillingEvidence);
  subscribersRefresh?.addEventListener(
    "click",
    () => loadSubscribers({ reset: true })
  );
  subscribersExport?.addEventListener("click", exportSubscribers);
  subscribersMore?.addEventListener(
    "click",
    () => loadSubscribers({ reset: false })
  );
  subscribersFilters?.addEventListener(
    "change",
    () => loadSubscribers({ reset: true })
  );
  subscribersFilters?.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  async function loadSubscribers({ reset = false } = {}) {
    if (!subscribersRoot || subscriberLoading) return;
    if (!isSuperAdmin()) {
      subscribersExport?.setAttribute("disabled", "");
      if (subscribersMore) subscribersMore.hidden = true;
      subscribersRoot.innerHTML = `
        <div class="podcast-admin__callout">
          <p>${escapeHtml(adminText(
            "superAdminOnly"
          ))}</p>
        </div>`;
      setStatus(subscribersStatus, "");
      return;
    }
    if (!reset && !subscriberCursor) return;
    if (reset) {
      subscriberRows = [];
      subscriberSummary = null;
      subscriberCursor = null;
      subscribersRoot.replaceChildren();
    }
    const requestId = ++subscriberRequestId;
    const requestedShowId = getSelectedShowId();
    const requestedCursor = reset ? null : subscriberCursor;
    subscriberLoading = true;
    subscribersRefresh?.setAttribute("disabled", "");
    subscribersExport?.setAttribute("disabled", "");
    subscribersMore?.setAttribute("disabled", "");
    setStatus(
      subscribersStatus,
      adminText("loadingSubscribers")
    );
    try {
      const params = subscriberQueryParams({
        limit: "50",
        cursor: requestedCursor
      });
      const payload = await client.request(
        `/v1/admin/subscribers?${params}`
      );
      if (
        requestId !== subscriberRequestId
        || requestedShowId !== getSelectedShowId()
      ) return;
      const incoming = Array.isArray(payload.subscribers)
        ? payload.subscribers
        : [];
      subscriberRows = reset
        ? incoming
        : [...subscriberRows, ...incoming];
      subscriberSummary = payload.summary || subscriberSummary;
      subscriberCursor = payload.pagination?.nextCursor || null;
      renderSubscribers();
      setStatus(
        subscribersStatus,
        adminText(
          "subscriberCount",
          `${subscriberRows.length} subscriber records loaded.`,
          { count: subscriberRows.length }
        )
      );
    } catch (error) {
      if (requestId !== subscriberRequestId) return;
      setStatus(subscribersStatus, friendlyError(error), true);
    } finally {
      if (requestId === subscriberRequestId) {
        subscriberLoading = false;
        subscribersRefresh?.removeAttribute("disabled");
        subscribersMore?.removeAttribute("disabled");
        if (isSuperAdmin()) subscribersExport?.removeAttribute("disabled");
      }
    }
  }

  function subscriberQueryParams({
    format = "json",
    limit,
    cursor = null
  } = {}) {
    const params = new URLSearchParams({ format });
    if (limit) params.set("limit", limit);
    if (getSelectedShowId()) params.set("showId", getSelectedShowId());
    const status = subscribersFilters?.elements?.status?.value || "all";
    const provider = subscribersFilters?.elements?.provider?.value || "all";
    if (status !== "all") params.set("status", status);
    if (provider !== "all") params.set("provider", provider);
    if (cursor) params.set("cursor", cursor);
    return params;
  }

  function renderSubscribers() {
    if (!subscribersRoot) return;
    const summary = subscriberSummary || {};
    const metric = (label, value, className = "") => `
      <article class="${escapeHtml(className)}">
        <strong>${Number(value || 0)}</strong>
        <span>${escapeHtml(label)}</span>
      </article>`;
    const providerMetrics = Array.isArray(summary.providers)
      ? summary.providers.map((provider) =>
        metric(
          `${subscriberProviderLabel(provider.provider)} · ${adminText(
            "active"
          )}`,
          provider.active
        )
      ).join("")
      : "";
    const records = subscriberRows.length
      ? subscriberRows.map(renderSubscriberRecord).join("")
      : `<div class="podcast-admin__callout"><p>${escapeHtml(adminText(
        "noSubscribers"
      ))}</p></div>`;
    subscribersRoot.innerHTML = `
      <div class="podcast-admin__metric-grid">
        ${metric(adminText("subscriber"), summary.total)}
        ${metric(adminText("active"), summary.active, "is-ready")}
        ${metric(
          adminText("past_due"),
          summary.pastDue,
          Number(summary.pastDue || 0) ? "is-attention" : ""
        )}
        ${metric(adminText("paused"), summary.paused)}
        ${metric(adminText("pending"), summary.pending)}
        ${metric(adminText("ended"), summary.ended)}
        ${providerMetrics}
      </div>
      <div class="podcast-admin__subscriber-list">${records}</div>`;
    if (subscribersMore) subscribersMore.hidden = !subscriberCursor;
  }

  function renderSubscriberRecord(record) {
    const status = String(record.status || "unknown");
    const statusClass = status === "active"
      ? "is-ready"
      : ["past_due", "paused"].includes(status)
        ? "is-attention"
        : "";
    const sources = Array.isArray(record.sources) && record.sources.length
      ? record.sources.map(renderSubscriberSource).join("")
      : `<li>${escapeHtml(adminText("notAvailable"))}</li>`;
    const value = (label, content) => `
      <div>
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(content)}</dd>
      </div>`;
    return `
      <article class="podcast-admin__subscriber-card">
        <header>
          <div>
            <p class="podcast-admin__eyebrow">${escapeHtml(record.showTitle || record.showId || adminText("notAvailable"))}</p>
            <h3>${escapeHtml(record.listenerId || adminText("notAvailable"))}</h3>
          </div>
          <span class="podcast-admin__pill ${statusClass}">${escapeHtml(subscriberStatusLabel(status))}</span>
        </header>
        <dl>
          ${value(
            adminText("billingPeriod"),
            record.billingPeriod
              ? adminText(record.billingPeriod, humanizeCode(record.billingPeriod))
              : adminText("notAvailable")
          )}
          ${value(
            adminText("periodEnd"),
            formatBillingDate(record.currentPeriodEnd)
          )}
          ${value(
            adminText("privateFeed"),
            record.hasPrivateFeed
              ? adminText("yes")
              : adminText("no")
          )}
          ${value(
            adminText("announcements"),
            record.announcementsEnabled
              ? `${adminText("yes")} · ${String(record.notificationLanguage || "").toUpperCase()}`
              : adminText("no")
          )}
        </dl>
        <h4>${escapeHtml(adminText("sources"))}</h4>
        <ul class="podcast-admin__subscriber-sources">${sources}</ul>
      </article>`;
  }

  function renderSubscriberSource(source) {
    const status = String(source.status || "unknown");
    const providerCustomer = source.providerCustomerId
      ? `<span><strong>${escapeHtml(adminText("providerCustomer"))}:</strong> <code>${escapeHtml(source.providerCustomerId)}</code></span>`
      : "";
    const providerSubscription = source.providerSubscriptionId
      ? `<span><strong>${escapeHtml(adminText("providerSubscription"))}:</strong> <code>${escapeHtml(source.providerSubscriptionId)}</code></span>`
      : "";
    return `
      <li>
        <span><strong>${escapeHtml(subscriberProviderLabel(source.provider))}</strong> · ${escapeHtml(subscriberStatusLabel(status))}</span>
        ${providerCustomer}
        ${providerSubscription}
      </li>`;
  }

  function subscriberProviderLabel(provider) {
    const value = String(provider || "");
    if (value === "stripe") return "Stripe";
    if (value === "pool") return "Pool";
    if (value === "manual") {
      return document.documentElement.lang === "es" ? "Manual" : "Manual";
    }
    return humanizeCode(value || "unknown");
  }

  function subscriberStatusLabel(status) {
    return adminText(status, humanizeCode(status));
  }

  async function exportSubscribers() {
    if (!isSuperAdmin() || subscribersExport?.disabled) return;
    subscribersExport.disabled = true;
    setStatus(
      subscribersStatus,
      adminText(
        "loadingSubscriberExport"
      )
    );
    try {
      const params = subscriberQueryParams({
        format: "csv",
        limit: "500"
      });
      const baseUrl = new URL(`${apiOrigin.replace(/\/+$/, "")}/`);
      const exportUrl = new URL(
        `/v1/admin/subscribers?${params}`,
        baseUrl
      );
      if (exportUrl.origin !== baseUrl.origin) {
        throw new Error("unsafe_subscriber_export_origin");
      }
      const result = await requestCredentialedBlob(exportUrl, {
        fetchImpl,
        maximumBytes: 4 * 1024 * 1024,
        allowedContentTypes: ["text/csv"]
      });
      const filename = triggerBlobDownload(
        result,
        "podcast-subscribers.csv"
      );
      setStatus(
        subscribersStatus,
        adminText(
          "subscriberExportReady",
          `Downloaded ${filename}.`,
          { filename }
        )
      );
    } catch (error) {
      setStatus(subscribersStatus, friendlyError(error), true);
    } finally {
      subscribersExport.disabled = false;
    }
  }

  async function loadBilling() {
    if (!billingRoot) return;
    if (!isSuperAdmin()) {
      billingExport?.setAttribute("disabled", "");
      billingRoot.innerHTML = `
        <div class="podcast-admin__callout">
          <p>${escapeHtml(adminText(
            "superAdminOnly"
          ))}</p>
        </div>`;
      setStatus(billingStatus, "");
      return;
    }
    const requestId = ++billingRequestId;
    const requestedShowId = getSelectedShowId();
    billingRefresh?.setAttribute("disabled", "");
    billingExport?.setAttribute("disabled", "");
    setStatus(
      billingStatus,
      adminText("loadingBilling")
    );
    try {
      const evidencePath = new URLSearchParams({ limit: "100" });
      if (requestedShowId) evidencePath.set("showId", requestedShowId);
      const [readiness, evidence] = await Promise.all([
        client.request("/v1/admin/billing/readiness"),
        client.request(`/v1/admin/billing/tax-evidence?${evidencePath}`)
      ]);
      if (
        requestId !== billingRequestId
        || requestedShowId !== getSelectedShowId()
      ) return;
      renderBilling(readiness, evidence);
      setStatus(billingStatus, "");
    } catch (error) {
      if (requestId !== billingRequestId) return;
      billingRoot.replaceChildren();
      setStatus(
        billingStatus,
        error instanceof ApiError && error.status === 403
          ? adminText(
            "superAdminOnly"
          )
          : friendlyError(error)
            || adminText(
              "billingLoadFailed"
            ),
        true
      );
    } finally {
      if (requestId === billingRequestId) {
        billingRefresh?.removeAttribute("disabled");
        if (isSuperAdmin()) billingExport?.removeAttribute("disabled");
      }
    }
  }

  function renderBilling(readiness, result) {
    const invoiceEvidence = readiness.invoiceTaxEvidence || {};
    const taxChangePreviews = readiness.taxChangePreviews || {};
    const records = Array.isArray(result.evidence) ? result.evidence : [];
    const readinessMetric = (label, value, className = "") => `
      <article class="${escapeHtml(className)}">
        <strong>${escapeHtml(String(value))}</strong>
        <span>${escapeHtml(label)}</span>
      </article>`;
    const configurationItem = (label, value, ready) => `
      <div>
        <dt>${escapeHtml(label)}</dt>
        <dd><span class="podcast-admin__pill ${ready ? "is-ready" : "is-attention"}">${escapeHtml(value)}</span></dd>
      </div>`;
    const evidenceMarkup = records.length
      ? records.map(renderBillingEvidenceRecord).join("")
      : `<div class="podcast-admin__callout"><p>${escapeHtml(adminText(
        "noEvidence"
      ))}</p></div>`;
    billingRoot.innerHTML = `
      <div class="podcast-admin__billing-readiness">
        <section class="podcast-admin__card" aria-label="${escapeHtml(adminText("checkout"))}">
          <h3>${escapeHtml(adminText("checkout"))}</h3>
          <dl>
            ${configurationItem(
              adminText("mode"),
              readiness.mode === "live"
                ? adminText("liveMode")
                : adminText("testMode"),
              readiness.mode === "live"
            )}
            ${configurationItem(
              adminText("checkout"),
              readiness.checkoutEnabled
                ? adminText("enabled")
                : adminText("disabled"),
              Boolean(readiness.checkoutEnabled)
            )}
            ${configurationItem(
              adminText("tax"),
              readiness.taxCollectionEnabled
                ? adminText("configured")
                : adminText("notApproved"),
              Boolean(readiness.taxCollectionEnabled)
            )}
            ${configurationItem(
              adminText("stripeApi"),
              readiness.configured?.apiKey
                ? adminText("configured")
                : adminText("missing"),
              Boolean(readiness.configured?.apiKey)
            )}
            ${configurationItem(
              adminText("webhook"),
              readiness.configured?.webhookSecret
                ? adminText("configured")
                : adminText("missing"),
              Boolean(readiness.configured?.webhookSecret)
            )}
          </dl>
        </section>
        <section class="podcast-admin__billing-metrics">
          <h3>${escapeHtml(adminText("evidence"))}</h3>
          <div class="podcast-admin__metric-grid">
            ${readinessMetric(
              adminText("events"),
              Number(invoiceEvidence.total || 0)
            )}
            ${readinessMetric(
              adminText("matched"),
              Number(invoiceEvidence.matched || 0),
              "is-ready"
            )}
            ${readinessMetric(
              adminText("attention"),
              Number(invoiceEvidence.attention || 0),
              Number(invoiceEvidence.attention || 0) ? "is-attention" : ""
            )}
            ${readinessMetric(
              adminText("failedWebhooks"),
              Number(readiness.failedWebhookEvents || 0),
              Number(readiness.failedWebhookEvents || 0) ? "is-attention" : ""
            )}
          </div>
          <h3>${escapeHtml(adminText("addressPreviews"))}</h3>
          <div class="podcast-admin__metric-grid">
            ${readinessMetric(
              adminText("events"),
              Number(taxChangePreviews.total || 0)
            )}
            ${readinessMetric(
              adminText("unchanged"),
              Number(taxChangePreviews.unchanged || 0),
              "is-ready"
            )}
            ${readinessMetric(
              adminText("attention"),
              Number(taxChangePreviews.attention || 0),
              Number(taxChangePreviews.attention || 0) ? "is-attention" : ""
            )}
          </div>
        </section>
      </div>
      <section class="podcast-admin__billing-evidence" aria-labelledby="podcast-billing-evidence-title">
        <div class="podcast-admin__section-heading">
          <h3 id="podcast-billing-evidence-title">${escapeHtml(adminText("evidence"))}</h3>
          <p>${escapeHtml(adminText(
            "evidenceIntro"
          ))}</p>
        </div>
        ${result.truncated ? `<p class="podcast-admin__status">${escapeHtml(adminText(
          "truncated",
          `Showing the latest ${records.length} records. Export the CSV for this bounded result set.`,
          { count: records.length }
        ))}</p>` : ""}
        <div class="podcast-admin__billing-evidence-list">${evidenceMarkup}</div>
      </section>`;
  }

  function renderBillingEvidenceRecord(record) {
    const status = String(record.reconciliationStatus || "unknown");
    const statusClass = status === "matched" ? "is-ready" : "is-attention";
    const period = [formatBillingDate(record.periodStart), formatBillingDate(record.periodEnd)]
      .filter((value) => value !== adminText("notAvailable"))
      .join(" – ") || adminText("notAvailable");
    const value = (label, content) => `
      <div>
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(content)}</dd>
      </div>`;
    return `
      <article class="podcast-admin__billing-evidence-card">
        <header>
          <div>
            <p class="podcast-admin__eyebrow">${escapeHtml(record.providerMode === "live"
              ? adminText("liveMode")
              : adminText("testMode"))}</p>
            <h4>${escapeHtml(record.providerInvoiceId || adminText("notAvailable"))}</h4>
          </div>
          <span class="podcast-admin__pill ${statusClass}">${escapeHtml(humanizeCode(status))}</span>
        </header>
        <dl>
          ${value(adminText("show"), record.showTitle || record.showId || adminText("notAvailable"))}
          ${value(adminText("event"), humanizeCode(record.eventType))}
          ${value(adminText("invoiceStatus"), humanizeCode(record.invoiceStatus))}
          ${value(adminText("billingReason"), humanizeCode(record.billingReason || "not_available"))}
          ${value(adminText("period"), period)}
          ${value(adminText("observedTax"), formatBillingMoney(record.observedTaxCents, record.currency))}
          ${value(adminText("expectedTax"), formatBillingMoney(record.expectedTaxCents, record.currency))}
          ${value(adminText("total"), formatBillingMoney(record.totalCents, record.currency))}
          ${value(adminText("jurisdiction"), record.expectedJurisdictionCode || adminText("notAvailable"))}
          ${value(adminText("taxRateIds"), (record.observedTaxRateIds || []).join(", ") || adminText("notAvailable"))}
          ${value(adminText("recorded"), formatBillingDate(record.recordedAt))}
        </dl>
      </article>`;
  }

  function formatBillingMoney(cents, currency) {
    if (!Number.isSafeInteger(cents)) {
      return adminText("notAvailable");
    }
    const normalizedCurrency = /^[A-Z]{3}$/.test(String(currency || ""))
      ? String(currency)
      : "USD";
    try {
      return new Intl.NumberFormat(document.documentElement.lang || "en", {
        style: "currency",
        currency: normalizedCurrency
      }).format(cents / 100);
    } catch {
      return `${normalizedCurrency} ${(cents / 100).toFixed(2)}`;
    }
  }

  function formatBillingDate(value) {
    const date = new Date(String(value || ""));
    if (Number.isNaN(date.getTime())) {
      return adminText("notAvailable");
    }
    return new Intl.DateTimeFormat(document.documentElement.lang || "en", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  async function exportBillingEvidence() {
    if (!isSuperAdmin() || billingExport?.disabled) return;
    billingExport.disabled = true;
    setStatus(
      billingStatus,
      adminText("loadingExport")
    );
    try {
      const params = new URLSearchParams({
        format: "csv",
        limit: "500"
      });
      if (getSelectedShowId()) params.set("showId", getSelectedShowId());
      const baseUrl = new URL(`${apiOrigin.replace(/\/+$/, "")}/`);
      const exportUrl = new URL(
        `/v1/admin/billing/tax-evidence?${params}`,
        baseUrl
      );
      if (exportUrl.origin !== baseUrl.origin) {
        throw new Error("unsafe_billing_export_origin");
      }
      const result = await requestCredentialedBlob(exportUrl, {
        fetchImpl,
        maximumBytes: 4 * 1024 * 1024,
        allowedContentTypes: ["text/csv"]
      });
      const filename = triggerBlobDownload(
        result,
        "podcast-subscription-tax-evidence.csv"
      );
      setStatus(
        billingStatus,
        adminText(
          "exportReady",
          `Downloaded ${filename}.`,
          { filename }
        )
      );
    } catch (error) {
      setStatus(billingStatus, friendlyError(error), true);
    } finally {
      billingExport.disabled = false;
    }
  }


  function reset() {
    billingRequestId += 1;
    subscriberRows = [];
    subscriberSummary = null;
    subscriberCursor = null;
    subscriberLoading = false;
    subscriberRequestId += 1;
    billingRoot?.replaceChildren();
    subscribersRoot?.replaceChildren();
  }

  return { loadBilling, loadSubscribers, reset };
}
