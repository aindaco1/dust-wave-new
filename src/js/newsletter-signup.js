// Shared by the general newsletter, its popup, and project mailing lists.
(() => {
  for (const form of document.querySelectorAll('[data-newsletter-signup]')) {
    const copy = JSON.parse(form.querySelector('[data-newsletter-copy]').textContent);
    const button = form.querySelector('[type="submit"]');
    const status = form.querySelector('[data-signup-status]');
    const errorEl = form.querySelector('[data-signup-error]') || status;
    const successEl = form.querySelector('[data-signup-success]') || status;
    const inputButton = button.tagName === 'INPUT';
    const label = () => inputButton ? button.value : button.textContent;
    const setLabel = value => { if (inputButton) button.value = value; else button.textContent = value; };
    const idle = label();
    let busy = false;
    button.disabled = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || !form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      if (Object.hasOwn(data, 'consent')) data.consent = data.consent === 'on';
      const fields = [...form.querySelectorAll('input:not([type="submit"]), select, textarea')];
      busy = true;
      form.setAttribute('aria-busy', 'true');
      fields.forEach(field => { field.disabled = true; });
      button.disabled = true;
      setLabel(copy.submitting);
      for (const element of new Set([errorEl, successEl])) {
        element.textContent = '';
        element.style.display = 'none';
        delete element.dataset.error;
      }
      let feedback;
      try {
        const response = await fetch(form.dataset.endpoint || 'https://dustwave-newsletter.jogo.workers.dev', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data), credentials: 'omit', signal: AbortSignal.timeout(30000),
        });
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.code || 'unavailable');
        feedback = successEl;
        feedback.textContent = copy.success;
        form.reset();
        form.dispatchEvent(new CustomEvent('newsletter:subscribed', { bubbles: true }));
      } catch (error) {
        feedback = errorEl;
        feedback.dataset.error = 'true';
        feedback.textContent = error.message === 'unsubscribed' ? copy.unsubscribed : copy.error;
      } finally {
        busy = false;
        fields.forEach(field => { field.disabled = false; });
        button.disabled = false;
        form.removeAttribute('aria-busy');
        setLabel(idle);
        feedback.style.display = 'block';
        feedback.focus({ preventScroll: true });
      }
    });
  }
})();
