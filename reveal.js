/**
 * FirstCut Take 13 - Scroll Reveal Engine
 * Blur-to-sharp "coming alive" reveals, driven by IntersectionObserver.
 *
 * How it works:
 *  - Elements matching AUTO_TARGETS get a [data-reveal] attribute at runtime,
 *    so no markup edits are needed anywhere in index.html.
 *  - Siblings inside the same group get an incrementing --fc-rv-i index, which
 *    CSS turns into a stagger delay.
 *  - When an element crosses the viewport threshold it gains .fc-in and the CSS
 *    transition runs it from blurred/offset to sharp/settled. One-way only.
 *  - Respects prefers-reduced-motion and waits for the GSAP intro to finish.
 */

(function () {
  "use strict";

  var REDUCED =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Selector -> reveal variant. Order matters: first match wins per element. */
  var AUTO_TARGETS = [
    // Section headers lead their section
    [".section-title", "up"],
    [".group-sub-title", "up"],
    [".section-subtitle-muted", "up"],
    [".fe-heading", "up"],

    // Card grids - these stagger
    [".h-item-card", "blur"],
    [".feature-detail-card", "blur"],
    [".fe-card", "up"],

    // Team page family
    [".tm-hero-title", "up"],
    [".tm-hero-sub", "up"],
    [".tm-heading", "up"],
    [".tm-tagline", "up"],
    [".tm-card", "blur"],
    [".tm-dept-item", "up"],

    // Shared content blocks across subpages
    [".app-dark-card", "up"],
    [".fe-title", "up"],

    // Everything else that benefits from a soft entrance
    [".faq-item", "up"],
    [".pill-tabs-bar", "fade"],
    [".stat-block", "scale"],
    [".team-card", "blur"],
    [".sponsor-tier-card", "blur"]
  ];

  /* Elements never revealed: anything in the fixed chrome or the hero, which
     already has its own GSAP intro animation. */
  var EXCLUDE = [
    ".stockholm-header",
    "#hero-section",
    "#logo-loader",
    "#reveal-overlay",
    ".bottom-nav",
    ".drawer",
    "#custom-cursor",
    "footer"
  ].join(",");

  function tag() {
    var seen = [];
    AUTO_TARGETS.forEach(function (pair) {
      var sel = pair[0];
      var variant = pair[1];
      var nodes = document.querySelectorAll(sel);
      Array.prototype.forEach.call(nodes, function (el) {
        if (el.hasAttribute("data-reveal")) return;
        if (el.closest(EXCLUDE)) return;
        el.setAttribute("data-reveal", variant);
        seen.push(el);
      });
    });

    /* Stagger index: position among revealable siblings of the same parent. */
    var byParent = new Map();
    seen.forEach(function (el) {
      var p = el.parentElement;
      var n = byParent.get(p) || 0;
      el.style.setProperty("--fc-rv-i", String(Math.min(n, 8)));
      byParent.set(p, n + 1);
    });

    return seen;
  }

  function start() {
    var targets = tag();
    if (!targets.length) return;

    if (REDUCED || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add("fc-in");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("fc-in");
          io.unobserve(entry.target);
        });
      },
      {
        // Fire a little before the element is fully on screen so the motion
        // reads as "arriving", not "catching up".
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.12
      }
    );

    targets.forEach(function (el) {
      io.observe(el);
    });

    /* Safety net. Elements inside an inactive .dept-page have no box, so the
       observer cannot see them. It normally fires once the router displays
       them, but if anything prevents that we must never leave real content
       stranded at opacity 0 — so sweep any displayed, unrevealed element
       that is at or above the fold. */
    function sweep() {
      targets.forEach(function (el) {
        if (el.classList.contains("fc-in")) return;
        var r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return; // still display:none
        if (r.top < window.innerHeight) {
          el.classList.add("fc-in");
          io.unobserve(el);
        }
      });
    }

    var mo = new MutationObserver(function () {
      // Let the router finish its class swap and layout settle first.
      requestAnimationFrame(function () {
        requestAnimationFrame(sweep);
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".dept-page"), function (p) {
      mo.observe(p, { attributes: true, attributeFilter: ["class", "style"] });
    });

    window.addEventListener("pageshow", sweep);
    window.fcRevealSweep = sweep;
  }

  /* The intro timeline keeps #main-website hidden; starting the observer while
     it is invisible would reveal everything at once behind the curtain. */
  function whenVisible(cb) {
    var main = document.getElementById("main-website");
    if (!main) return cb();

    var tries = 0;
    (function check() {
      var vis = getComputedStyle(main).visibility === "visible";
      if (vis || tries > 240) return cb();
      tries++;
      requestAnimationFrame(check);
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      whenVisible(start);
    });
  } else {
    whenVisible(start);
  }
})();
