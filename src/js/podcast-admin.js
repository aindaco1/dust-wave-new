import { AdminApiClient, AdminApiError } from "./dust-wave-admin-shell/api-client.js?v=0.10.2";
import { AdminDownloadError, requestCredentialedBlob, triggerBlobDownload } from "./dust-wave-admin-shell/credentialed-download.js?v=0.10.2";
import { mountConfirmationDialog } from "./dust-wave-admin-shell/confirmation-dialog.js?v=0.10.2";
import { mountRichTextEditor } from "./dust-wave-admin-shell/editor.js?v=0.10.2";
import { markdownToEditorHtml } from "./dust-wave-admin-shell/editor-codec.js?v=0.10.2";
import {
  clipCueSummary,
  emptyTranscript,
  millisecondsToTimestamp,
  navigateToTranscriptReviewCue,
  newTranscriptCue,
} from "./podcast-admin-transcript-review.js";
import {
  clearTranscriptReviewDiagnostics as clearQa,
  renderTranscriptReviewDiagnostics
} from "./podcast-admin-transcript-diagnostic-navigation.js";
import {
  buildTaggedMarketingUrl,
  createMarketingQr,
  drawQrCanvas,
  qrSvgMarkup,
  safeMarketingFilename
} from "./dust-wave-admin-shell/marketing-assets.js?v=0.10.2";
import { mountSavedMarketingLinks } from "./podcast-admin-marketing-links.js";
import { renderEpisodeCatalog, renderShowCatalog } from "./podcast-admin-catalog.js";
import { mountEpisodePublishWorkflow } from "./podcast-admin-publish-workflow.js";
import { mountProgressiveSections } from "./podcast-admin-progressive-sections.js";
import {
  mountPodcastAdminToolDisclosure
} from "./podcast-admin-tool-disclosure.js";
import { createEpisodePublisher } from "./podcast-admin-publication.js";
import {
  createEpisodeWorkflowNavigator
} from "./podcast-admin-workflow-navigation.js";
import { mountEpisodeEditor } from "./podcast-admin-episode-editor.js";
import { mountShowNotesAssistant } from "./podcast-admin-show-notes.js";
import { mountChapterDraftAssistant } from "./podcast-admin-chapter-draft.js";
import { clipDurationLabel, mountClipDraftAssistant, resolveClipCueRange } from "./podcast-admin-clip-draft.js";
import { renderClipRecipePreview } from "./podcast-admin-clip-preview.js";
import { clipDownloadActionMarkup, mountTranscriptDownloads } from "./podcast-admin-download-actions.js";
import { mountTranscriptCaptionImport } from "./podcast-admin-transcript-import.js";
import { mountTranscriptSearch } from "./podcast-admin-transcript-search.js";
import { mountPodcastReviewDraftGuard } from "./podcast-admin-unsaved-changes.js";
import { syncReviewDraftButton } from "./podcast-admin-dirty-controls.js";
import { adminText, editorLabels } from "./podcast-admin-text.js";
import { ALIGNMENT_WORKFLOW, AUDIO_QC_POLICY_FIELDS, MAXIMUM_ALIGNMENT_BENCHMARK_BYTES, TRANSCRIPTION_CHUNK_WORKFLOW, TRANSCRIPT_CUES_PER_PAGE } from "./podcast-admin-constants.js";
import {
  mountShowSiteProjection,
  needsShowArchiveConfirmation,
  populateShowSettingsForm,
  readShowSettingsPayload
} from "./podcast-admin-show-settings.js";
import { mountRssImportWorkbench } from "./podcast-admin-rss-import.js";
import { buildEpisodeYouTubeControls, handleEpisodeYouTubeApproval, handleEpisodeYouTubeSubmit } from "./podcast-admin-episode-youtube.js";
import { mountYouTubeAudioRenditions } from "./podcast-admin-youtube-audio-renditions.js";
import { mountAudioEnhancementDerivatives } from "./podcast-admin-audio-derivatives.js";
import { mountDeliveryAudio } from "./podcast-admin-delivery-audio.js";
import { mountPodcastAnalytics } from "./podcast-admin-analytics.js";
import { mountClipPublications } from "./podcast-admin-clip-publications.js";
import {
  distributionCertificationList,
  renderDistributionLaunchClaim
} from "./podcast-admin-distribution-certification.js";
import { PasswordlessAdminSession } from "./dust-wave-admin-shell/passwordless-session.js?v=0.10.2";
import { mountAccessibleTabs } from "./dust-wave-admin-shell/tabs.js?v=0.10.2";
import { responsiveTurnstileSize } from "./dust-wave-admin-shell/turnstile.js?v=0.10.2";

const root = document.querySelector("[data-podcast-admin]");
if (root) startPodcastAdmin(root);

function startPodcastAdmin(root) {
  const apiOrigin = root.dataset.apiOrigin;
  const transcriptDownloads = mountTranscriptDownloads(root, adminText);
  const client = new AdminApiClient({
    baseUrl: apiOrigin,
    csrfHeader: "x-podcast-csrf"
  });
  const session = new PasswordlessAdminSession({ client });
  const authPanel = root.querySelector("[data-podcast-auth]");
  const turnstileContainer = root.querySelector("#podcast-turnstile");
  const app = root.querySelector("[data-podcast-app]");
  const logoutButton = root.querySelector("[data-podcast-logout]");
  const globalStatus = root.querySelector("[data-podcast-global-status]");
  const authStatus = root.querySelector("[data-podcast-auth-status]");
  const showCards = root.querySelector("[data-podcast-show-cards]");
  const showForm = root.querySelector("[data-podcast-show-form]");
  const showStatus = root.querySelector("[data-podcast-show-status]");
  const showSelects = Array.from(
    root.querySelectorAll("[data-podcast-show-select]")
  );
  const episodeForm = root.querySelector("[data-podcast-episode-form]");
  const episodeStatus = root.querySelector("[data-podcast-episode-status]");
  const episodeList = root.querySelector("[data-podcast-episode-list]");
  const uploadForm = root.querySelector("[data-podcast-upload-form]");
  const uploadStatus = root.querySelector("[data-podcast-upload-status]");
  const uploadProgress = root.querySelector("[data-podcast-upload-progress]");
  const transcriptWorkbench = root.querySelector(
    "[data-podcast-transcript-workbench]"
  );
  const transcriptEpisodeSelect = root.querySelector(
    "[data-podcast-transcript-episode]"
  );
  const transcriptLanguageSelect = root.querySelector(
    "[data-podcast-transcript-language]"
  );
  const transcriptionQueueButton = root.querySelector(
    "[data-podcast-transcription-queue]"
  );
  const transcriptionRefreshButton = root.querySelector(
    "[data-podcast-transcription-refresh]"
  );
  const transcriptionSummary = root.querySelector(
    "[data-podcast-transcription-summary]"
  );
  const transcriptionStatus = root.querySelector(
    "[data-podcast-transcription-status]"
  );
  const transcriptionJobsRoot = root.querySelector(
    "[data-podcast-transcription-jobs]"
  );
  const transcriptMeta = root.querySelector("[data-podcast-transcript-meta]");
  const transcriptCuesRoot = root.querySelector(
    "[data-podcast-transcript-cues]"
  );
  const transcriptStatus = root.querySelector(
    "[data-podcast-transcript-status]"
  );
  const transcriptAddButton = root.querySelector(
    "[data-podcast-transcript-add]"
  );
  const transcriptSaveButton = root.querySelector(
    "[data-podcast-transcript-save]"
  );
  const transcriptApproveButton = root.querySelector(
    "[data-podcast-transcript-approve]"
  );
  const transcriptPages = root.querySelector(
    "[data-podcast-transcript-pages]"
  );
  const transcriptPageLabel = root.querySelector(
    "[data-podcast-transcript-page]"
  );
  const transcriptPreviousButton = root.querySelector(
    "[data-podcast-transcript-previous]"
  );
  const transcriptNextButton = root.querySelector(
    "[data-podcast-transcript-next]"
  );
  const alignmentAdapterSelect = root.querySelector(
    "[data-podcast-alignment-adapter]"
  );
  const alignmentRefreshButton = root.querySelector(
    "[data-podcast-alignment-refresh]"
  );
  const alignmentQueueButton = root.querySelector(
    "[data-podcast-alignment-queue]"
  );
  const alignmentSummary = root.querySelector(
    "[data-podcast-alignment-summary]"
  );
  const alignmentStatus = root.querySelector(
    "[data-podcast-alignment-status]"
  );
  const alignmentJobsRoot = root.querySelector(
    "[data-podcast-alignment-jobs]"
  );
  const alignmentBenchmarkForm = root.querySelector(
    "[data-podcast-benchmark-form]"
  );
  const alignmentBenchmarkRefresh = root.querySelector(
    "[data-podcast-benchmark-refresh]"
  );
  const alignmentBenchmarkSummary = root.querySelector(
    "[data-podcast-benchmark-summary]"
  );
  const alignmentBenchmarkStatus = root.querySelector(
    "[data-podcast-benchmark-status]"
  );
  const alignmentBenchmarkList = root.querySelector(
    "[data-podcast-benchmark-list]"
  );
  const chapterWorkbench = root.querySelector(
    "[data-podcast-chapter-workbench]"
  );
  const chapterEpisodeSelect = root.querySelector(
    "[data-podcast-chapter-episode]"
  );
  const chapterMeta = root.querySelector("[data-podcast-chapter-meta]");
  const chapterRowsRoot = root.querySelector("[data-podcast-chapter-rows]");
  const chapterStatus = root.querySelector("[data-podcast-chapter-status]");
  const chapterAddButton = root.querySelector("[data-podcast-chapter-add]");
  const chapterSaveButton = root.querySelector("[data-podcast-chapter-save]");
  const chapterApproveButton = root.querySelector(
    "[data-podcast-chapter-approve]"
  );
  const reviewForm = root.querySelector("[data-podcast-review-form]");
  const reviewEpisodeSelect = root.querySelector(
    "[data-podcast-review-episode]"
  );
  const reviewTargetSelect = root.querySelector(
    "[data-podcast-review-target]"
  );
  const reviewStatus = root.querySelector("[data-podcast-review-status]");
  const reviewReadiness = root.querySelector(
    "[data-podcast-review-readiness]"
  );
  const reviewList = root.querySelector("[data-podcast-review-list]");
  const readinessSummary = root.querySelector(
    "[data-podcast-readiness-summary]"
  );
  const readinessGroups = root.querySelector(
    "[data-podcast-readiness-groups]"
  );
  const readinessStatus = root.querySelector(
    "[data-podcast-readiness-status]"
  );
  const readinessRefresh = root.querySelector(
    "[data-podcast-readiness-refresh]"
  );
  const audioQcEpisodeSelect = root.querySelector(
    "[data-podcast-audio-qc-episode]"
  );
  const audioQcQueue = root.querySelector("[data-podcast-audio-qc-queue]");
  const audioQcRefresh = root.querySelector(
    "[data-podcast-audio-qc-refresh]"
  );
  const audioQcSummary = root.querySelector(
    "[data-podcast-audio-qc-summary]"
  );
  const audioQcResults = root.querySelector(
    "[data-podcast-audio-qc-results]"
  );
  const audioQcStatus = root.querySelector("[data-podcast-audio-qc-status]");
  const audioQcPolicyForm = root.querySelector(
    "[data-podcast-audio-qc-policy-form]"
  );
  const audioQcPolicySummary = root.querySelector(
    "[data-podcast-audio-qc-policy-summary]"
  );
  const audioQcPolicyStatus = root.querySelector(
    "[data-podcast-audio-qc-policy-status]"
  );
  const audioMasterEpisodeSelect = root.querySelector(
    "[data-podcast-audio-master-episode]"
  );
  const audioMasterRefresh = root.querySelector(
    "[data-podcast-audio-master-refresh]"
  );
  const audioMasterSummary = root.querySelector(
    "[data-podcast-audio-master-summary]"
  );
  const audioMasterCurrent = root.querySelector(
    "[data-podcast-audio-master-current]"
  );
  const audioMasterApprovalForm = root.querySelector(
    "[data-podcast-audio-master-approval]"
  );
  const audioMasterApprovalStatus = root.querySelector(
    "[data-podcast-audio-master-approval-status]"
  );
  const audioEnhancementForm = root.querySelector(
    "[data-podcast-audio-enhancement-form]"
  );
  const audioEnhancementStatus = root.querySelector(
    "[data-podcast-audio-enhancement-status]"
  );
  const audioEnhancementResults = root.querySelector(
    "[data-podcast-audio-enhancement-results]"
  );
  const clipForm = root.querySelector("[data-podcast-clip-form]");
  const clipPreview = root.querySelector("[data-podcast-clip-preview]");
  const clipStatus = root.querySelector("[data-podcast-clip-status]");
  const clipList = root.querySelector("[data-podcast-clip-list]");
  const clipNewButton = root.querySelector("[data-podcast-clip-new]");
  const clipRenderButton = root.querySelector("[data-podcast-clip-render]");
  const clipLibraryFilters = root.querySelector(
    "[data-podcast-clip-library-filters]"
  );
  const clipLibraryStatus = root.querySelector(
    "[data-podcast-clip-library-status]"
  );
  const clipLibrary = root.querySelector("[data-podcast-clip-library]");
  const clipYouTubeForm = root.querySelector(
    "[data-podcast-clip-youtube-form]"
  );
  const clipYouTubeMeta = root.querySelector(
    "[data-podcast-clip-youtube-meta]"
  );
  const clipYouTubeStatus = root.querySelector(
    "[data-podcast-clip-youtube-status]"
  );
  const clipYouTubeApprove = root.querySelector(
    "[data-podcast-clip-youtube-approve]"
  );
  const marketingLinkForm = root.querySelector(
    "[data-podcast-marketing-link-form]"
  );
  const marketingQr = root.querySelector("[data-podcast-marketing-qr]");
  const marketingPreviewTitle = root.querySelector(
    "[data-podcast-marketing-preview-title]"
  );
  const marketingPreviewUrl = root.querySelector(
    "[data-podcast-marketing-preview-url]"
  );
  const marketingLinkStatus = root.querySelector(
    "[data-podcast-marketing-link-status]"
  );
  const marketingLinkSave = root.querySelector(
    "[data-podcast-marketing-save]"
  );
  const marketingLinkCancel = root.querySelector(
    "[data-podcast-marketing-cancel]"
  );
  const marketingLinksRoot = root.querySelector(
    "[data-podcast-marketing-links]"
  );
  const marketingLinksStatus = root.querySelector(
    "[data-podcast-marketing-links-status]"
  );
  const marketingLinksMore = root.querySelector(
    "[data-podcast-marketing-links-more]"
  );
  const embedForm = root.querySelector("[data-podcast-embed-form]");
  const embedPreview = root.querySelector("[data-podcast-embed-preview]");
  const embedStatus = root.querySelector("[data-podcast-embed-status]");
  const embedCopyButton = root.querySelector("[data-podcast-embed-copy]");
  const embedOpenLink = root.querySelector("[data-podcast-embed-open]");
  const shareCardForm = root.querySelector("[data-podcast-share-card-form]");
  const shareCardPreview = root.querySelector(
    "[data-podcast-share-card-preview]"
  );
  const shareCardStatus = root.querySelector(
    "[data-podcast-share-card-status]"
  );
  const shareCardCopyButton = root.querySelector(
    "[data-podcast-share-card-copy]"
  );
  const shareCardDownloadLink = root.querySelector(
    "[data-podcast-share-card-download]"
  );
  const shareCardOpenLink = root.querySelector(
    "[data-podcast-share-card-open]"
  );
  const announcementForm = root.querySelector(
    "[data-podcast-announcement-form]"
  );
  const announcementStatus = root.querySelector(
    "[data-podcast-announcement-status]"
  );
  const announcementReview = root.querySelector(
    "[data-podcast-announcement-review]"
  );
  const announcementApprove = root.querySelector(
    "[data-podcast-announcement-approve]"
  );
  const announcementHistory = root.querySelector(
    "[data-podcast-announcement-history]"
  );
  const announcementHistoryStatus = root.querySelector(
    "[data-podcast-announcement-history-status]"
  );
  const announcementHistoryRefresh = root.querySelector(
    "[data-podcast-announcement-history-refresh]"
  );
  const adPlanForm = root.querySelector("[data-podcast-ad-plan-form]");
  const adPlanStatus = root.querySelector("[data-podcast-ad-plan-status]");
  const adPlanResult = root.querySelector("[data-podcast-ad-plan-result]");
  const distributionRoot = root.querySelector("[data-podcast-distribution]");
  const distributionFilter = root.querySelector(
    "[data-podcast-distribution-filter]"
  );
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
  const sponsorForm = root.querySelector("[data-podcast-sponsor-preview-form]");
  const sponsorStatus = root.querySelector("[data-podcast-sponsor-status]");
  const sponsorResult = root.querySelector("[data-podcast-sponsor-preview-result]");
  const campaignForm = root.querySelector("[data-podcast-campaign-form]");
  const campaignStatus = root.querySelector("[data-podcast-campaign-status]");
  const campaignList = root.querySelector("[data-podcast-campaign-list]");
  const creativeForm = root.querySelector("[data-podcast-creative-form]");
  const creativeStatus = root.querySelector("[data-podcast-creative-status]");
  const creativeProgress = root.querySelector("[data-podcast-creative-progress]");
  let shows = [];
  let episodes = [];
  let adminIdentity = null;
  let campaigns = [];
  let distributionRequestId = 0;
  let billingRequestId = 0;
  let subscriberRows = [];
  let subscriberSummary = null;
  let subscriberCursor = null;
  let subscriberLoading = false;
  let subscriberRequestId = 0;
  let selectedShowId = "";
  let canManageCampaigns = false;
  let canManageCreatives = false;
  let canManageAdPlans = false;
  let canEditTranscripts = false;
  let canApproveTranscripts = false;
  let canEditChapters = false;
  let canApproveChapters = false;
  let canEditReviews = false;
  let canApproveReviews = false;
  let canRunAudioQc = false;
  let canManageAudioQcPolicy = false;
  let canApproveAudioMasters = false;
  let canRunAudioEnhancements = false;
  let canApproveClipYouTube = false;
  let canImportAlignmentBenchmarks = false;
  let transcript = null;
  let transcriptionState = null;
  let transcriptionRequestId = 0;
  let alignmentState = null;
  let alignmentRequestId = 0;
  let alignmentBenchmarkState = null;
  let alignmentBenchmarkRequestId = 0;
  let transcriptDurationSeconds = null;
  let transcriptRequestId = 0;
  let transcriptDirty = false;
  let transcriptPage = 0;
  const transcriptEditors = new Map();
  let chapterSet = null;
  let chapterRequestId = 0;
  let chapterDirty = false;
  let productionReviews = null;
  let reviewRequestId = 0;
  let publicationReadiness = null;
  let readinessRequestId = 0;
  let audioQcState = null;
  let audioQcRequestId = 0;
  let audioQcPolicy = null;
  let audioQcPolicyRequestId = 0;
  let audioMasterState = null;
  let audioMasterRequestId = 0;
  let clips = [];
  let selectedClipId = "";
  let clipRequestId = 0;
  let clipLibraryRows = [];
  let clipLibraryCursor = null;
  let clipLibraryLoading = false;
  let clipLibraryRequestId = 0;
  let selectedClipYouTube = null;
  let clipYouTubePublicationId = "";
  let marketingTaggedUrl = "";
  let marketingCurrentQr = null;
  let latestAnnouncementReview = null;
  let announcementHistoryRequestId = 0;
  let latestProcessorManifest = null;
  let episodeProgressiveTools = null;
  let turnstileToken = "";
  let turnstileWidgetId;
  let turnstileInitialization;

  const transcriptImport = mountTranscriptCaptionImport({
    root,
    text: adminText,
    canEdit: () => canEditTranscripts && Boolean(transcript),
    hasExistingContent: () => Boolean(
      transcriptDirty
      || Number(transcript?.revision || 0) > 0
      || transcript?.cues?.some(({ textMarkdown }) =>
        String(textMarkdown || "").trim()
      )
    ),
    getLanguage: () => transcriptLanguageSelect?.value || "es",
    getMaximumEndMs: () => transcriptDurationSeconds === null
      ? null
      : Math.round(transcriptDurationSeconds * 1_000),
    getContextKey: () => [
      transcriptEpisodeSelect?.value,
      transcriptLanguageSelect?.value,
      transcriptRequestId
    ].join(":"),
    applyImport({ cues }) {
      if (!transcript || !canEditTranscripts) return;
      transcript.cues = cues;
      transcriptPage = 0;
      transcriptDirty = true;
      renderTranscript();
    }
  });
  const transcriptSearch = mountTranscriptSearch({
    root,
    text: adminText,
    getCues: () => transcript
      ? syncVisibleTranscriptCues({ requireText: false })
      : [],
    getLanguage: () => transcriptLanguageSelect?.value || "es",
    onOpenCue: openTranscriptCue,
    formatError: transcriptInputError
  });
  const reviewDraftGuard = mountPodcastReviewDraftGuard({
    showSelects, transcriptEpisodeSelect, transcriptLanguageSelect,
    chapterEpisodeSelect, logoutButton,
    hasTranscriptChanges: () => transcriptDirty,
    hasChapterChanges: () => chapterDirty,
    discardTranscriptChanges: () => { transcriptDirty = false; },
    discardChapterChanges: () => { chapterDirty = false; },
    loadTranscript, loadChapters,
    message: () => adminText("discardUnsavedReviewChanges")
  });
  const rssImport = mountRssImportWorkbench({
    root,
    client,
    text: adminText,
    formatInteger,
    formatDate,
    isSuperAdmin,
    selectedShowId: () => selectedShowId,
    selectedShowLanguage: () =>
      shows.find(({ id }) => id === selectedShowId)?.language || "es",
    friendlyError,
    setStatus
  });
  const clipPublications = mountClipPublications({
    root,
    client,
    text: adminText,
    setStatus,
    friendlyError,
    findClip: (clipId) =>
      [...clipLibraryRows, ...clips].find(({ id }) => id === clipId),
    applyPublication: applyClipPublication,
    renderClips() {
      renderClipList();
      renderClipLibrary();
    },
    canApprove: () => canApproveClipYouTube
  });
  const notesEditorLabel = adminText("editorEpisodeNotes");
  const notesEditor = mountRichTextEditor(
    root.querySelector("[data-podcast-notes-editor]"),
    {
      label: notesEditorLabel,
      labels: editorLabels(notesEditorLabel)
    }
  );
  const showNotesAssistant = mountShowNotesAssistant({
    root: root.querySelector("[data-podcast-show-notes]"),
    notesEditor,
    client,
    text: adminText,
    setStatus,
    friendlyError
  });
  const chapterDraftAssistant = mountChapterDraftAssistant({
    root: root.querySelector("[data-podcast-chapter-draft]"),
    client,
    text: adminText,
    setStatus,
    friendlyError,
    hasExistingChapters: () => Boolean(
      chapterDirty
      || Number(chapterSet?.revision || 0) > 0
      || chapterSet?.chapters?.some(({ title }) => String(title || "").trim())
    ),
    applyChapters(chapters) {
      if (!chapterSet || !canEditChapters) return;
      chapterSet.chapters = chapters;
      chapterDirty = true;
      renderChapters();
    }
  });
  const clipDraftAssistant = mountClipDraftAssistant({
    root: root.querySelector("[data-podcast-clip-draft]"),
    client,
    text: adminText,
    setStatus,
    friendlyError,
    form: clipForm,
    selectedRecipeId: () => selectedClipId,
    clearSelectedRecipe: () => { selectedClipId = ""; },
    fillCueSelects: fillClipCueSelects,
    refreshRecipe: refreshClipRecipe
  });
  const episodeEditor = mountEpisodeEditor({
    form: episodeForm,
    list: episodeList,
    notesEditor,
    client,
    text: adminText,
    setStatus,
    friendlyError,
    getSelectedShowId: () => selectedShowId,
    getShows: () => shows,
    canEdit: () => canManageCreatives,
    onModeChange({ episodeId, sourceLanguage }) {
      showNotesAssistant.setEpisode(episodeId, sourceLanguage);
      if (episodeId) episodeProgressiveTools?.openFor(episodeForm);
    },
    onPermissionsChange({ editable }) {
      showNotesAssistant.setEditable(editable);
    },
    onSaved: loadShows
  });
  const announcementEditorLabel = adminText("editorAnnouncementContent");
  const announcementEditor = mountRichTextEditor(
    root.querySelector("[data-podcast-announcement-editor]"),
    {
      label: announcementEditorLabel,
      labels: editorLabels(announcementEditorLabel),
      onChange() {
        invalidateAnnouncementReview();
      }
    }
  );
  const savedMarketingLinks = mountSavedMarketingLinks({
    client,
    form: marketingLinkForm,
    saveButton: marketingLinkSave,
    cancelButton: marketingLinkCancel,
    listRoot: marketingLinksRoot,
    listStatus: marketingLinksStatus,
    loadMoreButton: marketingLinksMore,
    refreshButton: root.querySelector(
      "[data-podcast-marketing-links-refresh]"
    ),
    getShow: () => shows.find(({ id }) => id === selectedShowId) || null,
    canWrite: canOperateSelectedShowPublication,
    text: adminText,
    setStatus,
    friendlyError,
    applyLink: applySavedMarketingLinkFields,
    resetBuilder: resetMarketingLinkForm,
    downloadQr: downloadMarketingQr
  });
  const youtubeAudioRenditions = mountYouTubeAudioRenditions({
    root,
    client,
    text: adminText,
    setStatus,
    friendlyError,
    canQueue: () => canRunAudioQc
  });
  const deliveryAudio = mountDeliveryAudio({
    root,
    client,
    text: adminText,
    setStatus,
    friendlyError,
    operationId,
    buildPlayer: buildPrivatePodcastPlayer,
    localizeCode: localizedCode,
    canQueue: () => canRunAudioQc,
    canApprove: () => canApproveAudioMasters,
    onApproved: async (episodeId) => {
      await Promise.all([
        loadEpisodes(),
        loadPublicationReadiness(episodeId)
      ]);
    }
  });
  const audioDerivatives = mountAudioEnhancementDerivatives({
    root,
    client,
    text: adminText,
    setStatus,
    friendlyError,
    operationId,
    buildPlayer: buildPrivatePodcastPlayer,
    localizeCode: localizedCode,
    canQueue: () => canRunAudioEnhancements,
    canApprove: () => canApproveAudioMasters,
    onDecided: async (episodeId) => {
      await Promise.all([
        loadAudioMaster(),
        loadProductionReviews(),
        loadPublicationReadiness(episodeId)
      ]);
    }
  });
  const podcastAnalytics = mountPodcastAnalytics({
    root,
    client,
    apiOrigin,
    getShow: () => shows.find(({ id }) => id === selectedShowId) || null,
    text: adminText,
    setStatus,
    friendlyError
  });
  const showSiteProjection = mountShowSiteProjection({
    root,
    client,
    text: adminText,
    setStatus,
    friendlyError,
    canPublish: () => (adminIdentity?.roles || []).some(
      ({ role }) => role === "super_admin"
    )
  });
  const confirmationDialog = mountConfirmationDialog(root, {
    cancelLabel: adminText("dialogCancel"),
    confirmLabel: adminText("dialogConfirm"),
    requiredMessage: adminText("dialogRequired")
  });
  const publishEpisode = createEpisodePublisher({
    client,
    confirmationDialog,
    text: adminText,
    nodeLabel: localizedReadinessNodeLabel,
    operationId,
    report(message, error = false) {
      setStatus(episodeStatus, message, error);
    },
    friendlyError,
    humanizeCode,
    onReadiness(episodeId, readiness) {
      if (episodeId !== reviewEpisodeSelect?.value) return;
      publicationReadiness = readiness;
      renderPublicationReadiness();
    },
    async onPublished(episodeId) {
      await loadEpisodes();
      if (distributionFilter) {
        distributionFilter.elements.episodeId.value = episodeId;
      }
      await loadDistribution(episodeId);
    }
  });
  const adminTabs = mountAccessibleTabs(
    root.querySelector("[data-podcast-tabs]"),
    {
      responsiveSelect: {
        id: "podcast-admin-mobile-tabs"
      },
      storageKey: "dustwave-podcast-admin-tab",
      onSelect(tab) {
        if (tab !== "production") pauseClipMediaPlayers(clipList);
        if (tab !== "marketing") pauseClipMediaPlayers(clipLibrary);
        if (tab === "production") {
          loadAudioQcPolicy();
          loadAudioQc();
          loadAudioMaster();
          loadTranscript();
          loadAlignmentBenchmarks();
          loadChapters();
          loadProductionReviews();
          deliveryAudio.refresh();
          youtubeAudioRenditions.refresh();
        }
        if (tab === "distribution") loadDistribution();
        if (tab === "marketing") {
          updateMarketingTools();
          loadClipLibrary({ reset: true });
          loadAnnouncementHistory();
          savedMarketingLinks.load({ reset: true });
        }
        if (tab === "subscribers") loadSubscribers({ reset: true });
        if (tab === "billing") loadBilling();
        if (tab === "sponsors") loadCampaigns();
        if (tab === "analytics") podcastAnalytics.load();
      }
    }
  );
  episodeProgressiveTools = mountPodcastAdminToolDisclosure({
    root,
    text: adminText,
    episodeForm,
    uploadForm,
    adPlanForm,
    adPlanResult,
    audioQcPolicyForm,
    marketingLinkForm,
    embedForm,
    shareCardForm,
    announcementForm,
    announcementHistory,
    campaignForm,
    creativeForm
  });
  const navigateEpisodeWorkflow = createEpisodeWorkflowNavigator({
    root,
    tabs: adminTabs,
    episodeList,
    episodeForm,
    adPlanForm,
    audioQcEpisodeSelect,
    audioMasterEpisodeSelect,
    transcriptEpisodeSelect,
    chapterEpisodeSelect,
    transcriptWorkbench,
    reviewEpisodeSelect,
    loadProductionReviews,
    loadPublicationReadiness
  });
  const episodePublishWorkflow = mountEpisodePublishWorkflow({
    root: root.querySelector("[data-podcast-publish-workflow]"),
    client,
    text: adminText,
    nodeLabel: localizedReadinessNodeLabel,
    onNavigate: navigateEpisodeWorkflow,
    onPublish: publishEpisode
  });
  mountProgressiveSections(
    root.querySelector("#podcast-panel-production"),
    { label: adminText("productionSectionsAria") }
  );

  root.querySelector("[data-podcast-refresh]")?.addEventListener("click", loadShows);
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
  distributionRoot?.addEventListener("click", handleDistributionClick);
  distributionRoot?.addEventListener(
    "submit",
    updateDistributionDestination
  );
  distributionRoot?.addEventListener(
    "submit",
    updateDirectoryObservation
  );
  distributionRoot?.addEventListener(
    "submit",
    (event) => handleEpisodeYouTubeSubmit({
      event,
      canPrepare: canOperateSelectedShowPublication(),
      canReconcile: canApproveClipYouTube,
      client,
      text: adminText,
      setStatus,
      friendlyError,
      loadDistribution
    })
  );
  distributionFilter?.elements.episodeId?.addEventListener(
    "change",
    () => loadDistribution()
  );
  root.querySelector("[data-podcast-login-form]")?.addEventListener("submit", startLogin);
  logoutButton?.addEventListener("click", logout);
  for (const showSelect of showSelects) {
    showSelect.addEventListener("change", async () => {
      selectedShowId = showSelect.value;
      fillShowSelect();
      if (distributionFilter) {
        distributionFilter.elements.episodeId.value = "";
      }
      clipPublications.close();
      closeClipYouTubeForm();
      clearClipLibraryState();
      rssImport.reset({ form: true });
      fillShowForm();
      updateMarketingTools({ showChanged: true });
      await Promise.all([loadEpisodes(), loadCampaigns()]);
      const marketingPanel = root.querySelector("#podcast-panel-marketing");
      if (marketingPanel && !marketingPanel.hidden) {
        await Promise.all([
          loadClipLibrary({ reset: true }),
          loadAnnouncementHistory(),
          savedMarketingLinks.load({ reset: true })
        ]);
      }
      const analyticsPanel = root.querySelector("#podcast-panel-analytics");
      if (analyticsPanel && !analyticsPanel.hidden) {
        await podcastAnalytics.load();
      }
      const distributionPanel = root.querySelector(
        "#podcast-panel-distribution"
      );
      if (distributionPanel && !distributionPanel.hidden) {
        await loadDistribution();
      }
      const billingPanel = root.querySelector("#podcast-panel-billing");
      if (billingPanel && !billingPanel.hidden) {
        await loadBilling();
      }
      const subscribersPanel = root.querySelector(
        "#podcast-panel-subscribers"
      );
      if (subscribersPanel && !subscribersPanel.hidden) {
        await loadSubscribers({ reset: true });
      }
    });
  }
  showForm?.addEventListener("submit", saveShow);
  uploadForm?.addEventListener("submit", uploadMedia);
  transcriptionQueueButton?.addEventListener(
    "click",
    queueTranscription
  );
  transcriptionRefreshButton?.addEventListener(
    "click",
    loadTranscript
  );
  alignmentRefreshButton?.addEventListener("click", loadAlignmentJobs);
  alignmentAdapterSelect?.addEventListener("change", renderAlignmentJobs);
  alignmentQueueButton?.addEventListener("click", queueAlignment);
  alignmentJobsRoot?.addEventListener("click", approveAlignment);
  alignmentBenchmarkRefresh?.addEventListener(
    "click",
    loadAlignmentBenchmarks
  );
  alignmentBenchmarkForm?.addEventListener(
    "submit",
    importAlignmentBenchmark
  );
  transcriptAddButton?.addEventListener("click", addTranscriptCue);
  transcriptSaveButton?.addEventListener("click", saveTranscript);
  transcriptApproveButton?.addEventListener("click", approveTranscript);
  transcriptPreviousButton?.addEventListener("click", () =>
    moveTranscriptPage(-1)
  );
  transcriptNextButton?.addEventListener("click", () =>
    moveTranscriptPage(1)
  );
  chapterAddButton?.addEventListener("click", addChapter);
  chapterSaveButton?.addEventListener("click", saveChapters);
  chapterApproveButton?.addEventListener("click", approveChapters);
  chapterRowsRoot?.addEventListener("input", markChaptersDirty);
  chapterRowsRoot?.addEventListener("change", markChaptersDirty);
  chapterRowsRoot?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-podcast-chapter-remove]");
    if (button) removeChapter(button.dataset.podcastChapterRemove);
  });
  reviewEpisodeSelect?.addEventListener("change", loadProductionReviews);
  reviewForm?.addEventListener("submit", createProductionReviewComment);
  reviewList?.addEventListener("change", handleProductionReviewChange);
  reviewList?.addEventListener("click", handleProductionReviewClick);
  readinessRefresh?.addEventListener("click", () =>
    loadPublicationReadiness()
  );
  audioQcEpisodeSelect?.addEventListener("change", loadAudioQc);
  audioQcQueue?.addEventListener("click", queueAudioQc);
  audioQcRefresh?.addEventListener("click", loadAudioQc);
  audioQcPolicyForm?.addEventListener("submit", saveAudioQcPolicy);
  audioMasterEpisodeSelect?.addEventListener("change", loadAudioMaster);
  audioMasterRefresh?.addEventListener("click", loadAudioMaster);
  audioMasterApprovalForm?.addEventListener(
    "submit",
    approveSourceWorkingMaster
  );
  audioEnhancementForm?.addEventListener(
    "submit",
    queueAudioEnhancementPreview
  );
  clipForm?.addEventListener("submit", saveClipRecipe);
  clipNewButton?.addEventListener("click", resetClipRecipe);
  clipRenderButton?.addEventListener("click", prepareClipRender);
  clipForm?.elements.startCueId?.addEventListener(
    "change",
    refreshClipRecipe
  );
  clipForm?.elements.endCueId?.addEventListener(
    "change",
    refreshClipRecipe
  );
  clipForm?.elements.aspectRatio?.addEventListener(
    "change",
    refreshClipRecipe
  );
  clipList?.addEventListener("click", (event) => {
    handleClipAction(event, { editable: true });
  });
  clipLibraryFilters?.addEventListener("submit", (event) => {
    event.preventDefault();
    loadClipLibrary({ reset: true });
  });
  clipLibraryFilters?.addEventListener("change", () => {
    loadClipLibrary({ reset: true });
  });
  clipLibrary?.addEventListener("click", (event) => {
    if (handleClipAction(event)) return;
    if (event.target.closest("[data-podcast-clip-library-more]")) {
      loadClipLibrary({ reset: false });
    }
  });
  clipYouTubeForm?.addEventListener("submit", saveClipYouTubeDraft);
  clipYouTubeApprove?.addEventListener(
    "click",
    approveClipYouTubePublication
  );
  clipYouTubeForm
    ?.querySelector("[data-podcast-clip-youtube-close]")
    ?.addEventListener("click", closeClipYouTubeForm);
  marketingLinkForm?.addEventListener("input", updateMarketingLink);
  root.querySelector("[data-podcast-marketing-copy]")?.addEventListener(
    "click",
    copyMarketingLink
  );
  root.querySelector("[data-podcast-marketing-share]")?.addEventListener(
    "click",
    shareMarketingLink
  );
  root.querySelector("[data-podcast-marketing-qr-png]")?.addEventListener(
    "click",
    () => downloadMarketingQr("png")
  );
  root.querySelector("[data-podcast-marketing-qr-svg]")?.addEventListener(
    "click",
    () => downloadMarketingQr("svg")
  );
  embedForm?.addEventListener("submit", (event) => event.preventDefault());
  embedForm?.elements.episodeId?.addEventListener(
    "change",
    updatePodcastEmbed
  );
  embedCopyButton?.addEventListener("click", copyPodcastEmbed);
  shareCardForm?.addEventListener(
    "submit",
    (event) => event.preventDefault()
  );
  shareCardForm?.elements.episodeId?.addEventListener(
    "change",
    updatePodcastShareCard
  );
  shareCardCopyButton?.addEventListener("click", copyPodcastShareCardUrl);
  announcementForm?.addEventListener(
    "submit",
    runAnnouncementDryRun
  );
  announcementForm?.addEventListener("input", () => {
    invalidateAnnouncementReview();
  });
  announcementApprove?.addEventListener("click", approveAnnouncement);
  announcementHistoryRefresh?.addEventListener(
    "click",
    loadAnnouncementHistory
  );
  transcriptCuesRoot?.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-podcast-transcript-remove]");
    if (remove) removeTranscriptCue(remove.dataset.podcastTranscriptRemove);
  });
  adPlanForm?.addEventListener("submit", submitAdPlan);
  adPlanForm?.elements.episodeId?.addEventListener("change", () => loadAdPlan());
  adPlanForm?.elements.midRoll?.addEventListener("change", updateAdPlanFields);
  adPlanResult?.addEventListener("click", handleAdPlanAction);
  sponsorForm?.addEventListener("submit", previewSponsorDecision);
  campaignForm?.addEventListener("submit", createCampaign);
  campaignForm?.elements.campaignType?.addEventListener(
    "change",
    updateDirectSponsorFields
  );
  creativeForm?.addEventListener("submit", uploadCreative);
  campaignList?.addEventListener("click", handleCampaignAction);
  episodeList?.addEventListener("click", async (event) => {
    const review = event.target.closest("[data-review-episode]");
    if (review) {
      episodePublishWorkflow.selectEpisode(review.dataset.reviewEpisode);
      return;
    }
    const button = event.target.closest("[data-publish-episode]");
    if (!button) return;
    await publishEpisode(button.dataset.publishEpisode, button);
  });

  initializeCampaignForm();
  updateAdPlanFields();
  restoreOrExchange();

  async function restoreOrExchange() {
    setStatus(
      globalStatus,
      adminText("checkingSession")
    );
    try {
      const token = session.tokenFromFragment();
      const result = token ? await session.exchange(token) : await session.restore();
      if (token) session.clearFragment();
      showAuthenticated(result.identity);
      await Promise.all([loadShows(), loadAlignmentBenchmarks()]);
      setStatus(globalStatus, "");
    } catch (error) {
      showLoggedOut();
      setStatus(globalStatus, error instanceof AdminApiError && error.status === 401
        ? ""
        : friendlyError(error));
    }
  }

  async function startLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    setStatus(
      authStatus,
      adminText("sendingLink")
    );
    try {
      await session.start({
        email: form.elements.email.value,
        turnstileToken,
        preferredLanguage: document.documentElement.lang || "en"
      });
      setStatus(
        authStatus,
        adminText(
          "linkSent"
        )
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
    } catch (error) {
      setStatus(globalStatus, friendlyError(error), true);
    } finally {
      logoutButton.disabled = false;
      showLoggedOut();
    }
  }

  function showAuthenticated(identity) {
    adminIdentity = identity || null;
    authPanel.hidden = true;
    app.hidden = false;
    logoutButton.hidden = false;
    const roles = (identity?.roles || [])
      .map(({ role }) =>
        adminText(`role_${role}`, role.replaceAll("_", " "))
      )
      .join(", ");
    canManageCampaigns = (identity?.roles || []).some(({ role }) =>
      role === "super_admin" || role === "admin"
    );
    canManageCreatives = (identity?.roles || []).some(({ role }) =>
      ["super_admin", "admin", "producer"].includes(role)
    );
    canManageAdPlans = canManageCreatives;
    canEditTranscripts = canManageCreatives;
    canEditChapters = canManageCreatives;
    canEditReviews = canManageCreatives;
    canRunAudioQc = canManageCreatives;
    canManageAudioQcPolicy = (identity?.roles || []).some(({ role }) =>
      role === "super_admin" || role === "admin"
    );
    canApproveAudioMasters = (identity?.roles || []).some(({ role }) =>
      role === "super_admin"
    );
    canRunAudioEnhancements = canRunAudioQc;
    canApproveTranscripts = (identity?.roles || []).some(({ role }) =>
      role === "super_admin" || role === "admin"
    );
    canApproveChapters = canApproveTranscripts;
    canApproveReviews = canApproveTranscripts;
    canApproveClipYouTube = (identity?.roles || []).some(({ role }) =>
      role === "super_admin"
    );
    canImportAlignmentBenchmarks = canApproveClipYouTube;
    campaignForm.hidden = !canManageCampaigns;
    creativeForm.hidden = !canManageCreatives;
    adPlanForm.hidden = !canManageAdPlans;
    if (alignmentBenchmarkForm) {
      alignmentBenchmarkForm.hidden = !canImportAlignmentBenchmarks;
    }
    episodeEditor.refreshPermissions();
    chapterDraftAssistant.setEditable(canEditChapters);
    clipDraftAssistant.setEditable(canEditTranscripts);
    root.querySelector("[data-podcast-session-summary]").textContent =
      adminText("authenticated", { roles: roles ? ` — ${roles}` : "" });
  }

  function showLoggedOut() {
    authPanel.hidden = false;
    app.hidden = true;
    logoutButton.hidden = true;
    shows = [];
    episodes = [];
    episodeEditor.setEpisodes([]);
    episodeEditor.setShow("");
    adminIdentity = null;
    campaigns = [];
    podcastAnalytics.reset();
    deliveryAudio.reset();
    distributionRequestId += 1;
    billingRequestId += 1;
    subscriberRows = [];
    subscriberSummary = null;
    subscriberCursor = null;
    subscriberLoading = false;
    subscriberRequestId += 1;
    canManageCampaigns = false;
    canManageCreatives = false;
    canManageAdPlans = false;
    canEditTranscripts = false;
    canApproveTranscripts = false;
    canEditChapters = false;
    canApproveChapters = false;
    canEditReviews = false;
    canApproveReviews = false;
    canRunAudioQc = false;
    canManageAudioQcPolicy = false;
    canApproveAudioMasters = false;
    canRunAudioEnhancements = false;
    canApproveClipYouTube = false;
    canImportAlignmentBenchmarks = false;
    chapterDraftAssistant.setEditable(false);
    chapterDraftAssistant.setEpisode("");
    clipDraftAssistant.setEditable(false);
    clipDraftAssistant.setTranscript("", null);
    rssImport.reset({ form: true });
    rssImport.setShow(false);
    initializeTurnstile();
    latestAnnouncementReview = null;
    announcementHistoryRequestId += 1;
    announcementReview?.replaceChildren();
    announcementHistory?.replaceChildren();
    savedMarketingLinks.reset();
    if (announcementApprove) announcementApprove.hidden = true;
    setStatus(announcementHistoryStatus, "");
    transcript = null;
    transcriptionState = null;
    transcriptionRequestId += 1;
    alignmentState = null;
    alignmentRequestId += 1;
    alignmentBenchmarkState = null;
    alignmentBenchmarkRequestId += 1;
    transcriptDurationSeconds = null;
    transcriptDirty = false;
    transcriptPage = 0;
    transcriptRequestId += 1;
    transcriptEditors.clear();
    transcriptSearch.reset();
    transcriptSearch.setState({ available: false });
    transcriptCuesRoot?.replaceChildren();
    clearQa(root);
    transcriptMeta?.replaceChildren();
    transcriptionSummary?.replaceChildren();
    transcriptionJobsRoot?.replaceChildren();
    alignmentSummary?.replaceChildren();
    alignmentJobsRoot?.replaceChildren();
    alignmentBenchmarkList?.replaceChildren();
    if (alignmentBenchmarkSummary) {
      alignmentBenchmarkSummary.textContent = adminText(
        "noBenchmarkLoaded"
      );
    }
    if (alignmentBenchmarkForm) {
      alignmentBenchmarkForm.hidden = true;
      alignmentBenchmarkForm.reset();
    }
    setStatus(transcriptionStatus, "");
    setStatus(alignmentStatus, "");
    setStatus(alignmentBenchmarkStatus, "");
    if (transcriptPages) transcriptPages.hidden = true;
    setStatus(transcriptStatus, "");
    chapterSet = null;
    chapterDirty = false;
    chapterRequestId += 1;
    chapterRowsRoot?.replaceChildren();
    chapterMeta?.replaceChildren();
    setStatus(chapterStatus, "");
    productionReviews = null;
    reviewRequestId += 1;
    publicationReadiness = null;
    readinessRequestId += 1;
    reviewTargetSelect?.replaceChildren();
    reviewList?.replaceChildren();
    reviewReadiness?.replaceChildren();
    readinessGroups?.replaceChildren();
    if (readinessSummary) readinessSummary.textContent = "";
    setStatus(readinessStatus, "");
    audioQcState = null;
    audioQcRequestId += 1;
    audioQcPolicy = null;
    audioQcPolicyRequestId += 1;
    audioQcResults?.replaceChildren();
    if (audioQcSummary) audioQcSummary.textContent = "";
    setStatus(audioQcStatus, "");
    if (audioQcPolicyForm) audioQcPolicyForm.hidden = true;
    if (audioQcPolicySummary) audioQcPolicySummary.textContent = "";
    setStatus(audioQcPolicyStatus, "");
    audioMasterState = null;
    audioMasterRequestId += 1;
    releaseAudioMasterPlayers();
    audioMasterCurrent?.replaceChildren();
    audioEnhancementResults?.replaceChildren();
    audioDerivatives.reset();
    if (audioMasterSummary) audioMasterSummary.textContent = "";
    if (audioMasterApprovalForm) audioMasterApprovalForm.hidden = true;
    if (audioEnhancementForm) audioEnhancementForm.hidden = true;
    setStatus(audioMasterApprovalStatus, "");
    setStatus(audioEnhancementStatus, "");
    reviewForm?.reset();
    setStatus(reviewStatus, "");
    clips = [];
    selectedClipId = "";
    clipRequestId += 1;
    clipForm?.reset();
    releaseClipMediaPlayers(clipList);
    clipList?.replaceChildren();
    if (clipPreview) clipPreview.textContent = "";
    setStatus(clipStatus, "");
    clearClipLibraryState();
    clipPublications.close();
    closeClipYouTubeForm();
    latestProcessorManifest = null;
    sponsorResult?.replaceChildren();
    campaignList?.replaceChildren();
    creativeForm?.reset();
    adPlanForm?.reset();
    adPlanResult?.replaceChildren();
  }

  async function loadShows() {
    setStatus(globalStatus, adminText("loadingShows"));
    try {
      const payload = await client.request("/v1/admin/shows");
      shows = payload.shows || [];
      const previousShowId = selectedShowId;
      selectedShowId = shows.some(({ id }) => id === selectedShowId)
        ? selectedShowId
        : shows[0]?.id || "";
      if (selectedShowId !== previousShowId) {
        clearClipLibraryState();
        clipPublications.close();
        closeClipYouTubeForm();
      }
      renderShows();
      fillShowSelect();
      fillShowForm();
      updateMarketingTools({
        showChanged: selectedShowId !== previousShowId
      });
      await Promise.all([loadEpisodes(), loadCampaigns()]);
      const marketingPanel = root.querySelector("#podcast-panel-marketing");
      if (marketingPanel && !marketingPanel.hidden) {
        await Promise.all([
          loadClipLibrary({ reset: true }),
          loadAnnouncementHistory(),
          savedMarketingLinks.load({ reset: true })
        ]);
      }
      const analyticsPanel = root.querySelector("#podcast-panel-analytics");
      if (analyticsPanel && !analyticsPanel.hidden) {
        await podcastAnalytics.load();
      }
      setStatus(globalStatus, "");
    } catch (error) {
      setStatus(globalStatus, friendlyError(error), true);
    }
  }

  function renderShows() {
    renderShowCatalog({
      target: showCards,
      shows,
      text: adminText,
      localizedCode,
      escapeHtml,
      escapeAttribute
    });
  }

  function fillShowSelect() {
    for (const showSelect of showSelects) {
      showSelect.replaceChildren(...shows.map((show) =>
        new Option(show.title, show.id, false, show.id === selectedShowId)
      ));
    }
  }

  function fillShowForm() {
    const show = shows.find(({ id }) => id === selectedShowId);
    showForm.hidden = !show;
    showSiteProjection.setShow(show);
    rssImport.setShow(Boolean(show));
    episodeEditor.setShow(selectedShowId);
    if (!show) return;
    populateShowSettingsForm(showForm, show);
  }

  function updateMarketingTools({ showChanged = false } = {}) {
    const show = shows.find(({ id }) => id === selectedShowId);
    if (!show) {
      marketingTaggedUrl = "";
      marketingCurrentQr = null;
      marketingQr?.replaceChildren();
      announcementReview?.replaceChildren();
      savedMarketingLinks.reset();
      return;
    }
    if (
      showChanged
      || marketingLinkForm?.dataset.showId !== show.id
    ) {
      marketingLinkForm.dataset.showId = show.id;
      savedMarketingLinks.resetForShow();
    }
    savedMarketingLinks.refreshPermissions();
    if (
      showChanged
      || announcementForm?.dataset.showId !== show.id
    ) {
      announcementForm.dataset.showId = show.id;
      const spanish = show.language === "es";
      announcementForm.elements.language.value = spanish ? "es" : "en";
      announcementForm.elements.subject.value = spanish
        ? `Nuevo episodio de ${show.title}`
        : `New episode of ${show.title}`;
      announcementForm.elements.heading.value = show.title;
      announcementForm.elements.ctaLabel.value = spanish
        ? "Escuchar episodio"
        : "Listen to the episode";
      announcementForm.elements.ctaUrl.value = show.canonicalUrl;
      announcementEditor.setValue(
        spanish
          ? `Ya está disponible un nuevo episodio de **${show.title}**.`
          : `A new episode of **${show.title}** is now available.`
      );
      announcementReview.replaceChildren();
      latestAnnouncementReview = null;
      if (announcementApprove) announcementApprove.hidden = true;
      setStatus(announcementStatus, "");
    }
    updateMarketingLink();
  }

  function updateMarketingLink() {
    const show = shows.find(({ id }) => id === selectedShowId);
    if (!show || !marketingLinkForm) return;
    try {
      const canonicalOrigin = new URL(show.canonicalUrl).origin;
      marketingTaggedUrl = buildTaggedMarketingUrl({
        canonicalUrl: show.canonicalUrl,
        source: marketingLinkForm.elements.source.value,
        medium: marketingLinkForm.elements.medium.value,
        campaign: marketingLinkForm.elements.campaign.value,
        content: marketingLinkForm.elements.content.value,
        ref: marketingLinkForm.elements.ref.value,
        allowedOrigins: [canonicalOrigin]
      });
      marketingLinkForm.elements.taggedUrl.value = marketingTaggedUrl;
      marketingPreviewTitle.textContent = show.title;
      marketingPreviewUrl.textContent = marketingTaggedUrl;
      renderMarketingQr();
      setStatus(marketingLinkStatus, "");
    } catch (error) {
      marketingTaggedUrl = "";
      marketingCurrentQr = null;
      marketingLinkForm.elements.taggedUrl.value = "";
      marketingQr?.replaceChildren();
      setStatus(
        marketingLinkStatus,
        error instanceof Error
          ? error.message
          : adminText("taggedLinkFailed"),
        true
      );
    }
  }

  function renderMarketingQr() {
    marketingCurrentQr = null;
    marketingQr?.replaceChildren();
    if (!marketingTaggedUrl || !marketingQr) return;
    try {
      const qr = createMarketingQr(marketingTaggedUrl);
      if (!qr) {
        throw new Error(
          adminText("qrUnavailable")
        );
      }
      const canvas = document.createElement("canvas");
      canvas.setAttribute("role", "img");
      canvas.setAttribute(
        "aria-label",
        adminText("qrCodeFor", {
          title: shows.find(({ id }) => id === selectedShowId)?.title
            || adminText("podcastFallback")
        })
      );
      drawQrCanvas(qr, canvas, { cellSize: 8, margin: 4 });
      marketingCurrentQr = qr;
      marketingQr.append(canvas);
    } catch (error) {
      setStatus(
        marketingLinkStatus,
        error instanceof Error
          ? error.message
          : adminText("qrRenderFailed"),
        true
      );
    }
  }

  async function copyMarketingLink() {
    if (!marketingTaggedUrl) {
      updateMarketingLink();
      if (!marketingTaggedUrl) return;
    }
    try {
      await navigator.clipboard.writeText(marketingTaggedUrl);
      setStatus(
        marketingLinkStatus,
        adminText("taggedLinkCopied")
      );
    } catch {
      const input = marketingLinkForm.elements.taggedUrl;
      input.focus();
      input.select();
      setStatus(
        marketingLinkStatus,
        adminText(
          "clipboardLinkSelected"
        )
      );
    }
  }

  async function shareMarketingLink() {
    if (!marketingTaggedUrl) {
      updateMarketingLink();
      if (!marketingTaggedUrl) return;
    }
    const show = shows.find(({ id }) => id === selectedShowId);
    if (typeof navigator.share !== "function") {
      await copyMarketingLink();
      return;
    }
    try {
      await navigator.share({
        title: show?.title || "Dust Wave Podcast",
        text: show?.description || "",
        url: marketingTaggedUrl
      });
      setStatus(
        marketingLinkStatus,
        adminText("shareSheetOpened")
      );
    } catch (error) {
      if (error?.name !== "AbortError") {
        setStatus(
          marketingLinkStatus,
          adminText("shareSheetFailed"),
          true
        );
      }
    }
  }

  function downloadMarketingQr(format) {
    if (!marketingCurrentQr || !marketingTaggedUrl) {
      updateMarketingLink();
    }
    if (!marketingCurrentQr) return;
    const show = shows.find(({ id }) => id === selectedShowId);
    const base = safeMarketingFilename(
      `${show?.slug || "podcast"}-${marketingLinkForm.elements.ref.value || "qr"}`,
      "podcast-qr"
    );
    if (format === "svg") {
      downloadMarketingBlob(
        `${base}.svg`,
        new Blob(
          [qrSvgMarkup(marketingCurrentQr, {
            cellSize: 8,
            margin: 4,
            label: adminText("qrCodeFor", {
              title: show?.title || adminText("podcastFallback")
            })
          })],
          { type: "image/svg+xml;charset=utf-8" }
        )
      );
      setStatus(
        marketingLinkStatus,
        adminText("svgQrDownloaded")
      );
      return;
    }
    const canvas = document.createElement("canvas");
    drawQrCanvas(marketingCurrentQr, canvas, {
      cellSize: 12,
      margin: 4
    });
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus(
          marketingLinkStatus,
          adminText("pngEncodeFailed"),
          true
        );
        return;
      }
      downloadMarketingBlob(`${base}.png`, blob);
      setStatus(
        marketingLinkStatus,
        adminText("pngQrDownloaded")
      );
    }, "image/png");
  }

  function downloadMarketingBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  function resetMarketingLinkForm() {
    if (!marketingLinkForm) return;
    const show = shows.find(({ id }) => id === selectedShowId);
    marketingLinkForm.elements.label.value = "";
    marketingLinkForm.elements.source.value = "podcast";
    marketingLinkForm.elements.medium.value = "owned";
    marketingLinkForm.elements.campaign.value = show
      ? `${show.slug}-launch`
      : "";
    marketingLinkForm.elements.content.value = "";
    marketingLinkForm.elements.ref.value = "";
    updateMarketingLink();
  }

  function applySavedMarketingLinkFields(row, { edit = false } = {}) {
    if (!marketingLinkForm) return;
    marketingLinkForm.elements.label.value = String(row.label || "");
    marketingLinkForm.elements.source.value = String(row.utmSource || "");
    marketingLinkForm.elements.medium.value = String(row.utmMedium || "");
    marketingLinkForm.elements.campaign.value = String(row.utmCampaign || "");
    marketingLinkForm.elements.content.value = String(row.utmContent || "");
    marketingLinkForm.elements.ref.value = String(row.referralCode || "");
    updateMarketingLink();
    if (edit) marketingLinkForm.elements.label.focus();
  }

  async function runAnnouncementDryRun(event) {
    event.preventDefault();
    const show = shows.find(({ id }) => id === selectedShowId);
    if (!show || !announcementForm) return;
    const submit = announcementForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    announcementReview.replaceChildren();
    setStatus(
      announcementStatus,
      adminText(
        "reviewingAudience"
      )
    );
    try {
      const result = await client.request(
        `/v1/admin/shows/${encodeURIComponent(show.id)}/marketing/announcements/dry-run`,
        {
          method: "POST",
          body: announcementPayload()
        }
      );
      latestAnnouncementReview = result;
      renderAnnouncementReview(result);
      setStatus(
        announcementStatus,
        adminText(
          "audienceSummary",
          {
            count: formatInteger(result.eligibleRecipientCount),
            subscribers: Number(result.eligibleRecipientCount) === 1
              ? adminText("subscriberSingular")
              : adminText("subscriberPlural")
          }
        )
      );
    } catch (error) {
      setStatus(announcementStatus, friendlyError(error), true);
    } finally {
      submit.disabled = false;
    }
  }

  function renderAnnouncementReview(result) {
    const card = document.createElement("article");
    card.className = "podcast-admin__card";
    const previewBody = document.createElement("div");
    previewBody.className = "podcast-admin__announcement-body";
    previewBody.innerHTML = markdownToEditorHtml(
      result.preview?.bodyMarkdown || ""
    );
    card.innerHTML = `
      <p class="podcast-admin__pill">${escapeHtml(
        announcementReviewLabel(result)
      )}</p>
      <h4>${escapeHtml(result.preview?.subject || adminText("announcementFallback"))}</h4>
      ${result.preview?.heading
        ? `<p><strong>${escapeHtml(result.preview.heading)}</strong></p>`
        : ""}
      <p>${escapeHtml(adminText(
        "eligibleSummary",
        {
          count: formatInteger(result.eligibleRecipientCount),
          recipients: Number(result.eligibleRecipientCount) === 1
            ? adminText("eligibleRecipientSingular")
            : adminText("eligibleRecipientPlural"),
          language: result.preview?.language || ""
        }
      ))}</p>`;
    card.append(previewBody);
    if (result.preview?.ctaLabel && result.preview?.ctaUrl) {
      const cta = document.createElement("p");
      const link = document.createElement("a");
      link.className = "btn btn-outline-light";
      link.href = result.preview.ctaUrl;
      link.textContent = result.preview.ctaLabel;
      cta.append(link);
      card.append(cta);
    }
    const evidence = document.createElement("p");
    evidence.append(
      `${adminText("reviewHash")}: `,
      Object.assign(document.createElement("code"), {
        textContent: result.reviewHash || ""
      })
    );
    card.append(evidence);
    announcementReview.replaceChildren(card);
    if (announcementApprove) {
      announcementApprove.hidden = !(
        result.sendEnabled === true
        && Number(result.eligibleRecipientCount) > 0
        && canApproveSelectedShowAnnouncement()
      );
    }
  }

  function announcementPayload() {
    return {
      language: announcementForm.elements.language.value,
      subject: announcementForm.elements.subject.value,
      heading: announcementForm.elements.heading.value,
      bodyMarkdown: announcementEditor.getMarkdown(),
      ctaLabel: announcementForm.elements.ctaLabel.value,
      ctaUrl: announcementForm.elements.ctaUrl.value
    };
  }

  function invalidateAnnouncementReview() {
    latestAnnouncementReview = null;
    announcementReview?.replaceChildren();
    if (announcementApprove) announcementApprove.hidden = true;
    setStatus(announcementStatus, "");
  }

  function announcementReviewLabel(result) {
    if (result.deliveryMode === "live") {
      return adminText("announcementLiveReady");
    }
    if (result.deliveryMode === "dry_run") {
      return adminText("announcementDryRunReady");
    }
    return adminText("announcementDeliveryDisabled");
  }

  async function approveAnnouncement() {
    const show = shows.find(({ id }) => id === selectedShowId);
    const review = latestAnnouncementReview;
    if (
      !show
      || !review?.reviewHash
      || !canApproveSelectedShowAnnouncement()
      || announcementApprove?.disabled
    ) return;
    if (
      review.deliveryMode === "live"
      && !globalThis.confirm(adminText("confirmLiveAnnouncement", {
        count: formatInteger(review.eligibleRecipientCount)
      }))
    ) return;
    announcementApprove.disabled = true;
    setStatus(
      announcementStatus,
      adminText("approvingAnnouncement")
    );
    try {
      const result = await client.request(
        `/v1/admin/shows/${encodeURIComponent(show.id)}/marketing/announcements/approve`,
        {
          method: "POST",
          body: {
            ...announcementPayload(),
            reviewHash: review.reviewHash
          }
        }
      );
      latestAnnouncementReview = null;
      announcementApprove.hidden = true;
      renderApprovedAnnouncement(result.announcement);
      setStatus(
        announcementStatus,
        result.announcement?.deliveryMode === "dry_run"
          ? adminText("announcementDryRunQueued")
          : adminText("announcementQueued", {
              count: formatInteger(
                result.announcement?.eligibleRecipientCount
              )
            })
      );
      await loadAnnouncementHistory();
    } catch (error) {
      setStatus(announcementStatus, friendlyError(error), true);
    } finally {
      announcementApprove.disabled = false;
    }
  }

  function renderApprovedAnnouncement(announcement) {
    const card = document.createElement("article");
    card.className = "podcast-admin__card";
    const heading = document.createElement("h4");
    heading.textContent = announcement?.subject
      || adminText("announcementFallback");
    const evidence = document.createElement("p");
    evidence.textContent = adminText("announcementApprovalEvidence", {
      revision: Number(announcement?.revision || 0),
      status: announcementStatusLabel(announcement?.status)
    });
    card.append(
      distributionBadge(
        announcement?.deliveryMode === "dry_run"
          ? adminText("dryRunMode")
          : adminText("liveMode")
      ),
      heading,
      evidence
    );
    announcementReview.replaceChildren(card);
  }

  async function loadAnnouncementHistory() {
    const showId = selectedShowId;
    announcementHistoryRequestId += 1;
    const requestId = announcementHistoryRequestId;
    announcementHistory?.replaceChildren();
    if (!showId) {
      setStatus(announcementHistoryStatus, "");
      return;
    }
    setStatus(
      announcementHistoryStatus,
      adminText("loadingAnnouncementHistory")
    );
    try {
      const result = await client.request(
        `/v1/admin/shows/${encodeURIComponent(showId)}/marketing/announcements?limit=20`
      );
      if (
        requestId !== announcementHistoryRequestId
        || showId !== selectedShowId
      ) return;
      renderAnnouncementHistory(result.announcements || []);
      setStatus(announcementHistoryStatus, "");
    } catch (error) {
      if (requestId !== announcementHistoryRequestId) return;
      setStatus(
        announcementHistoryStatus,
        friendlyError(error),
        true
      );
    }
  }

  function renderAnnouncementHistory(announcements) {
    if (!announcementHistory) return;
    if (announcements.length < 1) {
      const empty = document.createElement("p");
      empty.textContent = adminText("noAnnouncementHistory");
      announcementHistory.replaceChildren(empty);
      return;
    }
    announcementHistory.replaceChildren(...announcements.map(
      (announcement) => {
        const card = document.createElement("article");
        card.className = "podcast-admin__card";
        const heading = document.createElement("h4");
        heading.textContent = announcement.subject
          || adminText("announcementFallback");
        const summary = document.createElement("p");
        summary.textContent = adminText("announcementHistorySummary", {
          revision: Number(announcement.revision || 0),
          language: announcement.language || "—",
          count: formatInteger(announcement.eligibleRecipientCount),
          status: announcementStatusLabel(announcement.status)
        });
        const counts = announcement.deliveryCounts || {};
        const evidence = document.createElement("p");
        evidence.className = "podcast-admin__help";
        evidence.textContent = adminText("announcementDeliveryCounts", {
          pending: formatInteger(counts.pending),
          accepted: formatInteger(counts.accepted),
          delivered: formatInteger(counts.delivered),
          dryRun: formatInteger(counts.dryRun),
          suppressed: formatInteger(counts.suppressed),
          failed: formatInteger(counts.failed)
        });
        const date = document.createElement("p");
        date.className = "podcast-admin__help";
        date.textContent = formatBillingDate(announcement.approvedAt);
        card.append(
          distributionBadge(
            announcement.deliveryMode === "dry_run"
              ? adminText("dryRunMode")
              : adminText("liveMode")
          ),
          heading,
          summary,
          evidence,
          date
        );
        return card;
      }
    ));
  }

  function announcementStatusLabel(value) {
    return adminText(`announcementStatus_${String(value || "unknown")}`);
  }

  function canApproveSelectedShowAnnouncement() {
    return (adminIdentity?.roles || []).some(({ role, showId }) =>
      (role === "super_admin" || role === "admin")
      && (role === "super_admin" || !showId || showId === selectedShowId)
    );
  }

  async function saveShow(event) {
    event.preventDefault();
    const currentShow = shows.find(({ id }) => id === selectedShowId);
    const payload = readShowSettingsPayload(showForm);
    if (
      needsShowArchiveConfirmation(currentShow, payload.status)
      && !window.confirm(adminText("archiveShowConfirm", {
        title: currentShow?.title || showForm.elements.title.value
      }))
    ) {
      return;
    }
    const button = showForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(showStatus, adminText("saving"));
    try {
      await client.request(`/v1/admin/shows/${encodeURIComponent(selectedShowId)}`, {
        method: "PATCH",
        body: payload
      });
      setStatus(showStatus, adminText("showSaved"));
      await loadShows();
    } catch (error) {
      setStatus(showStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadEpisodes() {
    if (!selectedShowId) return;
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(selectedShowId)}/episodes`
      );
      episodes = payload.episodes || [];
      episodeEditor.setEpisodes(episodes);
      renderEpisodes();
      fillEpisodeSelects();
      await loadAdPlan();
      const productionPanel = root.querySelector("#podcast-panel-production");
      if (productionPanel && !productionPanel.hidden) {
        await Promise.all([
          loadAudioQcPolicy(),
          loadAudioQc(),
          loadAudioMaster(),
          loadTranscript(),
          loadChapters(),
          loadProductionReviews()
        ]);
      }
    } catch (error) {
      setStatus(episodeStatus, friendlyError(error), true);
    }
  }

  function renderEpisodes() {
    renderEpisodeCatalog({
      target: episodeList,
      episodes,
      text: adminText,
      localizedCode,
      escapeHtml,
      escapeAttribute,
      formatDate,
      canEdit: canManageCreatives
    });
    episodeProgressiveTools?.setOpen(episodeForm, episodes.length === 0);
    episodePublishWorkflow.setEpisodes(episodes);
  }

  function fillEpisodeSelects() {
    deliveryAudio.setEpisodes(episodes);
    youtubeAudioRenditions.setEpisodes(episodes);
    for (const select of [
      uploadForm?.elements.episodeId,
      sponsorForm?.elements.episodeId,
      adPlanForm?.elements.episodeId,
      transcriptEpisodeSelect,
      chapterEpisodeSelect,
      reviewEpisodeSelect,
      audioQcEpisodeSelect,
      audioMasterEpisodeSelect
    ].filter(Boolean)) {
      const previousValue = select.value;
      select.replaceChildren(...episodes.map((episode) =>
        new Option(
          `${episode.title} — ${episode.mediaStatus}`,
          episode.id,
          false,
          episode.id === previousValue
        )
      ));
    }
    reviewDraftGuard.syncContexts();
    const campaignEpisodeSelect = campaignForm?.elements.episodeId;
    if (campaignEpisodeSelect) {
      const previousValue = campaignEpisodeSelect.value;
      campaignEpisodeSelect.replaceChildren(
        new Option(
          adminText("allEpisodesShow"),
          ""
        ),
        ...episodes.map((episode) =>
          new Option(
            episode.title,
            episode.id,
            false,
            episode.id === previousValue
          )
        )
      );
    }
    const libraryEpisodeSelect = clipLibraryFilters?.elements.episodeId;
    if (libraryEpisodeSelect) {
      const previousValue = libraryEpisodeSelect.value;
      libraryEpisodeSelect.replaceChildren(
        new Option(adminText("allEpisodes"), ""),
        ...episodes.map((episode) =>
          new Option(
            episode.title,
            episode.id,
            false,
            episode.id === previousValue
          )
        )
      );
    }
    const previewButton = sponsorForm?.querySelector('button[type="submit"]');
    if (previewButton) previewButton.disabled = episodes.length === 0;
    const adPlanButton = adPlanForm?.querySelector('button[type="submit"]');
    if (adPlanButton) adPlanButton.disabled = episodes.length === 0;
    if (episodes.length === 0) {
      sponsorResult?.replaceChildren();
      adPlanResult?.replaceChildren();
      transcript = null;
      transcriptDownloads.render("", null);
      transcriptionState = null;
      transcriptionRequestId += 1;
      alignmentState = null;
      alignmentRequestId += 1;
      transcriptEditors.clear();
      transcriptCuesRoot?.replaceChildren();
      clearQa(root);
      transcriptionJobsRoot?.replaceChildren();
      alignmentJobsRoot?.replaceChildren();
      if (transcriptionSummary) {
        transcriptionSummary.textContent =
          adminText(
            "createBeforeTranscriptQueue"
          );
      }
      if (transcriptionQueueButton) transcriptionQueueButton.disabled = true;
      if (alignmentSummary) {
        alignmentSummary.textContent =
          adminText(
            "createBeforeAlignment"
          );
      }
      if (alignmentQueueButton) alignmentQueueButton.disabled = true;
      if (transcriptMeta) {
        transcriptMeta.textContent =
          adminText(
            "createBeforeTranscriptReview"
          );
      }
      chapterSet = null;
      chapterDraftAssistant.setEpisode("");
      chapterRowsRoot?.replaceChildren();
      if (chapterMeta) {
        chapterMeta.textContent =
          adminText(
            "createBeforeChapters"
          );
      }
      productionReviews = null;
      reviewTargetSelect?.replaceChildren();
      reviewList?.replaceChildren();
      publicationReadiness = null;
      readinessGroups?.replaceChildren();
      audioQcState = null;
      audioQcResults?.replaceChildren();
      if (audioQcSummary) {
        audioQcSummary.textContent =
          adminText(
            "createBeforeQc"
          );
      }
      if (audioQcQueue) audioQcQueue.disabled = true;
      audioMasterState = null;
      releaseAudioMasterPlayers();
      audioMasterCurrent?.replaceChildren();
      audioEnhancementResults?.replaceChildren();
      audioDerivatives.reset();
      if (audioMasterSummary) {
        audioMasterSummary.textContent =
          adminText(
            "createBeforeMaster"
          );
      }
      if (audioMasterApprovalForm) audioMasterApprovalForm.hidden = true;
      if (audioEnhancementForm) audioEnhancementForm.hidden = true;
      if (reviewReadiness) {
        reviewReadiness.textContent =
          adminText(
            "createBeforeProductionReview"
          );
      }
      if (readinessSummary) {
        readinessSummary.textContent =
          adminText(
            "createBeforeReadiness"
          );
      }
      setStatus(
        sponsorStatus,
        adminText(
          "createBeforeSponsorPreview"
        )
      );
      setStatus(
        adPlanStatus,
        adminText(
          "createBeforeAdMarkers"
        )
      );
    } else {
      setStatus(sponsorStatus, "");
    }
    fillPodcastEmbedEpisodes();
    fillDistributionEpisodes();
  }

  function fillDistributionEpisodes() {
    if (!distributionFilter) return;
    const select = distributionFilter.elements.episodeId;
    const previousValue = select.value;
    select.replaceChildren(
      new Option(
        adminText(
          "showSetupReadiness"
        ),
        ""
      ),
      ...episodes.map((episode) =>
        new Option(
        `${episode.title} — ${localizedCode("episodeStatus", episode.status)}`,
          episode.id,
          false,
          episode.id === previousValue
        )
      )
    );
    if (!episodes.some(({ id }) => id === previousValue)) {
      select.value = "";
    }
  }

  function publicMarketingEpisodes() {
    const now = Date.now();
    return episodes.filter((episode) => {
      const publicAtMs = Date.parse(episode.publicAt || "");
      return episode.status === "published"
        && ["public", "early_access", "free_mini"].includes(episode.access)
        && Number(episode.publicationRevision || 0) > 0
        && Number.isFinite(publicAtMs)
        && publicAtMs <= now
        && typeof episode.canonicalUrl === "string";
    });
  }

  function fillPodcastEmbedEpisodes() {
    if (embedForm) {
      fillPublicEpisodeSelect(embedForm.elements.episodeId);
      updatePodcastEmbed();
    }
    fillPodcastShareCardEpisodes();
  }

  function fillPublicEpisodeSelect(select) {
    if (!select) return [];
    const eligibleEpisodes = publicMarketingEpisodes();
    const previousValue = select.value;
    select.replaceChildren(
      eligibleEpisodes.length
        ? new Option(
          adminText("selectPublicEpisode"),
          ""
        )
        : new Option(
          adminText("noPublicEpisodes"),
          ""
        ),
      ...eligibleEpisodes.map((episode) =>
        new Option(
          adminText(
            "publicRevisionOption",
            {
              title: episode.title,
              revision: Number(episode.publicationRevision)
            }
          ),
          episode.id,
          false,
          episode.id === previousValue
        )
      )
    );
    select.disabled = eligibleEpisodes.length === 0;
    if (!eligibleEpisodes.some(({ id }) => id === previousValue)) {
      select.value = eligibleEpisodes[0]?.id || "";
    }
    return eligibleEpisodes;
  }

  function podcastPublicAssetUrls(show, episode) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(show.slug)
      || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(episode.slug)
    ) {
      throw new Error(
        adminText("invalidPublicSlug")
      );
    }
    const showUrl = new URL(show.canonicalUrl);
    const canonicalUrl = new URL(episode.canonicalUrl);
    const expectedPath =
      `/news/podcasts/${show.slug}/${episode.slug}/`;
    if (
      canonicalUrl.origin !== showUrl.origin
      || canonicalUrl.pathname !== expectedPath
      || canonicalUrl.search
      || canonicalUrl.hash
    ) {
      throw new Error(
        adminText(
          "canonicalMismatch"
        )
      );
    }
    return {
      canonicalUrl: canonicalUrl.toString(),
      embedUrl: new URL("embed/", canonicalUrl).toString(),
      shareCardUrl: new URL(
        `/img/podcasts/${show.slug}/${episode.slug}/social-card.png`,
        canonicalUrl.origin
      ).toString()
    };
  }

  function podcastEmbedFrame(embedUrl, title, { preview = false } = {}) {
    const frame = document.createElement("iframe");
    frame.src = embedUrl;
    frame.title = adminText(
      "playerFrameTitle",
      { title }
    );
    frame.loading = "lazy";
    frame.setAttribute("allow", "autoplay");
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    if (preview) {
      frame.className = "podcast-admin__embed-frame";
    } else {
      frame.setAttribute("data-dust-wave-podcast-embed", "true");
      frame.setAttribute("width", "100%");
      frame.setAttribute("height", "360");
      frame.setAttribute(
        "style",
        "width:100%;height:360px;border:0;border-radius:12px;overflow:hidden"
      );
    }
    return frame;
  }

  function clearPodcastEmbed(message) {
    if (!embedForm) return;
    embedForm.elements.embedUrl.value = "";
    embedForm.elements.embedCode.value = "";
    if (embedCopyButton) embedCopyButton.disabled = true;
    if (embedOpenLink) {
      embedOpenLink.href = "#";
      embedOpenLink.hidden = true;
    }
    embedPreview?.replaceChildren();
    if (embedPreview) embedPreview.hidden = true;
    setStatus(embedStatus, message || "");
  }

  function updatePodcastEmbed() {
    if (!embedForm) return;
    const show = shows.find(({ id }) => id === selectedShowId);
    const episode = publicMarketingEpisodes().find(
      ({ id }) => id === embedForm.elements.episodeId.value
    );
    if (!show || !episode) {
      clearPodcastEmbed(
        episodes.length
          ? adminText(
            "noReleasedRevision"
          )
          : adminText(
            "createPublishForEmbed"
          )
      );
      return;
    }

    try {
      const { embedUrl } = podcastPublicAssetUrls(show, episode);
      const code = podcastEmbedFrame(embedUrl, episode.title).outerHTML;
      embedForm.elements.embedUrl.value = embedUrl;
      embedForm.elements.embedCode.value = code;
      if (embedCopyButton) embedCopyButton.disabled = false;
      if (embedOpenLink) {
        embedOpenLink.href = embedUrl;
        embedOpenLink.hidden = false;
      }
      if (embedPreview) {
        const label = document.createElement("p");
        label.className = "podcast-admin__field-label";
        label.textContent = adminText("livePreview");
        embedPreview.replaceChildren(
          label,
          podcastEmbedFrame(embedUrl, episode.title, { preview: true })
        );
        embedPreview.hidden = false;
      }
      setStatus(embedStatus, "");
    } catch (error) {
      clearPodcastEmbed(
        error.message || adminText("embedFailed")
      );
    }
  }

  async function copyPodcastEmbed() {
    const code = embedForm?.elements.embedCode.value || "";
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setStatus(embedStatus, adminText("embedCopied"));
    } catch (_error) {
      embedForm.elements.embedCode.focus();
      embedForm.elements.embedCode.select();
      setStatus(
        embedStatus,
        adminText(
          "embedCopySelected"
        ),
        true
      );
    }
  }

  function fillPodcastShareCardEpisodes() {
    if (!shareCardForm) return;
    fillPublicEpisodeSelect(shareCardForm.elements.episodeId);
    updatePodcastShareCard();
  }

  function clearPodcastShareCard(message) {
    if (!shareCardForm) return;
    shareCardForm.elements.shareCardUrl.value = "";
    if (shareCardCopyButton) shareCardCopyButton.disabled = true;
    for (const link of [shareCardDownloadLink, shareCardOpenLink]) {
      if (!link) continue;
      link.href = "#";
      link.hidden = true;
    }
    shareCardPreview?.replaceChildren();
    if (shareCardPreview) shareCardPreview.hidden = true;
    setStatus(shareCardStatus, message || "");
  }

  function updatePodcastShareCard() {
    if (!shareCardForm) return;
    const show = shows.find(({ id }) => id === selectedShowId);
    const episode = publicMarketingEpisodes().find(
      ({ id }) => id === shareCardForm.elements.episodeId.value
    );
    if (!show || !episode) {
      clearPodcastShareCard(
        episodes.length
          ? adminText(
            "noReleasedRevision"
          )
          : adminText(
            "createPublishForCard"
          )
      );
      return;
    }
    try {
      const { shareCardUrl } = podcastPublicAssetUrls(show, episode);
      shareCardForm.elements.shareCardUrl.value = shareCardUrl;
      if (shareCardCopyButton) shareCardCopyButton.disabled = false;
      if (shareCardDownloadLink) {
        shareCardDownloadLink.href = shareCardUrl;
        shareCardDownloadLink.download = `${safeMarketingFilename(
          `${show.slug}-${episode.slug}-social-card`,
          "podcast-social-card"
        )}.png`;
        shareCardDownloadLink.hidden = false;
      }
      if (shareCardOpenLink) {
        shareCardOpenLink.href = shareCardUrl;
        shareCardOpenLink.hidden = false;
      }
      if (shareCardPreview) {
        const image = document.createElement("img");
        image.src = shareCardUrl;
        image.alt = adminText(
          "socialCardAlt",
          { title: episode.title }
        );
        image.width = 1200;
        image.height = 630;
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", () => {
          setStatus(
            shareCardStatus,
            adminText(
              "cardUnavailable"
            ),
            true
          );
        }, { once: true });
        shareCardPreview.replaceChildren(image);
        shareCardPreview.hidden = false;
      }
      setStatus(shareCardStatus, "");
    } catch (error) {
      clearPodcastShareCard(
        error.message || adminText(
          "cardUrlFailed"
        )
      );
    }
  }

  async function copyPodcastShareCardUrl() {
    const url = shareCardForm?.elements.shareCardUrl.value || "";
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setStatus(
        shareCardStatus,
        adminText("cardUrlCopied")
      );
    } catch (_error) {
      shareCardForm.elements.shareCardUrl.focus();
      shareCardForm.elements.shareCardUrl.select();
      setStatus(
        shareCardStatus,
        adminText(
          "cardCopySelected"
        ),
        true
      );
    }
  }

  async function uploadMedia(event) {
    event.preventDefault();
    const file = uploadForm.elements.media.files[0];
    if (!file) return;
    const button = uploadForm.querySelector('button[type="submit"]');
    button.disabled = true;
    uploadProgress.hidden = false;
    uploadProgress.value = 0;
    setStatus(
      uploadStatus,
      adminText("preparingUpload")
    );
    try {
      const created = await client.request("/v1/admin/uploads", {
        method: "POST",
        body: {
          showId: selectedShowId,
          episodeId: uploadForm.elements.episodeId.value,
          kind: uploadForm.elements.kind.value,
          filename: file.name,
          contentType: file.type || fallbackMime(file.name),
          expectedBytes: file.size
        }
      });
      const partBytes = created.recommendedPartBytes;
      const partCount = Math.ceil(file.size / partBytes);
      for (let index = 0; index < partCount; index += 1) {
        const part = file.slice(index * partBytes, Math.min(file.size, (index + 1) * partBytes));
        setStatus(
          uploadStatus,
          adminText(
            "uploadingPart",
            { part: index + 1, count: partCount }
          )
        );
        await client.request(
          `/v1/admin/uploads/${encodeURIComponent(created.uploadId)}/parts/${index + 1}`,
          {
            method: "PUT",
            body: part,
            headers: { "content-type": file.type || "application/octet-stream" }
          }
        );
        uploadProgress.value = Math.round(((index + 1) / partCount) * 100);
      }
      await client.request(
        `/v1/admin/uploads/${encodeURIComponent(created.uploadId)}/complete`,
        { method: "POST", body: {} }
      );
      uploadForm.reset();
      setStatus(
        uploadStatus,
        adminText("uploadComplete")
      );
      await loadEpisodes();
    } catch (error) {
      setStatus(uploadStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadTranscript() {
    const episodeId = transcriptEpisodeSelect?.value;
    const language = transcriptLanguageSelect?.value || "es";
    transcriptImport.reset();
    transcriptImport.setState({ available: false, editable: false });
    transcriptSearch.setState({ available: false });
    transcriptRequestId += 1;
    const requestId = transcriptRequestId;
    transcriptPage = 0;
    transcriptEditors.clear();
    transcriptCuesRoot?.replaceChildren();
    clearQa(root);
    if (!episodeId) {
      transcript = null;
      alignmentState = null;
      alignmentRequestId += 1;
      clips = [];
      selectedClipId = "";
      if (transcriptWorkbench) transcriptWorkbench.hidden = true;
      if (transcriptPages) transcriptPages.hidden = true;
      alignmentJobsRoot?.replaceChildren();
      if (alignmentQueueButton) alignmentQueueButton.disabled = true;
      clipList?.replaceChildren();
      updateClipAvailability();
      if (transcriptMeta) {
        transcriptMeta.textContent = adminText(
          "createBeforeTranscriptReview"
        );
      }
      return;
    }
    if (transcriptWorkbench) transcriptWorkbench.hidden = false;
    setStatus(
      transcriptStatus,
      adminText("loadingTranscriptReview")
    );
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/transcripts`
      );
      if (requestId !== transcriptRequestId) return;
      transcriptDurationSeconds = Number.isFinite(
        Number(payload.durationSeconds)
      )
        ? Number(payload.durationSeconds)
        : null;
      transcript = (payload.transcripts || []).find(
        (candidate) => candidate.language === language
      ) || emptyTranscript(language);
      transcriptDirty = false;
      renderTranscript();
      await Promise.all([
        loadClips(),
        loadTranscriptionJobs(),
        loadAlignmentJobs()
      ]);
      setStatus(transcriptStatus, "");
    } catch (error) {
      if (requestId !== transcriptRequestId) return;
      transcript = null;
      transcriptEditors.clear();
      transcriptCuesRoot?.replaceChildren();
      clearQa(root);
      if (transcriptPages) transcriptPages.hidden = true;
      clips = [];
      selectedClipId = "";
      clipList?.replaceChildren();
      updateClipAvailability();
      setStatus(transcriptStatus, friendlyError(error), true);
    }
  }

  async function loadTranscriptionJobs() {
    const episodeId = transcriptEpisodeSelect?.value;
    transcriptionRequestId += 1;
    const requestId = transcriptionRequestId;
    if (!episodeId) {
      transcriptionState = null;
      transcriptionJobsRoot?.replaceChildren();
      if (transcriptionSummary) {
        transcriptionSummary.textContent = adminText(
          "createBeforeTranscriptQueue"
        );
      }
      if (transcriptionQueueButton) transcriptionQueueButton.disabled = true;
      return false;
    }
    setStatus(
      transcriptionStatus,
      adminText("loadingTranscriptionJobs")
    );
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/transcription-jobs`
      );
      if (requestId !== transcriptionRequestId) return;
      transcriptionState = payload;
      renderTranscriptionJobs();
      setStatus(transcriptionStatus, "");
      return true;
    } catch (error) {
      if (requestId !== transcriptionRequestId) return;
      transcriptionState = null;
      transcriptionJobsRoot?.replaceChildren();
      if (transcriptionQueueButton) transcriptionQueueButton.disabled = true;
      setStatus(transcriptionStatus, friendlyError(error), true);
      return false;
    }
  }

  function renderTranscriptionJobs() {
    if (!transcriptionJobsRoot) return;
    const source = transcriptionState?.source;
    const jobs = Array.isArray(transcriptionState?.jobs)
      ? transcriptionState.jobs
      : [];
    const active = jobs.some(
      ({ status }) => status === "queued" || status === "running"
    );
    if (transcriptionSummary) {
      transcriptionSummary.textContent = source
        ? [
            adminText(
              "sourceLabel",
              { language: humanizeCode(source.sourceLanguage) }
            ),
            formatBytes(Number(source.objectBytes || 0)),
            formatClipDuration(Number(source.durationMs || 0)),
            source.directProcessingEligible
              ? adminText("directAiPathReady")
              : adminText(
                  "stagingChunkPathReady"
                ),
            adminText(
              "masterLabel",
              {
                digest: String(source.workingMasterSha256 || "").slice(0, 12)
              }
            ),
            source.settingsVersion
          ].join(" · ")
        : adminText(
            "approveMasterBeforeTranscription"
          );
    }
    if (transcriptionQueueButton) {
      transcriptionQueueButton.hidden = !canEditTranscripts;
      transcriptionQueueButton.disabled =
        !canEditTranscripts
        || !source
        || active;
    }
    if (!jobs.length) {
      const empty = document.createElement("p");
      empty.className = "podcast-admin__empty";
      empty.textContent = adminText(
        "noTranscriptionJob"
      );
      transcriptionJobsRoot.replaceChildren(empty);
      return;
    }
    transcriptionJobsRoot.replaceChildren(...jobs.map((job) => {
      const card = document.createElement("article");
      card.className = "podcast-admin__card";
      const heading = document.createElement("div");
      heading.className = "podcast-admin__transcript-cue-heading";
      const title = document.createElement("h4");
      title.textContent =
        `${localizedCode("jobStatus", job.status)} · ${
          humanizeCode(job.language)
        }`;
      const pill = document.createElement("span");
      pill.className = "podcast-admin__pill";
      pill.textContent = job.result?.timingPrecision
        ? adminText(
            "timingLabel",
            { precision: humanizeCode(job.result.timingPrecision) }
          )
        : adminText("wordTimingLocked");
      heading.append(title, pill);
      const evidence = document.createElement("p");
      evidence.textContent = [
        job.model,
        job.settingsVersion,
        adminText(
          "attemptLabel",
          { count: formatInteger(job.attemptCount) }
        ),
        formatDate(job.completedAt || job.requestedAt)
      ].filter(Boolean).join(" · ");
      card.append(heading, evidence);
      if (job.failure?.code) {
        const failure = document.createElement("p");
        failure.className = "podcast-admin__status is-error";
        failure.textContent = `${humanizeCode(job.failure.code)}: ${
          job.failure.message
          || adminText("noAdditionalDetail")
        }`;
        card.append(failure);
      }
      if (job.result?.transcriptSha256) {
        const result = document.createElement("p");
        result.textContent = adminText(
          "transcriptJobResult",
          {
            revision: Number(job.result.transcriptRevision),
            digest: String(job.result.transcriptSha256).slice(0, 16)
          }
        );
        card.append(result);
      }
      if (job.chunking) {
        const chunking = document.createElement("p");
        chunking.textContent = [
          adminText(
            "chunkPreparation",
            { status: localizedCode("jobStatus", job.chunking.status) }
          ),
          job.chunking.chunkCount
            ? adminText(
                "immutableChunks",
                { count: formatInteger(job.chunking.chunkCount) }
              )
            : "",
          job.chunking.processorVersion || ""
        ].filter(Boolean).join(" · ");
        card.append(chunking);
        if (
          ["queued", "running"].includes(job.chunking.status)
          && job.chunking.workflow?.filename === TRANSCRIPTION_CHUNK_WORKFLOW
          && job.chunking.workflow?.input?.run_id
        ) {
          const dispatch = document.createElement("p");
          dispatch.textContent = adminText(
            "stagingProcessorRun",
            {
              workflow: job.chunking.workflow.filename,
              runId: job.chunking.workflow.input.run_id
            }
          );
          card.append(dispatch);
        }
      }
      return card;
    }));
  }

  async function queueTranscription() {
    const episodeId = transcriptEpisodeSelect?.value;
    const source = transcriptionState?.source;
    if (
      !episodeId
      || !source
      || !canEditTranscripts
    ) return;
    transcriptionQueueButton.disabled = true;
    setStatus(
      transcriptionStatus,
      adminText(
        "snapshottingTranscription"
      )
    );
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/transcription-jobs`,
        {
          method: "POST",
          body: {
            requestId: operationId("transcription"),
            expectedWorkingMasterId: source.currentWorkingMasterId,
            language: source.sourceLanguage
          }
        }
      );
      const message = payload.idempotent
        ? adminText(
            "transcriptionAlreadyExists"
          )
        : payload.delivery === "queued"
          ? adminText(
              "transcriptionQueued"
            )
          : payload.delivery === "chunk_processor_required"
            ? adminText(
                "transcriptionChunkWorkflow"
              )
            : adminText(
                "transcriptionRecovery"
              );
      if (await loadTranscriptionJobs()) {
        setStatus(transcriptionStatus, message);
      }
    } catch (error) {
      setStatus(transcriptionStatus, friendlyError(error), true);
      renderTranscriptionJobs();
    }
  }

  async function loadAlignmentBenchmarks() {
    alignmentBenchmarkRequestId += 1;
    const requestId = alignmentBenchmarkRequestId;
    setStatus(
      alignmentBenchmarkStatus,
      adminText(
        "loadingBenchmarkSummaries"
      )
    );
    try {
      const payload = await client.request(
        "/v1/admin/alignment-benchmarks"
      );
      if (requestId !== alignmentBenchmarkRequestId) return false;
      alignmentBenchmarkState = payload;
      renderAlignmentBenchmarks();
      setStatus(alignmentBenchmarkStatus, "");
      return true;
    } catch (error) {
      if (requestId !== alignmentBenchmarkRequestId) return false;
      alignmentBenchmarkState = null;
      alignmentBenchmarkList?.replaceChildren();
      if (alignmentBenchmarkSummary) {
        alignmentBenchmarkSummary.textContent = adminText(
          "benchmarkSummariesFailed"
        );
      }
      setStatus(
        alignmentBenchmarkStatus,
        friendlyError(error),
        true
      );
      return false;
    }
  }

  function renderAlignmentBenchmarks() {
    if (!alignmentBenchmarkList) return;
    const benchmarks = alignmentBenchmarkState?.benchmarks || [];
    const latestPassing = benchmarks.find(({ passed }) => passed);
    const runner = alignmentBenchmarkState?.requiredRunner;
    if (alignmentBenchmarkSummary) {
      alignmentBenchmarkSummary.textContent = latestPassing
        ? [
            adminText(
              "latestPassingEvidence",
              { corpus: latestPassing.corpusVersion }
            ),
            `${latestPassing.adapter?.name
              || adminText("adapterFallback")} ${
              latestPassing.adapter?.version || ""
            }`.trim(),
            adminText(
              "runnerLabel",
              {
                revision: String(
                  latestPassing.runner?.revision || ""
                ).slice(0, 12)
              }
            ),
            formatDate(latestPassing.completedAt)
          ].join(" · ")
        : [
            adminText(
              "noPassingBenchmark"
            ),
            runner?.revision
              ? adminText(
                  "requiredRunner",
                  { revision: String(runner.revision).slice(0, 12) }
                )
              : ""
          ].filter(Boolean).join(" ");
    }
    if (!benchmarks.length) {
      const empty = document.createElement("p");
      empty.className = "podcast-admin__empty";
      empty.textContent = adminText(
        "noBenchmarkEvidence"
      );
      alignmentBenchmarkList.replaceChildren(empty);
      return;
    }
    alignmentBenchmarkList.replaceChildren(
      ...benchmarks.map((benchmark) => {
        const card = document.createElement("article");
        card.className = "podcast-admin__card";
        const heading = document.createElement("div");
        heading.className = "podcast-admin__transcript-cue-heading";
        const title = document.createElement("h5");
        title.textContent = benchmark.corpusVersion
          || adminText("benchmarkFallback");
        const status = document.createElement("span");
        status.className = "podcast-admin__pill";
        status.textContent = benchmark.passed
          ? adminText("passed")
          : adminText("failed");
        heading.append(title, status);

        const identity = document.createElement("p");
        identity.textContent = [
          `${benchmark.adapter?.name || adminText("adapterFallback")} ${
            benchmark.adapter?.version || ""
          }`.trim(),
          adminText(
            "modelLabel",
            {
              model: benchmark.adapter?.modelVersion
                || adminText("distributionUnknown")
            }
          ),
          adminText(
            "runnerLabel",
            {
              revision: String(benchmark.runner?.revision || "").slice(0, 12)
            }
          )
        ].join(" · ");

        const languageEvidence = document.createElement("p");
        languageEvidence.textContent = ["en", "es"].map((language) => {
          const evidence = benchmark.languages?.[language] || {};
          return adminText(
            "benchmarkLanguageEvidence",
            {
              language: language.toUpperCase(),
              fixtures: formatInteger(evidence.fixtureCount),
              words: formatInteger(evidence.goldWordCount),
              aligned: formatPercent(evidence.alignedWordRatio)
            }
          );
        }).join(" · ");

        const gates = document.createElement("p");
        gates.textContent = [
          adminText(
            "previewsCount",
            {
              accepted: formatInteger(benchmark.previews?.accepted),
              total: formatInteger(benchmark.previews?.total)
            }
          ),
          benchmark.resourceGatePassed
            ? adminText("resourceGatePassed")
            : adminText("resourceGateFailed"),
          benchmark.idempotencyGatePassed
            ? adminText(
                "idempotencyGatePassed"
              )
            : adminText(
                "idempotencyGateFailed"
              ),
          benchmark.cleanEnvironmentReproduced
            ? adminText("cleanRunReproduced")
            : adminText("cleanRunMissing")
        ].join(" · ");

        const evidence = document.createElement("p");
        evidence.className = "podcast-admin__review-evidence";
        evidence.textContent = [
          adminText(
            "inputDigest",
            { digest: String(benchmark.inputSha256 || "").slice(0, 16) }
          ),
          adminText(
            "reportDigest",
            { digest: String(benchmark.reportSha256 || "").slice(0, 16) }
          ),
          formatBytes(benchmark.inputBytes),
          formatDate(benchmark.completedAt)
        ].join(" · ");
        card.append(heading, identity, languageEvidence, gates, evidence);
        return card;
      })
    );
  }

  async function importAlignmentBenchmark(event) {
    event.preventDefault();
    if (!alignmentBenchmarkForm || !canImportAlignmentBenchmarks) return;
    const file = alignmentBenchmarkForm.elements.evidence?.files?.[0];
    if (
      !file
      || file.size < 1
      || file.size > MAXIMUM_ALIGNMENT_BENCHMARK_BYTES
    ) {
      setStatus(
        alignmentBenchmarkStatus,
        adminText(
          "chooseBenchmarkJson"
        ),
        true
      );
      return;
    }
    const submit = alignmentBenchmarkForm.querySelector(
      'button[type="submit"]'
    );
    submit.disabled = true;
    setStatus(
      alignmentBenchmarkStatus,
      adminText(
        "recordingBenchmark"
      )
    );
    try {
      const evidence = JSON.parse(await file.text());
      if (
        !evidence
        || typeof evidence !== "object"
        || Array.isArray(evidence)
      ) {
        throw new SyntaxError("A JSON object is required");
      }
      const payload = await client.request(
        "/v1/admin/alignment-benchmarks",
        { method: "POST", body: evidence }
      );
      alignmentBenchmarkForm.reset();
      if (await loadAlignmentBenchmarks()) {
        setStatus(
          alignmentBenchmarkStatus,
          payload.idempotent
            ? adminText(
                "benchmarkAlreadyRecorded"
              )
            : adminText(
                "benchmarkRecorded",
                {
                  status: payload.benchmark?.passed
                    ? adminText("passing")
                    : adminText("failed").toLocaleLowerCase(
                        document.documentElement.lang || "en"
                      )
                }
              )
        );
      }
    } catch (error) {
      setStatus(
        alignmentBenchmarkStatus,
        error instanceof SyntaxError
          ? adminText(
              "invalidJsonObject"
            )
          : friendlyError(error),
        true
      );
    } finally {
      submit.disabled = false;
    }
  }

  async function loadAlignmentJobs() {
    const episodeId = transcriptEpisodeSelect?.value;
    alignmentRequestId += 1;
    const requestId = alignmentRequestId;
    if (!episodeId) {
      alignmentState = null;
      alignmentJobsRoot?.replaceChildren();
      if (alignmentSummary) {
        alignmentSummary.textContent = adminText(
          "createBeforeAlignment"
        );
      }
      if (alignmentQueueButton) alignmentQueueButton.disabled = true;
      return false;
    }
    setStatus(
      alignmentStatus,
      adminText("loadingAlignmentEvidence")
    );
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/alignments`
      );
      if (requestId !== alignmentRequestId) return false;
      alignmentState = payload;
      renderAlignmentJobs();
      setStatus(alignmentStatus, "");
      return true;
    } catch (error) {
      if (requestId !== alignmentRequestId) return false;
      alignmentState = null;
      alignmentJobsRoot?.replaceChildren();
      if (alignmentQueueButton) alignmentQueueButton.disabled = true;
      setStatus(alignmentStatus, friendlyError(error), true);
      return false;
    }
  }

  function renderAlignmentJobs() {
    if (!alignmentJobsRoot) return;
    const language = transcriptLanguageSelect?.value || "es";
    const candidate = (alignmentState?.candidates || []).find(
      (item) => item.language === language
    );
    const jobs = (alignmentState?.jobs || []).filter(
      (job) => job.language === language
    );
    const active = jobs.some(({ status }) =>
      ["queued", "running"].includes(status)
    );
    const processorAvailable = alignmentState?.processor?.available === true;
    if (alignmentSummary) {
      alignmentSummary.textContent = candidate
        ? [
            adminText(
              "transcriptRevisionSummary",
              {
                language: humanizeCode(language),
                revision: Number(candidate.transcriptRevision || 0)
              }
            ),
            localizedCode("transcriptStatus", candidate.transcriptStatus),
            candidate.currentWorkingMasterId
              ? adminText(
                  "masterLabel",
                  {
                    digest: String(
                      candidate.workingMasterSha256 || ""
                    ).slice(0, 12)
                  }
                )
              : adminText("workingMasterMissing"),
            candidate.eligible
              ? adminText("exactInputsEligible")
              : adminText(
                  "approveTranscriptAndMaster"
                ),
            processorAvailable
              ? adminText(
                  "stagingProcessorAvailable"
                )
              : adminText("processorUnavailable")
          ].join(" · ")
        : adminText(
            "noTranscriptRevision",
            { language: humanizeCode(language) }
          );
    }
    if (alignmentQueueButton) {
      alignmentQueueButton.hidden = !canEditTranscripts;
      alignmentQueueButton.disabled =
        !canEditTranscripts
        || !candidate?.eligible
        || !processorAvailable
        || active;
    }
    if (alignmentAdapterSelect) {
      alignmentAdapterSelect.disabled =
        !canEditTranscripts || !processorAvailable || active;
    }
    if (!jobs.length) {
      const empty = document.createElement("p");
      empty.className = "podcast-admin__empty";
      empty.textContent = adminText(
        "noAlignmentJob"
      );
      alignmentJobsRoot.replaceChildren(empty);
      return;
    }
    alignmentJobsRoot.replaceChildren(...jobs.map((job) => {
      const card = document.createElement("article");
      card.className = "podcast-admin__card";
      const heading = document.createElement("div");
      heading.className = "podcast-admin__transcript-cue-heading";
      const title = document.createElement("h4");
      title.textContent =
        `${localizedCode("jobStatus", job.status)} · ${
          localizedCode("alignmentStatus", job.alignmentStatus)
        }`;
      const pill = document.createElement("span");
      pill.className = "podcast-admin__pill";
      pill.textContent = `${job.adapter?.name || "adapter"} ${
        job.adapter?.version || ""
      }`.trim();
      heading.append(title, pill);

      const identity = document.createElement("p");
      identity.textContent = [
        adminText(
          "transcriptRevisionLabel",
          { revision: Number(job.transcriptRevision || 0) }
        ),
        adminText(
          "attemptLabel",
          { count: formatInteger(job.attemptCount) }
        ),
        adminText(
          "runnerLabel",
          { revision: String(job.runner?.revision || "").slice(0, 12) }
        ),
        formatDate(job.completedAt || job.requestedAt)
      ].filter(Boolean).join(" · ");
      card.append(heading, identity);

      if (job.quality) {
        const quality = document.createElement("p");
        quality.textContent = [
          adminText(
            "alignedCount",
            { count: formatInteger(job.quality.alignedWordCount) }
          ),
          adminText(
            "unalignedCount",
            { count: formatInteger(job.quality.unalignedWordCount) }
          ),
          adminText(
            "interpolatedCount",
            { count: formatInteger(job.quality.interpolatedWordCount) }
          ),
          job.quality.structurallyEligible
            ? adminText("structureEligible")
            : adminText("structureBlocked")
        ].join(" · ");
        card.append(quality);
      }
      if (job.workflow?.filename === ALIGNMENT_WORKFLOW) {
        const workflow = document.createElement("p");
        workflow.textContent = adminText(
          "runAlignmentWorkflow",
          { workflow: job.workflow.filename, jobId: job.id }
        );
        card.append(workflow);
      }
      if (job.failure?.code) {
        const failure = document.createElement("p");
        failure.className = "podcast-admin__status is-error";
        failure.textContent =
          `${humanizeCode(job.failure.code)}: ${
            job.failure.message
            || adminText("noAdditionalDetail")
          }`;
        card.append(failure);
      }

      const benchmarkPassed = Boolean(job.benchmark?.passedRunId);
      const gate = document.createElement("p");
      gate.textContent = benchmarkPassed
        ? adminText(
            "matchingBenchmark",
            { runId: job.benchmark.passedRunId }
          )
        : adminText(
            "benchmarkApprovalLocked"
          );
      card.append(gate);

      if (
        job.status === "ready"
        && job.alignmentStatus === "needs_review"
      ) {
        const approve = document.createElement("button");
        approve.className = "btn btn-outline-light";
        approve.type = "button";
        approve.dataset.podcastAlignmentApprove = job.id;
        approve.textContent = adminText(
          "approveExactAlignment"
        );
        approve.disabled =
          !canApproveTranscripts
          || job.quality?.structurallyEligible !== true
          || !benchmarkPassed;
        card.append(approve);
      }
      return card;
    }));
  }

  async function queueAlignment() {
    const episodeId = transcriptEpisodeSelect?.value;
    const language = transcriptLanguageSelect?.value || "es";
    const candidate = (alignmentState?.candidates || []).find(
      (item) => item.language === language
    );
    if (
      !episodeId
      || !candidate?.eligible
      || !canEditTranscripts
      || alignmentState?.processor?.available !== true
    ) return;
    alignmentQueueButton.disabled = true;
    setStatus(
      alignmentStatus,
      adminText(
        "bindingAlignmentInputs"
      )
    );
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/alignments`,
        {
          method: "POST",
          body: {
            requestId: operationId("alignment"),
            expectedWorkingMasterId: candidate.currentWorkingMasterId,
            expectedTranscriptRevision: Number(
              candidate.transcriptRevision
            ),
            language,
            adapter: alignmentAdapterSelect?.value || "whisperx"
          }
        }
      );
      const message = payload.idempotent
        ? adminText(
            "alignmentAlreadyExists"
          )
        : adminText(
            "alignmentRecorded"
          );
      if (await loadAlignmentJobs()) {
        setStatus(alignmentStatus, message);
      }
    } catch (error) {
      setStatus(alignmentStatus, friendlyError(error), true);
      renderAlignmentJobs();
    }
  }

  async function approveAlignment(event) {
    const button = event.target.closest("[data-podcast-alignment-approve]");
    const episodeId = transcriptEpisodeSelect?.value;
    if (!button || !episodeId || !canApproveTranscripts) return;
    const jobId = button.dataset.podcastAlignmentApprove;
    button.disabled = true;
    setStatus(
      alignmentStatus,
      adminText(
        "approvingAlignment"
      )
    );
    try {
      await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/alignments/${
          encodeURIComponent(jobId)
        }/approve`,
        {
          method: "POST",
          body: { approvalId: operationId("alignment_approval") }
        }
      );
      await loadTranscript();
      setStatus(
        alignmentStatus,
        adminText(
          "alignmentApproved"
        )
      );
    } catch (error) {
      setStatus(alignmentStatus, friendlyError(error), true);
      renderAlignmentJobs();
    }
  }

  function renderTranscript() {
    if (!transcript || !transcriptCuesRoot) return;
    transcriptImport.setState({
      available: true,
      editable: canEditTranscripts
    });
    transcriptSearch.setState({
      available: true,
      contextKey: [
        transcriptEpisodeSelect?.value,
        transcriptLanguageSelect?.value,
        transcriptRequestId
      ].join(":")
    });
    transcriptDownloads.render(transcriptEpisodeSelect.value, transcript);
    const episode = episodes.find(
      ({ id }) => id === transcriptEpisodeSelect?.value
    );
    const alignment = transcript.alignment || {};
    const alignmentLabel = alignment.status === "passed"
      ? adminText(
          "alignedWords",
          { count: formatInteger(alignment.alignedWordCount) }
        )
      : localizedCode("alignmentStatus", alignment.status || "not_run");
    if (transcriptMeta) {
      transcriptMeta.textContent = [
        episode?.title || adminText("episodeFallback"),
        adminText(
          "transcriptRevision",
          { revision: Number(transcript.revision || 0) }
        ),
        localizedCode("transcriptStatus", transcript.status || "new"),
        adminText(
          "alignmentLabel",
          { status: alignmentLabel }
        ),
        alignment.wordControlsEnabled
          ? adminText("wordControlsAvailable")
          : adminText("wordControlsLocked")
      ].join(" · ");
    }
    transcriptEditors.clear();
    const cues = transcript.cues?.length
      ? transcript.cues
      : [newTranscriptCue()];
    transcript.cues = cues;
    renderTranscriptReviewDiagnostics(root, cues, adminText, openTranscriptCue);
    const pageCount = Math.max(
      1,
      Math.ceil(cues.length / TRANSCRIPT_CUES_PER_PAGE)
    );
    transcriptPage = Math.min(transcriptPage, pageCount - 1);
    const firstCueIndex = transcriptPage * TRANSCRIPT_CUES_PER_PAGE;
    const lastCueIndex = Math.min(
      cues.length,
      firstCueIndex + TRANSCRIPT_CUES_PER_PAGE
    );
    const visibleCues = cues.slice(firstCueIndex, lastCueIndex);
    if (transcriptPages) transcriptPages.hidden = pageCount <= 1;
    if (transcriptPageLabel) {
      transcriptPageLabel.textContent = adminText(
        "cuesRange",
        {
          first: formatInteger(firstCueIndex + 1),
          last: formatInteger(lastCueIndex),
          total: formatInteger(cues.length)
        }
      );
    }
    if (transcriptPreviousButton) {
      transcriptPreviousButton.disabled = transcriptPage === 0;
    }
    if (transcriptNextButton) {
      transcriptNextButton.disabled = transcriptPage >= pageCount - 1;
    }
    const rows = visibleCues.map((cue, visibleIndex) => {
      const index = firstCueIndex + visibleIndex;
      const row = document.createElement("article");
      row.className = "podcast-admin__transcript-cue";
      row.dataset.transcriptCueId = cue.id;
      row.dataset.transcriptCueNumber = String(index + 1);
      row.innerHTML = `
        <div class="podcast-admin__transcript-cue-heading">
          <h3>${escapeHtml(adminText(
            "cueHeading",
            { number: formatInteger(index + 1) }
          ))}</h3>
          <button
            class="btn btn-outline-light"
            type="button"
            data-podcast-transcript-remove="${escapeAttribute(cue.id)}">
            ${escapeHtml(adminText("remove"))}
          </button>
        </div>
        <div class="podcast-admin__field-grid">
          <label>${escapeHtml(adminText("startSeconds"))}
            <input data-transcript-start type="number" min="0" step="0.001" required>
          </label>
          <label>${escapeHtml(adminText("endSeconds"))}
            <input data-transcript-end type="number" min="0.001" step="0.001" required>
          </label>
          <label>${escapeHtml(adminText(
            "publicSpeakerLabel"
          ))}
            <input data-transcript-speaker maxlength="80">
          </label>
          <label class="podcast-admin__checkbox">
            <input data-transcript-speaker-confirmed type="checkbox">
            ${escapeHtml(adminText(
              "speakerConfirmed"
            ))}
          </label>
        </div>
        <label>${escapeHtml(adminText("captionText"))}</label>
        <div data-transcript-editor></div>`;
      const start = row.querySelector("[data-transcript-start]");
      const end = row.querySelector("[data-transcript-end]");
      const speaker = row.querySelector("[data-transcript-speaker]");
      const confirmed = row.querySelector(
        "[data-transcript-speaker-confirmed]"
      );
      start.value = millisecondsToSeconds(cue.startsAtMs);
      end.value = millisecondsToSeconds(cue.endsAtMs);
      speaker.value = cue.speakerLabel || "";
      confirmed.checked = cue.speakerConfirmed === true;
      start.setAttribute("aria-label", adminText("cueFieldLabel", {
        field: adminText("startSeconds"),
        number: formatInteger(index + 1)
      }));
      end.setAttribute("aria-label", adminText("cueFieldLabel", {
        field: adminText("endSeconds"),
        number: formatInteger(index + 1)
      }));
      speaker.setAttribute("aria-label", adminText("cueFieldLabel", {
        field: adminText("publicSpeakerLabel"),
        number: formatInteger(index + 1)
      }));
      confirmed.setAttribute("aria-label", adminText(
        "cueSpeakerConfirmed",
        { number: formatInteger(index + 1) }
      ));
      confirmed.disabled = !canEditTranscripts || !speaker.value;
      speaker.addEventListener("input", () => {
        transcriptDirty = true;
        syncReviewDraftButton(transcriptSaveButton, true, adminText);
        confirmed.disabled = !canEditTranscripts || !speaker.value.trim();
        if (!speaker.value.trim()) confirmed.checked = false;
        transcriptApproveButton.disabled = true;
        updateClipAvailability();
      });
      for (const control of [start, end, confirmed]) {
        control.addEventListener("input", () => {
          transcriptDirty = true;
          syncReviewDraftButton(transcriptSaveButton, true, adminText);
          transcriptApproveButton.disabled = true;
          updateClipAvailability();
        });
      }
      for (const control of [start, end, speaker]) {
        control.disabled = !canEditTranscripts;
      }
      const remove = row.querySelector("[data-podcast-transcript-remove]");
      remove.disabled = !canEditTranscripts || cues.length === 1;
      remove.setAttribute("aria-label", adminText(
        "removeCue",
        { number: formatInteger(index + 1) }
      ));
      const cueLabel = adminText(
        "cueCaption",
        { number: formatInteger(index + 1) }
      );
      const editor = mountRichTextEditor(
        row.querySelector("[data-transcript-editor]"),
        {
          value: cue.textMarkdown || "",
          mode: "timed_text",
          label: cueLabel,
          labels: editorLabels(cueLabel),
          onChange() {
            transcriptDirty = true;
            syncReviewDraftButton(transcriptSaveButton, true, adminText);
            transcriptApproveButton.disabled = true;
            updateClipAvailability();
          }
        }
      );
      if (!canEditTranscripts) {
        editor.editor.contentEditable = "false";
        row.querySelectorAll(".dw-editor__toolbar button").forEach((button) => {
          button.disabled = true;
        });
      }
      row.querySelectorAll(".dw-editor__toolbar button").forEach((button) => {
        button.setAttribute("aria-label", adminText("cueFormatAction", {
          action: button.textContent.trim(),
          number: formatInteger(index + 1)
        }));
      });
      transcriptEditors.set(cue.id, editor);
      return row;
    });
    transcriptCuesRoot.replaceChildren(...rows);
    transcriptAddButton.hidden = !canEditTranscripts;
    transcriptSaveButton.hidden = !canEditTranscripts;
    syncReviewDraftButton(transcriptSaveButton, transcriptDirty, adminText);
    transcriptApproveButton.hidden = !canApproveTranscripts;
    transcriptApproveButton.disabled = !canApproveTranscripts
      || Number(transcript.revision || 0) < 1
      || transcript.status === "approved"
      || transcriptDirty
      || transcript.speakerLabelsConfirmed !== true;
    updateClipAvailability();
  }

  function addTranscriptCue() {
    if (!transcript || !canEditTranscripts) return;
    try {
      const cues = syncVisibleTranscriptCues({ requireText: false });
      const last = cues.at(-1);
      const startsAtMs = last?.endsAtMs || 0;
      const episodeEndMs = transcriptDurationSeconds === null
        ? null
        : Math.round(transcriptDurationSeconds * 1_000);
      if (episodeEndMs !== null && startsAtMs >= episodeEndMs) {
        throw new Error(
          adminText(
            "lastCueAtDuration"
          )
        );
      }
      const endsAtMs = episodeEndMs === null
        ? startsAtMs + 5_000
        : Math.min(startsAtMs + 5_000, episodeEndMs);
      transcript.cues = cues.concat(newTranscriptCue(startsAtMs, endsAtMs));
      transcriptPage = Math.floor(
        (transcript.cues.length - 1) / TRANSCRIPT_CUES_PER_PAGE
      );
      transcriptDirty = true;
      renderTranscript();
      transcriptCuesRoot.lastElementChild?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    } catch (error) {
      setStatus(transcriptStatus, transcriptInputError(error), true);
    }
  }

  function removeTranscriptCue(cueId) {
    if (!transcript || !canEditTranscripts) return;
    try {
      const cues = syncVisibleTranscriptCues({ requireText: false });
      if (cues.length <= 1) {
        throw new Error(adminText(
          "transcriptNeedsCue"
        ));
      }
      transcript.cues = cues.filter(({ id }) => id !== cueId);
      transcriptPage = Math.min(
        transcriptPage,
        Math.max(
          0,
          Math.ceil(transcript.cues.length / TRANSCRIPT_CUES_PER_PAGE) - 1
        )
      );
      transcriptDirty = true;
      renderTranscript();
    } catch (error) {
      setStatus(transcriptStatus, transcriptInputError(error), true);
    }
  }

  async function saveTranscript() {
    if (!transcript || !canEditTranscripts) return;
    transcriptSaveButton.disabled = true;
    transcriptAddButton.disabled = true;
    setStatus(
      transcriptStatus,
      adminText("savingTranscriptDraft")
    );
    try {
      const episodeId = transcriptEpisodeSelect.value;
      const language = transcriptLanguageSelect.value;
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/transcripts/${encodeURIComponent(language)}`,
        {
          method: "PUT",
          body: {
            mutationId: operationId("transcript_edit"),
            baseRevision: Number(transcript.revision || 0),
            cues: syncVisibleTranscriptCues()
          }
        }
      );
      transcript = payload.transcript;
      transcriptDirty = false;
      renderTranscript();
      setStatus(
        transcriptStatus,
        adminText(
          "transcriptDraftSaved"
        )
      );
      await refreshReviewEvidenceForEpisode(episodeId);
    } catch (error) {
      setStatus(
        transcriptStatus,
        error instanceof AdminApiError
          ? friendlyError(error)
          : transcriptInputError(error),
        true
      );
    } finally {
      syncReviewDraftButton(transcriptSaveButton, transcriptDirty, adminText);
      transcriptAddButton.disabled = false;
    }
  }

  async function approveTranscript() {
    if (!transcript || !canApproveTranscripts) return;
    if (transcriptDirty) {
      setStatus(
        transcriptStatus,
        adminText(
          "saveCueEditsFirst"
        ),
        true
      );
      return;
    }
    transcriptApproveButton.disabled = true;
    setStatus(
      transcriptStatus,
      adminText("approvingTranscript")
    );
    try {
      const episodeId = transcriptEpisodeSelect.value;
      const language = transcriptLanguageSelect.value;
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/transcripts/${encodeURIComponent(language)}/approve`,
        {
          method: "POST",
          body: {
            approvalId: operationId("transcript_approval"),
            expectedRevision: Number(transcript.revision)
          }
        }
      );
      transcript = payload.transcript;
      transcriptDirty = false;
      renderTranscript();
      setStatus(
        transcriptStatus,
        transcript.alignment?.wordControlsEnabled
          ? adminText(
              "transcriptApprovedAligned"
            )
          : adminText(
              "transcriptApprovedLocked"
            )
      );
      await refreshReviewEvidenceForEpisode(episodeId);
    } catch (error) {
      setStatus(transcriptStatus, friendlyError(error), true);
    } finally {
      if (transcript) renderTranscript();
    }
  }

  function moveTranscriptPage(offset) {
    if (!transcript) return;
    try {
      syncVisibleTranscriptCues({ requireText: false });
      const pageCount = Math.max(
        1,
        Math.ceil(transcript.cues.length / TRANSCRIPT_CUES_PER_PAGE)
      );
      transcriptPage = Math.max(
        0,
        Math.min(pageCount - 1, transcriptPage + offset)
      );
      renderTranscript();
    } catch (error) {
      setStatus(transcriptStatus, transcriptInputError(error), true);
    }
  }

  function openTranscriptCue(cueIndex) {
    try {
      navigateToTranscriptReviewCue({
        cueIndex,
        cues: transcript?.cues,
        cuesPerPage: TRANSCRIPT_CUES_PER_PAGE,
        syncVisibleCues: () =>
          syncVisibleTranscriptCues({ requireText: false }),
        showPage: (page) => {
          transcriptPage = page;
          renderTranscript();
        },
        cuesRoot: transcriptCuesRoot
      });
    } catch (error) {
      setStatus(transcriptStatus, transcriptInputError(error), true);
    }
  }

  function syncVisibleTranscriptCues({ requireText = true } = {}) {
    const visibleCues = collectVisibleTranscriptCues({ requireText });
    const visibleById = new Map(
      visibleCues.map((cue) => [cue.id, cue])
    );
    transcript.cues = transcript.cues.map(
      (cue) => visibleById.get(cue.id) || cue
    );
    if (requireText) {
      const missingIndex = transcript.cues.findIndex(
        ({ textMarkdown }) => !String(textMarkdown || "").trim()
      );
      if (missingIndex >= 0) {
        throw new Error(adminText(
          "cueNeedsCaption",
          { number: formatInteger(missingIndex + 1) }
        ));
      }
    }
    return transcript.cues;
  }

  function collectVisibleTranscriptCues({ requireText = true } = {}) {
    const rows = Array.from(
      transcriptCuesRoot?.querySelectorAll("[data-transcript-cue-id]") || []
    );
    if (!rows.length) {
      throw new Error(adminText(
        "addTranscriptCue"
      ));
    }
    return rows.map((row, index) => {
      const cueNumber =
        transcriptPage * TRANSCRIPT_CUES_PER_PAGE + index + 1;
      const startsAtMs = secondsToMilliseconds(
        row.querySelector("[data-transcript-start]").value,
        adminText(
          "cueStart",
          { number: formatInteger(cueNumber) }
        )
      );
      const endsAtMs = secondsToMilliseconds(
        row.querySelector("[data-transcript-end]").value,
        adminText(
          "cueEnd",
          { number: formatInteger(cueNumber) }
        )
      );
      const speakerLabel = row
        .querySelector("[data-transcript-speaker]")
        .value
        .trim();
      const textMarkdown = transcriptEditors
        .get(row.dataset.transcriptCueId)
        ?.getMarkdown()
        .trim();
      if (requireText && !textMarkdown) {
        throw new Error(adminText(
          "cueNeedsCaption",
          { number: formatInteger(cueNumber) }
        ));
      }
      return {
        id: row.dataset.transcriptCueId,
        startsAtMs,
        endsAtMs,
        speakerLabel,
        speakerConfirmed: speakerLabel
          ? row.querySelector("[data-transcript-speaker-confirmed]").checked
          : false,
        textMarkdown
      };
    });
  }

  async function loadChapters() {
    const episodeId = chapterEpisodeSelect?.value;
    const episode = episodes.find(({ id }) => id === episodeId);
    chapterDraftAssistant.setEpisode(
      episodeId,
      episode?.sourceLanguage === "en" ? "en" : "es"
    );
    const requestId = ++chapterRequestId;
    chapterRowsRoot?.replaceChildren();
    chapterDirty = false;
    if (!episodeId) {
      chapterSet = null;
      if (chapterWorkbench) chapterWorkbench.hidden = true;
      if (chapterMeta) {
        chapterMeta.textContent = adminText(
          "createBeforeChapters"
        );
      }
      return;
    }
    if (chapterWorkbench) chapterWorkbench.hidden = false;
    setStatus(
      chapterStatus,
      adminText("loadingChapterReview")
    );
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/chapters`
      );
      if (requestId !== chapterRequestId) return;
      chapterSet = payload.chapterSet || emptyChapterSet(episodeId);
      chapterDirty = false;
      renderChapters();
      setStatus(chapterStatus, "");
    } catch (error) {
      if (requestId !== chapterRequestId) return;
      chapterSet = null;
      chapterRowsRoot?.replaceChildren();
      setStatus(chapterStatus, friendlyError(error), true);
    }
  }

  function renderChapters() {
    if (!chapterSet || !chapterRowsRoot) return;
    const episode = episodes.find(
      ({ id }) => id === chapterEpisodeSelect?.value
    );
    if (chapterMeta) {
      const chapterCount = Number(chapterSet.chapters?.length || 0);
      chapterMeta.textContent = [
        episode?.title || adminText("episodeFallback"),
        adminText(
          "transcriptRevision",
          { revision: Number(chapterSet.revision || 0) }
        ),
        localizedCode("chapterStatus", chapterSet.status || "needs_review"),
        adminText(
          "chapterCount",
          {
            count: formatInteger(chapterCount),
            chapters: chapterCount === 1
              ? adminText("chapterSingular")
              : adminText("chapterPlural")
          }
        )
      ].join(" · ");
    }
    const chapters = chapterSet.chapters?.length
      ? chapterSet.chapters
      : [newChapter(0)];
    chapterSet.chapters = chapters;
    const rows = chapters.map((chapter, index) => {
      const row = document.createElement("article");
      row.className = "podcast-admin__chapter-row";
      row.dataset.podcastChapterId = chapter.id;
      row.innerHTML = `
        <div class="podcast-admin__transcript-cue-heading">
          <h3>${escapeHtml(adminText(
            "chapterHeading",
            { number: formatInteger(index + 1) }
          ))}</h3>
          <button
            class="btn btn-outline-light"
            type="button"
            data-podcast-chapter-remove="${escapeAttribute(chapter.id)}">
            ${escapeHtml(adminText("remove"))}
          </button>
        </div>
        <div class="podcast-admin__field-grid">
          <label>${escapeHtml(adminText("startSeconds"))}
            <input data-chapter-start type="number" min="0" step="0.001" required>
          </label>
          <label>${escapeHtml(adminText("titleLabel"))}
            <input data-chapter-title maxlength="160" required>
          </label>
        </div>
        <div class="podcast-admin__field-grid">
          <label>${escapeHtml(adminText(
            "relatedHttpsLink"
          ))}
            <input data-chapter-url type="url" inputmode="url" maxlength="2048">
          </label>
          <label>${escapeHtml(adminText(
            "httpsArtworkUrl"
          ))}
            <input data-chapter-image-url type="url" inputmode="url" maxlength="2048">
          </label>
        </div>
        <label class="podcast-admin__checkbox">
          <input data-chapter-toc type="checkbox">
          ${escapeHtml(adminText(
            "showInChapterToc"
          ))}
        </label>`;
      row.querySelector("[data-chapter-start]").value =
        millisecondsToSeconds(chapter.startsAtMs);
      row.querySelector("[data-chapter-title]").value = chapter.title || "";
      row.querySelector("[data-chapter-url]").value = chapter.url || "";
      row.querySelector("[data-chapter-image-url]").value =
        chapter.imageUrl || "";
      row.querySelector("[data-chapter-toc]").checked = chapter.toc !== false;
      row.querySelectorAll("input").forEach((input) => {
        input.disabled = !canEditChapters;
      });
      row.querySelector("[data-podcast-chapter-remove]").disabled =
        !canEditChapters || chapters.length === 1;
      return row;
    });
    chapterRowsRoot.replaceChildren(...rows);
    chapterAddButton.hidden = !canEditChapters;
    chapterSaveButton.hidden = !canEditChapters;
    syncReviewDraftButton(chapterSaveButton, chapterDirty, adminText);
    chapterApproveButton.hidden = !canApproveChapters;
    chapterApproveButton.disabled = !canApproveChapters
      || Number(chapterSet.revision || 0) < 1
      || chapterSet.status === "approved"
      || chapterDirty;
  }

  function markChaptersDirty() {
    if (!chapterSet || !canEditChapters) return;
    chapterDirty = true;
    syncReviewDraftButton(chapterSaveButton, true, adminText);
    if (chapterApproveButton) chapterApproveButton.disabled = true;
  }

  function addChapter() {
    if (!chapterSet || !canEditChapters) return;
    try {
      const chapters = collectChapters({ requireTitles: false });
      const lastStart = chapters.at(-1)?.startsAtMs ?? -1;
      const durationMs = Number.isFinite(Number(chapterSet.durationSeconds))
        ? Math.round(Number(chapterSet.durationSeconds) * 1_000)
        : null;
      let startsAtMs = lastStart < 0 ? 0 : lastStart + 120_000;
      if (durationMs !== null && startsAtMs >= durationMs) {
        startsAtMs = durationMs - 1_000;
      }
      if (startsAtMs <= lastStart || startsAtMs < 0) {
        throw new Error(
          adminText(
            "noChapterTimeRemaining"
          )
        );
      }
      chapterSet.chapters = chapters.concat(newChapter(startsAtMs));
      chapterDirty = true;
      renderChapters();
      chapterRowsRoot.lastElementChild?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    } catch (error) {
      setStatus(chapterStatus, chapterInputError(error), true);
    }
  }

  function removeChapter(chapterId) {
    if (!chapterSet || !canEditChapters) return;
    try {
      const chapters = collectChapters({ requireTitles: false });
      if (chapters.length <= 1) {
        throw new Error(adminText(
          "approvedChaptersNeedOne"
        ));
      }
      chapterSet.chapters = chapters.filter(({ id }) => id !== chapterId);
      chapterDirty = true;
      renderChapters();
    } catch (error) {
      setStatus(chapterStatus, chapterInputError(error), true);
    }
  }

  function collectChapters({ requireTitles = true } = {}) {
    const rows = Array.from(
      chapterRowsRoot?.querySelectorAll("[data-podcast-chapter-id]") || []
    );
    if (!rows.length) {
      throw new Error(adminText(
        "addAtLeastOneChapter"
      ));
    }
    const durationMs = Number.isFinite(Number(chapterSet?.durationSeconds))
      ? Math.round(Number(chapterSet.durationSeconds) * 1_000)
      : null;
    let previousStart = -1;
    return rows.map((row, index) => {
      const startsAtMs = secondsToMilliseconds(
        row.querySelector("[data-chapter-start]").value,
        adminText(
          "chapterStart",
          { number: formatInteger(index + 1) }
        )
      );
      if (index === 0 && startsAtMs !== 0) {
        throw new Error(adminText(
          "firstChapterAtZero"
        ));
      }
      if (startsAtMs <= previousStart) {
        throw new Error(adminText(
          "chapterAfterPrevious",
          { number: formatInteger(index + 1) }
        ));
      }
      if (durationMs !== null && startsAtMs >= durationMs) {
        throw new Error(adminText(
          "chapterOutsideDuration",
          { number: formatInteger(index + 1) }
        ));
      }
      previousStart = startsAtMs;
      const title = row.querySelector("[data-chapter-title]").value.trim();
      if (requireTitles && !title) {
        throw new Error(adminText(
          "chapterNeedsTitle",
          { number: formatInteger(index + 1) }
        ));
      }
      const url = checkedHttpsUrl(
        row.querySelector("[data-chapter-url]").value,
        adminText(
          "chapterLink",
          { number: formatInteger(index + 1) }
        )
      );
      const imageUrl = checkedHttpsUrl(
        row.querySelector("[data-chapter-image-url]").value,
        adminText(
          "chapterArtwork",
          { number: formatInteger(index + 1) }
        )
      );
      return {
        id: row.dataset.podcastChapterId,
        startsAtMs,
        title,
        url,
        imageUrl,
        toc: row.querySelector("[data-chapter-toc]").checked
      };
    });
  }

  async function saveChapters() {
    if (!chapterSet || !canEditChapters) return;
    chapterSaveButton.disabled = true;
    chapterAddButton.disabled = true;
    setStatus(
      chapterStatus,
      adminText("savingChapterDraft")
    );
    try {
      const episodeId = chapterEpisodeSelect.value;
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/chapters`,
        {
          method: "PUT",
          body: {
            mutationId: operationId("chapter_edit"),
            baseRevision: Number(chapterSet.revision || 0),
            chapters: collectChapters()
          }
        }
      );
      chapterSet = payload.chapterSet;
      chapterDirty = false;
      renderChapters();
      setStatus(
        chapterStatus,
        adminText(
          "chapterDraftSaved"
        )
      );
      await refreshReviewEvidenceForEpisode(episodeId);
    } catch (error) {
      setStatus(
        chapterStatus,
        error instanceof AdminApiError
          ? friendlyError(error)
          : chapterInputError(error),
        true
      );
    } finally {
      syncReviewDraftButton(chapterSaveButton, chapterDirty, adminText);
      chapterAddButton.disabled = false;
    }
  }

  async function approveChapters() {
    if (!chapterSet || !canApproveChapters) return;
    if (chapterDirty) {
      setStatus(
        chapterStatus,
        adminText(
          "saveChapterEditsFirst"
        ),
        true
      );
      return;
    }
    chapterApproveButton.disabled = true;
    setStatus(
      chapterStatus,
      adminText("approvingChapters")
    );
    try {
      const episodeId = chapterEpisodeSelect.value;
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/chapters/approve`,
        {
          method: "POST",
          body: {
            approvalId: operationId("chapter_approval"),
            expectedRevision: Number(chapterSet.revision)
          }
        }
      );
      chapterSet = payload.chapterSet;
      chapterDirty = false;
      renderChapters();
      setStatus(
        chapterStatus,
        adminText(
          "chaptersApproved"
        )
      );
      await refreshReviewEvidenceForEpisode(episodeId);
    } catch (error) {
      setStatus(chapterStatus, friendlyError(error), true);
    } finally {
      if (chapterSet) renderChapters();
    }
  }

  async function loadAudioQcPolicy() {
    const showId = selectedShowId;
    const requestId = ++audioQcPolicyRequestId;
    audioQcPolicy = null;
    if (audioQcPolicyForm) audioQcPolicyForm.hidden = true;
    if (!showId) {
      if (audioQcPolicySummary) {
        audioQcPolicySummary.textContent = adminText("chooseShowForPolicy");
      }
      setStatus(audioQcPolicyStatus, "");
      return;
    }
    if (audioQcPolicySummary) {
      audioQcPolicySummary.textContent = adminText("loadingMeasurementPolicy");
    }
    setStatus(audioQcPolicyStatus, "");
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(showId)}/audio-qc-policy`
      );
      if (
        requestId !== audioQcPolicyRequestId
        || showId !== selectedShowId
      ) return;
      audioQcPolicy = payload.policy || null;
      renderAudioQcPolicy();
    } catch (error) {
      if (
        requestId !== audioQcPolicyRequestId
        || showId !== selectedShowId
      ) return;
      if (audioQcPolicySummary) {
        audioQcPolicySummary.textContent = adminText("measurementPolicyFailed");
      }
      setStatus(audioQcPolicyStatus, friendlyError(error), true);
    }
  }

  function renderAudioQcPolicy() {
    if (!audioQcPolicy || !audioQcPolicySummary) return;
    audioQcPolicySummary.textContent = [
      adminText("policyRevision", {
        revision: formatInteger(audioQcPolicy.revision)
      }),
      adminText("policyCompactMono", {
        value: Number(audioQcPolicy.monoIntegratedLufs)
      }),
      adminText("policyCompactStereo", {
        value: Number(audioQcPolicy.stereoIntegratedLufs)
      }),
      adminText("policyCompactTolerance", {
        value: Number(audioQcPolicy.integratedLufsTolerance)
      }),
      adminText("policyCompactTruePeak", {
        value: Number(audioQcPolicy.maximumTruePeakDbtp)
      }),
      adminText("policyCompactSilence", {
        value: Number(audioQcPolicy.silenceThresholdDb)
      })
    ].join(" · ");
    if (!audioQcPolicyForm) return;
    audioQcPolicyForm.hidden = !canManageAudioQcPolicy;
    if (audioQcPolicyForm.hidden) return;
    for (const field of AUDIO_QC_POLICY_FIELDS) {
      audioQcPolicyForm.elements[field].value =
        String(audioQcPolicy[field]);
    }
  }

  async function saveAudioQcPolicy(event) {
    event.preventDefault();
    if (
      !selectedShowId
      || !canManageAudioQcPolicy
      || !audioQcPolicy
      || !audioQcPolicyForm
    ) return;
    const showId = selectedShowId;
    const button = audioQcPolicyForm.querySelector(
      'button[type="submit"]'
    );
    button.disabled = true;
    setStatus(
      audioQcPolicyStatus,
      adminText("savingQcThresholds")
    );
    try {
      const policyValues = Object.fromEntries(
        AUDIO_QC_POLICY_FIELDS.map((field) => [
          field,
          audioQcPolicyForm.elements[field].valueAsNumber
        ])
      );
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(showId)}/audio-qc-policy`,
        {
          method: "PATCH",
          body: {
            baseRevision: Number(audioQcPolicy.revision),
            ...policyValues
          }
        }
      );
      if (showId !== selectedShowId) return;
      audioQcPolicy = payload.policy || null;
      renderAudioQcPolicy();
      setStatus(
        audioQcPolicyStatus,
        adminText("policyRevisionSaved", {
          revision: formatInteger(audioQcPolicy?.revision)
        })
      );
      await Promise.all([loadAudioQc(), loadAudioMaster()]);
    } catch (error) {
      if (showId === selectedShowId) {
        setStatus(audioQcPolicyStatus, friendlyError(error), true);
      }
    } finally {
      button.disabled = false;
    }
  }

  async function loadAudioQc() {
    const episodeId = audioQcEpisodeSelect?.value || "";
    const requestId = ++audioQcRequestId;
    audioQcState = null;
    audioQcResults?.replaceChildren();
    if (!episodeId) {
      if (audioQcSummary) {
        audioQcSummary.textContent = adminText("createBeforeQc");
      }
      if (audioQcQueue) audioQcQueue.disabled = true;
      setStatus(audioQcStatus, "");
      return;
    }
    if (audioQcQueue) audioQcQueue.disabled = true;
    setStatus(audioQcStatus, adminText("loadingAudioQc"));
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/audio-qc`
      );
      if (requestId !== audioQcRequestId) return;
      audioQcState = payload;
      renderAudioQc();
      setStatus(audioQcStatus, "");
    } catch (error) {
      if (requestId !== audioQcRequestId) return;
      if (audioQcSummary) {
        audioQcSummary.textContent = adminText("audioQcFailed");
      }
      setStatus(audioQcStatus, friendlyError(error), true);
    }
  }

  function renderAudioQc() {
    if (
      !audioQcState
      || !audioQcSummary
      || !audioQcResults
    ) return;
    const source = audioQcState.source;
    const policy = audioQcState.policy || {};
    const processor = audioQcState.processor || {};
    const runs = Array.isArray(audioQcState.runs)
      ? audioQcState.runs
      : [];
    audioQcSummary.textContent = source
      ? [
          adminText("sourceFile", {
            filename: String(source.filename || adminText("privateAudio"))
          }),
          formatBytes(Number(source.objectBytes || 0)),
          adminText("policyShort", {
            revision: formatInteger(policy.revision)
          }),
          processor.available
            ? adminText("signedStagingProcessorReady")
            : adminText("processorUnavailable")
        ].join(" · ")
      : adminText("uploadBeforeQc");
    if (audioQcQueue) {
      audioQcQueue.disabled =
        !canRunAudioQc || !source || !processor.available;
    }
    if (!runs.length) {
      const empty = document.createElement("p");
      empty.className = "podcast-admin__empty";
      empty.textContent = adminText("noQcReport");
      audioQcResults.replaceChildren(empty);
      return;
    }
    audioQcResults.replaceChildren(...runs.map(renderAudioQcRun));
  }

  function renderAudioQcRun(run) {
    const article = document.createElement("article");
    const status = String(run.status || "queued");
    article.className =
      `podcast-admin__readiness-card is-${audioQcCardStatus(status)}`;
    const heading = document.createElement("div");
    heading.className = "podcast-admin__readiness-card-heading";
    const title = document.createElement("h3");
    title.textContent = adminText("qcRun", { id: String(run.id || "") });
    const pill = document.createElement("span");
    pill.className = "podcast-admin__pill";
    pill.textContent = status;
    heading.append(title, pill);
    const summary = document.createElement("p");
    if (status === "succeeded") {
      const values = run.summary || {};
      const blockerCount = Number(values.blockerCount || 0);
      const warningCount = Number(values.warningCount || 0);
      summary.textContent = [
        adminText("blockersCount", {
          count: formatInteger(blockerCount),
          blockers: blockerCount === 1
            ? adminText("blockerSingular")
            : adminText("blockerPlural")
        }),
        adminText("warningsCount", {
          count: formatInteger(warningCount),
          warnings: warningCount === 1
            ? adminText("warningSingular")
            : adminText("warningPlural")
        }),
        `${Number(values.integratedLufs || 0)} LUFS`,
        `${Number(values.truePeakDbtp || 0)} dBTP`,
        formatDurationMilliseconds(Number(values.durationMs || 0))
      ].join(" · ");
    } else if (status === "failed") {
      summary.textContent = adminText("processorFailedSafely", {
        code: humanizeCode(run.failureCode || "processor_failed")
      });
    } else {
      summary.textContent = adminText("qcQueuedNoChange");
    }
    article.append(heading, summary);
    if (status === "succeeded") {
      const report = run.report || {};
      const quality = report.quality || {};
      const findings = Array.isArray(quality.findings)
        ? quality.findings
        : [];
      const details = document.createElement("details");
      const detailsSummary = document.createElement("summary");
      detailsSummary.textContent = findings.length
        ? adminText("reviewMeasuredFindings", {
            count: formatInteger(findings.length),
            findings: findings.length === 1
              ? adminText("findingSingular")
              : adminText("findingPlural")
          })
        : adminText("reviewCleanEvidence");
      const list = document.createElement("ul");
      list.className = "podcast-admin__audio-qc-findings";
      if (!findings.length) {
        const item = document.createElement("li");
        item.textContent = adminText("noQcFindings");
        list.append(item);
      } else {
        for (const finding of findings) {
          const item = document.createElement("li");
          const label = document.createElement("strong");
          label.textContent =
            `${humanizeCode(finding.code)} · ${String(finding.severity)}`;
          const evidence = document.createElement("span");
          evidence.textContent = [
            `${Number(finding.measured)} ${String(finding.unit || "")}`,
            adminText("limitLabel", {
              value: Number(finding.limit),
              unit: String(finding.unit || "")
            }),
            String(finding.remediation || "")
          ].join(" · ");
          item.append(label, evidence);
          list.append(item);
        }
      }
      details.append(detailsSummary, list);
      article.append(details);
    }
    return article;
  }

  async function queueAudioQc() {
    const episodeId = audioQcEpisodeSelect?.value || "";
    if (!episodeId || !canRunAudioQc || !audioQcState?.source) return;
    audioQcQueue.disabled = true;
    setStatus(audioQcStatus, adminText("snapshottingQc"));
    try {
      const runId = `qc_${crypto.randomUUID().replace(/-/g, "")}`;
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/audio-qc`,
        {
          method: "POST",
          body: { runId }
        }
      );
      await Promise.all([loadAudioQc(), loadAudioMaster()]);
      setStatus(
        audioQcStatus,
        adminText("qcRunQueued", { id: String(payload.run?.id || runId) })
      );
    } catch (error) {
      setStatus(audioQcStatus, friendlyError(error), true);
      renderAudioQc();
    }
  }

  function audioQcCardStatus(status) {
    if (
      status === "succeeded"
      || status === "ready"
      || status === "approved"
    ) return "ready";
    if (status === "failed" || status === "stale") return "failed";
    return "pending";
  }

  async function loadAudioMaster() {
    const episodeId = audioMasterEpisodeSelect?.value || "";
    const requestId = ++audioMasterRequestId;
    audioMasterState = null;
    releaseAudioMasterPlayers();
    audioMasterCurrent?.replaceChildren();
    audioEnhancementResults?.replaceChildren();
    if (!episodeId) {
      if (audioMasterSummary) {
        audioMasterSummary.textContent = adminText("createBeforeMaster");
      }
      if (audioMasterApprovalForm) audioMasterApprovalForm.hidden = true;
      if (audioEnhancementForm) audioEnhancementForm.hidden = true;
      setStatus(audioMasterApprovalStatus, "");
      setStatus(audioEnhancementStatus, "");
      audioDerivatives.reset();
      return;
    }
    if (audioMasterRefresh) audioMasterRefresh.disabled = true;
    if (audioMasterSummary) {
      audioMasterSummary.textContent = adminText("loadingWorkingMaster");
    }
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/audio-master`
      );
      if (requestId !== audioMasterRequestId) return;
      audioMasterState = payload;
      setStatus(audioMasterApprovalStatus, "");
      setStatus(audioEnhancementStatus, "");
      await audioDerivatives.load(
        episodeId,
        Number(payload.state?.revision || 0)
      );
      if (requestId !== audioMasterRequestId) return;
      renderAudioMaster();
    } catch (error) {
      if (requestId !== audioMasterRequestId) return;
      if (audioMasterSummary) {
        audioMasterSummary.textContent = adminText("workingMasterFailed");
      }
      if (audioMasterApprovalForm) audioMasterApprovalForm.hidden = true;
      if (audioEnhancementForm) audioEnhancementForm.hidden = true;
      setStatus(audioEnhancementStatus, friendlyError(error), true);
    } finally {
      if (
        requestId === audioMasterRequestId
        && audioMasterRefresh
      ) {
        audioMasterRefresh.disabled = false;
      }
    }
  }

  function renderAudioMaster() {
    if (
      !audioMasterState
      || !audioMasterSummary
      || !audioMasterCurrent
      || !audioEnhancementResults
    ) return;
    releaseAudioMasterPlayers();
    const state = audioMasterState.state || {};
    const current = audioMasterState.current;
    const eligible = audioMasterState.eligibleSource;
    const processor = audioMasterState.processor || {};
    audioMasterSummary.textContent = current
      ? [
          adminText("workingMasterRevision", {
            revision: formatInteger(current.revision)
          }),
          localizedCode(
            "originKind",
            current.originKind || "source_original"
          ),
          formatBytes(Number(current.objectBytes || 0)),
          adminText("approvedAt", { date: formatDate(current.approvedAt) })
        ].join(" · ")
      : eligible
        ? [
            adminText("noWorkingMaster"),
            adminText("qcWarnings", {
              count: formatInteger(eligible.warningCount),
              warnings: Number(eligible.warningCount || 0) === 1
                ? adminText("warningSingular")
                : adminText("warningPlural")
            }),
            formatBytes(Number(eligible.objectBytes || 0)),
            adminText("policyShort", {
              revision: formatInteger(eligible.policyRevision)
            })
          ].join(" · ")
        : adminText("runQcBeforeMaster");
    audioMasterCurrent.replaceChildren(
      current
        ? renderCurrentAudioMaster(current)
        : emptyAudioMasterMessage(adminText("noExactWorkingMaster"))
    );
    if (audioMasterApprovalForm) {
      audioMasterApprovalForm.hidden =
        !canApproveAudioMasters || !eligible;
      const button = audioMasterApprovalForm.querySelector(
        'button[type="submit"]'
      );
      if (button) {
        button.textContent = current
          ? adminText("replaceWorkingMaster")
          : adminText("approveWorkingMaster");
      }
    }
    if (audioEnhancementForm) {
      audioEnhancementForm.hidden =
        !canRunAudioEnhancements || !eligible || !processor.available;
      fillAudioEnhancementPresets();
      constrainEnhancementWindow(eligible);
    }
    const previews = Array.isArray(audioMasterState.previews)
      ? audioMasterState.previews
      : [];
    audioEnhancementResults.replaceChildren(
      ...(previews.length
        ? previews.map(renderAudioEnhancementPreview)
        : [emptyAudioMasterMessage(adminText("noEnhancementComparisons"))])
    );
    window.DWDigestAudio?.mount(audioEnhancementResults);
  }

  function renderCurrentAudioMaster(master) {
    const article = document.createElement("article");
    article.className = "podcast-admin__readiness-card is-ready";
    const heading = document.createElement("div");
    heading.className = "podcast-admin__readiness-card-heading";
    const title = document.createElement("h3");
    title.textContent = adminText("currentWorkingMaster", {
      revision: formatInteger(master.revision)
    });
    const pill = document.createElement("span");
    pill.className = "podcast-admin__pill";
    pill.textContent = adminText("approvedGeneric");
    heading.append(title, pill);
    const summary = document.createElement("p");
    summary.textContent = [
      localizedCode(
        "originKind",
        master.originKind || "source_original"
      ),
      formatBytes(Number(master.objectBytes || 0)),
      String(master.mimeType || "private audio")
    ].join(" · ");
    const evidence = document.createElement("dl");
    evidence.className = "podcast-admin__readiness-evidence";
    appendEvidenceRow(
      evidence,
      adminText("sourceSha256"),
      String(master.sourceSha256 || "")
    );
    appendEvidenceRow(
      evidence,
      adminText("qcReportSha256"),
      String(master.qualityControlReportSha256 || "")
    );
    appendEvidenceRow(
      evidence,
      adminText("approvalReason"),
      String(master.approvalReason || "")
    );
    article.append(heading, summary, evidence);
    return article;
  }

  function appendEvidenceRow(rootElement, label, value) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value || adminText("none");
    rootElement.append(term, description);
  }

  function emptyAudioMasterMessage(message) {
    const empty = document.createElement("p");
    empty.className = "podcast-admin__empty";
    empty.textContent = message;
    return empty;
  }

  function fillAudioEnhancementPresets() {
    if (!audioEnhancementForm) return;
    const select = audioEnhancementForm.elements.presetId;
    const presets = Array.isArray(audioMasterState?.presets)
      ? audioMasterState.presets
      : [];
    const selected = select.value;
    select.replaceChildren(...presets.map((preset) =>
      new Option(
        `${localizedCode(
          "audioPreset",
          preset.id || preset.label
        )} — ${adminText(
          `audioPresetDescription_${String(preset.id || "")}`,
          String(preset.description || "")
        )}`,
        String(preset.id || ""),
        false,
        preset.id === selected
      )
    ));
  }

  function constrainEnhancementWindow(eligible) {
    if (!audioEnhancementForm || !eligible) return;
    const durationSeconds = Math.max(
      0,
      Number(eligible.durationMs || 0) / 1_000
    );
    const start = audioEnhancementForm.elements.previewStartSeconds;
    const length = audioEnhancementForm.elements.previewDurationSeconds;
    start.max = String(Math.max(0, durationSeconds - 5));
    length.max = String(Math.min(90, durationSeconds));
    if (Number(length.value) > Number(length.max)) {
      length.value = String(Math.floor(Number(length.max)));
    }
  }

  async function approveSourceWorkingMaster(event) {
    event.preventDefault();
    const episodeId = audioMasterEpisodeSelect?.value || "";
    const eligible = audioMasterState?.eligibleSource;
    const state = audioMasterState?.state;
    if (
      !episodeId
      || !eligible
      || !state
      || !canApproveAudioMasters
      || !audioMasterApprovalForm
    ) return;
    const button = audioMasterApprovalForm.querySelector(
      'button[type="submit"]'
    );
    button.disabled = true;
    setStatus(
      audioMasterApprovalStatus,
      adminText("bindingWorkingMaster")
    );
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/`
          + "audio-master/approve-source",
        {
          method: "POST",
          body: {
            masterId: operationId("master"),
            baseRevision: Number(state.revision || 0),
            qualityControlRunId: String(
              eligible.qualityControlRunId || ""
            ),
            approvalReason:
              audioMasterApprovalForm.elements.approvalReason.value,
            acknowledgeExactSource:
              audioMasterApprovalForm.elements.acknowledgeExactSource.checked
          }
        }
      );
      audioMasterApprovalForm.reset();
      await Promise.all([
        loadAudioMaster(),
        loadProductionReviews(),
        loadPublicationReadiness(episodeId)
      ]);
      setStatus(
        audioMasterApprovalStatus,
        adminText("workingMasterApproved", {
          revision: formatInteger(payload.master?.revision)
        })
      );
    } catch (error) {
      setStatus(
        audioMasterApprovalStatus,
        friendlyError(error),
        true
      );
    } finally {
      button.disabled = false;
    }
  }

  async function queueAudioEnhancementPreview(event) {
    event.preventDefault();
    const episodeId = audioMasterEpisodeSelect?.value || "";
    const eligible = audioMasterState?.eligibleSource;
    if (
      !episodeId
      || !eligible
      || !canRunAudioEnhancements
      || !audioEnhancementForm
    ) return;
    const button = audioEnhancementForm.querySelector(
      'button[type="submit"]'
    );
    button.disabled = true;
    setStatus(
      audioEnhancementStatus,
      adminText("snapshottingEnhancement")
    );
    try {
      const jobId = operationId("enhance");
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/`
          + "audio-enhancement-previews",
        {
          method: "POST",
          body: {
            jobId,
            qualityControlRunId: String(
              eligible.qualityControlRunId || ""
            ),
            presetId: audioEnhancementForm.elements.presetId.value,
            previewStartMs: Math.round(
              Number(
                audioEnhancementForm.elements.previewStartSeconds.value
              ) * 1_000
            ),
            previewDurationMs: Math.round(
              Number(
                audioEnhancementForm.elements.previewDurationSeconds.value
              ) * 1_000
            )
          }
        }
      );
      await loadAudioMaster();
      setStatus(
        audioEnhancementStatus,
        adminText("enhancementPreviewQueued", {
          id: String(payload.preview?.id || jobId)
        })
      );
    } catch (error) {
      setStatus(audioEnhancementStatus, friendlyError(error), true);
      renderAudioMaster();
    } finally {
      button.disabled = false;
    }
  }

  function renderAudioEnhancementPreview(preview) {
    const article = document.createElement("article");
    const status = String(preview.status || "queued");
    article.className =
      `podcast-admin__readiness-card is-${audioQcCardStatus(status)}`;
    const heading = document.createElement("div");
    heading.className = "podcast-admin__readiness-card-heading";
    const title = document.createElement("h3");
    title.textContent = adminText("abPreview", {
      id: String(preview.id || "")
    });
    const pill = document.createElement("span");
    pill.className = "podcast-admin__pill";
    pill.textContent = localizedCode("jobStatus", status);
    heading.append(title, pill);
    const recipe = preview.recipe || {};
    const summary = document.createElement("p");
    summary.textContent = [
      localizedCode("audioPreset", recipe.presetId || "preset"),
      adminText("startsAt", {
        time: formatDurationMilliseconds(Number(recipe.previewStartMs || 0))
      }),
      formatDurationMilliseconds(Number(recipe.previewDurationMs || 0))
    ].join(" · ");
    article.append(heading, summary);
    if (status === "ready" && preview.original && preview.enhanced) {
      const comparison = document.createElement("div");
      comparison.className =
        "podcast-admin__audio-enhancement-comparison";
      comparison.append(
        buildPrivatePodcastPlayer(
          `${String(preview.id)}_original`,
          adminText("originalExcerpt"),
          String(preview.original.mediaUrl || "")
        ),
        buildPrivatePodcastPlayer(
          `${String(preview.id)}_enhanced`,
          adminText("enhancedExcerpt"),
          String(preview.enhanced.mediaUrl || "")
        )
      );
      article.append(comparison);
      const queue = audioDerivatives.queueButtonForPreview(preview);
      if (queue) {
        const actions = document.createElement("div");
        actions.className = "podcast-admin__transcript-actions";
        actions.append(queue);
        article.append(actions);
      }
    } else {
      const detail = document.createElement("p");
      detail.textContent = status === "failed"
        ? adminText("processorFailedSafely", {
            code: humanizeCode(preview.failureCode || "processor_failed")
          })
        : adminText("waitingForStagingWorkflow");
      article.append(detail);
    }
    const warning = document.createElement("p");
    warning.className = "podcast-admin__audio-enhancement-warning";
    warning.textContent = adminText(
      "enhancementPreviewWarning",
      String(preview.warning || "")
    );
    article.append(warning);
    return article;
  }

  function buildPrivatePodcastPlayer(
    playerId,
    title,
    mediaPath,
    options = {}
  ) {
    const section = document.createElement("section");
    section.className = "podcast-admin__audio-enhancement-player";
    const heading = document.createElement("h4");
    heading.textContent = title;
    const card = document.createElement("div");
    card.className = "audio-card";
    card.lang = document.documentElement.lang || "en";
    card.dataset.audioCredentials = "include";
    const body = document.createElement("div");
    const wave = document.createElement("div");
    const safeId = String(playerId).replace(/[^A-Za-z0-9_-]/g, "-");
    const mediaUrl = checkedPrivatePodcastMediaUrl(
      mediaPath,
      options.contract || "enhancementAudio"
    );
    wave.className = "wave";
    wave.id = `wave_${safeId}`;
    wave.dataset.audioId = `audio_${safeId}`;
    wave.dataset.audioSrc = mediaUrl;
    if (options.peaksPath) {
      wave.dataset.peaksSrc = checkedPrivatePodcastMediaUrl(
        options.peaksPath,
        "deliveryPeaks"
      );
    }
    const audio = document.createElement("audio");
    audio.id = `audio_${safeId}`;
    audio.preload = "none";
    audio.src = mediaUrl;
    audio.crossOrigin = "use-credentials";
    const controls = document.createElement("div");
    controls.className = "controls";
    controls.append(
      playerControl(
        "playpause",
        adminText("playTitle", { title }),
        adminText("play")
      ),
      playerControl("skip-back", adminText("rewindTen"), "−10"),
      playerControl("skip-fwd", adminText("skipThirty"), "+30")
    );
    const speed = playerControl("speed", adminText("changeSpeed"), "1x");
    speed.dataset.audioSpeed = "";
    const download = document.createElement("a");
    const downloadUrl = new URL(mediaUrl);
    downloadUrl.searchParams.set("download", "1");
    download.className = "download";
    download.href = downloadUrl.href;
    download.download = "";
    download.setAttribute(
      "aria-label",
      adminText("downloadTitle", { title })
    );
    download.textContent = adminText("download");
    controls.append(speed, download);
    body.append(wave, audio, controls);
    card.append(body);
    section.append(heading, card);
    return section;
  }

  function checkedPrivatePodcastMediaUrl(mediaPath, contract) {
    const apiBase = new URL(`${apiOrigin.replace(/\/+$/, "")}/`);
    const mediaUrl = new URL(String(mediaPath || ""), apiBase);
    const pathPatterns = {
      enhancementAudio:
        /^\/v1\/admin\/(?:audio-enhancements\/[A-Za-z0-9_-]+\/media\/(?:original|enhanced)|audio-enhancement-derivatives\/[A-Za-z0-9_-]+\/media)$/,
      deliveryAudio:
        /^\/v1\/admin\/delivery-audio-jobs\/[A-Za-z0-9_-]+\/media$/,
      deliveryPeaks:
        /^\/v1\/admin\/delivery-audio-jobs\/[A-Za-z0-9_-]+\/peaks$/
    };
    if (
      mediaUrl.origin !== apiBase.origin
      || mediaUrl.search
      || mediaUrl.hash
      || !pathPatterns[contract]?.test(mediaUrl.pathname)
    ) {
      throw new Error(adminText("invalidEnhancementUrl"));
    }
    return mediaUrl.href;
  }

  function playerControl(className, label, text) {
    const button = document.createElement("button");
    button.className = className;
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.textContent = text;
    return button;
  }

  function releaseAudioMasterPlayers() {
    for (const card of audioEnhancementResults?.querySelectorAll(
      ".audio-card"
    ) || []) {
      const media = card.querySelector("audio");
      try { media?.pause(); } catch {}
      try { card._ws?.destroy?.(); } catch {}
      const wave = card.querySelector(".wave");
      try { wave?.__wsRO?.disconnect?.(); } catch {}
    }
    audioDerivatives.releasePlayers();
  }

  async function loadProductionReviews() {
    const episodeId = reviewEpisodeSelect?.value;
    const requestId = ++reviewRequestId;
    productionReviews = null;
    reviewTargetSelect?.replaceChildren();
    reviewList?.replaceChildren();
    if (!episodeId) {
      if (reviewReadiness) {
        reviewReadiness.textContent = adminText("createBeforeProductionReview");
      }
      await loadPublicationReadiness("");
      return;
    }
    const readinessPromise = loadPublicationReadiness(episodeId);
    setStatus(reviewStatus, adminText("loadingProductionReview"));
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/reviews`
      );
      if (requestId !== reviewRequestId) return;
      productionReviews = payload;
      renderProductionReviews();
      setStatus(reviewStatus, "");
    } catch (error) {
      if (requestId !== reviewRequestId) return;
      setStatus(reviewStatus, friendlyError(error), true);
    } finally {
      await readinessPromise;
    }
  }

  async function refreshReviewEvidenceForEpisode(episodeId) {
    if (episodeId === reviewEpisodeSelect?.value) {
      await loadProductionReviews();
    }
  }

  async function loadPublicationReadiness(
    episodeId = reviewEpisodeSelect?.value || ""
  ) {
    const requestId = ++readinessRequestId;
    publicationReadiness = null;
    readinessGroups?.replaceChildren();
    if (!episodeId) {
      if (readinessSummary) {
        readinessSummary.textContent = adminText("createBeforeReadiness");
      }
      setStatus(readinessStatus, "");
      return;
    }
    setStatus(readinessStatus, adminText("loadingReadiness"));
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/readiness`
      );
      if (requestId !== readinessRequestId) return;
      publicationReadiness = payload;
      renderPublicationReadiness();
      setStatus(readinessStatus, "");
    } catch (error) {
      if (requestId !== readinessRequestId) return;
      if (readinessSummary) {
        readinessSummary.textContent = adminText("readinessFailed");
      }
      setStatus(readinessStatus, friendlyError(error), true);
    }
  }

  function renderPublicationReadiness() {
    if (
      !publicationReadiness
      || !readinessSummary
      || !readinessGroups
    ) return;
    const legacy = publicationReadiness.legacyGate || {};
    const candidate = publicationReadiness.candidateGate || {};
    const digest = String(publicationReadiness.snapshotDigest || "");
    const missingChecks = (legacy.missing || []).length;
    const blockerCount = Number(candidate.blockerCount || 0);
    const warningCount = Number(candidate.warningCount || 0);
    readinessSummary.textContent = [
      legacy.ready
        ? adminText("publishChecksPass")
        : adminText("publishChecksMissing", {
            count: formatInteger(missingChecks),
            checks: missingChecks === 1
              ? adminText("checkSingular")
              : adminText("checkPlural")
          }),
      candidate.ready
        ? adminText("launchCandidateReady")
        : adminText("candidateBlockers", {
            count: formatInteger(blockerCount),
            blockers: blockerCount === 1
              ? adminText("blockerSingular")
              : adminText("blockerPlural")
          }),
      adminText("warningsCount", {
        count: formatInteger(warningCount),
        warnings: warningCount === 1
          ? adminText("warningSingular")
          : adminText("warningPlural")
      }),
      adminText("publicationRevision", {
        revision: formatInteger(publicationReadiness.publicationRevision)
      }),
      digest ? adminText("snapshotDigest", { digest: digest.slice(0, 12) }) : "",
      publicationGateLabel(publicationReadiness.publicationGateMode)
    ].filter(Boolean).join(" · ");

    const groups = new Map();
    for (const readinessNode of publicationReadiness.nodes || []) {
      const group = String(readinessNode.group || "core");
      const current = groups.get(group) || [];
      current.push(readinessNode);
      groups.set(group, current);
    }
    const groupOrder = ["core", "editorial", "monetization", "distribution"];
    readinessGroups.replaceChildren(...groupOrder
      .filter((group) => groups.has(group))
      .map((group) => renderReadinessGroup(group, groups.get(group))));
  }

  function renderReadinessGroup(group, nodes) {
    const section = document.createElement("section");
    section.className = "podcast-admin__readiness-group";
    const heading = document.createElement("h3");
    heading.textContent = adminText(
      `readinessGroup_${group}`,
      humanizeCode(group)
    );
    const list = document.createElement("div");
    list.className = "podcast-admin__readiness-list";
    list.replaceChildren(...nodes.map(renderReadinessNode));
    section.append(heading, list);
    return section;
  }

  function renderReadinessNode(readinessNode) {
    const card = document.createElement("article");
    const status = String(readinessNode.status || "missing");
    const severity = String(readinessNode.severity || "info");
    const label = localizedReadinessNodeLabel(readinessNode);
    card.className =
      `podcast-admin__readiness-card is-${status} severity-${severity}`;
    const heading = document.createElement("div");
    heading.className = "podcast-admin__readiness-card-heading";
    const title = document.createElement("h4");
    title.textContent = label;
    const pill = document.createElement("span");
    pill.className = "podcast-admin__pill";
    pill.textContent = [
      localizedCode("readinessStatus", status),
      localizedCode("readinessSeverity", severity)
    ].join(" · ");
    heading.append(title, pill);
    const summary = document.createElement("p");
    summary.textContent = adminText(
      `readinessSummary_${status}`,
      String(readinessNode.summary || ""),
      { label }
    );
    const evidence = document.createElement("details");
    const evidenceSummary = document.createElement("summary");
    evidenceSummary.textContent = adminText("evidenceLabel");
    const values = document.createElement("dl");
    values.className = "podcast-admin__readiness-evidence";
    for (const [key, value] of Object.entries(readinessNode.evidence || {})) {
      const term = document.createElement("dt");
      term.textContent = humanizeCode(key);
      const description = document.createElement("dd");
      description.textContent = readinessEvidenceValue(value);
      values.append(term, description);
    }
    evidence.append(evidenceSummary, values);
    card.append(heading, summary, evidence);
    return card;
  }

  function localizedReadinessNodeLabel(readinessNode) {
    const id = String(readinessNode?.id || "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return adminText(
      `readinessNode_${id}`,
      String(
        readinessNode?.label || adminText("dependencyFallback")
      )
    );
  }

  function readinessEvidenceValue(value) {
    if (Array.isArray(value)) {
      return value.length ? value.join(", ") : adminText("none");
    }
    if (typeof value === "boolean") {
      return value ? adminText("yes") : adminText("no");
    }
    if (value === null || value === undefined || value === "") {
      return adminText("none");
    }
    return String(value);
  }

  function renderProductionReviews() {
    if (!productionReviews || !reviewTargetSelect || !reviewList) return;
    const previousTarget = reviewTargetSelect.value;
    const targets = productionReviews.targetOptions || [];
    reviewTargetSelect.replaceChildren(...targets.map((target) => {
      const option = new Option(
        `${target.label} — ${adminText("transcriptRevision", {
          revision: formatInteger(target.revision)
        })}`,
        `${target.type}:${target.id}`,
        false,
        `${target.type}:${target.id}` === previousTarget
      );
      option.dataset.targetType = target.type;
      option.dataset.targetId = target.id;
      return option;
    }));
    reviewTargetSelect.disabled = !canEditReviews || targets.length === 0;
    const submit = reviewForm?.querySelector('button[type="submit"]');
    if (submit) submit.disabled = !canEditReviews || targets.length === 0;

    const readiness = productionReviews.readiness || {};
    if (reviewReadiness) {
      reviewReadiness.textContent = targets.length === 0
        ? adminText("noReviewTargets")
        : [
            reviewTargetCount(
              "currentTargets",
              readiness.currentTargetCount || targets.length
            ),
            reviewTargetCount(
              "currentReviewTargets",
              readiness.currentReviewCount
            ),
            adminText("approvedCount", {
              count: formatInteger(readiness.approvedCurrentReviewCount)
            }),
            adminText("unreviewedCount", {
              count: formatInteger(readiness.unreviewedCurrentTargetCount)
            }),
            adminText("openBlockers", {
              count: formatInteger(readiness.openBlockerCount),
              blockers: Number(readiness.openBlockerCount || 0) === 1
                ? adminText("blockerSingular")
                : adminText("blockerPlural")
            }),
            readiness.reviewReady
              ? adminText("reviewReady")
              : adminText("reviewIncomplete"),
            publicationGateLabel(
              publicationReadiness?.publicationGateMode
            )
          ].join(" · ");
    }

    const reviews = productionReviews.reviews || [];
    if (!reviews.length) {
      const empty = document.createElement("p");
      empty.className = "podcast-admin__empty";
      empty.textContent = adminText("noReviewNotes");
      reviewList.replaceChildren(empty);
      return;
    }
    reviewList.replaceChildren(...reviews.map(renderProductionReview));
  }

  function reviewTargetCount(key, value) {
    const count = Number(value || 0);
    return adminText(key, {
      count: formatInteger(count),
      targets: count === 1
        ? adminText("targetSingular")
        : adminText("targetPlural")
    });
  }

  function renderProductionReview(review) {
    const card = document.createElement("article");
    card.className = "podcast-admin__review-card";
    if (!review.isCurrent) card.classList.add("is-stale");

    const heading = document.createElement("div");
    heading.className = "podcast-admin__transcript-cue-heading";
    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = review.targetLabel || humanizeCode(review.targetType);
    const evidence = document.createElement("p");
    evidence.className = "podcast-admin__review-evidence";
    evidence.textContent = [
      adminText("transcriptRevision", {
        revision: formatInteger(review.targetRevision)
      }),
      review.isCurrent
        ? adminText("currentTarget")
        : adminText("historicalTarget"),
      adminText("reviewStateValue", {
        state: localizedCode("reviewStatus", review.status)
      }),
      review.assignedToAdminUserId === adminIdentity?.id
        ? adminText("assignedToMe")
        : review.assignedToAdminUserId
          ? adminText("assignedToTeam")
          : adminText("unassigned")
    ].join(" · ");
    titleWrap.append(title, evidence);

    const controls = document.createElement("div");
    controls.className = "podcast-admin__review-controls";
    const statusLabel = document.createElement("label");
    statusLabel.textContent = adminText("reviewState");
    const statusSelect = document.createElement("select");
    statusSelect.dataset.podcastReviewStatus = review.id;
    const statuses = [
      "draft",
      "ready_for_review",
      "changes_requested",
      "approved"
    ];
    statusSelect.replaceChildren(...statuses.map((status) =>
      new Option(
        localizedCode("reviewStatus", status),
        status,
        false,
        status === review.status
      )
    ));
    statusSelect.disabled = !canEditReviews
      || !review.isCurrent
      || (review.status === "approved" && !canApproveReviews);
    if (!canApproveReviews) {
      const approveOption = statusSelect.querySelector(
        'option[value="approved"]'
      );
      if (approveOption && review.status !== "approved") {
        approveOption.disabled = true;
      }
    }
    const hasOpenBlocker = (review.comments || []).some(
      ({ blocker, resolutionStatus }) =>
        blocker && resolutionStatus === "open"
    );
    if (hasOpenBlocker && review.status !== "approved") {
      const approveOption = statusSelect.querySelector(
        'option[value="approved"]'
      );
      if (approveOption) approveOption.disabled = true;
    }
    statusLabel.append(statusSelect);
    const assignLabel = document.createElement("label");
    assignLabel.className = "podcast-admin__checkbox";
    const assignInput = document.createElement("input");
    assignInput.type = "checkbox";
    assignInput.checked =
      review.assignedToAdminUserId === adminIdentity?.id;
    assignInput.disabled = !canEditReviews
      || !review.isCurrent
      || (review.status === "approved" && !canApproveReviews);
    assignInput.dataset.podcastReviewAssign = review.id;
    assignLabel.append(
      assignInput,
      document.createTextNode(` ${adminText("assignedToMeControl")}`)
    );
    controls.append(statusLabel, assignLabel);
    heading.append(titleWrap, controls);

    const comments = document.createElement("div");
    comments.className = "podcast-admin__review-comments";
    for (const comment of review.comments || []) {
      comments.append(renderProductionReviewComment(review, comment));
    }
    card.append(heading, comments);
    return card;
  }

  function renderProductionReviewComment(review, comment) {
    const item = document.createElement("article");
    item.className = "podcast-admin__review-comment";
    if (comment.resolutionStatus === "resolved") {
      item.classList.add("is-resolved");
    }
    const meta = document.createElement("p");
    meta.className = "podcast-admin__review-evidence";
    const range = formatReviewRange(comment.startsAtMs, comment.endsAtMs);
    meta.textContent = [
      range,
      comment.blocker ? adminText("releaseBlocker") : adminText("reviewNote"),
      localizedCode("resolutionStatus", comment.resolutionStatus),
      comment.assignedToAdminUserId === adminIdentity?.id
        ? adminText("assignedToMe")
        : comment.assignedToAdminUserId
          ? adminText("assignedToTeam")
          : adminText("unassigned")
    ].filter(Boolean).join(" · ");
    const body = document.createElement("p");
    body.className = "podcast-admin__review-body";
    body.textContent = comment.bodyText;
    const actions = document.createElement("div");
    actions.className = "podcast-admin__transcript-actions";
    if (comment.startsAtMs !== null) {
      const reuse = document.createElement("button");
      reuse.className = "btn btn-outline-light";
      reuse.type = "button";
      reuse.dataset.podcastReviewReuseRange = comment.id;
      reuse.dataset.startsAtMs = String(comment.startsAtMs);
      reuse.dataset.endsAtMs =
        comment.endsAtMs === null ? "" : String(comment.endsAtMs);
      reuse.textContent = adminText("useThisRange");
      actions.append(reuse);
    }
    if (canEditReviews) {
      const resolution = document.createElement("button");
      resolution.className = "btn btn-outline-light";
      resolution.type = "button";
      resolution.dataset.podcastReviewCommentState = comment.id;
      resolution.dataset.reviewId = review.id;
      resolution.dataset.revision = String(comment.revision);
      resolution.dataset.nextState =
        comment.resolutionStatus === "resolved" ? "open" : "resolved";
      resolution.dataset.assignedTo =
        comment.assignedToAdminUserId || "";
      resolution.textContent =
        comment.resolutionStatus === "resolved"
          ? adminText("reopen")
          : adminText("resolve");
      actions.append(resolution);
    }
    item.append(meta, body);
    if (actions.childElementCount) item.append(actions);
    return item;
  }

  async function createProductionReviewComment(event) {
    event.preventDefault();
    if (!productionReviews || !canEditReviews) return;
    const option = reviewTargetSelect.selectedOptions[0];
    if (!option) {
      setStatus(reviewStatus, adminText("chooseReviewTarget"), true);
      return;
    }
    const button = reviewForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(reviewStatus, adminText("addingReviewNote"));
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${
          encodeURIComponent(reviewEpisodeSelect.value)
        }/reviews`,
        {
          method: "POST",
          body: {
            commentId: operationId("review_comment"),
            targetType: option.dataset.targetType,
            targetId: option.dataset.targetId,
            startsAtMs: optionalReviewMilliseconds(
              reviewForm.elements.startsAtSeconds.value,
              adminText("reviewStart")
            ),
            endsAtMs: optionalReviewMilliseconds(
              reviewForm.elements.endsAtSeconds.value,
              adminText("reviewEnd")
            ),
            bodyText: reviewForm.elements.bodyText.value,
            blocker: reviewForm.elements.blocker.checked,
            assignedToAdminUserId:
              reviewForm.elements.assignToSelf.checked
                ? adminIdentity?.id
                : null
          }
        }
      );
      productionReviews = payload;
      reviewForm.elements.bodyText.value = "";
      reviewForm.elements.startsAtSeconds.value = "";
      reviewForm.elements.endsAtSeconds.value = "";
      reviewForm.elements.blocker.checked = false;
      renderProductionReviews();
      setStatus(reviewStatus, adminText("reviewNoteAdded"));
      await loadPublicationReadiness();
    } catch (error) {
      setStatus(
        reviewStatus,
        error instanceof AdminApiError
          ? friendlyError(error)
          : reviewInputError(error),
        true
      );
    } finally {
      button.disabled = false;
    }
  }

  function handleProductionReviewChange(event) {
    const status = event.target.closest("[data-podcast-review-status]");
    if (status) {
      const review = productionReviews?.reviews?.find(
        ({ id }) => id === status.dataset.podcastReviewStatus
      );
      if (review) {
        updateProductionReview(review, {
          status: status.value,
          assignedToAdminUserId: review.assignedToAdminUserId
        });
      }
      return;
    }
    const assignment = event.target.closest("[data-podcast-review-assign]");
    if (assignment) {
      const review = productionReviews?.reviews?.find(
        ({ id }) => id === assignment.dataset.podcastReviewAssign
      );
      if (review) {
        updateProductionReview(review, {
          status: review.status,
          assignedToAdminUserId: assignment.checked
            ? adminIdentity?.id
            : null
        });
      }
    }
  }

  function handleProductionReviewClick(event) {
    const range = event.target.closest("[data-podcast-review-reuse-range]");
    if (range) {
      reviewForm.elements.startsAtSeconds.value = millisecondsToSeconds(
        Number(range.dataset.startsAtMs)
      );
      reviewForm.elements.endsAtSeconds.value = range.dataset.endsAtMs
        ? millisecondsToSeconds(Number(range.dataset.endsAtMs))
        : "";
      reviewForm.elements.bodyText.focus();
      return;
    }
    const state = event.target.closest(
      "[data-podcast-review-comment-state]"
    );
    if (state) updateProductionReviewComment(state);
  }

  async function updateProductionReview(
    review,
    { status, assignedToAdminUserId }
  ) {
    if (!canEditReviews) return;
    setStatus(reviewStatus, adminText("savingReviewState"));
    try {
      const payload = await client.request(
        `/v1/admin/reviews/${encodeURIComponent(review.id)}`,
        {
          method: "PATCH",
          body: {
            mutationId: operationId("review_state"),
            baseRevision: Number(review.revision),
            status,
            assignedToAdminUserId
          }
        }
      );
      productionReviews = payload;
      renderProductionReviews();
      setStatus(reviewStatus, adminText("reviewStateSaved"));
      await loadPublicationReadiness();
    } catch (error) {
      renderProductionReviews();
      setStatus(reviewStatus, friendlyError(error), true);
    }
  }

  async function updateProductionReviewComment(button) {
    button.disabled = true;
    setStatus(reviewStatus, adminText("updatingReviewNote"));
    try {
      const payload = await client.request(
        `/v1/admin/review-comments/${
          encodeURIComponent(button.dataset.podcastReviewCommentState)
        }`,
        {
          method: "PATCH",
          body: {
            mutationId: operationId("review_comment_state"),
            baseRevision: Number(button.dataset.revision),
            resolutionStatus: button.dataset.nextState,
            assignedToAdminUserId: button.dataset.assignedTo || null
          }
        }
      );
      productionReviews = payload;
      renderProductionReviews();
      setStatus(reviewStatus, adminText("reviewNoteUpdated"));
      await loadPublicationReadiness();
    } catch (error) {
      setStatus(reviewStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadClips({ preserveStatus = false } = {}) {
    const episodeId = transcriptEpisodeSelect?.value;
    clipRequestId += 1;
    const requestId = clipRequestId;
    if (!episodeId) {
      clips = [];
      selectedClipId = "";
      clipList?.replaceChildren();
      updateClipAvailability();
      return;
    }
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/clips`
      );
      if (requestId !== clipRequestId) return;
      clips = payload.clips || [];
      selectedClipId = clips.some(({ id }) => id === selectedClipId)
        ? selectedClipId
        : "";
      renderClipList();
      if (selectedClipId) {
        fillClipRecipe(
          clips.find(({ id }) => id === selectedClipId)
        );
      } else {
        resetClipRecipe();
      }
      if (!preserveStatus) setStatus(clipStatus, "");
    } catch (error) {
      if (requestId !== clipRequestId) return;
      clips = [];
      selectedClipId = "";
      clipList?.replaceChildren();
      updateClipAvailability();
      setStatus(clipStatus, friendlyError(error), true);
    }
  }

  function renderClipList() {
    if (!clipList) return;
    releaseClipMediaPlayers(clipList);
    if (!clips.length) {
      clipList.innerHTML = `<p class="podcast-admin__empty">${
        escapeHtml(adminText("noSavedClips"))
      }</p>`;
      return;
    }
    clipList.replaceChildren(...clips.map((clip) => {
      const row = document.createElement("article");
      row.className = "podcast-admin__card";
      const media = clipRenderPresentation(clip, "production");
      row.innerHTML = `
        <div>
          <p class="podcast-admin__pill">${escapeHtml(adminText(
            "clipRevisionPill",
            {
              status: localizedCode("clipStatus", clip.status),
              revision: formatInteger(clip.revision)
            }
          ))}</p>
          <h3>${escapeHtml(clip.title)}</h3>
          <p>${escapeHtml(clip.aspectRatio)} · ${formatClipDuration(clip.durationMs)} · ${escapeHtml(humanizeCode(clip.boundaryMode))}</p>
          <p>${escapeHtml(adminText("privateRender", {
            status: media.renderLabel
          }))}</p>
          ${media.details}
        </div>
        <div class="podcast-admin__clip-actions">
          <button
            class="btn btn-outline-light"
            type="button"
            data-podcast-clip-edit="${escapeAttribute(clip.id)}"
            ${canEditTranscripts ? "" : "disabled"}>
            ${escapeHtml(adminText("editRecipe"))}
          </button>
          ${media.actions}
        </div>
        ${media.container}`;
      return row;
    }));
  }

  async function loadClipLibrary({ reset = true } = {}) {
    if (!clipLibrary || !clipLibraryFilters) return;
    if (!selectedShowId) {
      clearClipLibraryState();
      setStatus(clipLibraryStatus, adminText("chooseShowForClips"));
      return;
    }
    if (!reset && (clipLibraryLoading || !clipLibraryCursor)) return;
    const requestId = ++clipLibraryRequestId;
    const cursor = reset ? null : clipLibraryCursor;
    if (reset) {
      clipLibraryRows = [];
      clipLibraryCursor = null;
      releaseClipMediaPlayers(clipLibrary);
      clipLibrary.replaceChildren();
    }
    clipLibraryLoading = true;
    setStatus(
      clipLibraryStatus,
      reset ? adminText("loadingClipLibrary") : adminText("loadingMoreClips")
    );
    const params = new URLSearchParams({ limit: "24" });
    for (const field of ["episodeId", "aspectRatio", "renderStatus"]) {
      const value = clipLibraryFilters.elements[field]?.value;
      if (value) params.set(field, value);
    }
    if (cursor) params.set("cursor", cursor);
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(selectedShowId)}/clips?${params}`
      );
      if (requestId !== clipLibraryRequestId) return;
      const page = payload.clips || [];
      clipLibraryRows = reset
        ? page
        : [...clipLibraryRows, ...page];
      clipLibraryCursor = payload.pagination?.nextCursor || null;
      renderClipLibrary();
      setStatus(
        clipLibraryStatus,
        adminText("clipsLoaded", {
          count: formatInteger(clipLibraryRows.length),
          clips: clipLibraryRows.length === 1
            ? adminText("clipSingular")
            : adminText("clipPlural")
        })
      );
    } catch (error) {
      if (requestId !== clipLibraryRequestId) return;
      if (reset) {
        clipLibraryRows = [];
        clipLibraryCursor = null;
        clipLibrary.replaceChildren();
      }
      setStatus(clipLibraryStatus, friendlyError(error), true);
    } finally {
      if (requestId === clipLibraryRequestId) {
        clipLibraryLoading = false;
      }
    }
  }

  function clearClipLibraryState() {
    clipLibraryRows = [];
    clipLibraryCursor = null;
    clipLibraryLoading = false;
    clipLibraryRequestId += 1;
    releaseClipMediaPlayers(clipLibrary);
    clipLibrary?.replaceChildren();
    setStatus(clipLibraryStatus, "");
  }

  function renderClipLibrary() {
    if (!clipLibrary) return;
    releaseClipMediaPlayers(clipLibrary);
    if (!clipLibraryRows.length) {
      clipLibrary.innerHTML = `<p class="podcast-admin__empty">${
        escapeHtml(adminText("noClipsMatch"))
      }</p>`;
      return;
    }
    const cards = clipLibraryRows.map((clip) => {
      const row = document.createElement("article");
      row.className = "podcast-admin__card";
      const media = clipRenderPresentation(clip, "marketing");
      row.innerHTML = `
        <div>
          <p class="podcast-admin__pill">${escapeHtml(clip.episodeTitle || adminText("episodeFallback"))} · ${escapeHtml(clip.aspectRatio)}</p>
          <h3>${escapeHtml(clip.title)}</h3>
          <p>${formatClipDuration(clip.durationMs)} · ${escapeHtml(humanizeCode(clip.captionLanguage))} · ${escapeHtml(adminText("transcriptRevision", { revision: formatInteger(clip.revision) }))}</p>
          <p>${escapeHtml(adminText("privateRender", { status: media.renderLabel }))}</p>
          ${media.details}
        </div>
        <div class="podcast-admin__clip-actions">${media.actions}</div>
        ${media.container}`;
      return row;
    });
    clipLibrary.replaceChildren(...cards);
    if (clipLibraryCursor) {
      const more = document.createElement("button");
      more.className = "btn btn-outline-light podcast-admin__more";
      more.type = "button";
      more.dataset.podcastClipLibraryMore = "";
      more.textContent = adminText("loadMoreClips");
      clipLibrary.append(more);
    }
  }

  function clipRenderPresentation(clip, surface) {
    const render = clip.render;
    const publicPublication = clip.publicPublication;
    const youtubePublication = clip.youtubePublication;
    const publicDetails = publicPublication
      ? `<p>${escapeHtml(adminText("publicClipSelection", {
          status: localizedCode(
            "clipPublicationStatus",
            publicPublication.status
          )
        }))}</p>`
      : "";
    const youtubeDetails = youtubePublication
      ? `<p>${escapeHtml(adminText("youtubeTest", {
          status: localizedCode("youtubeStatus", youtubePublication.status),
          privacy: localizedCode(
            "privacyStatus",
            youtubePublication.privacyStatus
          )
        }))}</p>`
      : "";
    const renderLabel = !render
      ? adminText("renderNotRequested")
      : render.clipRevision === clip.revision
        ? localizedCode("renderStatus", render.status)
        : adminText("olderRenderRevision", {
            status: localizedCode("renderStatus", render.status),
            revision: formatInteger(render.clipRevision)
          });
    const mediaUrl = adminApiUrl(render?.mediaPath);
    const downloadUrl = adminApiUrl(render?.downloadPath);
    const captionsUrl = adminApiUrl(render?.captionsPath);
    const subtitlesUrl = adminApiUrl(render?.subtitlesPath);
    const ready = render
      && render.clipRevision === clip.revision
      && render.status === "ready"
      && mediaUrl
      && downloadUrl
      && captionsUrl;
    if (!ready) {
      return {
        renderLabel,
        details: `${publicDetails}${youtubeDetails}`,
        actions: "",
        container: ""
      };
    }
    const previewId =
      `${surface}-clip-render-preview-${render.id}`;
    const publicAction = canEditTranscripts
      ? `<button
          class="btn btn-outline-light"
          type="button"
          data-podcast-clip-publication-open="${escapeAttribute(clip.id)}">
          ${escapeHtml(publicPublication
            ? adminText("reviewPublicClip")
            : adminText("preparePublicClip"))}
        </button>`
      : "";
    const youtubeAction = canEditTranscripts
      ? `<button
          class="btn btn-outline-light"
          type="button"
          data-podcast-clip-youtube-open="${escapeAttribute(clip.id)}">
          ${escapeHtml(youtubePublication
            ? adminText("reviewYoutubeTest")
            : adminText("prepareYoutubeTest"))}
        </button>`
      : "";
    const downloadActions = clipDownloadActionMarkup(
      [downloadUrl, captionsUrl, subtitlesUrl],
      adminText
    );
    return {
      renderLabel,
      details: `
        <p>
          ${Number(render.width)}×${Number(render.height)}
          · ${formatClipDuration(Number(render.durationMs))}
          · ${formatInteger(render.outputBytes)} bytes
        </p>
        ${publicDetails}
        ${youtubeDetails}`,
      actions: `
        <button
          class="btn btn-outline-light"
          type="button"
          aria-controls="${escapeAttribute(previewId)}"
          aria-expanded="false"
          data-podcast-clip-render-preview
          data-media-path="${escapeAttribute(render.mediaPath)}">
          ${escapeHtml(adminText("previewRender"))}
        </button>
        ${downloadActions}
        ${publicAction}
        ${youtubeAction}`,
      container: `<div
        id="${escapeAttribute(previewId)}"
        class="podcast-admin__clip-media"
        data-podcast-clip-media
        hidden></div>`
    };
  }

  function handleClipAction(event, { editable = false } = {}) {
    const publication = event.target.closest(
      "[data-podcast-clip-publication-open]"
    );
    if (publication) {
      closeClipYouTubeForm();
      if (!clipPublications.open(
        publication.dataset.podcastClipPublicationOpen
      )) {
        setStatus(
          clipLibraryStatus,
          adminText("currentRenderRequiredForPublicClip"),
          true
        );
      }
      return true;
    }
    const youtube = event.target.closest(
      "[data-podcast-clip-youtube-open]"
    );
    if (youtube) {
      openClipYouTubeForm(youtube.dataset.podcastClipYoutubeOpen);
      return true;
    }
    const preview = event.target.closest(
      "[data-podcast-clip-render-preview]"
    );
    if (preview) {
      toggleClipRenderPreview(preview);
      return true;
    }
    const edit = editable
      ? event.target.closest("[data-podcast-clip-edit]")
      : null;
    if (edit) {
      selectClipRecipe(edit.dataset.podcastClipEdit);
      return true;
    }
    return false;
  }

  function toggleClipRenderPreview(button) {
    const row = button.closest(".podcast-admin__card");
    const container = row?.querySelector("[data-podcast-clip-media]");
    const status = button.closest("#podcast-panel-marketing")
      ? clipLibraryStatus
      : clipStatus;
    if (!container) return;
    if (!container.hidden) {
      releaseClipMediaPlayers(container);
      container.hidden = true;
      button.textContent = adminText("previewRender");
      button.setAttribute("aria-expanded", "false");
      return;
    }
    const mediaUrl = adminApiUrl(button.dataset.mediaPath);
    if (!mediaUrl) {
      setStatus(status, adminText("invalidPrivateRenderUrl"), true);
      return;
    }
    const video = document.createElement("video");
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.crossOrigin = "use-credentials";
    video.src = mediaUrl;
    video.setAttribute("aria-label", adminText("privateClipPreview"));
    video.addEventListener("error", () => {
      if (video.dataset.releasing === "1") return;
      setStatus(
        status,
        adminText("privateRenderFailed"),
        true
      );
    }, { once: true });
    container.replaceChildren(video);
    container.hidden = false;
    button.textContent = adminText("hidePreview");
    button.setAttribute("aria-expanded", "true");
  }

  function releaseClipMediaPlayers(container) {
    container?.querySelectorAll("video").forEach((video) => {
      video.dataset.releasing = "1";
      video.pause();
      video.removeAttribute("src");
      video.load();
    });
  }

  function pauseClipMediaPlayers(container) {
    container?.querySelectorAll("video").forEach((video) => video.pause());
  }

  function applyClipPublication(renderId, publication) {
    if (!renderId || !publication) return;
    for (const collection of [clips, clipLibraryRows]) {
      for (const clip of collection) {
        if (clip.render?.id === renderId) {
          clip.publicPublication = publication;
        }
      }
    }
  }

  function openClipYouTubeForm(clipId) {
    if (!clipYouTubeForm) return;
    const clip = [...clipLibraryRows, ...clips].find(
      (candidate) => candidate.id === clipId
    );
    if (
      !clip
      || clip.render?.status !== "ready"
      || clip.render?.clipRevision !== clip.revision
    ) {
      setStatus(
        clipLibraryStatus,
        adminText("currentRenderRequired"),
        true
      );
      return;
    }
    clipPublications.close();
    selectedClipYouTube = clip;
    const publication = clip.youtubePublication;
    clipYouTubePublicationId =
      publication?.id || operationId("clip_youtube");
    const show = shows.find(({ id }) => id === selectedShowId);
    clipYouTubeForm.elements.title.value = publication?.title
      || `${String(clip.title || "").slice(0, 92)} #Shorts`;
    clipYouTubeForm.elements.description.value =
      publication?.description || "";
    clipYouTubeForm.elements.privacyStatus.value =
      publication?.privacyStatus || "unlisted";
    clipYouTubeForm.elements.confirmChannelUrl.value =
      publication?.channelUrl || show?.youtubeChannelUrl || "";
    const immutable = Boolean(publication);
    for (const field of [
      "title",
      "description",
      "privacyStatus",
      "confirmChannelUrl"
    ]) {
      clipYouTubeForm.elements[field].disabled = immutable;
    }
    const save = clipYouTubeForm.querySelector(
      "[data-podcast-clip-youtube-save]"
    );
    if (save) save.hidden = immutable;
    if (clipYouTubeApprove) {
      clipYouTubeApprove.hidden = !(
        canApproveClipYouTube
        && ["draft", "dry_run"].includes(publication?.status)
      );
    }
    if (clipYouTubeMeta) {
      clipYouTubeMeta.textContent = [
        clip.episodeTitle || adminText("episodeFallback"),
        clip.title,
        adminText("renderLabel", { id: clip.render.id }),
        publication
          ? `${localizedCode("youtubeStatus", publication.status)} · ${
            localizedCode("privacyStatus", publication.privacyStatus)
          }`
          : adminText("newImmutableDraft")
      ].join(" · ");
    }
    setStatus(clipYouTubeStatus, "");
    clipYouTubeForm.hidden = false;
    clipYouTubeForm.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }

  async function saveClipYouTubeDraft(event) {
    event.preventDefault();
    const clip = selectedClipYouTube;
    const button = clipYouTubeForm?.querySelector(
      "[data-podcast-clip-youtube-save]"
    );
    if (!clip?.render || !button) return;
    button.disabled = true;
    setStatus(
      clipYouTubeStatus,
      adminText("preparingYoutubeDraft")
    );
    try {
      const payload = await client.request(
        `/v1/admin/clip-renders/${encodeURIComponent(clip.render.id)}/youtube`,
        {
          method: "POST",
          body: {
            publicationId: clipYouTubePublicationId,
            expectedClipRevision: Number(clip.revision),
            title: clipYouTubeForm.elements.title.value,
            description: clipYouTubeForm.elements.description.value,
            privacyStatus:
              clipYouTubeForm.elements.privacyStatus.value,
            confirmChannelUrl:
              clipYouTubeForm.elements.confirmChannelUrl.value
          }
        }
      );
      applyClipYouTubePublication(
        clip.render.id,
        payload.publication
      );
      renderClipList();
      renderClipLibrary();
      openClipYouTubeForm(clip.id);
      setStatus(
        clipYouTubeStatus,
        payload.idempotent
          ? adminText("youtubeDraftExists")
          : adminText("youtubeDraftPrepared")
      );
    } catch (error) {
      setStatus(clipYouTubeStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function approveClipYouTubePublication() {
    const clip = selectedClipYouTube;
    const publication = clip?.youtubePublication;
    if (!clip || !publication || !clipYouTubeApprove) return;
    clipYouTubeApprove.disabled = true;
    setStatus(
      clipYouTubeStatus,
      adminText("approvingYoutubeTest")
    );
    try {
      const payload = await client.request(
        `/v1/admin/clip-youtube-publications/${encodeURIComponent(publication.id)}/approve`,
        { method: "POST", body: {} }
      );
      applyClipYouTubePublication(
        publication.renderId || clip.render?.id,
        payload.publication
      );
      renderClipList();
      renderClipLibrary();
      openClipYouTubeForm(clip.id);
      setStatus(
        clipYouTubeStatus,
        payload.publication.status === "dry_run"
          ? adminText("youtubeDryRunApproved")
          : adminText("youtubeUploadAccepted", {
              status: localizedCode(
                "youtubeStatus",
                payload.publication.status
              )
            })
      );
    } catch (error) {
      setStatus(clipYouTubeStatus, friendlyError(error), true);
    } finally {
      clipYouTubeApprove.disabled = false;
    }
  }

  function applyClipYouTubePublication(renderId, publication) {
    if (!renderId || !publication) return;
    for (const collection of [clips, clipLibraryRows]) {
      for (const clip of collection) {
        if (clip.render?.id === renderId) {
          clip.youtubePublication = publication;
        }
      }
    }
    if (selectedClipYouTube?.render?.id === renderId) {
      selectedClipYouTube.youtubePublication = publication;
    }
  }

  function closeClipYouTubeForm() {
    selectedClipYouTube = null;
    clipYouTubePublicationId = "";
    clipYouTubeForm?.reset();
    if (clipYouTubeForm) clipYouTubeForm.hidden = true;
    setStatus(clipYouTubeStatus, "");
  }

  function adminApiUrl(path) {
    if (
      !/^\/v1\/admin\/clip-renders\/[A-Za-z0-9_-]+\/(?:media(?:\?download=1)?|captions\.(?:vtt|srt))$/
        .test(path || "")
    ) {
      return "";
    }
    try {
      const apiBase = new URL(`${apiOrigin.replace(/\/+$/, "")}/`);
      const url = new URL(path, apiBase);
      return url.origin === apiBase.origin ? url.toString() : "";
    } catch {
      return "";
    }
  }

  function resetClipRecipe() {
    selectedClipId = "";
    clipForm?.reset();
    if (clipForm) {
      clipForm.elements.boundaryMode.value = "segment";
      clipForm.elements.templateId.value = "captioned-waveform-v1";
    }
    fillClipCueSelects();
    refreshClipRecipe();
  }

  function selectClipRecipe(clipId) {
    const clip = clips.find(({ id }) => id === clipId);
    if (!clip) return;
    selectedClipId = clip.id;
    fillClipRecipe(clip);
    clipForm?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function fillClipRecipe(clip) {
    if (!clipForm || !clip) return;
    clipForm.elements.title.value = clip.title || "";
    clipForm.elements.aspectRatio.value = clip.aspectRatio || "9:16";
    clipForm.elements.boundaryMode.value = clip.boundaryMode || "segment";
    clipForm.elements.templateId.value =
      clip.templateId || "captioned-waveform-v1";
    fillClipCueSelects({
      startCueId: clip.selection?.startCueId,
      endCueId: clip.selection?.endCueId
    });
    refreshClipRecipe();
  }

  function fillClipCueSelects({
    startCueId = clipForm?.elements.startCueId.value,
    endCueId = clipForm?.elements.endCueId.value
  } = {}) {
    if (!clipForm) return;
    const cues = transcript?.cues || [];
    const options = (selectedId) => cues.map((cue, index) =>
      new Option(
        `${index + 1} · ${millisecondsToTimestamp(cue.startsAtMs)}–${millisecondsToTimestamp(cue.endsAtMs)} · ${clipCueSummary(cue.textMarkdown)}`,
        cue.id,
        false,
        cue.id === selectedId
      )
    );
    clipForm.elements.startCueId.replaceChildren(...options(startCueId));
    clipForm.elements.endCueId.replaceChildren(...options(endCueId));
    if (
      !cues.some(({ id }) => id === clipForm.elements.startCueId.value)
      && cues[0]
    ) {
      clipForm.elements.startCueId.value = cues[0].id;
    }
    if (
      !cues.some(({ id }) => id === clipForm.elements.endCueId.value)
      && cues[0]
    ) {
      clipForm.elements.endCueId.value = cues[0].id;
    }
  }

  function updateClipAvailability() {
    if (!clipForm) return;
    clipDraftAssistant.setTranscript(
      transcriptEpisodeSelect?.value, transcript, transcriptDirty);
    const selected = clips.find(({ id }) => id === selectedClipId);
    const transcriptApproved = transcript
      && transcript.status === "approved"
      && Number(transcript.approvedRevision) === Number(transcript.revision)
      && !transcriptDirty;
    const canSave = Boolean(canEditTranscripts && transcriptApproved);
    const selection = selectedClipCueRange();
    const selectionIsValid = selection
      && selection.durationMs >= 1_000
      && selection.durationMs <= 180_000;
    for (const control of [
      clipForm.elements.title,
      clipForm.elements.aspectRatio,
      clipForm.elements.startCueId,
      clipForm.elements.endCueId
    ]) {
      control.disabled = !canSave;
    }
    clipForm.elements.boundaryMode.disabled = true;
    clipForm.elements.templateId.disabled = true;
    clipForm.querySelector('button[type="submit"]').disabled =
      !canSave || !selectionIsValid;
    if (clipNewButton) clipNewButton.disabled = !canSave;
    const renderMatchesCurrent = selected
      && selected.render?.clipRevision === selected.revision;
    if (clipRenderButton) {
      clipRenderButton.disabled = !canSave
        || !selectionIsValid
        || !selected
        || Number(selected.revision || 0) < 1
        || selected.transcriptSha256 !== transcript?.contentSha256
        || (
          renderMatchesCurrent
          && selected.render?.status === "ready"
        );
    }
  }

  function refreshClipRecipe() {
    updateClipAvailability();
    updateClipPreview();
  }

  function selectedClipCueRange() {
    return resolveClipCueRange(
      transcript?.cues, clipForm?.elements.startCueId.value,
      clipForm?.elements.endCueId.value
    );
  }

  function updateClipPreview() {
    if (!clipForm || !clipPreview) return;
    const selection = selectedClipCueRange();
    const startCue = transcript?.cues?.find(
      ({ id }) => id === clipForm.elements.startCueId.value
    );
    renderClipRecipePreview({
      target: clipPreview,
      aspectRatio: clipForm.elements.aspectRatio.value,
      transcript,
      transcriptDirty,
      selection,
      startCue,
      text: adminText,
      formatTimestamp: millisecondsToTimestamp,
      formatDuration: formatClipDuration
    });
  }

  async function saveClipRecipe(event) {
    event.preventDefault();
    const selected = clips.find(({ id }) => id === selectedClipId);
    const clipId = selected?.id || operationId("clip");
    const button = clipForm.querySelector('button[type="submit"]');
    button.disabled = true;
    clipRenderButton.disabled = true;
    setStatus(clipStatus, adminText("savingClipRecipe"));
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(transcriptEpisodeSelect.value)}/clips/${encodeURIComponent(clipId)}`,
        {
          method: "PUT",
          body: {
            mutationId: operationId("clip_mutation"),
            baseRevision: Number(selected?.revision || 0),
            title: clipForm.elements.title.value,
            captionLanguage: transcriptLanguageSelect.value,
            aspectRatio: clipForm.elements.aspectRatio.value,
            templateId: "captioned-waveform-v1",
            boundaryMode: "segment",
            startCueId: clipForm.elements.startCueId.value,
            endCueId: clipForm.elements.endCueId.value
          }
        }
      );
      selectedClipId = payload.clip.id;
      await loadClips({ preserveStatus: true });
      setStatus(
        clipStatus,
        adminText("clipRecipeSaved")
      );
      await refreshReviewEvidenceForEpisode(
        transcriptEpisodeSelect.value
      );
    } catch (error) {
      setStatus(clipStatus, friendlyError(error), true);
      updateClipAvailability();
    }
  }

  async function prepareClipRender() {
    const clip = clips.find(({ id }) => id === selectedClipId);
    if (!clip) return;
    clipRenderButton.disabled = true;
    setStatus(clipStatus, adminText("preparingRenderManifest"));
    try {
      const renderId = clip.render?.clipRevision === clip.revision
        ? clip.render.id
        : operationId("clip_render");
      const payload = await client.request(
        `/v1/admin/clips/${encodeURIComponent(clip.id)}/render`,
        {
          method: "POST",
          body: {
            renderId,
            expectedRevision: Number(clip.revision)
          }
        }
      );
      downloadJson(
        `podcast-clip-${clip.id}-revision-${clip.revision}.json`,
        payload.processorManifest
      );
      await loadClips({ preserveStatus: true });
      setStatus(
        clipStatus,
        payload.idempotent
          ? adminText("renderManifestExists")
          : adminText("renderManifestCreated")
      );
    } catch (error) {
      setStatus(clipStatus, friendlyError(error), true);
      updateClipAvailability();
    }
  }

  function updateAdPlanFields() {
    if (!adPlanForm) return;
    const enabled = adPlanForm.elements.midRoll.checked;
    adPlanForm.elements.midRollSeconds.disabled = !enabled;
    adPlanForm.elements.midRollSeconds.required = enabled;
  }

  async function loadAdPlan({ preserveStatus = false } = {}) {
    const episodeId = adPlanForm?.elements.episodeId.value;
    latestProcessorManifest = null;
    if (!episodeId) {
      adPlanResult?.replaceChildren();
      return;
    }
    adPlanResult.innerHTML = `<p>${escapeHtml(adminText("loadingAdPlan"))}</p>`;
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/ad-plan`
      );
      latestProcessorManifest = payload.processorManifest || null;
      renderAdPlan(payload);
      if (!preserveStatus) setStatus(adPlanStatus, "");
    } catch (error) {
      adPlanResult.textContent = friendlyError(error);
    }
  }

  function renderAdPlan(payload) {
    const plan = payload.latestPlan;
    const source = payload.source || {};
    const markers = payload.active?.markers || [];
    const segments = payload.active?.segments || [];
    const canApprove = canManageAdPlans && plan?.status === "needs_review";
    const canReject = canManageAdPlans
      && plan
      && !["approved", "superseded", "rejected"].includes(plan.status);
    const card = document.createElement("article");
    card.className = "podcast-admin__decision";
    card.innerHTML = `
      <div>
        <p class="podcast-admin__pill">${escapeHtml(plan?.status
          ? humanizeCode(plan.status)
          : adminText("noPlan"))}</p>
        <h3>${escapeHtml(plan
          ? adminText("adPlanRevision", {
              revision: formatInteger(plan.revision)
            })
          : adminText("noMarkerPlan"))}</h3>
        <p>${escapeHtml(adminText("deliverySource", {
          status: source.ready
            ? adminText("readyLower")
            : adminText("notReadyLower"),
          bytes: formatInteger(source.bytes),
          duration: formatInteger(source.durationSeconds)
        }))}</p>
        <p>${escapeHtml(adminText("processorLabel", {
          processor: plan?.processorVersion || adminText("awaitingEvidence")
        }))}</p>
        <p>${escapeHtml(adminText("adPlanCounts", {
          segments: formatInteger(plan?.segmentCount),
          markers: formatInteger(markers.length),
          ready: formatInteger(segments.filter(
            ({ validationStatus }) => validationStatus === "ready"
          ).length)
        }))}</p>
      </div>
      <div>
        <h3>${escapeHtml(adminText("reviewControls"))}</h3>
        <p>${escapeHtml(adminText("adApprovalEffect"))}</p>
        <div class="podcast-admin__episode-actions">
          <button class="btn btn-outline-light" type="button" data-download-ad-plan ${latestProcessorManifest ? "" : "disabled"}>${escapeHtml(adminText("downloadProcessorManifest"))}</button>
          <button class="btn btn-outline-light" type="button" data-approve-ad-plan="${escapeAttribute(plan?.id || "")}" ${canApprove ? "" : "disabled"}>${escapeHtml(adminText("approveEvidence"))}</button>
          <button class="btn btn-danger" type="button" data-reject-ad-plan="${escapeAttribute(plan?.id || "")}" ${canReject ? "" : "disabled"}>${escapeHtml(adminText("reject"))}</button>
        </div>
      </div>`;
    adPlanResult.replaceChildren(card);
  }

  async function submitAdPlan(event) {
    event.preventDefault();
    const markers = [];
    if (adPlanForm.elements.preRoll.checked) {
      markers.push({ position: "pre" });
    }
    if (adPlanForm.elements.midRoll.checked) {
      markers.push({
        position: "mid",
        startsAtMs: Math.round(
          Number(adPlanForm.elements.midRollSeconds.value) * 1_000
        )
      });
    }
    if (adPlanForm.elements.postRoll.checked) {
      markers.push({ position: "post" });
    }
    if (markers.length === 0) {
      setStatus(adPlanStatus, adminText("selectAdPosition"), true);
      return;
    }
    const button = adPlanForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(adPlanStatus, adminText("submittingMarkerIntent"));
    try {
      const created = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(adPlanForm.elements.episodeId.value)}/ad-plan`,
        {
          method: "POST",
          body: {
            streamProfile: "mp3-44100-stereo-cbr128-frame-v1",
            markers
          }
        }
      );
      latestProcessorManifest = created.processorManifest;
      setStatus(
        adPlanStatus,
        adminText("adPlanSubmitted")
      );
      await loadAdPlan({ preserveStatus: true });
      await refreshReviewEvidenceForEpisode(
        adPlanForm.elements.episodeId.value
      );
    } catch (error) {
      setStatus(adPlanStatus, friendlyError(error), true);
    } finally {
      button.disabled = episodes.length === 0;
    }
  }

  async function handleAdPlanAction(event) {
    const downloadButton = event.target.closest("[data-download-ad-plan]");
    if (downloadButton) {
      if (!latestProcessorManifest) return;
      downloadJson(
        `podcast-ad-plan-${latestProcessorManifest.planId}.json`,
        latestProcessorManifest
      );
      setStatus(adPlanStatus, adminText("processorManifestDownloaded"));
      return;
    }
    const approveButton = event.target.closest("[data-approve-ad-plan]");
    const rejectButton = event.target.closest("[data-reject-ad-plan]");
    const button = approveButton || rejectButton;
    if (!button) return;
    const planId = approveButton
      ? approveButton.dataset.approveAdPlan
      : rejectButton.dataset.rejectAdPlan;
    const reason = rejectButton
      ? globalThis.prompt(adminText("adRejectionReason"))
      : null;
    if (rejectButton && !reason?.trim()) return;
    button.disabled = true;
    setStatus(
      adPlanStatus,
      approveButton ? adminText("recheckingR2") : adminText("rejectingPlan")
    );
    try {
      await client.request(
        `/v1/admin/ads/plans/${encodeURIComponent(planId)}/${approveButton ? "approve" : "reject"}`,
        {
          method: "POST",
          body: approveButton ? {} : { reason: reason.trim() }
        }
      );
      setStatus(
        adPlanStatus,
        approveButton
          ? adminText("adEvidenceApproved")
          : adminText("planRejected")
      );
      await loadAdPlan({ preserveStatus: true });
      await refreshReviewEvidenceForEpisode(
        adPlanForm.elements.episodeId.value
      );
    } catch (error) {
      setStatus(adPlanStatus, friendlyError(error), true);
      button.disabled = false;
    }
  }

  async function loadDistribution(episodeId) {
    if (!distributionRoot || !selectedShowId) return;
    const selectedEpisodeId = episodeId
      ?? distributionFilter?.elements.episodeId?.value
      ?? "";
    const requestId = ++distributionRequestId;
    const requestedShowId = selectedShowId;
    const loading = document.createElement("p");
    loading.textContent = adminText(
      "loadingDistribution"
    );
    distributionRoot.replaceChildren(loading);
    try {
      const path = selectedEpisodeId
        ? `/v1/admin/episodes/${encodeURIComponent(
          selectedEpisodeId
        )}/distribution`
        : `/v1/admin/distribution?showId=${encodeURIComponent(
          requestedShowId
        )}`;
      const payload = await client.request(path);
      if (
        requestId !== distributionRequestId
        || requestedShowId !== selectedShowId
      ) return;
      renderDistribution(payload);
    } catch (error) {
      if (
        requestId === distributionRequestId
        && requestedShowId === selectedShowId
      ) {
        distributionRoot.textContent = friendlyError(error);
      }
    }
  }

  function renderDistribution(payload) {
    const destinations = Array.isArray(payload.destinations)
      ? payload.destinations
      : [];
    const summary = payload.summary || {};
    const fragment = document.createDocumentFragment();
    if (payload.release) {
      fragment.append(
        renderReleaseChannels(payload.release, payload.episodeId || "")
      );
    }
    const overview = document.createElement("div");
    overview.className =
      "podcast-admin__metric-grid podcast-admin__distribution-summary";
    for (const [value, label] of [
      [summary.total, adminText("launchDirectories")],
      [
        summary.setupComplete,
        adminText("ownerSetupComplete")
      ],
      [
        summary.setupRequired,
        adminText("ownerSetupRequired")
      ],
      [summary.observed, adminText("episodeObserved")],
      [summary.certified, adminText("certifiedDirectories")]
    ]) {
      const card = document.createElement("article");
      const strong = document.createElement("strong");
      strong.textContent = Number.isFinite(Number(value))
        ? String(Number(value))
        : "—";
      const span = document.createElement("span");
      span.textContent = label;
      card.append(strong, span);
      overview.append(card);
    }
    fragment.append(overview);
    fragment.append(
      renderDistributionLaunchClaim({
        launchClaim: payload.launchClaim || {},
        text: adminText,
        formatDate,
        formatInteger,
        badge: distributionBadge,
        canValidate: canOperateSelectedShowPublication()
      })
    );

    const feed = document.createElement("div");
    feed.className = "podcast-admin__distribution-feed";
    const feedText = document.createElement("label");
    const feedLabel = document.createElement("strong");
    feedLabel.textContent = adminText(
      "canonicalRssFeed"
    );
    const feedUrl = document.createElement("input");
    feedUrl.type = "url";
    feedUrl.readOnly = true;
    feedUrl.setAttribute("aria-readonly", "true");
    feedUrl.value = String(payload.feedUrl || "");
    feedUrl.dataset.podcastDistributionFeedUrl = "";
    feedText.append(feedLabel, feedUrl);
    const copy = document.createElement("button");
    copy.className = "btn btn-outline-light";
    copy.type = "button";
    copy.dataset.podcastDistributionCopyFeed = String(payload.feedUrl || "");
    copy.textContent = adminText("copyFeedUrl");
    const copyStatus = document.createElement("p");
    copyStatus.className = "podcast-admin__status";
    copyStatus.dataset.podcastDistributionCopyStatus = "";
    copyStatus.setAttribute("role", "status");
    copyStatus.setAttribute("aria-live", "polite");
    feed.append(feedText, copy, copyStatus);
    fragment.append(feed);

    const list = document.createElement("div");
    list.className = "podcast-admin__directory-list";
    for (const destination of destinations) {
      list.append(
        distributionDestinationCard(destination, {
          episodeId: payload.episodeId || ""
        })
      );
    }
    if (!destinations.length) {
      const empty = document.createElement("p");
      empty.className = "podcast-admin__empty";
      empty.textContent = adminText(
        "noDistributionDestinations"
      );
      list.append(empty);
    }
    fragment.append(list);
    distributionRoot.replaceChildren(fragment);
  }

  function renderReleaseChannels(release, episodeId) {
    const section = document.createElement("section");
    section.className = "podcast-admin__release-channels";
    const heading = document.createElement("div");
    heading.className = "podcast-admin__panel-heading";
    const titleGroup = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = release.publicationRevision
      ? adminText(
          "releaseRevision",
          { revision: Number(release.publicationRevision) }
        )
      : adminText("releaseChannels");
    const description = document.createElement("p");
    description.textContent = adminText(
      "rootJobsDescription"
    );
    titleGroup.append(title, description);
    heading.append(
      titleGroup,
      distributionBadge(releaseStatusLabel(release.status))
    );
    section.append(heading);

    const channels = Array.isArray(release.channels)
      ? release.channels
      : [];
    if (!channels.length) {
      const empty = document.createElement("p");
      empty.className = "podcast-admin__empty";
      empty.textContent = adminText(
        "noPublicationRevision"
      );
      section.append(empty);
      return section;
    }
    const grid = document.createElement("div");
    grid.className = "podcast-admin__release-channel-grid";
    for (const channel of channels) {
      const card = document.createElement("article");
      const cardHeading = document.createElement("div");
      cardHeading.className = "podcast-admin__directory-heading";
      const channelTitle = document.createElement("h4");
      channelTitle.textContent = String(
        channel.name
        || channel.id
        || adminText("channelFallback")
      );
      cardHeading.append(
        channelTitle,
        distributionBadge(
          distributionStatusLabel(channel.status),
          channel.status === "succeeded" ? "is-ready" : ""
        )
      );
      card.append(cardHeading);

      const timing = document.createElement("p");
      timing.textContent = [
        channel.scheduledAt
          ? adminText(
              "scheduledAt",
              { date: formatDate(channel.scheduledAt) }
            )
          : "",
        channel.completedAt
          ? adminText(
              "completedAt",
              { date: formatDate(channel.completedAt) }
            )
          : "",
        adminText(
          "attemptsCount",
          { count: formatInteger(Math.max(0, Number(channel.attemptCount) || 0)) }
        )
      ].filter(Boolean).join(" · ");
      card.append(timing);

      if (channel.providerEvidence) {
        const evidence = document.createElement("p");
        evidence.textContent = adminText(
          "providerEvidence",
          { evidence: String(channel.providerEvidence) }
        );
        card.append(evidence);
      }
      if (channel.id === "news" && channel.siteStatus) {
        const site = document.createElement("p");
        site.textContent = [
          adminText(
            "sitePublication",
            { status: distributionStatusLabel(channel.siteStatus) }
          ),
          channel.siteCommitSha
            ? adminText(
                "commitLabel",
                { commit: String(channel.siteCommitSha).slice(0, 12) }
              )
            : ""
        ].filter(Boolean).join(" · ");
        card.append(site);
      }
      if (channel.error) {
        const error = document.createElement("p");
        error.className = "podcast-admin__status is-error";
        error.textContent = String(channel.error);
        card.append(error);
      }
      if (channel.id === "youtube" && episodeId) {
        const youtubeControls = buildEpisodeYouTubeControls({
          channel,
          release,
          episodeId,
          episode: episodes.find(({ id }) => id === episodeId),
          show: shows.find(({ id }) => id === selectedShowId),
          canPrepare: canOperateSelectedShowPublication(),
          canApprove: canApproveClipYouTube,
          publicationId: operationId("episode_youtube"),
          text: adminText,
          localizedCode,
          formatInteger
        });
        if (youtubeControls) card.append(youtubeControls);
      }
      if (
        channel.retryable
        && episodeId
        && canOperateSelectedShowPublication()
      ) {
        const actions = document.createElement("div");
        actions.className = "podcast-admin__release-channel-actions";
        const retry = document.createElement("button");
        retry.className = "btn btn-outline-light";
        retry.type = "button";
        retry.dataset.podcastReleaseRetry = "";
        retry.dataset.episodeId = String(episodeId);
        retry.dataset.destination = String(channel.id || "");
        retry.dataset.publicationRevision = String(
          Number(release.publicationRevision) || 0
        );
        retry.dataset.channelName = String(
          channel.name
          || channel.id
          || adminText("channelFallback").toLocaleLowerCase(
            document.documentElement.lang || "en"
          )
        );
        retry.textContent = adminText(
          "retryChannel",
          {
            channel: String(
              channel.name
              || channel.id
              || adminText("channelFallback")
            )
          }
        );
        const status = document.createElement("p");
        status.className = "podcast-admin__status";
        status.dataset.podcastReleaseRetryStatus = "";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        actions.append(retry, status);
        card.append(actions);
      }
      grid.append(card);
    }
    section.append(grid);
    return section;
  }

  function releaseStatusLabel(value) {
    return {
      not_published: adminText("releaseNotPublished"),
      in_progress: adminText("releaseInProgress"),
      needs_attention: adminText(
        "releaseNeedsAttention"
      ),
      complete: adminText("releaseComplete")
    }[String(value || "")] || adminText(
      "unknownReleaseState"
    );
  }

  function distributionDestinationCard(destination, { episodeId }) {
    const card = document.createElement("details");
    card.className = "podcast-admin__directory-card";
    card.dataset.destinationId = String(destination.id || "");
    card.open = Boolean(
      destination.ownerSetupStatus !== "verified"
      || destination.setupError
      || destination.publicationError
      || destination.publicationStatus === "failed"
      || (
        destination.certification
        && !destination.certification.certified
      )
    );

    const summary = document.createElement("summary");
    const heading = document.createElement("div");
    heading.className = "podcast-admin__directory-heading";
    const titleGroup = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = String(
      destination.name || adminText("directoryFallback")
    );
    const semantics = document.createElement("p");
    semantics.textContent = destination.mode === "direct_api"
      ? adminText("directProviderAdapter")
      : adminText("rssFollowingDirectory");
    titleGroup.append(title, semantics);
    const badges = document.createElement("div");
    badges.className = "podcast-admin__badges";
    badges.append(
      distributionBadge(
        destination.enabled
          ? adminText("enabled")
          : adminText("disabled"),
        destination.enabled ? "is-ready" : ""
      ),
      distributionBadge(
        distributionStatusLabel(destination.ownerSetupStatus)
      )
    );
    if (destination.publicationStatus) {
      badges.append(
        distributionBadge(
          distributionStatusLabel(destination.publicationStatus),
          destination.publicationStatus === "observed" ? "is-ready" : ""
        )
      );
    }
    if (destination.certification?.certified) {
      badges.append(
        distributionBadge(
          adminText("certificationComplete"),
          "is-ready"
        )
      );
    }
    heading.append(titleGroup, badges);
    summary.append(heading);
    card.append(summary);

    const details = document.createElement("p");
    details.className = "podcast-admin__directory-details";
    details.textContent = destination.publicationRevision
      ? `${adminText(
          "latestEpisodeRevision",
          { revision: Number(destination.publicationRevision) }
        )}${destination.lastObservedAt
          ? ` · ${adminText(
              "observedAt",
              { date: formatDate(destination.lastObservedAt) }
            )}`
          : ""}.`
      : adminText(
          "directorySetupApplies"
        );
    card.append(details);
    card.append(
      distributionCertificationList({
        certification: destination.certification || {},
        text: adminText
      })
    );

    const checklist = [
      destination.ownerAccountLabel
        ? adminText(
            "ownerAccount",
            { account: String(destination.ownerAccountLabel) }
          )
        : "",
      destination.submissionDate
        ? adminText(
            "submittedAt",
            { date: String(destination.submissionDate) }
          )
        : ""
    ].filter(Boolean);
    if (checklist.length) {
      const checklistDetails = document.createElement("p");
      checklistDetails.className = "podcast-admin__directory-details";
      checklistDetails.textContent = checklist.join(" · ");
      card.append(checklistDetails);
    }
    if (destination.setupNotes) {
      const notes = document.createElement("p");
      notes.className = "podcast-admin__directory-notes";
      notes.textContent = String(destination.setupNotes);
      card.append(notes);
    }

    const links = document.createElement("div");
    links.className = "podcast-admin__directory-links";
    const setupLink = safeDistributionLink(
      destination.submissionUrl,
      adminText("openOwnerSetup")
    );
    const listingLink = safeDistributionLink(
      destination.listingUrl,
      adminText("openPublicListing")
    );
    const evidenceLink = safeDistributionLink(
      destination.evidenceUrl,
      adminText("openEpisodeEvidence")
    );
    const submissionEvidenceLink = safeDistributionLink(
      destination.submissionEvidenceUrl,
      adminText("openSubmissionEvidence")
    );
    const destinationName = String(
      destination.name || adminText("directoryFallback")
    );
    for (const link of [
      setupLink,
      listingLink,
      evidenceLink,
      submissionEvidenceLink
    ].filter(Boolean)) {
      link.setAttribute("aria-label", adminText("directoryActionLabel", {
        action: link.textContent,
        directory: destinationName
      }));
    }
    if (setupLink) links.append(setupLink);
    if (submissionEvidenceLink) links.append(submissionEvidenceLink);
    if (listingLink) links.append(listingLink);
    if (evidenceLink) links.append(evidenceLink);
    if (links.childElementCount) card.append(links);

    for (const message of [
      destination.setupError,
      destination.publicationError
    ].filter(Boolean)) {
      const error = document.createElement("p");
      error.className = "podcast-admin__status is-error";
      error.textContent = String(message);
      card.append(error);
    }

    if (canManageSelectedShowDistribution()) {
      const form = document.createElement("form");
      form.className = "podcast-admin__distribution-form";
      form.setAttribute("aria-label", adminText("directorySetupFormLabel", {
        directory: destinationName
      }));
      form.dataset.podcastDistributionForm = "";
      form.dataset.destinationId = String(destination.id || "");
      form.dataset.episodeId = episodeId;

      const statusLabel = document.createElement("label");
      statusLabel.textContent = adminText("ownerSetup");
      const status = document.createElement("select");
      status.name = "ownerSetupStatus";
      for (const [value, label] of [
        [
          "not_started",
          adminText("setupNotStartedOption")
        ],
        ["pending", adminText("setupInProgressOption")],
        ["verified", adminText("setupCompleteOption")],
        ["not_required", adminText("setupNotRequiredOption")]
      ]) {
        status.append(
          new Option(
            label,
            value,
            false,
            value === destination.ownerSetupStatus
          )
        );
      }
      statusLabel.append(status);

      const accountLabel = document.createElement("label");
      accountLabel.textContent = adminText(
        "responsibleAccountLabel"
      );
      const account = document.createElement("input");
      account.name = "ownerAccountLabel";
      account.type = "text";
      account.maxLength = 120;
      account.autocomplete = "off";
      account.placeholder = adminText(
        "operationsPlaceholder"
      );
      account.value = String(destination.ownerAccountLabel || "");
      accountLabel.append(account);

      const submissionDateLabel = document.createElement("label");
      submissionDateLabel.textContent = adminText(
        "submissionDateOptional"
      );
      const submissionDate = document.createElement("input");
      submissionDate.name = "submissionDate";
      submissionDate.type = "date";
      submissionDate.value = String(destination.submissionDate || "");
      submissionDateLabel.append(submissionDate);

      const submissionEvidenceLabel = document.createElement("label");
      submissionEvidenceLabel.textContent = adminText(
        "submissionEvidenceOptional"
      );
      const submissionEvidence = document.createElement("input");
      submissionEvidence.name = "submissionEvidenceUrl";
      submissionEvidence.type = "url";
      submissionEvidence.inputMode = "url";
      submissionEvidence.maxLength = 2048;
      submissionEvidence.placeholder = "https://";
      submissionEvidence.value = String(
        destination.submissionEvidenceUrl || ""
      );
      submissionEvidenceLabel.append(submissionEvidence);

      const listingLabel = document.createElement("label");
      listingLabel.textContent = adminText(
        "publicListingOptional"
      );
      const listing = document.createElement("input");
      listing.name = "listingUrl";
      listing.type = "url";
      listing.inputMode = "url";
      listing.maxLength = 2048;
      listing.placeholder = "https://";
      listing.value = String(destination.listingUrl || "");
      listingLabel.append(listing);

      const notesLabel = document.createElement("label");
      notesLabel.className = "podcast-admin__distribution-form-wide";
      notesLabel.textContent = adminText(
        "operationalNotes"
      );
      const notes = document.createElement("textarea");
      notes.name = "setupNotes";
      notes.rows = 3;
      notes.maxLength = 1000;
      notes.value = String(destination.setupNotes || "");
      notesLabel.append(notes);

      const enabledLabel = document.createElement("label");
      enabledLabel.className = "podcast-admin__checkbox";
      const enabled = document.createElement("input");
      enabled.name = "enabled";
      enabled.type = "checkbox";
      enabled.checked = Boolean(destination.enabled);
      enabledLabel.append(
        enabled,
        document.createTextNode(` ${adminText("enabled")}`)
      );

      const save = document.createElement("button");
      save.className = "btn btn-outline-light";
      save.type = "submit";
      save.textContent = adminText("saveSetup");
      save.setAttribute("aria-label", adminText("directoryActionLabel", {
        action: adminText("saveSetup"),
        directory: destinationName
      }));
      const formStatus = document.createElement("p");
      formStatus.className = "podcast-admin__status";
      formStatus.dataset.podcastDistributionStatus = "";
      formStatus.setAttribute("role", "status");
      formStatus.setAttribute("aria-live", "polite");
      form.append(
        statusLabel,
        accountLabel,
        submissionDateLabel,
        submissionEvidenceLabel,
        listingLabel,
        notesLabel,
        enabledLabel,
        save,
        formStatus
      );
      card.append(form);
    }
    if (
      episodeId
      && Number(destination.publicationRevision) > 0
      && destination.publicationStatus
      && !["setup_required", "disabled"].includes(
        destination.publicationStatus
      )
      && canOperateSelectedShowPublication()
    ) {
      card.append(directoryObservationForm(destination, { episodeId }));
    }
    return card;
  }

  function directoryObservationForm(destination, { episodeId }) {
    const form = document.createElement("form");
    form.className =
      "podcast-admin__distribution-form podcast-admin__directory-observation-form";
    form.dataset.podcastDirectoryObservationForm = "";
    form.dataset.destinationId = String(destination.id || "");
    form.dataset.episodeId = String(episodeId);
    form.dataset.publicationRevision = String(
      Number(destination.publicationRevision) || 0
    );

    const stateLabel = document.createElement("label");
    stateLabel.textContent = adminText(
      "episodeDirectoryState"
    );
    const state = document.createElement("select");
    state.name = "status";
    state.append(
      new Option(
        adminText("distributionObserved"),
        "observed",
        false,
        destination.publicationStatus !== "failed"
      ),
      new Option(
        adminText("distributionNeedsAttention"),
        "failed",
        false,
        destination.publicationStatus === "failed"
      )
    );
    stateLabel.append(state);

    const evidenceLabel = document.createElement("label");
    evidenceLabel.textContent = adminText(
      "httpsEpisodeEvidence"
    );
    const evidence = document.createElement("input");
    evidence.name = "evidenceUrl";
    evidence.type = "url";
    evidence.inputMode = "url";
    evidence.maxLength = 2048;
    evidence.placeholder = "https://";
    evidence.value = String(destination.evidenceUrl || "");
    evidenceLabel.append(evidence);

    const errorLabel = document.createElement("label");
    errorLabel.dataset.podcastDirectoryObservationError = "";
    errorLabel.textContent = adminText("failureDetail");
    const error = document.createElement("textarea");
    error.name = "error";
    error.rows = 2;
    error.maxLength = 500;
    error.value = String(destination.publicationError || "");
    errorLabel.append(error);

    const save = document.createElement("button");
    save.className = "btn btn-outline-light";
    save.type = "submit";
    save.textContent = adminText(
      "saveEpisodeEvidence"
    );
    const formStatus = document.createElement("p");
    formStatus.className = "podcast-admin__status";
    formStatus.dataset.podcastDirectoryObservationStatus = "";
    formStatus.setAttribute("role", "status");
    formStatus.setAttribute("aria-live", "polite");
    form.append(
      stateLabel,
      evidenceLabel,
      errorLabel,
      save,
      formStatus
    );
    state.addEventListener(
      "change",
      () => updateDirectoryObservationFields(form)
    );
    updateDirectoryObservationFields(form);
    return form;
  }

  function updateDirectoryObservationFields(form) {
    const failed = form.elements.status.value === "failed";
    const errorLabel = form.querySelector(
      "[data-podcast-directory-observation-error]"
    );
    errorLabel.hidden = !failed;
    form.elements.error.required = failed;
    form.elements.evidenceUrl.required = !failed;
  }

  function distributionBadge(label, className = "") {
    const badge = document.createElement("span");
    badge.className = `podcast-admin__pill ${className}`.trim();
    badge.textContent = label;
    return badge;
  }

  function distributionStatusLabel(value) {
    return {
      not_started: adminText(
        "distributionSetupNotStarted"
      ),
      pending: adminText(
        "distributionSetupInProgress"
      ),
      verified: adminText(
        "distributionOwnerSetupComplete"
      ),
      not_required: adminText(
        "distributionSetupNotRequired"
      ),
      setup_required: adminText(
        "distributionSetupRequired"
      ),
      waiting_for_feed: adminText(
        "distributionWaitingForRss"
      ),
      queued: adminText("distributionQueued"),
      running: adminText("distributionRunning"),
      processing: adminText("distributionProcessing"),
      succeeded: adminText("distributionSucceeded"),
      observed: adminText("distributionObserved"),
      failed: adminText("distributionNeedsAttention"),
      canceled: adminText("distributionCanceled"),
      disabled: adminText("distributionDisabled")
    }[String(value || "")] || adminText("distributionUnknown");
  }

  function safeDistributionLink(value, label) {
    try {
      const url = new URL(String(value || ""));
      if (
        url.protocol !== "https:"
        || url.username
        || url.password
        || url.hash
      ) return null;
      const link = document.createElement("a");
      link.className = "btn btn-outline-light";
      link.href = url.toString();
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label;
      return link;
    } catch {
      return null;
    }
  }

  function canManageSelectedShowDistribution() {
    return (adminIdentity?.roles || []).some(({ role, showId }) =>
      (role === "super_admin" || role === "admin")
      && (role === "super_admin" || !showId || showId === selectedShowId)
    );
  }

  function canOperateSelectedShowPublication() {
    return (adminIdentity?.roles || []).some(({ role, showId }) =>
      ["super_admin", "admin", "producer"].includes(role)
      && (role === "super_admin" || !showId || showId === selectedShowId)
    );
  }

  async function handleDistributionClick(event) {
    const youtubeApproval = event.target.closest(
      "[data-podcast-episode-youtube-approve]"
    );
    if (youtubeApproval) {
      await handleEpisodeYouTubeApproval({
        button: youtubeApproval,
        authorized: canApproveClipYouTube,
        client,
        text: adminText,
        setStatus,
        friendlyError,
        loadDistribution
      });
      return;
    }
    const feedValidation = event.target.closest(
      "[data-podcast-feed-validation-retry]"
    );
    if (feedValidation) {
      await revalidateCanonicalFeed(feedValidation);
      return;
    }
    const retry = event.target.closest("[data-podcast-release-retry]");
    if (retry) {
      await retryReleaseChannel(retry);
      return;
    }
    const button = event.target.closest(
      "[data-podcast-distribution-copy-feed]"
    );
    if (!button) return;
    const status = distributionRoot.querySelector(
      "[data-podcast-distribution-copy-status]"
    );
    const value = button.dataset.podcastDistributionCopyFeed || "";
    try {
      await navigator.clipboard.writeText(value);
      setStatus(status, adminText("feedUrlCopied"));
    } catch (_error) {
      const input = distributionRoot.querySelector(
        "[data-podcast-distribution-feed-url]"
      );
      input?.focus();
      input?.select();
      setStatus(
        status,
        adminText(
          "feedCopySelected"
        ),
        true
      );
    }
  }

  async function revalidateCanonicalFeed(button) {
    if (!canOperateSelectedShowPublication() || !selectedShowId) return;
    const status = button.parentElement?.querySelector(
      "[data-podcast-feed-validation-status]"
    );
    button.disabled = true;
    setStatus(status, adminText("validatingRssFeed"));
    try {
      const result = await client.request(
        `/v1/admin/shows/${encodeURIComponent(
          selectedShowId
        )}/feed-validation`,
        { method: "POST" }
      );
      setStatus(
        status,
        adminText("rssFeedValidationPassed", {
          items: formatInteger(Math.max(0, Number(result.itemCount) || 0))
        })
      );
      await loadDistribution();
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      button.disabled = false;
    }
  }

  async function retryReleaseChannel(button) {
    if (!canOperateSelectedShowPublication()) return;
    const episodeId = String(button.dataset.episodeId || "");
    const destination = String(button.dataset.destination || "");
    const publicationRevision = Number(
      button.dataset.publicationRevision || 0
    );
    const channelName = String(
      button.dataset.channelName
      || adminText("channelFallback").toLocaleLowerCase(
        document.documentElement.lang || "en"
      )
    );
    if (
      !episodeId
      || !/^[A-Za-z0-9_-]+$/.test(destination)
      || !Number.isSafeInteger(publicationRevision)
      || publicationRevision <= 0
    ) return;
    if (
      !window.confirm(
        adminText(
          "retryReleaseConfirm",
          { channel: channelName, revision: publicationRevision }
        )
      )
    ) return;
    const status = button.parentElement?.querySelector(
      "[data-podcast-release-retry-status]"
    );
    button.disabled = true;
    setStatus(
      status,
      adminText(
        "queueingRetry",
        { channel: channelName }
      )
    );
    try {
      const result = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          episodeId
        )}/distribution/${encodeURIComponent(destination)}/retry`,
        {
          method: "POST",
          body: { publicationRevision }
        }
      );
      setStatus(
        status,
        result.idempotent
          ? adminText(
              "channelAlreadyQueued",
              { channel: channelName }
            )
          : adminText(
              "channelRetryQueued",
              {
                channel: channelName,
                schedule: result.delivery === "scheduled"
                  ? adminText(
                      "nextSchedulerPass"
                    )
                  : ""
              }
            )
      );
      await loadDistribution(episodeId);
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      button.disabled = false;
    }
  }

  async function updateDistributionDestination(event) {
    const form = event.target.closest("[data-podcast-distribution-form]");
    if (!form) return;
    event.preventDefault();
    if (!canManageSelectedShowDistribution()) return;
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector("[data-podcast-distribution-status]");
    button.disabled = true;
    setStatus(
      status,
      adminText("savingOwnerSetup")
    );
    try {
      await client.request(
        `/v1/admin/shows/${encodeURIComponent(
          selectedShowId
        )}/distribution/${encodeURIComponent(form.dataset.destinationId)}`,
        {
          method: "PATCH",
          body: {
            enabled: form.elements.enabled.checked,
            ownerSetupStatus: form.elements.ownerSetupStatus.value,
            listingUrl: form.elements.listingUrl.value,
            ownerAccountLabel: form.elements.ownerAccountLabel.value,
            submissionDate: form.elements.submissionDate.value,
            submissionEvidenceUrl:
              form.elements.submissionEvidenceUrl.value,
            setupNotes: form.elements.setupNotes.value
          }
        }
      );
      setStatus(
        status,
        adminText("directorySetupSaved")
      );
      await loadDistribution(form.dataset.episodeId || undefined);
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      button.disabled = false;
    }
  }

  async function updateDirectoryObservation(event) {
    const form = event.target.closest(
      "[data-podcast-directory-observation-form]"
    );
    if (!form) return;
    event.preventDefault();
    if (!canOperateSelectedShowPublication()) return;
    const episodeId = String(form.dataset.episodeId || "");
    const destinationId = String(form.dataset.destinationId || "");
    const publicationRevision = Number(
      form.dataset.publicationRevision || 0
    );
    if (
      !episodeId
      || !/^[A-Za-z0-9_-]+$/.test(destinationId)
      || !Number.isSafeInteger(publicationRevision)
      || publicationRevision <= 0
    ) return;
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector(
      "[data-podcast-directory-observation-status]"
    );
    button.disabled = true;
    setStatus(
      status,
      adminText("savingEpisodeEvidence")
    );
    try {
      const result = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          episodeId
        )}/distribution/${encodeURIComponent(destinationId)}`,
        {
          method: "PATCH",
          body: {
            publicationRevision,
            status: form.elements.status.value,
            evidenceUrl: form.elements.evidenceUrl.value,
            error: form.elements.error.value
          }
        }
      );
      setStatus(
        status,
        result.idempotent
          ? adminText(
              "directoryEvidenceCurrent"
            )
          : adminText(
              "directoryEvidenceSaved"
            )
      );
      await loadDistribution(episodeId);
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      button.disabled = false;
    }
  }

  function initializeCampaignForm() {
    if (!campaignForm) return;
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    campaignForm.elements.startsAt.value = datetimeLocalValue(now);
    campaignForm.elements.endsAt.value = datetimeLocalValue(end);
    updateDirectSponsorFields();
  }

  function updateDirectSponsorFields() {
    if (!campaignForm) return;
    const direct = campaignForm.elements.campaignType.value === "direct";
    for (const field of campaignForm.querySelectorAll("[data-direct-sponsor-field]")) {
      field.hidden = !direct;
      for (const control of field.querySelectorAll("input, select")) {
        control.disabled = !direct;
      }
    }
    campaignForm.elements.sponsorName.required = direct;
  }

  async function loadCampaigns() {
    if (!selectedShowId) {
      campaigns = [];
      campaignList?.replaceChildren();
      fillCreativeCampaignSelect();
      return;
    }
    campaignList.innerHTML = `<p>${escapeHtml(adminText(
      "loadingSponsorCampaigns"
    ))}</p>`;
    try {
      const payload = await client.request(
        `/v1/admin/ads/campaigns?showId=${encodeURIComponent(selectedShowId)}`
      );
      campaigns = payload.campaigns || [];
      renderCampaigns(campaigns);
      fillCreativeCampaignSelect();
    } catch (error) {
      campaigns = [];
      campaignList.textContent = friendlyError(error);
      fillCreativeCampaignSelect();
    }
  }

  function fillCreativeCampaignSelect() {
    const select = creativeForm?.elements.campaignId;
    if (!select) return;
    const previousValue = select.value;
    const activeCampaigns = campaigns.filter(({ active }) => active);
    select.replaceChildren(...activeCampaigns.map((campaign) =>
      new Option(
        `${campaign.name} — ${localizedCode(
          "campaignStatus",
          campaign.approvalStatus
        )}`,
        campaign.id,
        false,
        campaign.id === previousValue
      )
    ));
    const button = creativeForm.querySelector('button[type="submit"]');
    button.disabled = activeCampaigns.length === 0;
    if (activeCampaigns.length === 0) {
      setStatus(
        creativeStatus,
        adminText(
          "createActiveCampaignFirst"
        )
      );
    } else if (creativeProgress.hidden) {
      setStatus(creativeStatus, "");
    }
  }

  function renderCampaigns(campaignRows) {
    if (!campaignRows.length) {
      campaignList.innerHTML = `<p class="podcast-admin__empty">${escapeHtml(
        adminText(
          "noSponsorCampaigns"
        )
      )}</p>`;
      return;
    }
    campaignList.replaceChildren(...campaignRows.map((campaign) => {
      const row = document.createElement("article");
      row.className = "podcast-admin__campaign";
      const blockers = campaign.blockers || [];
      const blockerItems = blockers.length
        ? blockers.map((blocker) =>
            `<li>${escapeHtml(humanizeCode(blocker))}</li>`
          ).join("")
        : `<li>${escapeHtml(adminText(
            "campaignMetadataReady"
          ))}</li>`;
      const canApprove = canManageCampaigns
        && campaign.active
        && campaign.approvalStatus !== "approved";
      const canKill = canManageCampaigns && campaign.active;
      row.innerHTML = `
        <div>
          <p class="podcast-admin__pill">${escapeHtml(localizedCode(
            "campaignStatus",
            campaign.approvalStatus
          ))} · ${escapeHtml(campaign.active
            ? adminText("activeDraftRow")
            : adminText("revoked"))}</p>
          <h3>${escapeHtml(campaign.name)}</h3>
          <p>${escapeHtml(localizedCode(
            "campaignType",
            campaign.campaignType
          ))}${campaign.sponsor?.name ? ` · ${escapeHtml(campaign.sponsor.name)}` : ""}</p>
          <p>${escapeHtml(formatDate(campaign.startsAt))} → ${escapeHtml(formatDate(campaign.endsAt))}</p>
          <p>${escapeHtml(adminText(
            "qualifiedAndCreatives",
            {
              qualified: formatInteger(campaign.qualifiedImpressions),
              goal: campaign.qualifiedImpressionGoal
                ? ` / ${formatInteger(campaign.qualifiedImpressionGoal)}`
                : "",
              creatives: formatInteger(campaign.readyCreativeCount)
            }
          ))}</p>
          <ul>${blockerItems}</ul>
        </div>
        <div class="podcast-admin__episode-actions">
          <button class="btn btn-outline-light" type="button" data-approve-campaign="${escapeAttribute(campaign.id)}" ${canApprove ? "" : "disabled"}>${escapeHtml(adminText("approve"))}</button>
          <button class="btn btn-danger" type="button" data-kill-campaign="${escapeAttribute(campaign.id)}" ${canKill ? "" : "disabled"}>${escapeHtml(adminText("kill"))}</button>
        </div>`;
      return row;
    }));
  }

  async function createCampaign(event) {
    event.preventDefault();
    const button = campaignForm.querySelector('button[type="submit"]');
    const direct = campaignForm.elements.campaignType.value === "direct";
    button.disabled = true;
    setStatus(
      campaignStatus,
      adminText("creatingCampaignDraft")
    );
    try {
      await client.request("/v1/admin/ads/campaigns", {
        method: "POST",
        body: {
          showId: selectedShowId,
          name: campaignForm.elements.name.value,
          campaignType: campaignForm.elements.campaignType.value,
          sponsorName: direct ? campaignForm.elements.sponsorName.value : null,
          sponsorWebsiteUrl: direct
            ? campaignForm.elements.sponsorWebsiteUrl.value || null
            : null,
          startsAt: isoOrNull(campaignForm.elements.startsAt.value),
          endsAt: isoOrNull(campaignForm.elements.endsAt.value),
          episodeId: campaignForm.elements.episodeId.value || null,
          position: campaignForm.elements.position.value || null,
          appName: campaignForm.elements.appName.value || null,
          deviceType: campaignForm.elements.deviceType.value || null,
          priority: Number(campaignForm.elements.priority.value || 0),
          pacingStrategy: campaignForm.elements.pacingStrategy.value,
          impressionCap: integerOrNull(campaignForm.elements.impressionCap.value),
          qualifiedImpressionGoal: integerOrNull(
            campaignForm.elements.qualifiedImpressionGoal.value
          ),
          billingModel: direct
            ? campaignForm.elements.billingModel.value
            : "flat_fee",
          contractAmountCents: direct
            ? moneyToCents(campaignForm.elements.contractAmount.value)
            : null,
          cpmCents: direct ? moneyToCents(campaignForm.elements.cpm.value) : null
        }
      });
      campaignForm.reset();
      initializeCampaignForm();
      fillEpisodeSelects();
      setStatus(
        campaignStatus,
        adminText(
          "campaignDraftCreated"
        )
      );
      await loadCampaigns();
    } catch (error) {
      setStatus(campaignStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function uploadCreative(event) {
    event.preventDefault();
    const file = creativeForm.elements.audio.files[0];
    if (!file) return;
    if (!/\.mp3$/i.test(file.name)) {
      setStatus(
        creativeStatus,
        adminText("chooseMp3"),
        true
      );
      return;
    }
    if (file.size < 1 || file.size > 25 * 1024 * 1024) {
      setStatus(
        creativeStatus,
        adminText(
          "creativeAudioSize"
        ),
        true
      );
      return;
    }
    const button = creativeForm.querySelector('button[type="submit"]');
    const campaignId = creativeForm.elements.campaignId.value;
    button.disabled = true;
    creativeProgress.hidden = false;
    creativeProgress.value = 0;
    setStatus(
      creativeStatus,
      adminText(
        "creatingCreativeMetadata"
      )
    );
    try {
      const created = await client.request(
        `/v1/admin/ads/campaigns/${encodeURIComponent(campaignId)}/creatives`,
        {
          method: "POST",
          body: {
            name: creativeForm.elements.name.value,
            filename: file.name,
            durationSeconds: Number(
              creativeForm.elements.durationSeconds.value
            ),
            weight: Number(creativeForm.elements.weight.value),
            streamProfile: "mp3-44100-stereo-cbr128-frame-v1"
          }
        }
      );
      creativeProgress.value = 1;
      if (
        created.upload?.lengthHeader !== "x-podcast-upload-bytes"
        || created.upload?.maximumBytes < file.size
      ) {
        throw new Error(adminText(
          "creativeUploadRejected"
        ));
      }
      setStatus(
        creativeStatus,
        adminText(
          "streamingCreative"
        )
      );
      await client.request(created.upload.path, {
        method: created.upload.method,
        body: file,
        headers: {
          "content-type": created.upload.contentType,
          [created.upload.lengthHeader]: String(file.size)
        }
      });
      creativeProgress.value = 2;
      setStatus(
        creativeStatus,
        adminText(
          "validatingCreative"
        )
      );
      const validated = await client.request(
        `/v1/admin/ads/creatives/${encodeURIComponent(created.creativeId)}/validate`,
        { method: "POST", body: {} }
      );
      if (validated.validationStatus !== "ready") {
        throw new Error(
          adminText(
            "creativeNotReady"
          )
        );
      }
      creativeProgress.value = 3;
      creativeForm.reset();
      setStatus(
        creativeStatus,
        adminText(
          "creativeValidated",
          {
            duration: formatInteger(validated.report?.durationMs),
            frames: formatInteger(validated.report?.frameCount)
          }
        )
      );
      await loadCampaigns();
    } catch (error) {
      setStatus(creativeStatus, friendlyError(error), true);
    } finally {
      button.disabled = campaigns.filter(({ active }) => active).length === 0;
    }
  }

  async function handleCampaignAction(event) {
    const approveButton = event.target.closest("[data-approve-campaign]");
    const killButton = event.target.closest("[data-kill-campaign]");
    const button = approveButton || killButton;
    if (!button) return;
    const campaignId = approveButton
      ? approveButton.dataset.approveCampaign
      : killButton.dataset.killCampaign;
    if (
      killButton
      && !globalThis.confirm(
        adminText(
          "killCampaignConfirm"
        )
      )
    ) {
      return;
    }
    button.disabled = true;
    setStatus(
      campaignStatus,
      approveButton
        ? adminText("checkingApprovalGates")
        : adminText("killingCampaign")
    );
    try {
      await client.request(
        `/v1/admin/ads/campaigns/${encodeURIComponent(campaignId)}/${approveButton ? "approve" : "kill"}`,
        { method: "POST", body: {} }
      );
      setStatus(
        campaignStatus,
        approveButton
          ? adminText("campaignApproved")
          : adminText("campaignKilled")
      );
      await loadCampaigns();
    } catch (error) {
      setStatus(campaignStatus, friendlyError(error), true);
      button.disabled = false;
    }
  }

  async function previewSponsorDecision(event) {
    event.preventDefault();
    const button = sponsorForm.querySelector('button[type="submit"]');
    button.disabled = true;
    sponsorResult.replaceChildren();
    setStatus(
      sponsorStatus,
      adminText(
        "evaluatingSponsorInventory"
      )
    );
    try {
      const payload = await client.request("/v1/admin/ads/preview", {
        method: "POST",
        body: {
          episodeId: sponsorForm.elements.episodeId.value,
          position: sponsorForm.elements.position.value,
          appName: sponsorForm.elements.appName.value,
          deviceType: sponsorForm.elements.deviceType.value,
          streamProfile: sponsorForm.elements.streamProfile.value,
          at: isoOrNull(sponsorForm.elements.at.value)
        }
      });
      if (!payload.previewOnly || payload.persisted) {
        throw new Error(adminText(
          "previewSafetyRejected"
        ));
      }
      renderSponsorDecision(payload);
      setStatus(
        sponsorStatus,
        adminText(
          "previewComplete"
        )
      );
    } catch (error) {
      setStatus(sponsorStatus, friendlyError(error), true);
    } finally {
      button.disabled = episodes.length === 0;
    }
  }

  function renderSponsorDecision(payload) {
    const blockers = payload.readiness?.blockers || [];
    const selection = payload.decision?.selection;
    const decision = selection
      ? `
        <p class="podcast-admin__pill">${escapeHtml(adminText(
          "proposedSelection"
        ))}</p>
        <h3>${escapeHtml(adminText(
          "campaignTypeHeading",
          { type: localizedCode("campaignType", selection.campaignType) }
        ))}</h3>
        <dl>
          <div><dt>${escapeHtml(adminText("campaign"))}</dt><dd>${escapeHtml(selection.campaignId)}</dd></div>
          <div><dt>${escapeHtml(adminText("creative"))}</dt><dd>${escapeHtml(selection.creativeId)}</dd></div>
          <div><dt>${escapeHtml(adminText("rule"))}</dt><dd>${escapeHtml(selection.ruleId || adminText("generic"))}</dd></div>
          <div><dt>${escapeHtml(adminText("priority"))}</dt><dd>${formatInteger(selection.reason?.priority)}</dd></div>
        </dl>`
      : `
        <p class="podcast-admin__pill">${escapeHtml(adminText(
          "fullFileFallback"
        ))}</p>
        <h3>${escapeHtml(adminText(
          "noEligibleInventory"
        ))}</h3>
        <p>${escapeHtml(adminText(
          "existingEpisodeDelivery"
        ))}</p>`;
    const blockerItems = blockers.length
      ? blockers.map((blocker) => `<li>${escapeHtml(humanizeCode(blocker))}</li>`).join("")
      : `<li>${escapeHtml(adminText(
          "noReadinessBlockers"
        ))}</li>`;
    const card = document.createElement("article");
    card.className = "podcast-admin__decision";
    card.innerHTML = `
      <div>
        ${decision}
      </div>
      <div>
        <h3>${escapeHtml(adminText("activationBlockers"))}</h3>
        <ul>${blockerItems}</ul>
        <p><strong>${escapeHtml(adminText("publicDelivery"))}:</strong> ${escapeHtml(humanizeCode(payload.publicDeliveryMode))}</p>
        <p><strong>${escapeHtml(adminText("campaignsEvaluated"))}:</strong> ${formatInteger(payload.inventory?.campaignCount)}</p>
        <p><strong>${escapeHtml(adminText("inventoryRevision"))}:</strong> <code>${escapeHtml(String(payload.inventory?.fingerprint || "").slice(0, 12))}</code></p>
      </div>`;
    sponsorResult.replaceChildren(card);
  }

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
    const requestedShowId = selectedShowId;
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
        || requestedShowId !== selectedShowId
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
    if (selectedShowId) params.set("showId", selectedShowId);
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
        fetchImpl: window.fetch,
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
    const requestedShowId = selectedShowId;
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
        || requestedShowId !== selectedShowId
      ) return;
      renderBilling(readiness, evidence);
      setStatus(billingStatus, "");
    } catch (error) {
      if (requestId !== billingRequestId) return;
      billingRoot.replaceChildren();
      setStatus(
        billingStatus,
        error instanceof AdminApiError && error.status === 403
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

  function isSuperAdmin() {
    return (adminIdentity?.roles || []).some(({ role }) =>
      role === "super_admin"
    );
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
      if (selectedShowId) params.set("showId", selectedShowId);
      const baseUrl = new URL(`${apiOrigin.replace(/\/+$/, "")}/`);
      const exportUrl = new URL(
        `/v1/admin/billing/tax-evidence?${params}`,
        baseUrl
      );
      if (exportUrl.origin !== baseUrl.origin) {
        throw new Error("unsafe_billing_export_origin");
      }
      const result = await requestCredentialedBlob(exportUrl, {
        fetchImpl: window.fetch,
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

  function initializeTurnstile() {
    const siteKey = root.dataset.turnstileSiteKey;
    if (
      !siteKey
      || turnstileWidgetId !== undefined
      || turnstileInitialization
    ) return;
    turnstileInitialization = loadTurnstile()
      .then(() => {
        if (turnstileWidgetId !== undefined || authPanel.hidden) return;
        turnstileWidgetId = globalThis.turnstile.render("#podcast-turnstile", {
          sitekey: siteKey,
          action: "podcast_admin_login",
          size: responsiveTurnstileSize(turnstileContainer),
          callback: (token) => { turnstileToken = token; },
          "expired-callback": () => { turnstileToken = ""; },
          "error-callback": () => { turnstileToken = ""; }
        });
      })
      .catch(() => {
        setStatus(
          authStatus,
          adminText("verificationUnavailable"),
          true
        );
      })
      .finally(() => {
        turnstileInitialization = undefined;
      });
  }

  function resetTurnstile() {
    turnstileToken = "";
    if (turnstileWidgetId !== undefined) {
      globalThis.turnstile?.reset?.(turnstileWidgetId);
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
    script.referrerPolicy = "no-referrer";
    script.addEventListener("load", () => {
      if (globalThis.turnstile) resolve();
      else reject(new Error("turnstile_unavailable"));
    }, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.append(script);
  }).catch((error) => {
    turnstileLoader = undefined;
    throw error;
  });
  return turnstileLoader;
}

function setStatus(element, message, error = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", error);
}

function emptyChapterSet(episodeId) {
  return {
    episodeId,
    durationSeconds: null,
    status: "needs_review",
    revision: 0,
    contentSha256: null,
    approvedRevision: null,
    approvedAt: null,
    chapters: [newChapter(0)]
  };
}

function newChapter(startsAtMs = 0) {
  return {
    id: operationId("chapter"),
    startsAtMs,
    title: "",
    url: "",
    imageUrl: "",
    toc: true
  };
}

function operationId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function millisecondsToSeconds(value) {
  return (Number(value || 0) / 1_000).toFixed(3).replace(/\.?0+$/, "");
}

const formatClipDuration = (value) =>
  clipDurationLabel(value, adminText, document.documentElement.lang);

function secondsToMilliseconds(value, label) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error(adminText("nonNegativeNumber", { label }));
  }
  const milliseconds = Math.round(seconds * 1_000);
  if (!Number.isSafeInteger(milliseconds)) {
    throw new Error(adminText("outsideSupportedRange", { label }));
  }
  return milliseconds;
}

function transcriptInputError(error) {
  return error instanceof Error
    ? error.message
    : adminText("invalidTranscriptValues");
}

function chapterInputError(error) {
  return error instanceof Error
    ? error.message
    : adminText("invalidChapterValues");
}

function reviewInputError(error) {
  return error instanceof Error
    ? error.message
    : adminText("invalidReviewValues");
}

function optionalReviewMilliseconds(value, label) {
  const text = String(value || "").trim();
  if (!text) return null;
  return secondsToMilliseconds(text, label);
}

function formatReviewRange(startsAtMs, endsAtMs) {
  if (startsAtMs === null || startsAtMs === undefined) {
    return adminText("untimed");
  }
  const start = millisecondsToTimestamp(Number(startsAtMs));
  return endsAtMs === null || endsAtMs === undefined
    ? start
    : `${start}–${millisecondsToTimestamp(Number(endsAtMs))}`;
}

function checkedHttpsUrl(value, label) {
  const text = String(value || "").trim();
  if (!text) return "";
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error(adminText("completeHttpsUrl", { label }));
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(adminText("completeHttpsUrl", { label }));
  }
  return url.href;
}

function friendlyError(error) {
  if (error instanceof AdminDownloadError) {
    if (error.code === "download_too_large") {
      return adminText(
        "downloadTooLarge"
      );
    }
    if (error.code === "download_content_type_invalid") {
      return adminText(
        "downloadTypeInvalid"
      );
    }
    return adminText(
      "downloadFailed"
    );
  }
  if (!(error instanceof AdminApiError)) {
    return adminText(
      "serviceUnavailable"
    );
  }
  const groupedCode = {
    audio_qc_completion_conflict: "audio_qc_run_conflict",
    publication_conflict: "publication_snapshot_stale",
    review_comment_revision_conflict: "review_revision_conflict",
    review_comment_id_conflict: "review_mutation_conflict"
  }[error.code] || (
    error.code.startsWith("publication_override_")
      ? "publication_override_invalid"
      : error.code.startsWith("transcription_")
        ? "transcription_invalid"
        : error.code
  );
  const translated = window.DustWaveI18n?.t(
    `admin.error_${groupedCode}`,
    {
      details: (
        error.code === "campaign_not_ready"
          ? error.details?.blockers || []
          : error.details?.missing || []
      ).map(humanizeCode).join(", ")
    }
  );
  if (translated && !translated.startsWith("[missing:")) return translated;
  return error.message || error.code;
}

function isoOrNull(value) {
  return value ? new Date(value).toISOString() : null;
}

function datetimeLocalValue(value) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function integerOrNull(value) {
  return value === "" ? null : Number(value);
}

function moneyToCents(value) {
  return value === "" ? null : Math.round(Number(value) * 100);
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(
        document.documentElement.lang || "en",
        { dateStyle: "medium", timeStyle: "short" }
      ).format(new Date(value))
    : adminText("notSet");
}

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 bytes";
  if (bytes < 1_024) return `${Math.round(bytes)} bytes`;
  if (bytes < 1_024 ** 2) return `${(bytes / 1_024).toFixed(1)} KiB`;
  if (bytes < 1_024 ** 3) {
    return `${(bytes / (1_024 ** 2)).toFixed(1)} MiB`;
  }
  return `${(bytes / (1_024 ** 3)).toFixed(2)} GiB`;
}

function formatDurationMilliseconds(value) {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds < 1) {
    return adminText("durationUnavailable");
  }
  return millisecondsToTimestamp(Math.round(milliseconds));
}

function publicationGateLabel(value) {
  if (value === "enforce") return adminText("exactSnapshotEnforced");
  if (value === "shadow") return adminText("exactSnapshotShadow");
  return adminText("legacyPublishChecks");
}

function formatInteger(value) {
  return new Intl.NumberFormat(
    document.documentElement.lang || "en"
  ).format(Number(value || 0));
}

function formatPercent(value) {
  const ratio = Number(value);
  if (!Number.isFinite(ratio)) return "0%";
  return new Intl.NumberFormat(document.documentElement.lang || "en", {
    style: "percent",
    maximumFractionDigits: 1
  }).format(ratio);
}

function humanizeCode(value) {
  return String(value || "").replace(/_/g, " ");
}

function localizedCode(prefix, value) {
  const code = String(value || "").trim();
  return adminText(`${prefix}_${code}`, humanizeCode(code));
}

function fallbackMime(filename) {
  const value = String(filename).toLowerCase();
  if (value.endsWith(".mp3")) return "audio/mpeg";
  if (value.endsWith(".m4a")) return "audio/mp4";
  if (value.endsWith(".wav")) return "audio/wav";
  if (value.endsWith(".flac")) return "audio/flac";
  if (value.endsWith(".mov")) return "video/quicktime";
  if (value.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

function downloadJson(filename, value) {
  const url = URL.createObjectURL(new Blob(
    [`${JSON.stringify(value, null, 2)}\n`],
    { type: "application/json" }
  ));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
