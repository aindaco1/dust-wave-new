const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/;

export function createRetriableOperationId(operationId, prefix) {
  if (typeof operationId !== "function" || !IDENTIFIER_PATTERN.test(prefix)) {
    throw new TypeError("A valid operation ID factory and prefix are required");
  }
  let pending = null;
  return {
    get(context) {
      const key = String(context || "");
      if (!key) throw new TypeError("An operation context is required");
      if (pending?.context !== key) {
        const id = String(operationId(prefix) || "");
        if (!IDENTIFIER_PATTERN.test(id)) {
          throw new TypeError("The operation ID factory returned an invalid ID");
        }
        pending = { context: key, id };
      }
      return pending.id;
    },
    accept(context, id) {
      if (
        pending?.context !== String(context || "")
        || pending.id !== String(id || "")
      ) return false;
      pending = null;
      return true;
    },
    reset() {
      pending = null;
    }
  };
}

export function hasActiveCurrentOperation(rows, activeStatuses) {
  const statuses = activeStatuses instanceof Set
    ? activeStatuses
    : new Set(activeStatuses || []);
  return Array.isArray(rows) && rows.some((row) =>
    row?.current === true && statuses.has(String(row.status || ""))
  );
}

export function canQueueCurrentOperation({
  currentId,
  processorEnabled,
  authorized,
  rows,
  activeStatuses
}) {
  return Boolean(
    currentId
    && processorEnabled
    && authorized
    && !hasActiveCurrentOperation(rows, activeStatuses)
  );
}
