import { loadTurnstile } from './turnstile.js';
import { responsiveTurnstileSize } from './dust-wave-admin-shell/turnstile.js';

export function initContactForm(form, { loadChallenge = loadTurnstile, fetchImpl = fetch } = {}) {
  const copy = JSON.parse(form.ownerDocument.getElementById('contact-copy').textContent);
  const challenge = form.querySelector('[data-contact-challenge]');
  const status = form.querySelector('[role="status"]');
  const submit = form.querySelector('[type="submit"]');
  const retry = form.querySelector('[data-contact-retry]');
  const fields = [...form.querySelectorAll('input:not([type="hidden"]), textarea')];
  let api, widget, size, token = '', busy = false, loading = false, completed = false;

  function show(message, kind = '') {
    status.textContent = message;
    status.dataset.state = kind;
  }

  function updateButton() {
    submit.disabled = busy || completed || !token;
    submit.textContent = busy ? copy.sending : copy.submit;
  }

  function render() {
    if (!api || busy || completed || challenge.getBoundingClientRect().width <= 0) return;
    const nextSize = responsiveTurnstileSize(challenge);
    if (widget !== undefined && nextSize === size) return;
    token = '';
    updateButton();
    if (widget !== undefined) api.remove(widget);
    size = nextSize;
    widget = api.render(challenge, {
      sitekey: challenge.dataset.sitekey,
      action: 'contact',
      theme: 'dark',
      language: form.ownerDocument.documentElement.lang,
      size,
      callback(value) {
        if (completed) return;
        token = value;
        retry.hidden = true;
        if (status.dataset.state === 'challenge') show('');
        updateButton();
      },
      'expired-callback'() {
        if (completed) return;
        token = '';
        if (!busy) show(copy.verificationExpired, 'challenge');
        updateButton();
      },
      'error-callback'() {
        if (completed) return;
        token = '';
        if (!busy) show(copy.verificationFailed, 'challenge');
        retry.hidden = false;
        updateButton();
      }
    });
    // Turnstile owns the widget's loading/interaction UI once it is mounted.
    if (status.dataset.state === 'loading') show('');
  }

  async function initializeChallenge() {
    if (loading || busy || completed) return;
    loading = true;
    retry.hidden = true;
    show(copy.verificationLoading, 'loading');
    try {
      api = await loadChallenge();
      if (widget !== undefined) {
        api.remove(widget);
        widget = undefined;
      }
      render();
    } catch {
      show(copy.verificationFailed, 'challenge');
      retry.hidden = false;
    } finally {
      loading = false;
    }
  }

  retry.addEventListener('click', initializeChallenge);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || completed) return;
    if (!token) {
      show(copy.verificationRequired, 'challenge');
      return;
    }
    if (!form.reportValidity()) return;

    const body = new FormData(form);
    body.set('cf-turnstile-response', token);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    busy = true;
    form.setAttribute('aria-busy', 'true');
    fields.forEach(field => { field.disabled = true; });
    retry.hidden = true;
    updateButton();
    show(copy.sending);
    try {
      const response = await fetchImpl(form.action, {
        method: 'POST', body, headers: { Accept: 'application/json' },
        credentials: 'omit', signal: controller.signal
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) {
        const captchaError = Array.isArray(result?.errors) && result.errors.some(error =>
          /captcha|turnstile/i.test(`${error?.code || ''} ${error?.field || ''}`));
        show(response.status === 429 ? copy.rateLimited : captchaError ? copy.verificationFailed : copy.sendFailed, 'error');
        return;
      }
      completed = true;
      observer.disconnect();
      api.remove(widget);
      widget = undefined;
      challenge.hidden = true;
      retry.hidden = true;
      form.querySelectorAll('.contact-form__item').forEach(item => { item.hidden = true; });
      form.reset();
      show(copy.sent, 'success');
      status.focus({ preventScroll: true });
    } catch {
      // A lost response does not prove the provider failed to receive the message.
      show(copy.deliveryUnknown, 'error');
    } finally {
      clearTimeout(timeout);
      busy = false;
      form.removeAttribute('aria-busy');
      token = '';
      if (!completed) {
        fields.forEach(field => { field.disabled = false; });
        api.reset(widget);
        render();
      }
      updateButton();
    }
  });

  const observer = new ResizeObserver(render);
  observer.observe(challenge);
  initializeChallenge();
}

const form = document.getElementById('contact-form');
if (form) initContactForm(form);
