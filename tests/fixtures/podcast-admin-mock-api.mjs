import { createServer } from "node:http";

const host = "127.0.0.1";
const port = Number(process.env.PODCAST_ADMIN_MOCK_PORT || 4174);
const websiteOrigin =
  process.env.PODCAST_ADMIN_WEBSITE_ORIGIN || "http://127.0.0.1:4173";
const adminRole =
  process.env.PODCAST_ADMIN_MOCK_ROLE === "producer"
    ? "producer"
    : "super_admin";
const sha = (character) => character.repeat(64);

const show = {
  id: "show_opera_en_la_selva",
  slug: "opera-en-la-selva",
  title: "Ópera en la Selva",
  description: "Conversaciones desde la selva, en español y en inglés.",
  descriptionEn: "Conversations from the rainforest, in Spanish and English.",
  language: "es",
  status: "active",
  episodeCount: 1,
  earlyAccessDays: 7,
  premiumEnabled: true,
  freeMiniEpisodeEnabled: true,
  youtubeChannelUrl: "https://www.youtube.com/@dustwavecollective",
  canonicalUrl: "https://dustwave.xyz/podcasts/opera-en-la-selva/"
};

const episode = {
  id: "episode_mock",
  showId: show.id,
  slug: "episodio-de-prueba",
  title: "Episodio de prueba / Test episode",
  summary: "A controlled browser-QA fixture.",
  status: "draft",
  access: "public",
  mediaStatus: "ready",
  sourceLanguage: "es",
  audioFilename: "episode-source.wav",
  publicationRevision: 0,
  publicAt: null,
  canonicalUrl:
    "https://dustwave.xyz/news/podcasts/opera-en-la-selva/episodio-de-prueba/"
};

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

function json(response, status = 200) {
  return {
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(response)
  };
}

function responseFor(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const path = url.pathname;
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
    request.method === "GET"
    && path === `/v1/admin/shows/${show.id}/episodes`
  ) {
    return json({ episodes: [episode] });
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
    && path === `/v1/admin/episodes/${episode.id}/transcripts`
  ) {
    return json({ durationSeconds: 180, transcripts: [] });
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
    && path === `/v1/admin/episodes/${episode.id}/clips`
  ) {
    return json({ clips: [] });
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
    `Podcast admin mock API listening on http://${host}:${port}\n`
  );
});
