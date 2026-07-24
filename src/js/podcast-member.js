import {
  AdminApiClient as PodcastApiClient,
  AdminApiError as PodcastApiError
} from "./dust-wave-admin-shell/api-client.js";
import {
  PasswordlessAdminSession as PasswordlessSession
} from "./dust-wave-admin-shell/passwordless-session.js";

const root = document.querySelector("[data-podcast-member]");
if (root) startPodcastMember(root);

function startPodcastMember(rootElement) {
  const client = new PodcastApiClient({
    baseUrl: rootElement.dataset.apiOrigin,
    csrfHeader: "x-podcast-csrf"
  });
  const session = new PasswordlessSession({
    client,
    endpoints: {
      start: "/v1/member/auth/start",
      exchange: "/v1/member/auth/exchange",
      session: "/v1/member/session",
      logout: "/v1/member/logout"
    }
  });
  const authPanel = rootElement.querySelector("[data-podcast-member-auth]");
  const app = rootElement.querySelector("[data-podcast-member-app]");
  const loginForm = rootElement.querySelector("[data-podcast-member-login-form]");
  const logoutButton = rootElement.querySelector("[data-podcast-member-logout]");
  const globalStatus = rootElement.querySelector(
    "[data-podcast-member-global-status]"
  );
  const authStatus = rootElement.querySelector("[data-podcast-member-auth-status]");
  const sessionSummary = rootElement.querySelector(
    "[data-podcast-member-session-summary]"
  );
  const subscriptionList = rootElement.querySelector(
    "[data-podcast-member-subscriptions]"
  );
  let turnstileToken = "";
  let turnstileWidgetId;

  loginForm?.addEventListener("submit", startLogin);
  logoutButton?.addEventListener("click", logout);
  initializeTurnstile();
  restoreOrExchange();

  async function restoreOrExchange() {
    setStatus(globalStatus, "Comprobando tu sesión… / Checking your session…");
    const token = session.tokenFromFragment();
    if (token) session.clearFragment();
    try {
      const result = token
        ? await session.exchange(token)
        : await session.restore();
      showAuthenticated(result.identity);
      setStatus(globalStatus, "");
    } catch (error) {
      showLoggedOut();
      setStatus(
        globalStatus,
        error instanceof PodcastApiError && error.status === 401
          ? token
            ? "El enlace venció o ya fue usado. Solicita uno nuevo. / The link expired or was already used. Request a new one."
            : ""
          : friendlyError(error),
        Boolean(token) || !(error instanceof PodcastApiError && error.status === 401)
      );
    }
  }

  async function startLogin(event) {
    event.preventDefault();
    const submit = loginForm.querySelector("button[type='submit']");
    submit.disabled = true;
    setStatus(authStatus, "Enviando un enlace seguro… / Sending a secure link…");
    try {
      await session.start({
        email: loginForm.elements.email.value,
        turnstileToken,
        preferredLanguage: document.documentElement.lang || "es"
      });
      setStatus(
        authStatus,
        "Si existe una cuenta, el enlace ya va en camino. / If an account exists, the link is on its way."
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
      showLoggedOut();
      setStatus(globalStatus, "Sesión cerrada. / Signed out.");
    } catch (error) {
      setStatus(globalStatus, friendlyError(error), true);
    } finally {
      logoutButton.disabled = false;
    }
  }

  function showAuthenticated(identity) {
    authPanel.hidden = true;
    app.hidden = false;
    logoutButton.hidden = false;
    const subscriptions = Array.isArray(identity?.subscriptions)
      ? identity.subscriptions
      : [];
    sessionSummary.textContent = subscriptions.length
      ? `${subscriptions.length} suscripción${
        subscriptions.length === 1 ? "" : "es"
      } / ${subscriptions.length} subscription${
        subscriptions.length === 1 ? "" : "s"
      }`
      : "No hay suscripciones vinculadas todavía. / No subscriptions are linked yet.";
    subscriptionList.replaceChildren(
      ...subscriptions.map(subscriptionCard)
    );
  }

  function showLoggedOut() {
    authPanel.hidden = false;
    app.hidden = true;
    logoutButton.hidden = true;
    subscriptionList.replaceChildren();
    sessionSummary.textContent = "";
  }

  function subscriptionCard(subscription) {
    const card = document.createElement("article");
    card.className = "podcast-member__subscription";

    const heading = document.createElement("h3");
    const showLink = document.createElement("a");
    showLink.href = `/podcasts/${encodeURIComponent(subscription.show?.slug || "")}/`;
    showLink.textContent = subscription.show?.title || "Dust Wave Podcast";
    heading.append(showLink);

    const badges = document.createElement("p");
    badges.className = "podcast-member__badges";
    badges.append(
      badge(subscription.entitled ? "Premium activo / Active" : humanStatus(subscription.status)),
      badge(planLabel(subscription.billingPeriod))
    );

    const access = document.createElement("p");
    access.textContent = subscription.entitled
      ? "Acceso sin anuncios, anticipado y a episodios extra habilitado. / Ad-free, early, and bonus access is enabled."
      : "El acceso premium no está activo. / Premium access is not active.";

    const feed = document.createElement("p");
    feed.textContent = subscription.hasPrivateFeed
      ? "Tu feed privado está listo. Los controles para copiarlo o rotarlo se habilitarán en el siguiente paso seguro. / Your private feed is ready; secure copy and rotation controls are next."
      : "El feed privado se creará cuando la suscripción esté activa. / A private feed will be created when the subscription is active.";

    card.append(heading, badges, access, feed);
    if (subscription.currentPeriodEnd) {
      const period = document.createElement("p");
      period.className = "podcast-member__fine-print";
      period.textContent = `Periodo actual: ${formatDate(
        subscription.currentPeriodEnd
      )} / Current period: ${formatDate(subscription.currentPeriodEnd)}`;
      card.append(period);
    }
    return card;
  }

  function initializeTurnstile() {
    const siteKey = rootElement.dataset.turnstileSiteKey;
    if (!siteKey) return;
    let attempts = 0;
    const render = () => {
      attempts += 1;
      if (!globalThis.turnstile) {
        if (attempts < 100) {
          setTimeout(render, 100);
        } else {
          setStatus(
            authStatus,
            "No se pudo cargar la verificación. Recarga la página. / Verification could not load. Refresh the page.",
            true
          );
        }
        return;
      }
      turnstileWidgetId = globalThis.turnstile.render(
        "#podcast-member-turnstile",
        {
          sitekey: siteKey,
          action: "podcast_listener_login",
          callback: (token) => { turnstileToken = token; },
          "expired-callback": () => { turnstileToken = ""; },
          "error-callback": () => { turnstileToken = ""; }
        }
      );
    };
    render();
  }

  function resetTurnstile() {
    turnstileToken = "";
    if (turnstileWidgetId !== undefined) {
      globalThis.turnstile?.reset?.(turnstileWidgetId);
    }
  }
}

function badge(label) {
  const item = document.createElement("span");
  item.textContent = label;
  return item;
}

function planLabel(period) {
  if (period === "month") return "Mensual / Monthly";
  if (period === "year") return "Anual / Annual";
  return "Beneficio / Benefit";
}

function humanStatus(status) {
  const labels = {
    pending: "Pendiente / Pending",
    past_due: "Pago pendiente / Past due",
    paused: "Pausada / Paused",
    canceled: "Cancelada / Canceled",
    expired: "Vencida / Expired"
  };
  return labels[status] || "Inactiva / Inactive";
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(document.documentElement.lang || "es", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function setStatus(element, message, error = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", error);
}

function friendlyError(error) {
  if (!(error instanceof PodcastApiError)) {
    return "No se pudo contactar el servicio. Inténtalo de nuevo. / The service could not be reached. Please retry.";
  }
  if (error.code === "listener_auth_not_configured") {
    return "El acceso privado todavía no está configurado. / Private access is not configured yet.";
  }
  if (error.code === "invalid_csrf_token") {
    return "La sesión segura cambió. Recarga la página. / Your secure session changed. Refresh the page.";
  }
  if (error.code === "rate_limited") {
    return "Demasiados intentos. Espera y vuelve a intentar. / Too many attempts. Wait and retry.";
  }
  return error.message || error.code;
}
