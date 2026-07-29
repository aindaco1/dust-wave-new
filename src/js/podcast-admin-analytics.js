import {
  requestCredentialedBlob,
  triggerBlobDownload
} from "./dust-wave-admin-shell/credentialed-download.js?v=0.9.0";

let datatypeChartModule;

export function mountPodcastAnalytics({
  root,
  client,
  apiOrigin,
  getShow,
  text,
  setStatus,
  friendlyError
}) {
  const range = root.querySelector("[data-podcast-analytics-range]");
  const refresh = root.querySelector("[data-podcast-analytics-refresh]");
  const exportButton = root.querySelector("[data-podcast-analytics-export]");
  const status = root.querySelector("[data-podcast-analytics-status]");
  const qualified = root.querySelector("[data-podcast-qualified-downloads]");
  const engaged = root.querySelector("[data-podcast-engaged-plays]");
  const premium = root.querySelector("[data-podcast-premium-listeners]");
  const trend = root.querySelector("[data-podcast-analytics-trend]");
  const episodes = root.querySelector("[data-podcast-analytics-episodes]");
  const completion = root.querySelector(
    "[data-podcast-web-player-completion]"
  );
  const apps = root.querySelector("[data-podcast-analytics-apps]");
  const devices = root.querySelector("[data-podcast-analytics-devices]");
  const countries = root.querySelector("[data-podcast-analytics-countries]");
  const methodology = root.querySelector(
    "[data-podcast-analytics-methodology]"
  );
  const reconciliationRoot = root.querySelector(
    "[data-podcast-reconciliation]"
  );
  const reconciliationStatus = root.querySelector(
    "[data-podcast-reconciliation-status]"
  );
  const reconciliationShow = root.querySelector(
    "[data-podcast-reconciliation-show]"
  );
  const qualifiedSponsorDeliveries = root.querySelector(
    "[data-podcast-qualified-sponsor-deliveries]"
  );
  const reconciliationDifferences = root.querySelector(
    "[data-podcast-reconciliation-differences]"
  );
  const campaignsAtCap = root.querySelector(
    "[data-podcast-campaigns-at-cap]"
  );
  let requestId = 0;
  let sponsorRequestId = 0;
  let sponsorRows = [];
  let sponsorCursor = null;
  let sponsorLoading = false;

  refresh?.addEventListener("click", () => loadAudience());
  range?.addEventListener("change", () => loadAudience());
  exportButton?.addEventListener("click", exportCsv);
  root.querySelector("[data-podcast-reconciliation-refresh]")
    ?.addEventListener("click", () => loadSponsors({ reset: true }));
  reconciliationRoot?.addEventListener("click", (event) => {
    if (event.target.closest("[data-podcast-reconciliation-more]")) {
      loadSponsors({ reset: false });
    }
  });

  async function loadAudience() {
    const show = getShow();
    if (!show?.id) return;
    const selectedDays = validDays(range?.value);
    const currentId = ++requestId;
    setStatus(status, text("loadingAudienceAnalytics"));
    if (refresh) refresh.disabled = true;
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(show.id)}/analytics/overview?days=${selectedDays}`
      );
      if (currentId !== requestId || show.id !== getShow()?.id) return;
      render(payload);
      setStatus(
        status,
        text("analyticsUpdated", {
          date: formatDateTime(payload.generatedAt)
        })
      );
    } catch (error) {
      if (currentId !== requestId) return;
      resetMetrics();
      setStatus(status, friendlyError(error), true);
    } finally {
      if (currentId === requestId && refresh) refresh.disabled = false;
    }
  }

  async function load() {
    await Promise.all([
      loadAudience(),
      loadSponsors({ reset: true })
    ]);
  }

  function reset() {
    requestId += 1;
    sponsorRequestId += 1;
    sponsorRows = [];
    sponsorCursor = null;
    sponsorLoading = false;
    resetMetrics();
    setSponsorMetrics();
    trend?.replaceChildren();
    episodes?.replaceChildren();
    completion?.replaceChildren();
    apps?.replaceChildren();
    devices?.replaceChildren();
    countries?.replaceChildren();
    reconciliationRoot?.replaceChildren();
    setStatus(status, "");
    setStatus(reconciliationStatus, "");
  }

  function render(payload) {
    const totals = payload.totals || {};
    if (qualified) {
      qualified.textContent = formatInteger(totals.qualifiedDownloads);
    }
    if (engaged) engaged.textContent = formatInteger(totals.engagedPlays);
    if (premium) {
      premium.textContent = formatInteger(totals.activePremiumListeners);
    }
    renderTrend(payload.daily || []);
    renderEpisodes(payload.episodes || []);
    renderCompletion(
      payload.webPlayerCompletion || {},
      payload.episodes || []
    );
    renderBreakdown(apps, payload.breakdowns?.apps || [], "analyticsApp");
    renderBreakdown(
      devices,
      payload.breakdowns?.devices || [],
      "analyticsDevice"
    );
    renderBreakdown(
      countries,
      payload.breakdowns?.countries || [],
      "analyticsCountry"
    );
    if (methodology) {
      methodology.textContent = text("analyticsMethodology", {
        version: payload.methodology?.version || "dustwave-analytics-v1"
      });
    }
  }

  function renderTrend(rows) {
    if (!trend) return;
    trend.replaceChildren();
    const recent = rows.slice(-14);
    const maximum = Math.max(
      1,
      ...recent.flatMap((row) => [
        analyticsCount(row.qualifiedDownloads),
        analyticsCount(row.engagedPlays)
      ])
    );
    if (!recent.length) {
      trend.append(empty(text("analyticsNoData")));
      return;
    }
    const list = document.createElement("ol");
    list.className = "podcast-admin__analytics-trend";
    for (const row of recent) {
      const item = document.createElement("li");
      const date = document.createElement("time");
      date.dateTime = row.date;
      date.textContent = formatDate(row.date);
      const bars = document.createElement("span");
      bars.className = "podcast-admin__analytics-bars";
      bars.append(
        trendBar(
          row.qualifiedDownloads,
          maximum,
          text("analyticsQualifiedShort")
        ),
        trendBar(
          row.engagedPlays,
          maximum,
          text("analyticsEngagedShort")
        )
      );
      item.append(date, bars);
      list.append(item);
    }
    const qualifiedValues = recent.map(
      (row) => analyticsCount(row.qualifiedDownloads)
    );
    const engagedValues = recent.map(
      (row) => analyticsCount(row.engagedPlays)
    );
    const summaryOptions = {
      note: text("analyticsDatatypeNote", {
        days: formatInteger(recent.length)
      }),
      maximum,
      series: [
        {
          className: "podcast-admin__datatype-card--qualified",
          label: text("analyticsQualifiedShort"),
          latest: text("analyticsLatest", {
            value: formatInteger(qualifiedValues.at(-1))
          }),
          values: qualifiedValues
        },
        {
          className: "podcast-admin__datatype-card--engaged",
          label: text("analyticsEngagedShort"),
          latest: text("analyticsLatest", {
            value: formatInteger(engagedValues.at(-1))
          }),
          values: engagedValues
        }
      ]
    };
    trend.append(list);
    loadDatatypeChart().then((module) => {
      if (!module || !list.isConnected || list.parentElement !== trend) return;
      trend.insertBefore(
        module.createDatatypeTrendSummary(summaryOptions),
        list
      );
    });
  }

  function renderEpisodes(rows) {
    if (!episodes) return;
    if (!rows.length) {
      episodes.replaceChildren(empty(text("analyticsNoEpisodes")));
      return;
    }
    episodes.replaceChildren(table(
      [
        text("analyticsEpisode"),
        text("analyticsQualifiedShort"),
        text("analyticsEngagedShort")
      ],
      rows.map((row) => [
        row.title,
        formatInteger(row.qualifiedDownloads),
        formatInteger(row.engagedPlays)
      ]),
      text("analyticsTopEpisodes")
    ));
  }

  function renderCompletion(summary, rows) {
    if (!completion) return;
    const engagedPlays = Number(summary?.engagedPlays)
      || rows.reduce(
        (total, row) => total + Number(row.engagedPlays || 0),
        0
      );
    const counts = summary?.counts || {};
    if (!engagedPlays && !rows.length) {
      completion.replaceChildren(empty(text("analyticsNoCompletion")));
      return;
    }
    const completionRows = [
      [
        text("analyticsShowTotal"),
        formatInteger(engagedPlays),
        ...completionValues(counts, summary?.rates)
      ],
      ...rows.map((row) => [
        row.title,
        formatInteger(row.engagedPlays),
        ...completionValues(
          row.webPlayerCompletion,
          row.webPlayerCompletionRates
        )
      ])
    ];
    completion.replaceChildren(table(
      [
        text("analyticsEpisode"),
        text("analyticsEngagedShort"),
        "25%",
        "50%",
        "75%",
        "100%"
      ],
      completionRows,
      text("analyticsCompletionCaption")
    ));
  }

  function renderBreakdown(container, rows, prefix) {
    if (!container) return;
    if (!rows.length) {
      container.replaceChildren(empty(text("analyticsNoData")));
      return;
    }
    container.replaceChildren(table(
      [text("analyticsDimension"), text("analyticsCount")],
      rows.map((row) => [
        localizedDimension(prefix, row.code),
        formatInteger(row.count)
      ]),
      text(prefix)
    ));
  }

  async function loadSponsors({ reset = false } = {}) {
    const show = getShow();
    if (
      (!reset && sponsorLoading)
      || !show?.id
      || !reconciliationRoot
    ) return;
    if (reset) {
      sponsorRows = [];
      sponsorCursor = null;
      reconciliationRoot.replaceChildren();
    } else if (!sponsorCursor) {
      return;
    }
    const showId = show.id;
    const currentId = ++sponsorRequestId;
    sponsorLoading = true;
    setStatus(
      reconciliationStatus,
      reset
        ? text("loadingTrustedEvidence")
        : text("loadingMoreCampaignEvidence")
    );
    const query = new URLSearchParams({ showId, limit: "50" });
    if (!reset && sponsorCursor) query.set("cursor", sponsorCursor);
    try {
      const payload = await client.request(
        `/v1/admin/ads/reconciliation?${query}`
      );
      if (currentId !== sponsorRequestId || showId !== getShow()?.id) return;
      sponsorRows = reset
        ? payload.campaigns || []
        : sponsorRows.concat(payload.campaigns || []);
      sponsorCursor = payload.pagination?.nextCursor || null;
      renderSponsors(payload);
      setStatus(
        reconciliationStatus,
        payload.summary?.discrepancyCount
          ? text("counterDifferences")
          : text("campaignCountersReconcile")
      );
    } catch (error) {
      if (currentId !== sponsorRequestId) return;
      if (reset) {
        reconciliationRoot.replaceChildren();
        setSponsorMetrics();
      }
      setStatus(reconciliationStatus, friendlyError(error), true);
    } finally {
      if (currentId === sponsorRequestId) sponsorLoading = false;
    }
  }

  function renderSponsors(payload) {
    const show = getShow();
    if (reconciliationShow) {
      reconciliationShow.textContent = show?.title || text("thisShow");
    }
    setSponsorMetrics(payload.summary || {});
    if (!sponsorRows.length) {
      reconciliationRoot.replaceChildren(
        empty(text("noCampaignsToReconcile"))
      );
      return;
    }
    reconciliationRoot.replaceChildren(
      sponsorTable(sponsorRows, text),
      ...(sponsorCursor ? [sponsorMoreButton(text)] : [])
    );
  }

  function setSponsorMetrics(summary = {}) {
    if (qualifiedSponsorDeliveries) {
      qualifiedSponsorDeliveries.textContent =
        summary.counterValue === undefined
          ? "—"
          : formatInteger(summary.counterValue);
    }
    if (reconciliationDifferences) {
      reconciliationDifferences.textContent =
        summary.discrepancyCount === undefined
          ? "—"
          : formatInteger(summary.discrepancyCount);
    }
    if (campaignsAtCap) {
      campaignsAtCap.textContent =
        summary.campaignsAtCap === undefined
          ? "—"
          : formatInteger(summary.campaignsAtCap);
    }
  }

  async function exportCsv() {
    const show = getShow();
    if (!show?.id || !exportButton) return;
    exportButton.disabled = true;
    setStatus(status, text("analyticsPreparingExport"));
    try {
      const days = validDays(range?.value);
      const result = await requestCredentialedBlob(
        new URL(
          `/v1/admin/shows/${encodeURIComponent(show.id)}/analytics/overview.csv?days=${days}`,
          apiOrigin
        )
      );
      const filename = triggerBlobDownload(
        result,
        `podcast-analytics-${show.id}-${days}d.csv`
      );
      setStatus(status, text("analyticsExported", { filename }));
    } catch (error) {
      setStatus(status, friendlyError(error), true);
    } finally {
      exportButton.disabled = false;
    }
  }

  function resetMetrics() {
    for (const element of [qualified, engaged, premium]) {
      if (element) element.textContent = "—";
    }
  }

  return { load, reset };
}

function sponsorTable(rows, text) {
  const region = document.createElement("div");
  region.className = "podcast-admin__table-scroll";
  region.tabIndex = 0;
  region.setAttribute("role", "region");
  region.setAttribute("aria-label", text("sponsorDeliveryReconciliation"));
  const tableElement = document.createElement("table");
  tableElement.className = "podcast-admin__table";
  const caption = document.createElement("caption");
  caption.textContent = text("reconciliationCaption");
  const headings = [
    text("campaign"),
    text("status"),
    text("progress"),
    text("durableRows"),
    text("difference"),
    text("lastQualified")
  ];
  const head = document.createElement("thead");
  const headingRow = document.createElement("tr");
  for (const heading of headings) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = heading;
    headingRow.append(cell);
  }
  head.append(headingRow);
  const body = document.createElement("tbody");
  for (const campaign of rows) {
    const progressTarget =
      campaign.qualifiedImpressionGoal || campaign.impressionCap;
    const progress = progressTarget
      ? `${formatInteger(campaign.qualifiedImpressions)} / ${formatInteger(progressTarget)}`
      : formatInteger(campaign.qualifiedImpressions);
    const values = [
      campaign.name,
      localizedDimension("campaignStatus", campaign.approvalStatus),
      progress,
      formatInteger(campaign.qualificationRows),
      formatInteger(campaign.difference),
      formatDateTime(campaign.lastQualifiedAt) || "—"
    ];
    const row = document.createElement("tr");
    values.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? "th" : "td");
      if (index === 0) {
        cell.scope = "row";
        const strong = document.createElement("strong");
        strong.textContent = value;
        const detail = document.createElement("span");
        detail.textContent = campaign.sponsorName || localizedDimension(
          "campaignType",
          campaign.campaignType
        );
        cell.append(strong, detail);
      } else {
        cell.textContent = value;
      }
      if (index === 4 && !campaign.reconciled) {
        cell.className = "is-error";
      }
      row.append(cell);
    });
    body.append(row);
  }
  tableElement.append(caption, head, body);
  region.append(tableElement);
  return region;
}

function sponsorMoreButton(text) {
  const button = document.createElement("button");
  button.className = "btn btn-outline-light podcast-admin__more";
  button.type = "button";
  button.dataset.podcastReconciliationMore = "";
  button.textContent = text("loadMoreCampaigns");
  return button;
}

function table(headings, rows, captionText) {
  const region = document.createElement("div");
  region.className = "podcast-admin__table-scroll";
  region.tabIndex = 0;
  const tableElement = document.createElement("table");
  tableElement.className =
    "podcast-admin__table podcast-admin__table--compact";
  const caption = document.createElement("caption");
  caption.textContent = captionText;
  const head = document.createElement("thead");
  const headingRow = document.createElement("tr");
  for (const heading of headings) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = heading;
    headingRow.append(cell);
  }
  head.append(headingRow);
  const body = document.createElement("tbody");
  for (const values of rows) {
    const row = document.createElement("tr");
    values.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? "th" : "td");
      if (index === 0) cell.scope = "row";
      cell.textContent = String(value);
      row.append(cell);
    });
    body.append(row);
  }
  tableElement.append(caption, head, body);
  region.append(tableElement);
  return region;
}

function trendBar(value, maximum, label) {
  const count = analyticsCount(value);
  const bar = document.createElement("span");
  bar.className = "podcast-admin__analytics-bar";
  bar.style.setProperty("--analytics-ratio", String(count / maximum));
  bar.setAttribute("aria-label", `${label}: ${formatInteger(count)}`);
  const valueLabel = document.createElement("span");
  valueLabel.textContent = formatInteger(count);
  bar.append(valueLabel);
  return bar;
}

function analyticsCount(value) {
  const count = Number(value || 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function loadDatatypeChart() {
  datatypeChartModule ||= import("./datatype-chart.js").catch(() => null);
  return datatypeChartModule;
}

function empty(message) {
  const paragraph = document.createElement("p");
  paragraph.className = "podcast-admin__empty";
  paragraph.textContent = message;
  return paragraph;
}

function validDays(value) {
  const days = Number(value);
  return [7, 30, 90].includes(days) ? days : 30;
}

function completionValues(counts = {}, rates = {}) {
  return [25, 50, 75, 100].map((milestone) => {
    const count = formatInteger(counts?.[milestone]);
    const rate = formatPercent(rates?.[milestone]);
    return rate ? `${count} (${rate})` : count;
  });
}

function localizedDimension(prefix, code) {
  const translated = window.DustWaveI18n?.t(`admin.${prefix}_${code}`);
  return translated && !translated.startsWith("[missing:")
    ? translated
    : String(code || "").replaceAll("_", " ");
}

function formatInteger(value) {
  return new Intl.NumberFormat(
    document.documentElement.lang || "en"
  ).format(Number(value || 0));
}

function formatPercent(value) {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return "";
  return new Intl.NumberFormat(
    document.documentElement.lang || "en",
    { style: "percent", maximumFractionDigits: 1 }
  ).format(Math.max(0, Math.min(1, rate)));
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat(
    document.documentElement.lang || "en",
    { month: "short", day: "numeric", timeZone: "UTC" }
  ).format(date);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(
    document.documentElement.lang || "en",
    { dateStyle: "medium", timeStyle: "short" }
  ).format(date);
}
