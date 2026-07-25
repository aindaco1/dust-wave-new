"use strict";

/* Shared Digest and first-party Podcast player runtime. */
/* =========================================================================
	11) AUDIO: unlock & safe play helpers (global hooks preserved)
========================================================================= */
(() => {
if (!document.querySelector(".audio-card")) return;
let unlocked = false;
const pending = [];

function flushPending() {
	while (pending.length) { try { pending.shift()(); } catch {} }
}

async function unlock() {
	if (unlocked) return;
	unlocked = true;

	// Resume WebAudio (if used by WS)
	try {
	if (window.AudioContext || window.webkitAudioContext) {
		const ctx = window.__dgAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
		window.__dgAudioCtx = ctx;
		if (ctx.state === 'suspended') { await ctx.resume().catch(()=>{}); }
	}
	} catch {}

	flushPending();

	// stop listening once unlocked
	['pointerdown','touchstart','keydown'].forEach(t =>
	document.removeEventListener(t, unlock, true)
	);
}

// Arm unlock early (capture)
['pointerdown','touchstart','keydown'].forEach(t =>
	document.addEventListener(t, unlock, true)
);

// Public helpers (as before)
window.__safePlay = (fn) => { if (unlocked) { try { fn(); } catch {} } else { pending.push(fn); } };
window.__safeMediaPlay = (media) => { if (media) window.__safePlay(() => media.play().catch(()=>{})); };
})();

/* =========================================================================
	12) AUDIO player — WaveSurfer wiring (unchanged behavior, tidied)
========================================================================= */
(() => {
const WAVESURFER_PATH = "/js/vendor/wavesurfer.min.js";
let wavesurferLoadPromise;

// ----- utils -----
function ensureWavesurferLoaded() {
	if (window.WaveSurfer) return Promise.resolve();
	if (wavesurferLoadPromise) return wavesurferLoadPromise;
	wavesurferLoadPromise = new Promise((resolve, reject) => {
	if (window.WaveSurfer) return resolve();
	const s = document.createElement("script");
	s.src = WAVESURFER_PATH;
	s.async = true;
	s.onload = () => resolve();
	s.onerror = () => reject(new Error("Failed to load WaveSurfer"));
	document.head.appendChild(s);
	});
	return wavesurferLoadPromise;
}
const getVar = (name, fallback) => {
	const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return v || fallback;
};
function hardenControl(btn) {
	if (!btn) return;
	if (btn.tagName === 'A') {
	const b = document.createElement('button');
	b.type = 'button';
	b.className = btn.className;
	b.innerHTML = btn.innerHTML;
	[...btn.attributes].forEach(a => { if (!['href','role'].includes(a.name)) b.setAttribute(a.name, a.value); });
	btn.replaceWith(b);
	btn = b;
	} else if (btn.tagName === 'BUTTON' && btn.type !== 'button') {
	btn.type = 'button';
	}
	btn.style.touchAction = 'manipulation';
	btn.addEventListener('mousedown', (e) => { e.preventDefault(); }, { passive: false });
	btn.addEventListener('click', (e) => { e.stopPropagation(); });
	if (btn.getAttribute('tabindex') === '-1') btn.removeAttribute('tabindex');
	return btn;
}
function bindThrottled(el, type, fn, key, ms = 180) {
	if (!el) return;
	const k = `__bound_${type}_${key}`;
	if (el[k]) return;
	let last = 0;
	const wrapped = (e) => {
	const now = performance.now();
	if (now - last < ms) return;
	last = now;
	fn(e);
	};
	el.addEventListener(type, wrapped);
	el[k] = wrapped;
}

// anti-autoscroll focus guard (kept)
let lastInputWasKeyboard = false;
window.addEventListener('keydown', () => { lastInputWasKeyboard = true; }, { capture: true });
['pointerdown','mousedown','touchstart'].forEach(t =>
	window.addEventListener(t, () => { lastInputWasKeyboard = false; }, { capture: true })
);
document.addEventListener('focusin', (e) => {
	if (lastInputWasKeyboard) return;
	const t = e.target;
	if (!(t instanceof HTMLElement)) return;
	if (t.closest('.audio-card .controls')) t.blur();
}, { capture: true });

function ensureArtCol(card) {
	const topImg = card.querySelector(":scope > img");
	let col = card.querySelector(":scope > .art-col");
	if (!col) {
	col = document.createElement("div");
	col.className = "art-col";
	if (topImg) { topImg.replaceWith(col); col.appendChild(topImg); }
	else { card.insertAdjacentElement("afterbegin", col); }
	} else if (topImg && !col.contains(topImg)) {
	col.insertAdjacentElement("afterbegin", topImg);
	}
	return col;
}

function skipSeconds(ws, deltaSec) {
	if (!ws) return;
	const d = ws.getDuration();
	if (!d || !isFinite(d)) return;
	const t = ws.getCurrentTime();
	const next = Math.max(0, Math.min(d - 0.01, t + deltaSec));
	ws.seekTo(next / d);
}

function zoomWaveToContainer(ws, el) {
	const dur = ws.getDuration() || 0;
	if (!el || dur <= 0) return;
	const pxPerSec = el.clientWidth / dur;
	ws.setOptions?.({ minPxPerSec: Math.max(0.001, pxPerSec) });
	ws.zoom?.(pxPerSec);
}
function observeWaveResize(ws, el) {
	if (!window.ResizeObserver) return;
	const ro = new ResizeObserver(() => zoomWaveToContainer(ws, el));
	ro.observe(el);
	el.__wsRO = ro;
}

const fmt = (t) => {
	if (!isFinite(t)) return '0:00';
	const s = Math.max(0, Math.floor(t));
	const m = Math.floor(s/60), r = s%60;
	return m + ':' + String(r).padStart(2,'0');
};
function setupHoverTooltip(el, ws){
	const tip = document.createElement('div');
	tip.className = 'ws-hover';
	el.appendChild(tip);
	const update = (e) => {
	const rect = el.getBoundingClientRect();
	const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
	const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
	const dur = ws.getDuration() || 0;
	const time = dur ? (x / rect.width * dur) : 0;
	tip.style.left = x + 'px';
	tip.textContent = fmt(time);
	};
	el.addEventListener('mousemove',  (e) => { tip.style.display='block'; update(e); });
	el.addEventListener('mouseleave', () => { tip.style.display='none'; });
	el.addEventListener('touchstart', (e) => { tip.style.display='block'; update(e); }, {passive:true});
	el.addEventListener('touchmove',  (e) => { update(e); }, {passive:true});
	el.addEventListener('touchend',   () => { tip.style.display='none'; });
}

function wireControls(card, ws) {
	const ctrls = card.querySelector('.controls');
	if (!ctrls) return;

	// Ensure play/pause exists & hardened
	let ppBtn = ctrls.querySelector('.playpause');
	if (!ppBtn) {
	ppBtn = document.createElement('button');
	ppBtn.className = 'playpause';
	ppBtn.type = 'button';
	ppBtn.setAttribute('aria-label', 'Play');
	ctrls.insertBefore(ppBtn, ctrls.firstChild);
	}
	(function harden(btn){
	if (!btn) return;
	if (btn.tagName === 'A') {
		const b = document.createElement('button');
		b.type = 'button'; b.className = btn.className; b.innerHTML = btn.innerHTML;
		[...btn.attributes].forEach(a => { if (!['href','role'].includes(a.name)) b.setAttribute(a.name, a.value); });
		btn.replaceWith(b); btn = b;
	} else if (btn.tagName === 'BUTTON' && btn.type !== 'button') { btn.type = 'button'; }
	btn.style.touchAction = 'manipulation';
	btn.addEventListener('mousedown', (e) => { e.preventDefault(); }, { passive:false });
	btn.addEventListener('click', (e) => { e.stopPropagation(); });
	if (btn.getAttribute('tabindex') === '-1') btn.removeAttribute('tabindex');
	return btn;
	})(ppBtn);

	const svgPlay  = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"></path></svg>`;
	const svgPause = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"></path></svg>`;
	const setState = (playing) => {
	ppBtn.setAttribute('data-state', playing ? 'playing' : 'paused');
	ppBtn.innerHTML = playing ? svgPause : svgPlay;
	ppBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
	};
	setState(false);

	bindThrottled(ppBtn, 'click', () => {
	if (ws) {
		// 🔧 CHANGED: lazy-attach audio src on first play
		const mediaEl = ws.getMediaElement ? ws.getMediaElement() : null;           // 🔧
		const waveEl  = ws.getWrapper ? ws.getWrapper() : null;                     // 🔧
		const audioUrl = waveEl?.dataset?.audioSrc;                                 // 🔧

		if (ws.isPlaying()) {
		ws.pause();
		return;
		}

		if (mediaEl && !mediaEl.src && audioUrl) {                                  // 🔧
		mediaEl.preload = 'none';                                                 // 🔧
		mediaEl.src = audioUrl;                                                   // 🔧
		try { mediaEl.load(); } catch {}                                          // 🔧
		const start = () => { window.__safePlay?.(() => ws.play()); };            // 🔧
		if (mediaEl.readyState >= 2) start();                                     // 🔧
		else {
			const onReady = () => { mediaEl.removeEventListener('canplay', onReady); start(); };
			mediaEl.addEventListener('canplay', onReady, { once: true });
		}
		return;
		}

		window.__safePlay?.(() => ws.play());
		return;
	}
	// Fallback to hidden <audio> pre-WS
	const media = card.querySelector('audio');
	if (media) {
		if (media.paused) window.__safeMediaPlay?.(media);
		else try { media.pause(); } catch {}
	}
	}, 'pp');

	ws.on('play',   () => setState(true));
	ws.on('pause',  () => setState(false));
	ws.on('finish', () => setState(false));

	// Skip buttons
	let backBtn = hardenControl(ctrls.querySelector(".skip-back"));
	let fwdBtn  = hardenControl(ctrls.querySelector(".skip-fwd"));
	if (backBtn) bindThrottled(backBtn, "click", () => skipSeconds(ws, -10), "ws-skipback");
	if (fwdBtn)  bindThrottled(fwdBtn,  "click", () => skipSeconds(ws, +30), "ws-skipfwd");

	// Speed pill
	let speedBtn = hardenControl(ctrls.querySelector("[data-audio-speed]"));
	if (speedBtn) {
	const rates = [1, 1.1, 1.25, 1.5, 2, 0.5];
	const advanceRate = () => {
		const current = ws.getPlaybackRate ? ws.getPlaybackRate() : 1;
		const idx = rates.indexOf(current);
		const next = rates[(idx + 1) % rates.length];
		ws.setPlaybackRate(next);
		speedBtn.textContent = `${next}x`;
		speedBtn.setAttribute('aria-live', 'polite');
		speedBtn.setAttribute('aria-label', `Playback speed: ${next}x`);
	};
	bindThrottled(speedBtn, "click",  advanceRate, "ws-speed-click");
	bindThrottled(speedBtn, "keydown",(e) => {
		if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advanceRate(); }
	}, "ws-speed-key");
	speedBtn.textContent = "1x";
	if (!speedBtn.__bound_playbackRate) {
		ws.on?.("playback-rate", (r) => { speedBtn.textContent = `${r}x`; });
		speedBtn.__bound_playbackRate = true;
	}
	}

	// Download (don’t bubble)
	const dl = ctrls.querySelector('.download');
	if (dl && !dl.__bound_dl) {
	dl.addEventListener('click', (e) => e.stopPropagation());
	dl.style.touchAction = 'manipulation';
	dl.__bound_dl = true;
	}
}

async function createWaveForCard(card, opts={eager:false}) {
	const waveEl = card.querySelector(".wave");
	if (!waveEl || waveEl.dataset.wsReady === "1") return;

	const url = waveEl.dataset.audioSrc;
	if (!url) return;

	ensureArtCol(card);

	// hidden <audio> to enable play; keep MP3 off the wire until needed
	let media = card.querySelector('audio[id]');
	if (!media) {
		media = document.createElement('audio');
		media.src = url;
		media.preload = opts.eager ? 'metadata' : 'none'; // ← key change
		media.crossOrigin = 'anonymous';
		media.playsInline = true;
		media.style.display = 'none';
		waveEl.insertAdjacentElement('afterend', media);
	} else {
		media.preload = opts.eager ? 'metadata' : (media.preload || 'none');
		media.crossOrigin = media.crossOrigin || 'anonymous';
	}

	// skeleton + fallback progress + overlay
	waveEl.classList.add("wave--skeleton","wave--fallback","wave--loading");
	const fb   = document.createElement('div');  fb.className = 'fallback-bar';
	const hint = document.createElement('button');
	const playerLanguage = card.getAttribute('lang') || document.documentElement.lang;
	hint.className = 'play-hint';
	hint.textContent = playerLanguage.toLowerCase().startsWith('es')
		? 'Reproducir ahora'
		: 'Play now';
	hardenControl(hint);

	// coordinate with scroll squelch (Arc/Safari)
	['pointerdown','mousedown','touchstart'].forEach(t =>
		hint.addEventListener(t, () => {
		window.__armAudioSquelch?.();
		const ae = document.activeElement;
		if (ae && ae !== document.body && ae !== hint) { try { ae.blur(); } catch {} }
		}, { capture: true, passive: true })
	);

	hint.addEventListener('click', (e) => {
		e.preventDefault(); e.stopPropagation();
		// allow audio to load now that user interacted
		media.preload = 'auto'; try { media.load?.(); } catch {}
		window.__safeMediaPlay(media);
		try { if (card._ws && !card._ws.isPlaying()) card._ws.play(); } catch {}
		hint.classList.add('hidden');
		setTimeout(() => hint.remove(), 300);
	});

	const overlay = document.createElement('div');
	overlay.className = 'wave__overlay';
	overlay.addEventListener('wheel',      (e) => e.preventDefault(), { passive:false });
	overlay.addEventListener('touchmove',  (e) => e.preventDefault(), { passive:false });

	waveEl.append(fb, hint, overlay);

	const updateFallback = () => {
		const d = media.duration || 0;
		const t = media.currentTime || 0;
		const p = d > 0 ? Math.min(1, Math.max(0, t / d)) : 0;
		fb.style.transform = `scaleX(${p})`;
	};
	media.addEventListener('timeupdate',      updateFallback);
	media.addEventListener('loadedmetadata',  updateFallback);
	media.addEventListener('progress',        updateFallback);

	// ── NEW: fetch peaks and wait for them before creating WS ─────────────
	let precomputedPeaks = undefined;
	const peaksUrl = waveEl.dataset.peaksSrc;
	if (peaksUrl) {
		try {
		// default cache behavior is fine; 'force-cache' can mask updates
		const res = await fetch(peaksUrl, { cache: 'default' });
		if (res.ok) {
			const j = await res.json();
			precomputedPeaks = j.data || j.samples || j.peaks || undefined;
		}
		} catch {}
	}
	// ──────────────────────────────────────────────────────────────────────

	const ws = WaveSurfer.create({
		container: waveEl,
		media,
		height: Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--audio-h")) * 0.6),
		waveColor:     getVar("--wave-backdrop", "rgba(255,255,255,.2)"),
		progressColor: getVar("--wave-progress", "#f2f2f2"),
		cursorColor:   getVar("--wave-cursor", "#ffd54d"),
		cursorWidth: 2,
		barWidth: 2,
		barGap: 1.5,
		barRadius: 2,
		dragToSeek: false,
		interact: true,
		normalize: true,
		minPxPerSec: 0.001,
		autoplay: false,
		hideScrollbar: true,
		fillParent: true,
		autoCenter: false,
		autoScroll: false,
		peaks: precomputedPeaks // ← will be undefined if not found
	});

	waveEl.dataset.wsReady = "1";
	ws.setPlaybackRate?.(1);

	ws.on('ready', () => {
		zoomWaveToContainer(ws, waveEl);
		observeWaveResize(ws, waveEl);
		waveEl.classList.remove("wave--skeleton","wave--fallback","wave--loading");
		try { fb.remove(); hint.remove(); overlay.remove(); } catch {}
		media.removeEventListener('timeupdate',     updateFallback);
		media.removeEventListener('loadedmetadata', updateFallback);
		media.removeEventListener('progress',       updateFallback);
		setupHoverTooltip(waveEl, ws);
	});
	ws.on('error', () => {
		waveEl.classList.remove("wave--skeleton","wave--fallback","wave--loading");
		try { fb.remove(); hint.remove(); overlay.remove(); } catch {}
	});

	wireControls(card, ws);

	// reattach per-card squelch if global hook present
	try { document.querySelectorAll('.audio-card').forEach(window.__AudioSquelchAttach?.bind(null) || (()=>{})); } catch {}

	card._ws = ws;
}

async function boot() {
	const cards = Array.from(document.querySelectorAll(".audio-card"));
	if (!cards.length) return;

	try { await ensureWavesurferLoaded(); }
	catch (e) { console.error(e); return; }

	// Eager init first two (still eager UI, but no audio fetch until Play)
	const eagerCount = Math.min(2, cards.length);
	for (let i = 0; i < eagerCount; i++) createWaveForCard(cards[i], { eager:true });

	// IO preload others
	if ("IntersectionObserver" in window) {
	const io = new IntersectionObserver((entries, obs) => {
		entries.forEach((entry) => {
		if (entry.isIntersecting) { createWaveForCard(entry.target, { eager:false }); obs.unobserve(entry.target); }
		});
	}, { rootMargin: "800px 0px" });
	cards.slice(eagerCount).forEach((card) => io.observe(card));
	} else {
	cards.forEach((c, idx) => createWaveForCard(c, { eager: idx < eagerCount }));
	}

	window.addEventListener("pagehide", () => {
	cards.forEach((card) => {
		const ws = card._ws;
		if (ws && ws.destroy) { try { ws.destroy(); } catch {} }
		const waveEl = card.querySelector('.wave');
		if (waveEl?.__wsRO) { try { waveEl.__wsRO.disconnect(); } catch {} }
	});
	});
}

(document.readyState === "loading")
	? document.addEventListener("DOMContentLoaded", boot, { once: true })
	: boot();

// public reinit (unchanged contract)
window.DWDigestAudio = {
	reinit() {
	document.querySelectorAll(".audio-card .wave").forEach(w => { w.dataset.wsReady = "0"; });
	try { document.querySelectorAll('.audio-card').forEach(window.__AudioSquelchAttach?.bind(null) || (()=>{})); } catch {}
	boot();
	},
	seekTo(playerId, seconds, { play = false } = {}) {
	const waveEl = document.getElementById(`wave_${playerId}`);
	const card = waveEl?.closest(".audio-card");
	const media = card?.querySelector("audio");
	const target = Number(seconds);
	if (!card || !media || !Number.isFinite(target) || target < 0) return false;

	const duration = card._ws?.getDuration?.() || media.duration || 0;
	const bounded = duration > 0
		? Math.min(target, Math.max(0, duration - 0.01))
		: target;
	if (card._ws && duration > 0) card._ws.seekTo(bounded / duration);
	else {
		try { media.currentTime = bounded; } catch {}
	}
	if (play) {
		if (card._ws) window.__safePlay?.(() => card._ws.play());
		else window.__safeMediaPlay?.(media);
	}
	return true;
	}
};
})();

/* =========================================================================
11) Scroll squelch to prevent UA autoscroll when clicking audio controls
========================================================================= */
(() => {
if (!document.querySelector(".audio-card")) return;
let squelchUntil = 0;
const ARM_MS = 500;
const now = () => performance.now();

function armSquelch() {
	squelchUntil = now() + ARM_MS;
	// Disable scroll anchoring during the window
	document.documentElement.style.overflowAnchor = 'none';
	clearTimeout(armSquelch._t);
	armSquelch._t = setTimeout(() => {
	document.documentElement.style.overflowAnchor = '';
	}, ARM_MS + 50);
}
function isSquelched() { return now() < squelchUntil; }

// Guard the big 3
const _scrollTo = window.scrollTo.bind(window);
window.scrollTo = function() { if (isSquelched()) return; return _scrollTo(...arguments); };

const _scrollBy = window.scrollBy.bind(window);
window.scrollBy = function() { if (isSquelched()) return; return _scrollBy(...arguments); };

const _siv = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = function() { if (isSquelched()) return; return _siv.apply(this, arguments); };

// Blur focus pre-handlers on control interactions
function attachSquelchToCard(card) {
	const ctrls = card.querySelectorAll('.controls .playpause, .controls button, .controls [data-audio-speed]');
	ctrls.forEach(btn => {
	['pointerdown','mousedown','touchstart'].forEach(t =>
		btn.addEventListener(t, () => {
		armSquelch();
		const ae = document.activeElement;
		if (ae && ae !== document.body && ae !== btn) { try { ae.blur(); } catch {} }
		}, { passive: true, capture: true })
	);
	btn.addEventListener('click', () => { armSquelch(); }, { passive: true, capture: true });
	});
}

// Prevent focus from sticking on controls while squelched
document.addEventListener('focusin', (e) => {
	if (!isSquelched()) return;
	const t = e.target;
	if (t instanceof HTMLElement && t.closest('.audio-card .controls')) {
	try { t.blur(); } catch {}
	}
}, { capture: true });

// Apply to existing + expose for future
document.querySelectorAll('.audio-card').forEach(attachSquelchToCard);
window.__AudioSquelchAttach = attachSquelchToCard;

// Export armer so Play-hint can call it
window.__armAudioSquelch = armSquelch;
})();
