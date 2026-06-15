/**
 * Oravini Embed Script
 * Usage:
 *   Inline:   <div data-oravini-video="VIDEO_ID"></div>
 *   Lightbox: <a href="#" data-oravini-video="VIDEO_ID" data-style="lightbox">Watch →</a>
 *   Popover:  <button data-oravini-video="VIDEO_ID" data-style="popover">Play</button>
 *
 * Include once anywhere on the page:
 *   <script src="https://app.oravini.com/embed.js" async></script>
 */
(function () {
  "use strict";

  var BASE = (function () {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || "";
      if (src.indexOf("embed.js") !== -1) {
        return src.replace(/\/embed\.js.*$/, "");
      }
    }
    return "https://app.oravini.com";
  })();

  function injectStyles() {
    if (document.getElementById("oravini-embed-styles")) return;
    var style = document.createElement("style");
    style.id = "oravini-embed-styles";
    style.textContent = [
      ".oravini-inline-wrap{position:relative;width:100%;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#000;}",
      ".oravini-inline-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:none;}",
      "#oravini-lightbox-overlay{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.88);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:oravini-fadein 0.25s ease;}",
      "#oravini-lightbox-inner{position:relative;width:90vw;max-width:900px;aspect-ratio:16/9;border-radius:16px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.6);}",
      "#oravini-lightbox-inner iframe{position:absolute;inset:0;width:100%;height:100%;border:none;}",
      "#oravini-lightbox-close{position:absolute;top:-36px;right:0;background:rgba(255,255,255,0.12);border:none;color:#fff;border-radius:50%;width:28px;height:28px;font-size:16px;line-height:28px;text-align:center;cursor:pointer;transition:background 0.15s;}",
      "#oravini-lightbox-close:hover{background:rgba(255,255,255,0.25);}",
      "#oravini-popover-wrap{position:absolute;z-index:99999;width:340px;aspect-ratio:16/9;border-radius:12px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.5);animation:oravini-slidein 0.2s ease;}",
      "#oravini-popover-wrap iframe{width:100%;height:100%;border:none;}",
      "@keyframes oravini-fadein{from{opacity:0}to{opacity:1}}",
      "@keyframes oravini-slidein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}",
    ].join("");
    document.head.appendChild(style);
  }

  function buildIframeUrl(videoId) {
    return BASE + "/embed/" + videoId;
  }

  // ── Inline embed ─────────────────────────────────────────────────────────────

  function embedInline(el, videoId) {
    var wrap = document.createElement("div");
    wrap.className = "oravini-inline-wrap";
    var iframe = document.createElement("iframe");
    iframe.src = buildIframeUrl(videoId);
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("allow", "autoplay; fullscreen; encrypted-media");
    wrap.appendChild(iframe);
    el.innerHTML = "";
    el.appendChild(wrap);
    el.removeAttribute("data-oravini-video");
  }

  // ── Lightbox ─────────────────────────────────────────────────────────────────

  var lightboxOverlay = null;

  function closeLightbox() {
    if (lightboxOverlay) {
      lightboxOverlay.style.animation = "oravini-fadein 0.2s ease reverse";
      setTimeout(function () {
        if (lightboxOverlay && lightboxOverlay.parentNode) {
          lightboxOverlay.parentNode.removeChild(lightboxOverlay);
        }
        lightboxOverlay = null;
      }, 200);
    }
  }

  function openLightbox(videoId) {
    if (lightboxOverlay) closeLightbox();

    var overlay = document.createElement("div");
    overlay.id = "oravini-lightbox-overlay";

    var inner = document.createElement("div");
    inner.id = "oravini-lightbox-inner";

    var close = document.createElement("button");
    close.id = "oravini-lightbox-close";
    close.innerHTML = "&#10005;";
    close.setAttribute("aria-label", "Close video");
    close.onclick = closeLightbox;

    var iframe = document.createElement("iframe");
    iframe.src = buildIframeUrl(videoId);
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("allow", "autoplay; fullscreen; encrypted-media");

    inner.appendChild(close);
    inner.appendChild(iframe);
    overlay.appendChild(inner);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeLightbox();
    });

    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") { closeLightbox(); document.removeEventListener("keydown", escHandler); }
    });

    document.body.appendChild(overlay);
    lightboxOverlay = overlay;
  }

  // ── Popover ──────────────────────────────────────────────────────────────────

  var activePopover = null;

  function closePopover() {
    if (activePopover && activePopover.parentNode) {
      activePopover.parentNode.removeChild(activePopover);
      activePopover = null;
    }
  }

  function openPopover(triggerEl, videoId) {
    closePopover();

    var wrap = document.createElement("div");
    wrap.id = "oravini-popover-wrap";

    var iframe = document.createElement("iframe");
    iframe.src = buildIframeUrl(videoId);
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("allow", "autoplay; fullscreen; encrypted-media");
    wrap.appendChild(iframe);

    // Position relative to trigger
    var rect = triggerEl.getBoundingClientRect();
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    wrap.style.top = (rect.bottom + scrollTop + 8) + "px";
    wrap.style.left = Math.max(8, rect.left + scrollLeft - 80) + "px";

    document.body.appendChild(wrap);
    activePopover = wrap;

    setTimeout(function () {
      document.addEventListener("click", function outsideHandler(e) {
        if (!wrap.contains(e.target) && e.target !== triggerEl) {
          closePopover();
          document.removeEventListener("click", outsideHandler);
        }
      });
    }, 50);
  }

  // ── Wire up all [data-oravini-video] elements ────────────────────────────────

  function processElements() {
    var els = document.querySelectorAll("[data-oravini-video]");
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        var videoId = el.getAttribute("data-oravini-video");
        var style = el.getAttribute("data-style") || "inline";
        if (!videoId) return;

        if (style === "lightbox") {
          el.style.cursor = "pointer";
          el.addEventListener("click", function (e) {
            e.preventDefault();
            openLightbox(videoId);
          });
        } else if (style === "popover") {
          el.style.cursor = "pointer";
          el.addEventListener("click", function (e) {
            e.preventDefault();
            if (activePopover) { closePopover(); return; }
            openPopover(el, videoId);
          });
        } else {
          embedInline(el, videoId);
        }
      })(els[i]);
    }
  }

  function init() {
    injectStyles();
    processElements();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose API for dynamic usage
  window.Oravini = {
    embed: function (el, videoId) { injectStyles(); embedInline(el, videoId); },
    openLightbox: function (videoId) { injectStyles(); openLightbox(videoId); },
    closeLightbox: closeLightbox,
  };
})();
