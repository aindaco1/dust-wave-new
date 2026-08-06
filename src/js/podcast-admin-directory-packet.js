export function createDirectorySubmissionPacketActions({
  packet,
  text,
  downloadJson,
  setStatus
}) {
  if (!isDirectorySubmissionPacket(packet)) return null;

  const section = document.createElement("section");
  section.className =
    "podcast-admin__distribution-feed podcast-admin__directory-packet";

  const introduction = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = text("directorySubmissionPacket");
  const description = document.createElement("p");
  description.textContent = text("directorySubmissionPacketIntro", {
    count: packet.destinations.filter(({ enabled }) => enabled).length
  });
  introduction.append(title, description);

  const actions = document.createElement("div");
  const download = document.createElement("button");
  download.className = "btn btn-outline-light";
  download.type = "button";
  download.textContent = text("downloadSubmissionPacket");
  const copy = document.createElement("button");
  copy.className = "btn btn-outline-light";
  copy.type = "button";
  copy.textContent = text("copySubmissionPacket");
  actions.append(download, copy);

  const status = document.createElement("p");
  status.className = "podcast-admin__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  download.addEventListener("click", () => {
    downloadJson(
      `${safeFilename(packet.show.slug)}-directory-submission-packet.json`,
      packet
    );
    setStatus(status, text("submissionPacketDownloaded"));
  });
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(
        `${JSON.stringify(packet, null, 2)}\n`
      );
      setStatus(status, text("submissionPacketCopied"));
    } catch (_error) {
      setStatus(status, text("submissionPacketCopyUnavailable"), true);
    }
  });

  section.append(introduction, actions, status);
  return section;
}

export function createDistributionFeedActions({ feedUrl, text, setStatus }) {
  const feed = document.createElement("div");
  feed.className = "podcast-admin__distribution-feed";
  const label = document.createElement("label");
  const title = document.createElement("strong");
  title.textContent = text("canonicalRssFeed");
  const input = document.createElement("input");
  input.type = "url";
  input.readOnly = true;
  input.setAttribute("aria-readonly", "true");
  input.value = String(feedUrl || "");
  label.append(title, input);
  const copy = document.createElement("button");
  copy.className = "btn btn-outline-light";
  copy.type = "button";
  copy.textContent = text("copyFeedUrl");
  const status = document.createElement("p");
  status.className = "podcast-admin__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(input.value);
      setStatus(status, text("feedUrlCopied"));
    } catch (_error) {
      input.focus();
      input.select();
      setStatus(status, text("feedCopySelected"), true);
    }
  });
  feed.append(label, copy, status);
  return feed;
}

export function isDirectorySubmissionPacket(packet) {
  return Boolean(
    packet
    && packet.schema === "dust-wave-directory-submission-packet"
    && packet.version === 1
    && packet.containsCredentials === false
    && packet.show
    && typeof packet.show.slug === "string"
    && Array.isArray(packet.destinations)
  );
}

function safeFilename(value) {
  const safe = String(value || "podcast")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return safe || "podcast";
}
