import { normalizeAdminReason } from "./podcast-admin-request-security.js";

export function normalizePublicationOverrideReason(value) {
  return normalizeAdminReason(value);
}
