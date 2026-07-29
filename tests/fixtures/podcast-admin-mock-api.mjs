import { createServer } from "node:http";

const host = "127.0.0.1";
const port = Number(process.env.PODCAST_ADMIN_MOCK_PORT || 4174);
const websiteOrigin =
  process.env.PODCAST_ADMIN_WEBSITE_ORIGIN || "http://127.0.0.1:4173";
const adminRole =
  process.env.PODCAST_ADMIN_MOCK_ROLE === "producer"
    ? "producer"
    : "super_admin";
const transcriptCueCount = boundedInteger(
  process.env.PODCAST_ADMIN_MOCK_TRANSCRIPT_CUES,
  { minimum: 0, maximum: 10_000, fallback: 0 }
);
const transcriptApproved =
  process.env.PODCAST_ADMIN_MOCK_TRANSCRIPT_APPROVED === "true";
const publicClipMode = ["ready", "empty", "missing"].includes(
  process.env.PODCAST_ADMIN_MOCK_PUBLIC_CLIPS
)
  ? process.env.PODCAST_ADMIN_MOCK_PUBLIC_CLIPS
  : "ready";
const sha = (character) => character.repeat(64);

const show = {
  id: "show_opera_en_la_selva",
  slug: "opera-en-la-selva",
  title: "Ópera en la Selva",
  description: "Conversaciones desde la selva, en español y en inglés.",
  descriptionEn: "Conversations from the rainforest, in Spanish and English.",
  language: "es",
  status: "active",
  authorName: "Jay Renteria",
  category: "Arts",
  artworkUrl: "https://dustwave.xyz/img/podcasts/opera-en-la-selva/artwork.png",
  explicit: false,
  episodeCount: 1,
  earlyAccessDays: 7,
  premiumEnabled: true,
  freeMiniEpisodeEnabled: true,
  youtubeChannelUrl: "https://www.youtube.com/@dustwavecollective",
  canonicalUrl: "https://dustwave.xyz/podcasts/opera-en-la-selva/",
  feedUrl: "https://feeds.dustwave.xyz/opera-en-la-selva/rss.xml",
  podcastGuid: "d21642df-1816-55c8-b308-6209066e9ef6"
};

const episode = {
  id: "episode_mock",
  showId: show.id,
  slug: "episodio-de-prueba",
  title: "Episodio de prueba / Test episode",
  summary: "A controlled browser-QA fixture.",
  contentHtml:
    "<h2>Notas del episodio</h2><p>Contenido revisable y seguro.</p>",
  status: "draft",
  access: "public",
  mediaStatus: "ready",
  sourceLanguage: "es",
  audioFilename: "episode-source.wav",
  publicationRevision: 0,
  premiumAt: null,
  publicAt: null,
  canonicalUrl:
    "https://dustwave.xyz/news/podcasts/opera-en-la-selva/episodio-de-prueba/"
};

const transcriptCues = Array.from(
  { length: transcriptCueCount },
  (_, index) => {
    const startsAtMs = index * 3_000;
    const durationMs = index % 97 === 0
      ? 0
      : index % 29 === 0
        ? 11_000
        : index % 11 === 0
          ? 400
          : 2_500;
    return {
      id: `cue_browser_${String(index + 1).padStart(5, "0")}`,
      startsAtMs,
      endsAtMs: startsAtMs + durationMs,
      speakerLabel: transcriptApproved
        ? index % 2 === 0 ? "Jay" : "Guest"
        : index % 7 === 0
        ? ""
        : index % 2 === 0
          ? "Jay"
          : "Guest",
      speakerConfirmed: transcriptApproved || index % 13 !== 0,
      textMarkdown: index % 17 === 0
        ? "Una línea sintética deliberadamente rápida para revisar."
        : "Texto sintético de control."
    };
  }
);
const transcriptDurationSeconds = transcriptCues.length
  ? Math.ceil(transcriptCues.at(-1).endsAtMs / 1_000)
  : 180;
const transcriptFixture = transcriptCues.length
  ? {
      id: "transcript_browser_fixture",
      episodeId: episode.id,
      language: "es",
      source: "transcription",
      status: transcriptApproved ? "approved" : "needs_review",
      revision: 1,
      speakerLabelsConfirmed: transcriptApproved,
      approvedRevision: transcriptApproved ? 1 : null,
      approvedAt: transcriptApproved ? "2026-07-29T06:00:00.000Z" : null,
      contentSha256: sha("3"),
      cues: transcriptCues,
      alignment: {
        id: null,
        status: "not_run",
        adapter: null,
        model: null,
        completedAt: null,
        alignedWordCount: 0,
        wordControlsEnabled: false
      }
    }
  : null;

const clip = {
  id: "clip_browser_fixture",
  episodeId: episode.id,
  episodeTitle: episode.title,
  title: "La selva también escucha",
  revision: 1,
  status: "approved",
  aspectRatio: "9:16",
  captionLanguage: "es",
  boundaryMode: "segment",
  durationMs: 24_000,
  render: {
    id: "clip_render_browser_fixture",
    clipRevision: 1,
    status: "ready",
    width: 1_080,
    height: 1_920,
    durationMs: 24_000,
    outputBytes: 1_048_576,
    mediaPath:
      "/v1/admin/clip-renders/clip_render_browser_fixture/media",
    downloadPath:
      "/v1/admin/clip-renders/clip_render_browser_fixture/media?download=1",
    captionsPath:
      "/v1/admin/clip-renders/clip_render_browser_fixture/captions.vtt"
  },
  youtubePublication: null
};
let clipPublication = null;
let rssImportPlans = [{
  id: "rss_import_browser_fixture",
  showId: show.id,
  status: "draft",
  requestedFeedUrl: "https://podcast.example.org/feed.xml",
  resolvedFeedUrl: "https://feeds.example.org/opera.xml",
  feedSha256: sha("e"),
  sourcePodcastGuid: show.podcastGuid,
  selectionSha256: sha("9"),
  feedTitle: "Authorized source podcast",
  feedItemCount: 2,
  migratableItemCount: 1,
  selectedItemCount: 1,
  items: [{
    sourceIdentitySha256: sha("f"),
    ordinal: 0,
    metadataSha256: sha("8"),
    title: "Migratable episode",
    summary: "One validated audio item.",
    publishedAt: "2026-07-26T12:00:00.000Z",
    durationSeconds: 754,
    explicit: false,
    canonicalUrl: "https://podcast.example.org/episodes/migratable",
    enclosure: {
      url: "https://cdn.example.org/migratable.mp3",
      mimeType: "audio/mpeg",
      bytes: 1_234_567
    },
    warnings: []
  }],
  requestedAt: "2026-07-27T12:00:00.000Z",
  reviewedAt: null,
  canceledAt: null,
  updatedAt: "2026-07-27T12:00:00.000Z"
}];
let rssImportExecution = null;
let rssImportReconciliation = null;
let rssImportRedirectAttestation = null;
let rssImportCutoverPacket = null;
let rssImportRedirectActivationApproval = null;

function completeRssImportExecution() {
  if (!rssImportExecution || rssImportExecution.status !== "queued") return;
  rssImportExecution = {
    ...rssImportExecution,
    status: "succeeded",
    copiedItemCount: rssImportExecution.expectedItemCount,
    draftItemCount: rssImportExecution.expectedItemCount,
    items: rssImportExecution.items.map((item) => ({
      ...item,
      status: "succeeded",
      attemptCount: 1,
      copiedBytes: 1_234_567,
      copiedSha256: sha("4"),
      copiedMimeType: "audio/mpeg",
      episodeId: item.targetEpisodeId,
      completedAt: "2026-07-28T12:01:30.000Z"
    })),
    startedAt: "2026-07-28T12:01:05.000Z",
    completedAt: "2026-07-28T12:01:30.000Z",
    updatedAt: "2026-07-28T12:01:30.000Z"
  };
}

function rssImportReconciliationPayload(plan) {
  const copyReady = rssImportExecution?.status === "succeeded";
  const approval = rssImportReconciliation
    ? {
        ...rssImportReconciliation,
        fresh: copyReady
      }
    : null;
  const attestation = rssImportRedirectAttestation
    ? {
        ...rssImportRedirectAttestation,
        fresh: copyReady && Boolean(approval)
      }
    : null;
  const cutoverReady = Boolean(attestation && approval);
  const activationApproval =
    rssImportRedirectActivationApproval
    && rssImportCutoverPacket
      ? {
          ...rssImportRedirectActivationApproval,
          fresh: true
        }
      : null;
  return {
    reconciliationAvailable: true,
    executionId: rssImportExecution?.id || null,
    planId: plan.id,
    readiness: {
      evidenceSha256: sha("7"),
      itemCount: 1,
      copiedBytes: copyReady ? 1_234_567 : 0,
      copyReady,
      prePublicationReady: copyReady,
      readyForApproval: copyReady && !approval,
      blockers: copyReady
        ? []
        : ["rss_import_execution_not_succeeded"],
      items: [{
        sourceIdentitySha256: sha("f"),
        targetEpisodeId: "episode_rss_browser_0",
        targetSlug: "migratable-episode",
        copiedBytes: copyReady ? 1_234_567 : null,
        copiedSha256: copyReady ? sha("4") : null,
        copiedMimeType: copyReady ? "audio/mpeg" : null,
        copyReady,
        privateObjectVerified: copyReady,
        draftIdentityVerified: copyReady,
        sourceUploadVerified: copyReady,
        blockers: copyReady
          ? []
          : ["rss_import_execution_item_not_succeeded"]
      }]
    },
    approval,
    cutoverReadiness: {
      schema: "dustwave-rss-import-cutover-v1",
      activationAvailable: false,
      evidenceReady: cutoverReady,
      readyForPacket: cutoverReady && !rssImportCutoverPacket,
      evidenceSha256: sha("8"),
      importedEpisodeStateSha256: sha("9"),
      feedValidationEvidenceSha256: sha("a"),
      directoryEvidenceSha256: sha("b"),
      importedEpisodeCount: 1,
      publicEpisodeCount: cutoverReady ? 1 : 0,
      feedItemCount: cutoverReady ? 1 : 0,
      expectedFeedItemCount: cutoverReady ? 1 : 0,
      feedValidatedAt: cutoverReady
        ? "2026-07-28T12:04:00.000Z"
        : null,
      certifiedDestinationCount: cutoverReady ? 10 : 0,
      reobservedDestinationCount: cutoverReady ? 10 : 0,
      requiredDestinationCount: 10,
      blockers: cutoverReady
        ? []
        : [
            "rss_import_cutover_episode_not_public",
            "rss_import_cutover_rss_not_published",
            "rss_import_cutover_news_not_published",
            "rss_import_cutover_feed_not_current",
            "rss_import_cutover_directory_certification_required",
            "rss_import_cutover_directory_reobservation_required"
          ],
      checks: {
        ownerReconciliationApproved: Boolean(approval),
        importedEpisodeRevisionsPublished: cutoverReady,
        canonicalFeedCurrent: cutoverReady,
        directoryCertificationReady: cutoverReady,
        directoriesReobservedAfterFeed: cutoverReady,
        ownerRedirectAttested: Boolean(attestation?.fresh)
      },
      items: [{
        episodeId: "episode_rss_browser_0",
        slug: "migratable-episode",
        publicationRevision: cutoverReady ? 1 : 0,
        public: cutoverReady,
        rssPublished: cutoverReady,
        newsPublished: cutoverReady,
        blockers: cutoverReady
          ? []
          : [
              "rss_import_cutover_episode_not_public",
              "rss_import_cutover_rss_not_published",
              "rss_import_cutover_news_not_published"
            ]
      }],
      packet: rssImportCutoverPacket
        ? { ...rssImportCutoverPacket, fresh: true }
        : null
    },
    oldHostRedirectChecklist: {
      activationAvailable: false,
      ready: false,
      attestationAvailable: copyReady && Boolean(approval),
      activationApprovalAvailable: Boolean(
        rssImportCutoverPacket
      ),
      readyForActivationApproval: Boolean(
        rssImportCutoverPacket && !activationApproval
      ),
      manualActivationReady: Boolean(activationApproval),
      oldFeedDisplayUrl: "https://podcast.example.org/feed.xml",
      newFeedUrl:
        "https://feeds.dustwave.xyz/opera-en-la-selva/rss.xml",
      attestation,
      activationApproval,
      blockers: [
        ...(approval
          ? []
          : ["rss_import_owner_reconciliation_required"]),
        ...(cutoverReady
          ? []
          : [
              "rss_import_imported_episodes_unpublished",
              "rss_import_canonical_feed_not_revalidated",
              "rss_import_directory_reobservation_required"
            ]),
        ...(attestation
          ? []
          : ["rss_import_old_host_attestation_required"]),
        ...(activationApproval
          ? ["rss_import_redirect_manual_owner_action_required"]
          : ["rss_import_redirect_activation_approval_required"]),
        "rss_import_redirect_activation_unavailable"
      ],
      checks: {
        ownerReconciliationApproved: Boolean(approval),
        importedEpisodesPublic: cutoverReady,
        canonicalFeedRevalidated: cutoverReady,
        directoryCertificationReady: cutoverReady,
        ownerRedirectAttested: Boolean(attestation?.fresh),
        finalActivationApproved: Boolean(activationApproval)
      }
    },
    idempotent: null,
    redirectAttestationMutationPerformed: false,
    cutoverPacketMutationPerformed: false,
    redirectActivationApprovalMutationPerformed: false,
    r2MutationPerformed: false,
    episodeMutationPerformed: false,
    publicationMutationPerformed: false,
    redirectMutationPerformed: false,
    providerContactPerformed: false
  };
}

const announcement = {
  id: "announcement_browser_fixture",
  showId: show.id,
  revision: 1,
  language: "es",
  subject: "Nuevo episodio de Ópera en la Selva",
  heading: show.title,
  announcementRevision: sha("1"),
  audienceRevision: sha("2"),
  reviewHash: sha("3"),
  eligibleRecipientCount: 3,
  deliveryMode: "dry_run",
  status: "completed",
  approvedAt: "2026-07-26T12:00:00.000Z",
  completedAt: "2026-07-26T12:01:00.000Z",
  createdAt: "2026-07-26T12:00:00.000Z",
  deliveryCounts: {
    pending: 0,
    accepted: 0,
    delivered: 0,
    dryRun: 3,
    suppressed: 0,
    failed: 0
  }
};

const distributionDestinations = [
  ["apple_podcasts", "Apple Podcasts"],
  ["spotify", "Spotify"],
  ["youtube_music", "YouTube Music"],
  ["amazon_music", "Amazon Music"],
  ["audible", "Audible"],
  ["iheartradio", "iHeartRadio"],
  ["tunein", "TuneIn"],
  ["pocket_casts", "Pocket Casts"],
  ["overcast", "Overcast"],
  ["castbox", "Castbox"],
  ["podcast_index", "Podcast Index"]
].map(([id, name], index) => {
  const certified = index < 10;
  return {
    id,
    name,
    mode: "rss_follow",
    enabled: true,
    ownerSetupStatus: "verified",
    submissionUrl: `https://example.invalid/directory/${id}/setup`,
    submissionEvidenceUrl:
      `https://example.invalid/directory/${id}/submission`,
    listingUrl: `https://example.invalid/directory/${id}/listing`,
    ownerAccountLabel: "Dust Wave operations",
    submissionDate: "2026-07-26",
    setupNotes: certified
      ? "Browser fixture with the complete launch evidence chain."
      : "Recovery evidence remains intentionally incomplete.",
    publicationStatus: null,
    publicationRevision: null,
    lastObservedAt: null,
    evidenceUrl: null,
    setupError: null,
    publicationError: null,
    certification: {
      ownerVerified: true,
      feedValidated: true,
      ingestionObserved: true,
      failureRecoveryVerified: certified,
      certified
    }
  };
});

let marketingLinks = [{
  id: "marketing_link_browser_fixture",
  showId: show.id,
  code: "festival-newsletter",
  label: "Festival newsletter",
  canonicalUrl: show.canonicalUrl,
  utmSource: "newsletter",
  utmMedium: "email",
  utmCampaign: "opera-launch",
  utmContent: "hero",
  referralCode: "festival",
  taggedUrl:
    `${show.canonicalUrl}?utm_source=newsletter&utm_medium=email&utm_campaign=opera-launch&utm_content=hero&ref=festival`,
  revision: 1,
  createdAt: "2026-07-26T12:00:00.000Z",
  updatedAt: "2026-07-26T12:00:00.000Z"
}];

const audioMasterPayload = {
  state: {
    revision: 1,
    currentMasterId: "master_mock",
    updatedAt: "2026-07-25T12:00:00.000Z"
  },
  current: {
    id: "master_mock",
    revision: 1,
    originKind: "source_original",
    objectBytes: 14_400_000,
    mimeType: "audio/wav",
    sourceSha256: sha("a"),
    qualityControlReportSha256: sha("b"),
    approvalReason:
      'Exact-source review <img id="qa-master-injection" src=x> remains text.',
    approvedAt: "2026-07-25T12:00:00.000Z"
  },
  eligibleSource: {
    qualityControlRunId: "qc_mock",
    warningCount: 1,
    objectBytes: 14_400_000,
    policyRevision: 1,
    durationMs: 180_000
  },
  masters: [],
  previews: [
    {
      id: 'enhance_<img id="qa-preview-injection" src=x>',
      status: "ready",
      recipe: {
        presetId: "dialogue-gentle-v1",
        previewStartMs: 15_000,
        previewDurationMs: 45_000
      },
      original: {
        mediaUrl:
          "/v1/admin/audio-enhancements/enhance_mock/media/original",
        bytes: 1_080_000,
        sha256: sha("c"),
        durationMs: 45_000
      },
      enhanced: {
        mediaUrl:
          "/v1/admin/audio-enhancements/enhance_mock/media/enhanced",
        bytes: 1_080_000,
        sha256: sha("d"),
        durationMs: 45_000
      },
      warning:
        'Private preview only <script id="qa-warning-injection">bad()</script>'
    },
    {
      id: "enhance_mock",
      status: "ready",
      recipe: {
        presetId: "dialogue-gentle-v1",
        previewStartMs: 15_000,
        previewDurationMs: 45_000
      },
      original: {
        mediaUrl:
          "/v1/admin/audio-enhancements/enhance_mock/media/original",
        bytes: 1_080_000,
        sha256: sha("c"),
        durationMs: 45_000
      },
      enhanced: {
        mediaUrl:
          "/v1/admin/audio-enhancements/enhance_mock/media/enhanced",
        bytes: 1_080_000,
        sha256: sha("d"),
        durationMs: 45_000
      },
      warning: "Private preview only; it cannot become a master."
    }
  ],
  presets: [
    {
      id: "dialogue-gentle-v1",
      label: "Gentle dialogue cleanup",
      description: "Conservative cleanup and loudness matching"
    },
    {
      id: "loudness-only-v1",
      label: "Loudness only",
      description: "No tonal processing"
    }
  ],
  safeguards: {
    sourceApprovalRole: "super_admin",
    enhancementPreviewIsMaster: false,
    replacementInvalidatesDerivedApprovals: true
  },
  processor: {
    available: true,
    mode: "staging_manual"
  }
};

let audioEnhancementDerivatives = [
  {
    id: "derivative_browser_fixture",
    episodeId: episode.id,
    selectedPreviewId: "enhance_mock",
    sourceMasterId: "master_mock",
    sourceQualityControlRunId: "qc_mock",
    recipe: {
      schemaVersion: "audio-enhancement-derivative-recipe-v1",
      presetId: "dialogue-gentle-v1",
      targetIntegratedLufs: -19,
      maximumTruePeakDbtp: -1
    },
    recipeSha256: sha("4"),
    processorManifestSha256: sha("5"),
    status: "ready",
    current: true,
    output: {
      uploadId: "upload_derivative_browser_fixture",
      objectBytes: 4_320_000,
      etag: '"derivative-browser-etag"',
      sha256: sha("6"),
      durationMs: 180_000,
      mimeType: "audio/mpeg",
      mediaUrl:
        "/v1/admin/audio-enhancement-derivatives/"
        + "derivative_browser_fixture/media",
      downloadUrl:
        "/v1/admin/audio-enhancement-derivatives/"
        + "derivative_browser_fixture/media?download=1"
    },
    qualityControl: {
      runId: "qc_derivative_browser_fixture",
      status: "succeeded",
      policyRevision: 1,
      currentPolicyRevision: 1,
      policyCurrent: true,
      sourceSha256: sha("6"),
      outputDigestMatches: true,
      reportSha256: sha("7"),
      blockerCount: 0,
      warningCount: 1,
      completedAt: "2026-07-26T12:05:00.000Z"
    },
    approvable: true,
    processorVersion:
      "dustwave-audio-enhancement-derivative-1 (ffmpeg fixture)",
    processorReportSha256: sha("8"),
    failureCode: null,
    approvalReason:
      'Literal derivative evidence <img id="qa-derivative-injection" src=x>.',
    requestedAt: "2026-07-26T12:00:00.000Z",
    completedAt: "2026-07-26T12:04:00.000Z",
    approvedAt: null,
    processor: null,
    environment: "staging"
  }
];

let deliveryAudioJobs = [
  {
    id: "delivery_audio_browser_fixture",
    episodeId: episode.id,
    sourceMasterId: "master_mock",
    current: true,
    streamProfile: "mp3-44100-stereo-cbr128-frame-v1",
    status: "ready",
    failureCode: null,
    requestedAt: "2026-07-26T12:00:00.000Z",
    completedAt: "2026-07-26T12:03:00.000Z",
    approvedAt: null,
    approvalReason: null,
    output: {
      bytes: 2_880_000,
      sha256: sha("c"),
      durationMs: 180_000,
      mimeType: "audio/mpeg",
      mediaPath:
        "/v1/admin/delivery-audio-jobs/delivery_audio_browser_fixture/media",
      downloadPath:
        "/v1/admin/delivery-audio-jobs/delivery_audio_browser_fixture/media?download=1"
    },
    peaks: {
      bytes: 256,
      sha256: sha("d"),
      length: 8,
      path:
        "/v1/admin/delivery-audio-jobs/delivery_audio_browser_fixture/peaks"
    },
    processor: {
      version: "dustwave-delivery-audio-1 (ffmpeg browser fixture)",
      reportSha256: sha("e")
    },
    approval: {
      eligible: true,
      approvedCurrent: false
    }
  }
];

let youtubeAudioRenditions = [
  {
    id:
      "youtube_rendition_browser_fixture_with_a_deliberately_long_identifier",
    episodeId: episode.id,
    showId: show.id,
    workingMasterId: "master_mock",
    sourceBytes: 14_400_000,
    sourceMimeType: "audio/wav",
    artworkBytes: 248_000,
    artworkMimeType: "image/jpeg",
    outputUploadId: "youtube_rendition_upload_browser_fixture",
    outputBytes: 8_400_000,
    outputSha256: sha("8"),
    outputDurationMs: 180_000,
    outputWidth: 1920,
    outputHeight: 1080,
    processorManifestSha256: sha("9"),
    processorVersion: "dustwave-youtube-audio-1 (ffmpeg browser fixture)",
    status: "ready",
    failureCode: null,
    current: true,
    selected: true,
    nativeVideoPreferred: false,
    requestedAt: "2026-07-26T12:00:00.000Z",
    completedAt: "2026-07-26T12:03:00.000Z"
  },
  {
    id: "youtube_rendition_stale_browser_fixture",
    episodeId: episode.id,
    showId: show.id,
    workingMasterId: "master_previous",
    sourceBytes: 14_100_000,
    sourceMimeType: "audio/wav",
    artworkBytes: 248_000,
    artworkMimeType: "image/jpeg",
    outputUploadId: null,
    outputBytes: null,
    outputSha256: null,
    outputDurationMs: null,
    outputWidth: null,
    outputHeight: null,
    processorManifestSha256: sha("0"),
    processorVersion: "dustwave-youtube-audio-1 (ffmpeg browser fixture)",
    status: "failed",
    failureCode:
      "source_stale_<img id=\"qa-youtube-audio-injection\" src=x>",
    current: false,
    selected: false,
    nativeVideoPreferred: false,
    requestedAt: "2026-07-25T12:00:00.000Z",
    completedAt: "2026-07-25T12:01:00.000Z"
  }
];

function json(response, status = 200) {
  return {
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(response)
  };
}

function boundedInteger(value, {
  minimum,
  maximum,
  fallback
}) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed)
    && parsed >= minimum
    && parsed <= maximum
    ? parsed
    : fallback;
}

function responseFor(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const path = url.pathname;
  const publicClipPath =
    `/v1/shows/${show.slug}/episodes/episodio-de-prueba/clips`;
  if (request.method === "GET" && path === publicClipPath) {
    if (publicClipMode === "missing") {
      return json({ error: "clip_not_found" }, 404);
    }
    const canonicalUrl =
      `https://dustwave.xyz/news/podcasts/${show.slug}/`
      + "episodio-de-prueba/";
    return json({
      schemaVersion: 1,
      episode: {
        showSlug: show.slug,
        slug: "episodio-de-prueba",
        canonicalUrl
      },
      clips: publicClipMode === "empty"
        ? []
        : [{
            slug: "momento-de-lanzamiento",
            title: "Un momento en la selva",
            description: "Un audiograma subtitulado de control.",
            aspectRatio: "9:16",
            width: 1_080,
            height: 1_920,
            durationMs: 24_000,
            captionLanguage: "es",
            mediaUrl:
              `http://${host}:${port}${publicClipPath}`
              + "/momento-de-lanzamiento.mp4",
            downloadUrl:
              `http://${host}:${port}${publicClipPath}`
              + "/momento-de-lanzamiento.mp4?download=1",
            canonicalUrl
          }],
      truncated: false
    });
  }
  if (request.method === "GET" && path === "/v1/member/session") {
    return json({
      identity: {
        id: "listener_browser_qa",
        subscriptions: [{
          id: "subscription_browser_qa",
          provider: "stripe",
          status: "active",
          currentPeriodEnd: "2026-08-26T00:00:00.000Z",
          show: {
            id: show.id,
            slug: show.slug,
            title: show.title
          },
          billingPeriod: "month",
          entitled: true,
          hasPrivateFeed: true,
          hasStripeBilling: true,
          announcementNotificationsEnabled: false,
          notificationLanguage: "es"
        }]
      },
      csrfToken: "browser-qa-member-csrf",
      poolRedemptionEnabled: false
    });
  }
  if (
    request.method === "PUT"
    && path === `/v1/member/shows/${show.slug}/notifications`
  ) {
    return json({
      show: {
        id: show.id,
        slug: show.slug,
        title: show.title
      },
      preference: {
        announcementsEnabled: true,
        language: "es",
        consentSource: "member_account",
        destinationProtected: true
      }
    });
  }
  if (request.method === "GET" && path === "/v1/admin/session") {
    return json({
      identity: {
        id: "admin_browser_qa",
        email: "browser-qa@example.invalid",
        roles: [{ role: adminRole }]
      },
      csrfToken: "browser-qa-csrf"
    });
  }
  if (request.method === "GET" && path === "/v1/admin/shows") {
    return json({ shows: [show] });
  }
  if (
    request.method === "PATCH"
    && path === `/v1/admin/shows/${show.id}`
  ) {
    return json({ updated: true, showId: show.id });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/shows/${show.id}/premium-prices`
  ) {
    return json({
      showId: show.id,
      currency: "USD",
      monthlyCents: 500,
      annualCents: 5_000,
      providerMode: "test",
      providerReady: true,
      providerProvisioningRequired: false,
      checkoutEnabled: false,
      configurationLocked: false,
      blockers: [],
      history: { subscriptions: 0, checkoutAttempts: 0 },
      confirmation: `CONFIGURE_SHOW_PRICES ${show.id}`
    });
  }
  if (
    request.method === "PATCH"
    && path === `/v1/admin/shows/${show.id}/premium-prices`
  ) {
    return json({
      showId: show.id,
      currency: "USD",
      monthlyCents: 500,
      annualCents: 5_000,
      providerMode: "test",
      providerReady: false,
      providerProvisioningRequired: true,
      checkoutEnabled: false,
      configurationLocked: false,
      blockers: [],
      history: { subscriptions: 0, checkoutAttempts: 0 },
      confirmation: `CONFIGURE_SHOW_PRICES ${show.id}`,
      updated: true,
      idempotent: false
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/shows/${show.id}/site-projection`
  ) {
    return json({
      target: {
        owner: "aindaco1",
        repository: "dust-wave-new",
        ref: "release/1.2.0-youtube-preflight",
        path: "src/_data/podcastShows.json"
      },
      mode: "dry_run",
      showId: show.id,
      catalogSha: sha("a"),
      changed: true,
      changedFields: [
        "canonicalUrl",
        "feedArtworkUrl",
        "authorName",
        "category",
        "explicit"
      ],
      blockers: []
    });
  }
  if (
    request.method === "POST"
    && path === `/v1/admin/shows/${show.id}/site-projection`
  ) {
    return json({
      target: {
        owner: "aindaco1",
        repository: "dust-wave-new",
        ref: "release/1.2.0-youtube-preflight",
        path: "src/_data/podcastShows.json"
      },
      mode: "dry_run",
      showId: show.id,
      catalogSha: sha("a"),
      changed: true,
      changedFields: ["canonicalUrl", "feedArtworkUrl"],
      blockers: [],
      published: false,
      dryRun: true,
      idempotent: false
    });
  }
  if (
    request.method === "GET"
    && path === "/v1/admin/distribution"
    && url.searchParams.get("showId") === show.id
  ) {
    return json({
      showId: show.id,
      feedUrl:
        "https://feeds.dustwave.xyz/opera-en-la-selva/rss.xml",
      semantics: "rss-follow-after-one-time-owner-setup",
      summary: {
        total: distributionDestinations.length,
        setupComplete: distributionDestinations.length,
        setupRequired: 0,
        observed: 0,
        ingestionObserved: distributionDestinations.length,
        failureRecoveryVerified: 10,
        certified: 10
      },
      launchClaim: {
        ready: true,
        requiredDestinations: 10,
        certifiedDestinations: 10,
        remainingDestinations: 0,
        feedValidation: {
          status: "valid",
          feedUrl:
            "https://feeds.dustwave.xyz/opera-en-la-selva/rss.xml",
          validatorVersion: "dustwave-rss-launch-v2",
          currentValidator: true,
          sha256: sha("f"),
          itemCount: 1,
          failureCode: null,
          checkedAt: "2026-07-26T12:05:00.000Z",
          validatedAt: "2026-07-26T12:05:00.000Z"
        }
      },
      destinations: distributionDestinations
    });
  }
  if (
    request.method === "POST"
    && path === `/v1/admin/shows/${show.id}/feed-validation`
  ) {
    return json({
      valid: true,
      validatorVersion: "dustwave-rss-launch-v2",
      itemCount: 1,
      checkedAt: "2026-07-26T12:05:00.000Z",
      validatedAt: "2026-07-26T12:05:00.000Z"
    });
  }
  if (
    request.method === "GET"
    && path === "/v1/admin/subscribers"
  ) {
    if (url.searchParams.get("format") === "csv") {
      return {
        status: 200,
        contentType: "text/csv; charset=utf-8",
        headers: {
          "content-disposition": 'attachment; filename="podcast-subscribers.csv"',
          "access-control-expose-headers": "content-disposition"
        },
        body: [
          '"subscriptionId","listenerId","showId","showTitle","status"',
          '"subscription_mock","listener_mock","show_opera_en_la_selva","Ópera en la Selva","active"'
        ].join("\r\n")
      };
    }
    return json({
      subscribers: [{
        subscriptionId: "subscription_mock",
        listenerId: "listener_mock",
        showId: show.id,
        showTitle: show.title,
        priceId: "price_opera_monthly_usd",
        billingPeriod: "month",
        status: "active",
        currentPeriodEnd: "2026-08-26T00:00:00.000Z",
        hasPrivateFeed: true,
        announcementsEnabled: true,
        notificationLanguage: "es",
        sources: [{
          provider: "stripe",
          status: "active",
          currentPeriodEnd: "2026-08-26T00:00:00.000Z",
          providerCustomerId: "cus_browser_fixture",
          providerSubscriptionId: "sub_browser_fixture"
        }],
        createdAt: "2026-07-25T00:00:00.000Z",
        updatedAt: "2026-07-26T00:00:00.000Z"
      }],
      summary: {
        total: 1,
        active: 1,
        pastDue: 0,
        paused: 0,
        ended: 0,
        pending: 0,
        providers: [{ provider: "stripe", total: 1, active: 1 }]
      },
      pagination: { limit: 50, nextCursor: null }
    });
  }
  if (
    request.method === "GET"
    && path === "/v1/admin/billing/readiness"
  ) {
    return json({
      mode: "test",
      configured: {
        apiKey: true,
        webhookSecret: true
      },
      checkoutEnabled: false,
      taxCollectionEnabled: false,
      failedWebhookEvents: 0,
      invoiceTaxEvidence: { total: 0, matched: 0, attention: 0 },
      taxChangePreviews: { total: 0, unchanged: 0, attention: 0 }
    });
  }
  if (
    request.method === "GET"
    && path === "/v1/admin/billing/tax-evidence"
  ) {
    if (url.searchParams.get("format") === "csv") {
      return {
        status: 200,
        contentType: "text/csv; charset=utf-8",
        headers: {
          "content-disposition":
            'attachment; filename="podcast-subscription-tax-evidence.csv"',
          "access-control-expose-headers": "content-disposition"
        },
        body: '"eventId","providerInvoiceId"\r\n'
      };
    }
    return json({
      evidence: [],
      count: 0,
      limit: 100,
      truncated: false
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/shows/${show.id}/analytics/overview`
  ) {
    return json({
      showId: show.id,
      range: {
        days: Number(url.searchParams.get("days") || 30),
        startDate: "2026-07-20",
        endDate: "2026-07-26",
        timeZone: "UTC"
      },
      methodology: {
        version: "dustwave-analytics-v1",
        certification: "not_iab_certified"
      },
      totals: {
        qualifiedDownloads: 1842,
        engagedPlays: 619,
        activePremiumListeners: 37
      },
      daily: [
        { date: "2026-07-20", qualifiedDownloads: 180, engagedPlays: 52, webPlayerCompletion: { 25: 41, 50: 34, 75: 25, 100: 18 } },
        { date: "2026-07-21", qualifiedDownloads: 215, engagedPlays: 61, webPlayerCompletion: { 25: 48, 50: 40, 75: 29, 100: 20 } },
        { date: "2026-07-22", qualifiedDownloads: 244, engagedPlays: 78, webPlayerCompletion: { 25: 62, 50: 49, 75: 37, 100: 26 } },
        { date: "2026-07-23", qualifiedDownloads: 301, engagedPlays: 103, webPlayerCompletion: { 25: 82, 50: 66, 75: 49, 100: 35 } },
        { date: "2026-07-24", qualifiedDownloads: 290, engagedPlays: 96, webPlayerCompletion: { 25: 75, 50: 61, 75: 45, 100: 32 } },
        { date: "2026-07-25", qualifiedDownloads: 338, engagedPlays: 117, webPlayerCompletion: { 25: 93, 50: 75, 75: 57, 100: 39 } },
        { date: "2026-07-26", qualifiedDownloads: 274, engagedPlays: 112, webPlayerCompletion: { 25: 89, 50: 72, 75: 54, 100: 38 } }
      ],
      episodes: [{
        episodeId: episode.id,
        title: episode.title,
        qualifiedDownloads: 1842,
        engagedPlays: 619,
        webPlayerCompletion: {
          25: 490,
          50: 397,
          75: 296,
          100: 208
        },
        webPlayerCompletionRates: {
          25: 0.7916,
          50: 0.6414,
          75: 0.4782,
          100: 0.336
        }
      }],
      webPlayerCompletion: {
        scope: "dust_wave_web_player_only",
        cohort: "engaged_plays",
        engagedPlays: 619,
        counts: {
          25: 490,
          50: 397,
          75: 296,
          100: 208
        },
        rates: {
          25: 0.7916,
          50: 0.6414,
          75: 0.4782,
          100: 0.336
        }
      },
      breakdowns: {
        apps: [
          { code: "apple_podcasts", count: 812 },
          { code: "spotify", count: 601 },
          { code: "browser", count: 429 }
        ],
        devices: [
          { code: "mobile", count: 1320 },
          { code: "desktop", count: 522 }
        ],
        countries: [
          { code: "MX", count: 744 },
          { code: "US", count: 611 },
          { code: "CO", count: 487 }
        ]
      },
      generatedAt: "2026-07-26T18:00:00.000Z"
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/shows/${show.id}/analytics/overview.csv`
  ) {
    return {
      status: 200,
      contentType: "text/csv; charset=utf-8",
      headers: {
        "content-disposition":
          'attachment; filename="podcast-analytics-show_opera_en_la_selva-30d.csv"',
        "access-control-expose-headers": "content-disposition"
      },
      body:
        '"date","qualified_downloads","engaged_plays","web_player_completion_25","web_player_completion_50","web_player_completion_75","web_player_completion_100","methodology_version"\r\n'
        + '"2026-07-26","274","112","dustwave-analytics-v1"\r\n'
    };
  }
  if (
    request.method === "GET"
    && path === "/v1/admin/ads/reconciliation"
  ) {
    return json({
      showId: show.id,
      methodology: { version: "trusted-download-v1" },
      summary: {
        campaignCount: 0,
        counterValue: 0,
        qualificationRows: 0,
        difference: 0,
        discrepancyCount: 0,
        campaignsAtCap: 0,
        lastQualifiedAt: null
      },
      campaigns: [],
      pagination: { limit: 50, nextCursor: null }
    });
  }
  if (
    request.method === "GET"
    && path === "/v1/admin/alignment-benchmarks"
  ) {
    return json({
      benchmarks: [
        {
          id: "alignment_benchmark_mock",
          corpusVersion: "rights-cleared-bilingual-v1",
          adapter: {
            name: "whisperx",
            version: "3.8.6",
            model: "default",
            modelVersion: "default-en-es-v1",
            settingsVersion: "whisperx-align-v1"
          },
          runner: {
            repository: "aindaco1/dust-wave-alignment-runner",
            revision: "3c5ab054fdad375901eb186f32d7aed6cdb40413",
            digest: `sha256:${sha("5")}`
          },
          status: "passed",
          passed: true,
          reportSha256: sha("6"),
          inputSha256: sha("7"),
          inputBytes: 256_000,
          submissionId: "browser_qa_benchmark",
          cleanEnvironmentReproduced: true,
          languages: {
            en: {
              passed: true,
              fixtureCount: 12,
              goldWordCount: 408,
              alignedWordRatio: 0.995
            },
            es: {
              passed: true,
              fixtureCount: 12,
              goldWordCount: 408,
              alignedWordRatio: 0.993
            }
          },
          previews: {
            accepted: 99,
            total: 100,
            passed: true
          },
          benchmarkIntegrityGatePassed: true,
          resourceGatePassed: true,
          idempotencyGatePassed: true,
          completedAt: "2026-07-25T12:00:00.000Z",
          createdAt: "2026-07-25T12:00:00.000Z"
        }
      ],
      requiredRunner: {
        repository: "aindaco1/dust-wave-alignment-runner",
        revision: "3c5ab054fdad375901eb186f32d7aed6cdb40413"
      },
      limits: {
        maximumInputBytes: 8 * 1024 * 1024,
        maximumFixtures: 64,
        maximumTotalWords: 25_000
      }
    });
  }
  if (
    request.method === "POST"
    && path === `/v1/admin/shows/${show.id}/rss-import/preview`
  ) {
    return json({
      show: {
        id: show.id,
        title: show.title,
        podcastGuid: show.podcastGuid
      },
      importMutationPerformed: false,
      preview: {
        schemaVersion: "dustwave-rss-import-preview-v1",
        requestedUrl: "https://podcast.example.org/feed.xml",
        resolvedUrl: "https://feeds.example.org/opera.xml",
        redirectCount: 1,
        feedSha256: sha("e"),
        title: "Authorized source <img id=\"qa-rss-title\" src=x>",
        description: "Sanitized source metadata.",
        language: "es",
        artworkUrl: "https://cdn.example.org/opera.jpg",
        ownerEmailPresent: true,
        podcastGuid: show.podcastGuid,
        podcastGuidStatus: "valid",
        itemCount: 2,
        audioItemCount: 1,
        migratableItemCount: 1,
        previewItemCount: 2,
        previewTruncated: false,
        episodes: [
          {
            sourceIdentitySha256: sha("f"),
            title: "Migratable episode",
            summary: "One validated audio item.",
            publishedAt: "2026-07-26T12:00:00.000Z",
            durationSeconds: 754,
            explicit: false,
            canonicalUrl:
              "https://podcast.example.org/episodes/migratable",
            enclosure: {
              url: "https://cdn.example.org/migratable.mp3",
              mimeType: "audio/mpeg",
              bytes: 1_234_567
            },
            migrationReady: true,
            blockers: [],
            warnings: []
          },
          {
            sourceIdentitySha256: sha("0"),
            title: "Article <script id=\"qa-rss-item\">bad()</script>",
            summary: "Image-only newsletter item.",
            publishedAt: "2026-07-25T12:00:00.000Z",
            durationSeconds: null,
            explicit: null,
            canonicalUrl:
              "https://podcast.example.org/articles/not-a-podcast",
            enclosure: {
              url: "https://cdn.example.org/article.jpg",
              mimeType: "image/jpeg",
              bytes: null
            },
            migrationReady: false,
            blockers: [
              "unsupported_enclosure_type",
              "missing_or_invalid_enclosure_bytes"
            ],
            warnings: [
              "missing_or_invalid_duration",
              "missing_or_invalid_explicit_value"
            ]
          }
        ],
        limits: {
          maximumFeedBytes: 5 * 1024 * 1024,
          maximumFeedItems: 500,
          maximumPreviewItems: 25
        }
      }
    });
  }
  if (
    request.method === "POST"
    && path === `/v1/admin/shows/${show.id}/rss-import/podcast-guid`
  ) {
    return json({
      show: {
        id: show.id,
        podcastGuid: show.podcastGuid
      },
      assignment: {
        podcastGuid: show.podcastGuid,
        requestedFeedUrl: "https://podcast.example.org/feed.xml",
        resolvedFeedUrl: "https://feeds.example.org/opera.xml",
        feedSha256: sha("e"),
        assignedAt: "2026-07-28T12:00:00.000Z"
      },
      idempotent: true,
      episodeMutationPerformed: false,
      importMutationPerformed: false,
      publicationMutationPerformed: false
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/shows/${show.id}/rss-import/plans`
  ) {
    return json({
      plans: rssImportPlans,
      limit: 10,
      mediaCopyPerformed: false,
      episodeMutationPerformed: false
    });
  }
  if (
    request.method === "POST"
    && path === `/v1/admin/shows/${show.id}/rss-import/plans`
  ) {
    const prepared = {
      ...rssImportPlans[0],
      id: "rss_import_browser_prepared",
      status: "draft",
      requestedAt: "2026-07-28T12:00:00.000Z",
      updatedAt: "2026-07-28T12:00:00.000Z"
    };
    rssImportPlans = [
      prepared,
      ...rssImportPlans.filter(({ id }) => id !== prepared.id)
    ];
    return json({
      plan: prepared,
      idempotent: false,
      mediaCopyPerformed: false,
      episodeMutationPerformed: false
    });
  }
  const rssImportExecutionMatch = path.match(
    /^\/v1\/admin\/rss-import\/plans\/([A-Za-z0-9_-]+)\/execution$/u
  );
  if (request.method === "GET" && rssImportExecutionMatch) {
    const plan = rssImportPlans.find(
      ({ id }) => id === rssImportExecutionMatch[1]
    );
    if (!plan) return json({ error: "rss_import_plan_not_found" }, 404);
    completeRssImportExecution();
    return json({
      execution: rssImportExecution?.planId === plan.id
        ? rssImportExecution
        : null,
      executionAvailable: true,
      publicationMutationPerformed: false,
      redirectMutationPerformed: false,
      providerContactPerformed: false
    });
  }
  if (request.method === "POST" && rssImportExecutionMatch) {
    const plan = rssImportPlans.find(
      ({ id }) => id === rssImportExecutionMatch[1]
    );
    if (!plan) return json({ error: "rss_import_plan_not_found" }, 404);
    if (plan.status !== "reviewed") {
      return json({ error: "rss_import_plan_not_reviewed" }, 409);
    }
    rssImportReconciliation = null;
    rssImportRedirectAttestation = null;
    rssImportCutoverPacket = null;
    rssImportRedirectActivationApproval = null;
    rssImportExecution = {
      id: "rss_execution_browser_fixture",
      planId: plan.id,
      showId: show.id,
      status: "queued",
      expectedItemCount: plan.selectedItemCount,
      copiedItemCount: 0,
      draftItemCount: 0,
      failedItemCount: 0,
      sourceUrlRetained: true,
      sourceUrlExpiresAt: "2026-08-04T12:01:00.000Z",
      lastErrorCode: null,
      items: plan.items.map((item, ordinal) => ({
        sourceIdentitySha256: item.sourceIdentitySha256,
        ordinal,
        targetEpisodeId: `episode_rss_browser_${ordinal}`,
        targetSlug: "migratable-episode",
        sourceLanguage: "es",
        status: "queued",
        attemptCount: 0,
        copiedBytes: null,
        copiedSha256: null,
        copiedMimeType: null,
        episodeId: null,
        lastErrorCode: null,
        completedAt: null
      })),
      requestedAt: "2026-07-28T12:01:00.000Z",
      startedAt: null,
      completedAt: null,
      updatedAt: "2026-07-28T12:01:00.000Z"
    };
    return json({
      execution: rssImportExecution,
      idempotent: false,
      publicationMutationPerformed: false,
      redirectMutationPerformed: false,
      providerContactPerformed: false
    }, 202);
  }
  const rssImportReconciliationMatch = path.match(
    /^\/v1\/admin\/rss-import\/plans\/([A-Za-z0-9_-]+)\/reconciliation$/u
  );
  if (
    (request.method === "GET" || request.method === "POST")
    && rssImportReconciliationMatch
  ) {
    const plan = rssImportPlans.find(
      ({ id }) => id === rssImportReconciliationMatch[1]
    );
    if (!plan) {
      return json({ error: "rss_import_reconciliation_not_found" }, 404);
    }
    if (
      !rssImportExecution
      || rssImportExecution.planId !== plan.id
    ) {
      return json({ error: "rss_import_reconciliation_not_found" }, 404);
    }
    if (
      request.method === "POST"
      && rssImportExecution.status !== "succeeded"
    ) {
      return json({ error: "rss_import_reconciliation_not_ready" }, 409);
    }
    const idempotent = Boolean(rssImportReconciliation);
    if (request.method === "POST" && !rssImportReconciliation) {
      rssImportReconciliation = {
        id: "rss_reconciliation_browser_fixture",
        evidenceSha256: sha("7"),
        itemCount: 1,
        copiedBytes: 1_234_567,
        approvedAt: "2026-07-28T12:02:00.000Z"
      };
    }
    const payload = rssImportReconciliationPayload(plan);
    payload.idempotent = request.method === "POST"
      ? idempotent
      : null;
    return json(
      payload,
      request.method === "POST" && !idempotent ? 201 : 200
    );
  }
  const rssImportRedirectAttestationMatch = path.match(
    /^\/v1\/admin\/rss-import\/plans\/([A-Za-z0-9_-]+)\/redirect-attestation$/u
  );
  if (
    request.method === "POST"
    && rssImportRedirectAttestationMatch
  ) {
    const plan = rssImportPlans.find(
      ({ id }) => id === rssImportRedirectAttestationMatch[1]
    );
    if (
      !plan
      || !rssImportExecution
      || rssImportExecution.planId !== plan.id
      || rssImportExecution.status !== "succeeded"
      || !rssImportReconciliation
    ) {
      return json(
        { error: "rss_import_redirect_attestation_not_ready" },
        409
      );
    }
    const idempotent = Boolean(rssImportRedirectAttestation);
    if (!rssImportRedirectAttestation) {
      rssImportRedirectAttestation = {
        id: "rss_redirect_attestation_browser_fixture",
        redirectMethod: "provider_managed_redirect",
        attestedAt: "2026-07-28T12:03:00.000Z"
      };
    }
    const payload = rssImportReconciliationPayload(plan);
    payload.idempotent = idempotent;
    payload.redirectAttestationMutationPerformed = !idempotent;
    return json(payload, idempotent ? 200 : 201);
  }
  const rssImportCutoverPacketMatch = path.match(
    /^\/v1\/admin\/rss-import\/plans\/([A-Za-z0-9_-]+)\/cutover-packet$/u
  );
  if (request.method === "POST" && rssImportCutoverPacketMatch) {
    const plan = rssImportPlans.find(
      ({ id }) => id === rssImportCutoverPacketMatch[1]
    );
    if (
      !plan
      || !rssImportExecution
      || rssImportExecution.planId !== plan.id
      || !rssImportReconciliation
      || !rssImportRedirectAttestation
    ) {
      return json({ error: "rss_import_cutover_not_ready" }, 409);
    }
    const idempotent = Boolean(rssImportCutoverPacket);
    if (!rssImportCutoverPacket) {
      rssImportCutoverPacket = {
        id: "rss_cutover_packet_browser_fixture",
        evidenceSha256: sha("8"),
        preparedAt: "2026-07-28T12:05:00.000Z",
        importedEpisodeCount: 1,
        reobservedDestinationCount: 10
      };
    }
    const payload = rssImportReconciliationPayload(plan);
    payload.idempotent = idempotent;
    payload.cutoverPacketMutationPerformed = !idempotent;
    return json(payload, idempotent ? 200 : 201);
  }
  const rssImportRedirectActivationApprovalMatch = path.match(
    /^\/v1\/admin\/rss-import\/plans\/([A-Za-z0-9_-]+)\/redirect-activation-approval$/u
  );
  if (
    request.method === "POST"
    && rssImportRedirectActivationApprovalMatch
  ) {
    const plan = rssImportPlans.find(
      ({ id }) => id
        === rssImportRedirectActivationApprovalMatch[1]
    );
    if (
      !plan
      || !rssImportExecution
      || rssImportExecution.planId !== plan.id
      || !rssImportReconciliation
      || !rssImportRedirectAttestation
      || !rssImportCutoverPacket
    ) {
      return json(
        { error: "rss_import_redirect_activation_approval_not_ready" },
        409
      );
    }
    const idempotent = Boolean(
      rssImportRedirectActivationApproval
    );
    if (!rssImportRedirectActivationApproval) {
      rssImportRedirectActivationApproval = {
        id: "rss_redirect_activation_approval_browser_fixture",
        cutoverPacketId: rssImportCutoverPacket.id,
        cutoverEvidenceSha256:
          rssImportCutoverPacket.evidenceSha256,
        redirectMethod:
          rssImportRedirectAttestation.redirectMethod,
        approvedAt: "2026-07-28T12:06:00.000Z"
      };
    }
    const payload = rssImportReconciliationPayload(plan);
    payload.idempotent = idempotent;
    payload.redirectActivationApprovalMutationPerformed =
      !idempotent;
    return json(payload, idempotent ? 200 : 201);
  }
  const rssImportReviewMatch = path.match(
    /^\/v1\/admin\/rss-import\/plans\/([A-Za-z0-9_-]+)\/review$/u
  );
  if (request.method === "POST" && rssImportReviewMatch) {
    const plan = rssImportPlans.find(
      ({ id }) => id === rssImportReviewMatch[1]
    );
    if (!plan) return json({ error: "rss_import_plan_not_found" }, 404);
    const reviewed = {
      ...plan,
      status: "reviewed",
      reviewedAt: "2026-07-28T12:01:00.000Z",
      updatedAt: "2026-07-28T12:01:00.000Z"
    };
    rssImportPlans = rssImportPlans.map((candidate) =>
      candidate.id === reviewed.id ? reviewed : candidate
    );
    return json({
      plan: reviewed,
      idempotent: false,
      mediaCopyPerformed: false,
      episodeMutationPerformed: false
    });
  }
  const rssImportCancelMatch = path.match(
    /^\/v1\/admin\/rss-import\/plans\/([A-Za-z0-9_-]+)\/cancel$/u
  );
  if (request.method === "POST" && rssImportCancelMatch) {
    const plan = rssImportPlans.find(
      ({ id }) => id === rssImportCancelMatch[1]
    );
    if (!plan) return json({ error: "rss_import_plan_not_found" }, 404);
    if (rssImportExecution?.planId === plan.id) {
      return json({ error: "rss_import_plan_has_execution" }, 409);
    }
    const canceled = {
      ...plan,
      status: "canceled",
      canceledAt: "2026-07-28T12:02:00.000Z",
      updatedAt: "2026-07-28T12:02:00.000Z"
    };
    rssImportPlans = rssImportPlans.map((candidate) =>
      candidate.id === canceled.id ? canceled : candidate
    );
    return json({
      plan: canceled,
      idempotent: false,
      mediaCopyPerformed: false,
      episodeMutationPerformed: false
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/shows/${show.id}/episodes`
  ) {
    return json({ episodes: [episode] });
  }
  if (
    request.method === "PATCH"
    && path === `/v1/admin/episodes/${episode.id}`
  ) {
    return json({ updated: true, episodeId: episode.id });
  }
  if (
    request.method === "POST"
    && path === `/v1/admin/episodes/${episode.id}/show-notes/draft`
  ) {
    return json({
      draft: {
        summary:
          "Una conversación sobre cine, colaboración y trabajo creativo.",
        showNotesMarkdown:
          "## En este episodio\n\n"
          + "- Una conversación basada en la transcripción aprobada\n"
          + "- Cine, colaboración y proceso creativo",
        keywords: ["cine", "colaboración", "proceso creativo"]
      },
      source: {
        language: "es",
        revision: 1,
        contentSha256: sha("3"),
        approvedAt: "2026-07-29T06:00:00.000Z",
        includedCueCount: 24,
        totalCueCount: 24,
        truncated: false
      },
      outputLanguage: "es",
      model: "@cf/meta/llama-3.2-3b-instruct",
      reviewRequired: true,
      saved: false
    });
  }
  if (
    request.method === "POST"
    && path === `/v1/admin/episodes/${episode.id}/chapters/draft`
  ) {
    return json({
      draft: {
        chapters: [
          {
            id: "chapter_ai_111111111111111111111111",
            startsAtMs: 0,
            title: "El origen de la conversación",
            url: "",
            imageUrl: "",
            toc: true
          },
          {
            id: "chapter_ai_222222222222222222222222",
            startsAtMs: 90_000,
            title: "Cine y colaboración",
            url: "",
            imageUrl: "",
            toc: true
          }
        ]
      },
      source: {
        language: "es",
        revision: 1,
        contentSha256: sha("3"),
        approvedAt: "2026-07-29T06:00:00.000Z",
        includedCueCount: 24,
        totalCueCount: 24,
        truncated: false
      },
      outputLanguage: "es",
      model: "@cf/meta/llama-3.2-3b-instruct",
      reviewRequired: true,
      saved: false
    });
  }
  if (
    request.method === "POST"
    && path === `/v1/admin/episodes/${episode.id}/clips/draft`
  ) {
    return json({
      draft: {
        candidates: [
          {
            id: "clip_candidate_111111111111111111111111",
            title: "La selva también escucha",
            reason:
              "Un momento autosuficiente con una entrada clara y visual.",
            startCueId: "cue_browser_00001",
            endCueId: "cue_browser_00010",
            startsAtMs: 0,
            endsAtMs: 29_500,
            durationMs: 29_500
          },
          {
            id: "clip_candidate_222222222222222222222222",
            title: "Crear en colaboración",
            reason:
              "Una explicación práctica que funciona fuera del episodio.",
            startCueId: "cue_browser_00011",
            endCueId: "cue_browser_00020",
            startsAtMs: 30_000,
            endsAtMs: 59_500,
            durationMs: 29_500
          }
        ]
      },
      source: {
        language: "es",
        revision: 1,
        contentSha256: sha("3"),
        approvedAt: "2026-07-29T06:00:00.000Z",
        includedCueCount: transcriptCueCount,
        totalCueCount: transcriptCueCount,
        truncated: false
      },
      outputLanguage: "es",
      model: "@cf/meta/llama-3.2-3b-instruct",
      reviewRequired: true,
      saved: false
    });
  }
  if (
    request.method === "GET"
    && path
      === `/v1/admin/shows/${show.id}/marketing/announcements`
  ) {
    return json({
      deliveryMode: "dry_run",
      announcements: [announcement]
    });
  }
  if (
    request.method === "POST"
    && path
      === `/v1/admin/shows/${show.id}/marketing/announcements/dry-run`
  ) {
    return json({
      dryRun: true,
      reviewOnly: true,
      approvalRequired: true,
      sendEnabled: true,
      deliveryMode: "dry_run",
      deliveryProvider: "resend",
      consentPolicy: "explicit_show_opt_in",
      eligibleRecipientCount: 3,
      announcementRevision: sha("1"),
      audienceRevision: sha("2"),
      reviewHash: sha("3"),
      preview: {
        language: "es",
        subject: "Nuevo episodio de Ópera en la Selva",
        heading: show.title,
        bodyMarkdown: "Ya está disponible un nuevo episodio.",
        ctaLabel: "Escuchar episodio",
        ctaUrl: show.canonicalUrl
      }
    });
  }
  if (
    request.method === "POST"
    && path
      === `/v1/admin/shows/${show.id}/marketing/announcements/approve`
  ) {
    return json({
      announcement,
      idempotent: false,
      queueAccepted: true
    }, 202);
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/shows/${show.id}/marketing/links`
  ) {
    return json({
      showId: show.id,
      links: marketingLinks,
      pagination: { limit: 20, nextCursor: null }
    });
  }
  if (
    request.method === "POST"
    && path === `/v1/admin/shows/${show.id}/marketing/links`
  ) {
    const current = marketingLinks[0];
    const link = {
      ...current,
      id: current?.id || "marketing_link_browser_fixture",
      revision: Number(current?.revision || 0) + 1,
      updatedAt: new Date().toISOString()
    };
    marketingLinks = [link];
    return json({ updated: Boolean(current), link }, current ? 200 : 201);
  }
  if (
    request.method === "DELETE"
    && path.startsWith(`/v1/admin/shows/${show.id}/marketing/links/`)
  ) {
    const linkId = path.split("/").at(-1);
    marketingLinks = marketingLinks.filter(({ id }) => id !== linkId);
    return json({ deleted: true, linkId });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/shows/${show.id}/audio-qc-policy`
  ) {
    return json({
      policy: {
        revision: 1,
        monoIntegratedLufs: -19,
        stereoIntegratedLufs: -16,
        integratedLufsTolerance: 1,
        maximumTruePeakDbtp: -1,
        maximumDcOffset: 0.02,
        maximumChannelImbalanceLu: 1.5,
        maximumLeadingSilenceMs: 2_000,
        maximumTrailingSilenceMs: 3_000,
        maximumInternalSilenceMs: 8_000,
        silenceThresholdDb: -50
      }
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/episodes/${episode.id}/ad-plan`
  ) {
    return json({
      latestPlan: null,
      source: { ready: true, bytes: 14_400_000, durationSeconds: 180 },
      active: { markers: [], segments: [] },
      processorManifest: null
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/episodes/${episode.id}/audio-qc`
  ) {
    return json({
      source: {
        filename: "episode-source.wav",
        objectBytes: 14_400_000
      },
      policy: { revision: 1 },
      processor: { available: true },
      runs: [
        {
          id: "qc_mock",
          status: "succeeded",
          summary: {
            blockerCount: 0,
            warningCount: 1,
            integratedLufs: -18.7,
            truePeakDbtp: -1.4,
            durationMs: 180_000
          },
          report: { quality: { findings: [] } }
        }
      ]
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/episodes/${episode.id}/audio-master`
  ) {
    return json(audioMasterPayload);
  }
  if (
    request.method === "GET"
    && path
      === `/v1/admin/episodes/${episode.id}/audio-enhancement-derivatives`
  ) {
    return json({
      derivatives: audioEnhancementDerivatives,
      processor: { available: true, mode: "staging_manual" },
      safeguards: {
        selectedReadyPreviewRequired: true,
        currentMasterSnapshotRequired: true,
        fullLengthQualityControlRequired: true,
        explicitSuperAdminApprovalRequired: true,
        rendererCannotReplaceMaster: true
      }
    });
  }
  if (
    request.method === "POST"
    && path
      === `/v1/admin/episodes/${episode.id}/audio-enhancement-derivatives`
  ) {
    const queued = {
      ...audioEnhancementDerivatives[0],
      id: "derivative_browser_queued",
      status: "queued",
      output: null,
      qualityControl: null,
      approvable: false,
      processorVersion: null,
      processorReportSha256: null,
      requestedAt: new Date().toISOString(),
      completedAt: null,
      processor: null
    };
    audioEnhancementDerivatives = [
      queued,
      ...audioEnhancementDerivatives.filter(({ id }) => id !== queued.id)
    ];
    return json({
      derivative: queued,
      processor: {
        workflow: "process-audio-enhancement-derivative.yml",
        jobId: queued.id,
        manifestSha256: queued.processorManifestSha256
      },
      idempotent: false
    }, 202);
  }
  if (
    request.method === "POST"
    && path
      === "/v1/admin/audio-enhancement-derivatives/"
        + "derivative_browser_fixture/approve"
  ) {
    audioEnhancementDerivatives = audioEnhancementDerivatives.map(
      (derivative) => derivative.id === "derivative_browser_fixture"
        ? {
            ...derivative,
            status: "approved",
            approvable: false,
            approvedAt: new Date().toISOString()
          }
        : derivative
    );
    audioMasterPayload.state.revision = 2;
    audioMasterPayload.state.currentMasterId =
      "master_derivative_browser_fixture";
    audioMasterPayload.current = {
      id: "master_derivative_browser_fixture",
      revision: 2,
      originKind: "enhanced_derivative",
      objectBytes: 4_320_000,
      mimeType: "audio/mpeg",
      sourceSha256: sha("6"),
      qualityControlReportSha256: sha("7"),
      approvalReason: "Browser fixture approval.",
      approvedAt: new Date().toISOString()
    };
    return json({
      master: audioMasterPayload.current
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/episodes/${episode.id}/delivery-audio-jobs`
  ) {
    return json({
      jobs: deliveryAudioJobs,
      processor: { available: true, mode: "staging_manual" },
      safeguards: {
        currentWorkingMasterRequired: true,
        normalizedStreamProfile: "mp3-44100-stereo-cbr128-frame-v1",
        fullyDecodedAudioRequired: true,
        checksumBoundPeaksRequired: true,
        explicitRecentSuperAdminApprovalRequired: true,
        productionQueueDisabled: true
      }
    });
  }
  if (
    request.method === "POST"
    && path === `/v1/admin/episodes/${episode.id}/delivery-audio-jobs`
  ) {
    const queued = {
      ...deliveryAudioJobs[0],
      id: "delivery_audio_browser_queued",
      status: "queued",
      output: null,
      peaks: null,
      processor: { version: null, reportSha256: null },
      approval: { eligible: false, approvedCurrent: false },
      requestedAt: new Date().toISOString(),
      completedAt: null
    };
    deliveryAudioJobs = [
      queued,
      ...deliveryAudioJobs.filter(({ id }) => id !== queued.id)
    ];
    return json({
      job: queued,
      processor: {
        workflow: "process-delivery-audio.yml",
        jobId: queued.id,
        manifestSha256: sha("f")
      },
      idempotent: false
    }, 202);
  }
  if (
    request.method === "POST"
    && path
      === "/v1/admin/delivery-audio-jobs/"
        + "delivery_audio_browser_fixture/approve"
  ) {
    deliveryAudioJobs = deliveryAudioJobs.map((job) =>
      job.id === "delivery_audio_browser_fixture"
        ? {
            ...job,
            status: "approved",
            approvedAt: new Date().toISOString(),
            approval: { eligible: false, approvedCurrent: true }
          }
        : job
    );
    return json({
      job: deliveryAudioJobs.find(
        ({ id }) => id === "delivery_audio_browser_fixture"
      ),
      idempotent: false
    });
  }
  if (
    request.method === "GET"
    && path
      === `/v1/admin/episodes/${episode.id}/youtube-audio-renditions`
  ) {
    return json({
      episodeId: episode.id,
      environment: "staging",
      processorEnabled: true,
      nativeVideoPreferred: true,
      renditions: youtubeAudioRenditions
    });
  }
  if (
    request.method === "POST"
    && path
      === `/v1/admin/episodes/${episode.id}/youtube-audio-renditions`
  ) {
    const queued = {
      id: "youtube_rendition_browser_queued",
      episodeId: episode.id,
      showId: show.id,
      workingMasterId: "master_mock",
      sourceBytes: 14_400_000,
      sourceMimeType: "audio/wav",
      artworkBytes: 248_000,
      artworkMimeType: "image/jpeg",
      outputUploadId: null,
      outputBytes: null,
      outputSha256: null,
      outputDurationMs: null,
      outputWidth: null,
      outputHeight: null,
      processorManifestSha256: sha("4"),
      processorVersion: null,
      status: "queued",
      failureCode: null,
      current: true,
      selected: false,
      nativeVideoPreferred: false,
      requestedAt: new Date().toISOString(),
      completedAt: null
    };
    youtubeAudioRenditions = [
      queued,
      ...youtubeAudioRenditions.filter(({ id }) => id !== queued.id)
    ];
    return json({ rendition: queued, idempotent: false }, 202);
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/episodes/${episode.id}/transcripts`
  ) {
    return json({
      durationSeconds: transcriptDurationSeconds,
      transcripts: transcriptFixture ? [transcriptFixture] : []
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/episodes/${episode.id}/transcription-jobs`
  ) {
    return json({
      source: {
        sourceLanguage: "es",
        currentWorkingMasterId: "master_mock",
        workingMasterSha256: sha("a"),
        objectBytes: 14_400_000,
        mimeType: "audio/wav",
        durationMs: 180_000,
        directProcessingEligible: true,
        model: "@cf/openai/whisper-large-v3-turbo",
        settingsRevision: 1,
        settingsVersion: "whisper-source-v1"
      },
      jobs: [],
      safeguards: {
        sourceLanguageOnly: true,
        directSourceByteLimit: 16 * 1024 * 1024,
        largeSourceProcessor: "silence_aware_staging_workflow",
        wordTimingCreated: false,
        alignmentRequiredForWordControls: true
      }
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/episodes/${episode.id}/alignments`
  ) {
    return json({
      episodeId: episode.id,
      candidates: [],
      jobs: [],
      processor: {
        available: true,
        mode: "staging_manual",
        workflow: "process-alignment.yml",
        runnerRepository: "aindaco1/dust-wave-alignment-runner",
        runnerRevision: "3c5ab054fdad375901eb186f32d7aed6cdb40413"
      },
      gate: {
        bilingualBenchmarkRequired: true,
        minimumAlignedWordRatio: 0.98,
        interpolatedTimingPasses: false,
        wordControlsRemainLockedUntilPassed: true
      }
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/episodes/${episode.id}/chapters`
  ) {
    return json({ chapterSet: null });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/episodes/${episode.id}/reviews`
  ) {
    return json({
      targetOptions: [],
      reviews: [],
      readiness: {
        currentTargetCount: 0,
        currentReviewCount: 0,
        approvedCurrentReviewCount: 0,
        unreviewedCurrentTargetCount: 0,
        openBlockerCount: 0,
        reviewReady: false
      }
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/episodes/${episode.id}/readiness`
  ) {
    return json({
      publicationRevision: 0,
      publicationGateMode: "shadow",
      snapshotDigest: sha("e"),
      legacyGate: { ready: false, missing: ["publication"] },
      candidateGate: {
        ready: false,
        blockerCount: 1,
        warningCount: 1,
        overrideAvailable: true
      },
      nodes: [
        {
          id: "core.working_master",
          group: "core",
          label: "Working master",
          status: "ready",
          severity: "blocker",
          summary: "Exact source and QC evidence are approved.",
          evidence: { revision: 1, sourceSha256: sha("a") }
        }
      ]
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/shows/${show.id}/clips`
  ) {
    return json({
      clips: [{ ...clip, publicPublication: clipPublication }],
      pagination: { limit: 24, nextCursor: null }
    });
  }
  if (
    request.method === "POST"
    && path === `/v1/admin/clip-renders/${clip.render.id}/publication`
  ) {
    clipPublication = {
      id: "clip_publication_browser_fixture",
      showId: show.id,
      episodeId: episode.id,
      clipId: clip.id,
      clipRevision: clip.revision,
      renderId: clip.render.id,
      publicSlug: "la-selva-tambien-escucha",
      title: clip.title,
      description: "",
      status: "draft",
      aspectRatio: clip.aspectRatio,
      width: clip.render.width,
      height: clip.render.height,
      durationMs: clip.durationMs,
      captionLanguage: clip.captionLanguage,
      evidenceCurrent: true,
      publicPath:
        "/v1/shows/opera-en-la-selva/episodes/episodio-de-prueba"
        + "/clips/la-selva-tambien-escucha.mp4",
      requestedAt: "2026-07-28T12:00:00.000Z",
      approvedAt: null,
      withdrawnAt: null,
      updatedAt: "2026-07-28T12:00:00.000Z"
    };
    return json({ publication: clipPublication, idempotent: false });
  }
  if (
    request.method === "POST"
    && path ===
      "/v1/admin/clip-publications/clip_publication_browser_fixture/approve"
  ) {
    clipPublication = {
      ...clipPublication,
      status: "approved",
      approvedAt: "2026-07-28T12:01:00.000Z",
      updatedAt: "2026-07-28T12:01:00.000Z"
    };
    return json({ publication: clipPublication, idempotent: false });
  }
  if (
    request.method === "POST"
    && path ===
      "/v1/admin/clip-publications/clip_publication_browser_fixture/withdraw"
  ) {
    clipPublication = {
      ...clipPublication,
      status: "withdrawn",
      withdrawnAt: "2026-07-28T12:02:00.000Z",
      updatedAt: "2026-07-28T12:02:00.000Z"
    };
    return json({ publication: clipPublication, idempotent: false });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/episodes/${episode.id}/clips`
  ) {
    return json({
      clips: [{ ...clip, publicPublication: clipPublication }]
    });
  }
  if (
    request.method === "GET"
    && path === `/v1/admin/clip-renders/${clip.render.id}/captions.vtt`
  ) {
    return {
      status: 200,
      contentType: "text/vtt; charset=utf-8",
      headers: {
        "content-disposition":
          'attachment; filename="mock-clip-render.vtt"',
        "content-language": "es"
      },
      body: [
        "WEBVTT",
        "",
        "1",
        "00:00:00.000 --> 00:00:24.000",
        "<v Jay>Un audiograma subtitulado de control.</v>",
        ""
      ].join("\n")
    };
  }
  if (
    request.method === "GET"
    && path === "/v1/admin/ads/campaigns"
  ) {
    return json({ campaigns: [] });
  }
  if (
    request.method === "GET"
    && path.startsWith("/v1/admin/audio-enhancements/")
    && path.includes("/media/")
  ) {
    return {
      status: 200,
      contentType: "audio/wav",
      body: silentWav()
    };
  }
  if (
    request.method === "GET"
    && path.startsWith("/v1/admin/audio-enhancement-derivatives/")
    && path.endsWith("/media")
  ) {
    return {
      status: 200,
      contentType: "audio/mpeg",
      body: silentWav()
    };
  }
  if (
    request.method === "GET"
    && path.startsWith("/v1/admin/delivery-audio-jobs/")
    && path.endsWith("/media")
  ) {
    return {
      status: 200,
      contentType: "audio/mpeg",
      body: silentWav()
    };
  }
  if (
    request.method === "GET"
    && path.startsWith("/v1/admin/delivery-audio-jobs/")
    && path.endsWith("/peaks")
  ) {
    return json({
      schemaVersion: "dustwave-player-peaks-v1",
      version: 2,
      channels: 1,
      sample_rate: 16_000,
      samples_per_pixel: 1_000,
      bits: 8,
      length: 8,
      data: [-2, 2, -8, 8, -16, 16, -32, 32, -48, 48, -24, 24, -8, 8, -2, 2]
    });
  }
  return json({ error: "mock_route_not_found", method: request.method, path }, 404);
}

function silentWav() {
  const samples = 8_000;
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8_000, 24);
  bytes.writeUInt32LE(16_000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(samples * 2, 40);
  return bytes;
}

const server = createServer((request, response) => {
  response.setHeader("access-control-allow-origin", websiteOrigin);
  response.setHeader("access-control-allow-credentials", "true");
  response.setHeader(
    "access-control-allow-headers",
    "content-type, x-podcast-csrf"
  );
  response.setHeader(
    "access-control-allow-methods",
    "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  response.setHeader("cache-control", "no-store");
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  const result = responseFor(request);
  for (const [name, value] of Object.entries(result.headers || {})) {
    response.setHeader(name, value);
  }
  response.setHeader("content-type", result.contentType);
  response.writeHead(result.status);
  response.end(request.method === "HEAD" ? undefined : result.body);
});

server.listen(port, host, () => {
  process.stdout.write(
    `Podcast admin mock API listening on http://${host}:${port}`
      + ` (${transcriptCueCount} transcript cues, `
      + `${publicClipMode} public clips)\n`
  );
});
