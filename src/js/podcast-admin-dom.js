export function appendDefinition(list, label, value) {
  const document = list.ownerDocument ?? globalThis.document;
  const term = document.createElement("dt");
  const detail = document.createElement("dd");
  term.textContent = label;
  detail.textContent = value;
  list.append(term, detail);
}

export function createEmptyAdminMessage(
  value,
  document = globalThis.document
) {
  const message = document.createElement("p");
  message.className = "podcast-admin__empty";
  message.textContent = value;
  return message;
}

export function setElementStatus(element, message, error = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", error);
}
