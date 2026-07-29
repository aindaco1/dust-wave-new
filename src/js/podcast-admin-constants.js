export const TRANSCRIPT_CUES_PER_PAGE = 10;
export const MAXIMUM_ALIGNMENT_BENCHMARK_BYTES = 8 * 1024 * 1024;
export const TRANSCRIPTION_CHUNK_WORKFLOW = "process-transcription-chunks.yml";
export const ALIGNMENT_WORKFLOW = "process-alignment.yml";
export const AUDIO_QC_POLICY_FIELDS = Object.freeze([
  "monoIntegratedLufs",
  "stereoIntegratedLufs",
  "integratedLufsTolerance",
  "maximumTruePeakDbtp",
  "maximumDcOffset",
  "maximumChannelImbalanceLu",
  "maximumLeadingSilenceMs",
  "maximumTrailingSilenceMs",
  "maximumInternalSilenceMs",
  "silenceThresholdDb"
]);
