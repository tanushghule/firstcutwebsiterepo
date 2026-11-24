/**
 * FirstCut Take 13 - Main Website Application Logic
 * Interactive App UI, Department Router, Pill Filters, Viewfinder Cursor & Forms
 */

document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================================================
     1. CUSTOM CINEMA VIEWFINDER CURSOR & MULTI-WAVE CLICK RIPPLE
     ========================================================================== */
  const cursor = document.getElementById("custom-cursor");

  if (cursor) {
    window.addEventListener("mousemove", (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    });

    const interactiveSelector =
      "a, button, input, select, textarea, label, .faq-question, .h-item-card, .pill-tab";

    document.addEventListener("mouseover", (e) => {
      if (e.target && e.target.closest(interactiveSelector)) {
        cursor.classList.add("hovered");
      }
    });

    document.addEventListener("mouseout", (e) => {
      if (e.target && e.target.closest(interactiveSelector)) {
        cursor.classList.remove("hovered");
      }
    });

    window.addEventListener("mousedown", (e) => {
      cursor.classList.add("clicking");
      setTimeout(() => cursor.classList.remove("clicking"), 200);

      // Spawn 3 concentric expanding wave rings at click point
      ["", "wave-2", "wave-3"].forEach((cls) => {
        const wave = document.createElement("div");
        wave.className = `cursor-wave ${cls}`.trim();
        wave.style.left = `${e.clientX}px`;
        wave.style.top = `${e.clientY}px`;
        document.body.appendChild(wave);
        wave.addEventListener("animationend", () => wave.remove());
      });
    });
  }

  /* ==========================================================================
     2. INITIAL MOMOKA REVEAL & LOGO LOADER
     ========================================================================== */
  const loader = document.getElementById("logo-loader");
  const mainWebsite = document.getElementById("main-website");
  const revealPanels = document.querySelectorAll(".reveal-panel");

  let seenIntro = false;
  try { seenIntro = sessionStorage.getItem("fc_intro_seen") === "1"; sessionStorage.setItem("fc_intro_seen", "1"); } catch (e) { /* private mode */ }
  const reducedIntro = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if ((seenIntro || reducedIntro) && loader && mainWebsite) {
    // Return visit or reduced motion: no loading animation
    loader.style.display = "none";
    revealPanels.forEach((p) => { p.style.display = "none"; });
    mainWebsite.style.visibility = "visible";
    mainWebsite.style.opacity = "1";
  } else if (typeof gsap !== "undefined" && loader && mainWebsite) {
    const tl = gsap.timeline();
    tl.fromTo(
      ".loader-logo-container",
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.55, ease: "power2.out" }
    )
      .to(".loader-logo-container", {
        opacity: 0,
        y: -15,
        duration: 0.35,
        delay: 0.35,
        ease: "power2.in"
      })
      .to(
        revealPanels,
        {
          y: "0%",
          duration: 0.4,
          stagger: 0.05,
          ease: "power3.inOut"
        },
        "-=0.15"
      )
      .set(loader, { display: "none" })
      .set(mainWebsite, { visibility: "visible", opacity: 1 })
      .to(revealPanels, {
        y: "-100%",
        duration: 0.45,
        stagger: 0.05,
        ease: "power3.inOut"
      });
  } else if (loader && mainWebsite) {
    loader.style.display = "none";
    mainWebsite.style.visibility = "visible";
    mainWebsite.style.opacity = "1";
  }

  /* ==========================================================================
     3. HERO LOOPING WORDS ANIMATION
     ========================================================================== */
  const wordList = document.querySelector("[data-looping-words-list]");
  if (wordList && typeof gsap !== "undefined") {
    const words = Array.from(wordList.children);
    let currentIndex = 0;

    setInterval(() => {
      if (window.fcMotionPaused) return;
      currentIndex = (currentIndex + 1) % words.length;
      gsap.to(wordList, {
        yPercent: -100 * currentIndex / words.length,
        duration: 0.65,
        ease: "power3.inOut"
      });
    }, 2200);
  }

  /* ==========================================================================
     4. MULTI-PAGE DEPARTMENT ROUTER (Desktop Nav + Mobile Bottom Bar + Drawer)
     ========================================================================== */
  const validPages = ["home", "submissions", "outreach", "sponsorship", "team", "winners", "privacy"];
  const pageContainers = document.querySelectorAll(".dept-page");
  const drawerBackdrop = document.getElementById("mobile-drawer-backdrop");
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const drawerCloseBtn = document.getElementById("drawer-close-btn");

  const PAGE_META = {
    home: { title: "FirstCut Take 13 | India's Largest Student Film Festival", desc: "FirstCut is India's largest international student-run film festival, organized by FLAME University, Pune. Free entry. Submit your short film for Take 13.", url: "https://firstcutflame.com/" },
    submissions: { title: "Submit Your Film | FirstCut Take 13 Student Film Festival", desc: "Submit your student short film free to FirstCut Take 13 at FLAME University, Pune. Fiction, Non-Fiction, Animation and Nano categories. Deadline 10 Jan 2027.", url: "https://firstcutflame.com/submissions/" },
    outreach: { title: "Collaborate With Us | FirstCut Outreach, Colleges and Film Clubs", desc: "Partner with FirstCut Take 13. Colleges, film clubs, media schools and industry collaborators can reach the FirstCut outreach team here.", url: "https://firstcutflame.com/outreach/" },
    sponsorship: { title: "Sponsor FirstCut Take 13 | Partner With India's Student Film Festival", desc: "Connect your brand with FirstCut Take 13, a student film festival at FLAME University, Pune. Social media, on-ground branding, activations and award sponsorships.", url: "https://firstcutflame.com/sponsorship/" },
    winners: { title: "Past Winners | FirstCut Student Film Festival Archive", desc: "Past winners of FirstCut, India's largest student-run international film festival at FLAME University, Pune. Archive coming soon.", url: "https://firstcutflame.com/winners/" },
    privacy: { title: "Privacy Notice | FirstCut Film Festival", desc: "How the FirstCut website uses your information: forms, analytics and cookies. FLAME University, Pune.", url: "https://firstcutflame.com/privacy/" },
    team: { title: "Meet the Team | FirstCut Take 13 Film Festival Committee", desc: "Meet the student team behind FirstCut Take 13, India's largest student-run film festival at FLAME University, Pune.", url: "https://firstcutflame.com/team/" }
  };

  function switchDepartmentPage(targetPage, updateHash = true, anchor = "") {
    const pageName = validPages.includes(targetPage) ? targetPage : "home";

    pageContainers.forEach((section) => {
      if (section.dataset.page === pageName) {
        section.classList.add("active");
      } else {
        section.classList.remove("active");
      }
    });

    // Update active state across Desktop Nav, Mobile Bottom Bar, and Drawer
    document
      .querySelectorAll(".nav-link, .bottom-nav-item, .drawer-link")
      .forEach((link) => {
        if (link.dataset.pageTarget === pageName) {
          link.classList.add("active");
          link.setAttribute("aria-current", "page");
        } else {
          link.classList.remove("active");
          link.removeAttribute("aria-current");
        }
      });

    if (drawerBackdrop) {
      drawerBackdrop.classList.remove("open");
    }
    if (mobileMenuBtn) {
      mobileMenuBtn.setAttribute("aria-expanded", "false");
    }

    // Real, crawlable URLs: /submissions/, /outreach/, /sponsorship/, /team/ (home is /)
    const meta = PAGE_META[pageName];
    if (meta) {
      document.title = meta.title;
      const setMeta = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
      setMeta('meta[name="description"]', "content", meta.desc);
      setMeta('link[rel="canonical"]', "href", meta.url);
      setMeta('meta[property="og:title"]', "content", meta.title);
      setMeta('meta[property="og:description"]', "content", meta.desc);
      setMeta('meta[property="og:url"]', "content", meta.url);
      setMeta('meta[name="twitter:title"]', "content", meta.title);
      setMeta('meta[name="twitter:description"]', "content", meta.desc);
    }
    if (updateHash) {
      const path = pageName === "home" ? "/" : `/${pageName}/`;
      if (window.location.pathname !== path || window.location.hash) {
        history.pushState({ page: pageName }, "", path);
      }
    }

    const anchorEl = anchor ? document.getElementById(anchor) : null;
    if (anchorEl) {
      setTimeout(() => anchorEl.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Move focus to the new page heading so screen readers hear the change
    if (updateHash && !anchorEl) {
      const heading = document.querySelector(`#page-${pageName} h1`);
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
  }

  // Bind all elements with data-page-target
  document.addEventListener("click", (e) => {
    const targetEl = e.target.closest("[data-page-target]");
    if (targetEl) {
      const targetPage = targetEl.getAttribute("data-page-target");
      if (targetPage && validPages.includes(targetPage)) {
        e.preventDefault();
        const hashPart = (targetEl.getAttribute("href") || "").split("#")[1] || "";
        switchDepartmentPage(targetPage, true, hashPart);
      }
    }
  });

  // Mobile Hamburger Drawer Toggle
  if (mobileMenuBtn && drawerBackdrop) {
    mobileMenuBtn.addEventListener("click", () => {
      const isOpen = drawerBackdrop.classList.toggle("open");
      mobileMenuBtn.setAttribute("aria-expanded", String(isOpen));
    });
  }
  if (drawerCloseBtn && drawerBackdrop) {
    drawerCloseBtn.addEventListener("click", () => {
      drawerBackdrop.classList.remove("open");
    });
  }
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener("click", (e) => {
      if (e.target === drawerBackdrop) {
        drawerBackdrop.classList.remove("open");
      }
    });
  }

  // Initial page: real path first (/team/), legacy #hash links still work
  const pathPage = window.location.pathname.replace(/\/+$/, "").replace(/^\//, "").toLowerCase();
  const initialHash = window.location.hash.replace("#", "").trim().toLowerCase();
  if (validPages.includes(pathPage) && pathPage !== "home") {
    switchDepartmentPage(pathPage, false, initialHash && !validPages.includes(initialHash) ? initialHash : "");
  } else if (validPages.includes(initialHash)) {
    switchDepartmentPage(initialHash, false);
    history.replaceState({ page: initialHash }, "", initialHash === "home" ? "/" : `/${initialHash}/`);
  }

  // Mark the starting page as current for assistive tech
  document.querySelectorAll(".nav-link.active, .bottom-nav-item.active, .drawer-link.active").forEach((l) => l.setAttribute("aria-current", "page"));

  // Back/forward buttons
  window.addEventListener("popstate", () => {
    const p = window.location.pathname.replace(/\/+$/, "").replace(/^\//, "").toLowerCase();
    switchDepartmentPage(validPages.includes(p) ? p : "home", false);
  });

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "").trim().toLowerCase();
    if (validPages.includes(hash)) {
      switchDepartmentPage(hash, true);
    }
  });

  // Pause button for the background video and the rotating headline word
  const motionBtn = document.getElementById("motion-toggle");
  const heroVideo = document.querySelector("#hero-section video");
  if (motionBtn) {
    motionBtn.addEventListener("click", () => {
      window.fcMotionPaused = !window.fcMotionPaused;
      motionBtn.setAttribute("aria-pressed", String(window.fcMotionPaused));
      motionBtn.textContent = window.fcMotionPaused ? "Play motion" : "Pause motion";
      motionBtn.setAttribute("aria-label", `${motionBtn.textContent}: background video and moving headline`);
      if (heroVideo) { window.fcMotionPaused ? heroVideo.pause() : heroVideo.play().catch(() => {}); }
    });
    if (heroVideo && heroVideo.paused && !window.fcMotionPaused) {
      // Video was paused by the reduced-motion or data-saver script
      window.fcMotionPaused = true;
      motionBtn.setAttribute("aria-pressed", "true");
      motionBtn.textContent = "Play motion";
      motionBtn.setAttribute("aria-label", "Play motion: background video and moving headline");
    }
  }

  /* ==========================================================================
     5. INTERACTIVE PILL TABS FILTERING (Home, Submission Categories, Team)
     ========================================================================== */
  // Home Section Pill Filter
  const homePills = document.querySelectorAll("[data-home-filter]");
  const homeGroups = document.querySelectorAll("[data-home-group]");

  homePills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const filter = pill.getAttribute("data-home-filter");
      homePills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");

      homeGroups.forEach((grp) => {
        if (filter === "all" || grp.getAttribute("data-home-group") === filter) {
          grp.style.display = "block";
        } else {
          grp.style.display = "none";
        }
      });
    });
  });

  // Submission Categories Pill Filter
  const catPills = document.querySelectorAll("[data-cat-filter]");
  const catCards = document.querySelectorAll("[data-category-item]");

  catPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const filter = pill.getAttribute("data-cat-filter");
      catPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");

      catCards.forEach((card) => {
        if (filter === "all" || card.getAttribute("data-category-item") === filter) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    });
  });

  // Team Committees Pill Filter
  const teamPills = document.querySelectorAll("[data-team-filter]");
  const teamCards = document.querySelectorAll("[data-team-group]");

  teamPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const filter = pill.getAttribute("data-team-filter");
      teamPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");

      teamCards.forEach((card) => {
        if (filter === "all" || card.getAttribute("data-team-group") === filter) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    });
  });

  // Clicking '+' on a Submission Category Card selects that category and scrolls to the form
  const selectCategoryBtns = document.querySelectorAll(".select-category-btn");
  const categorySelectInput = document.getElementById("sub-category");
  const formContainerBox = document.getElementById("film-submission-form-box");

  selectCategoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const catValue = btn.getAttribute("data-select-cat");
      if (categorySelectInput && catValue) {
        categorySelectInput.value = catValue;
      }
      if (formContainerBox) {
        formContainerBox.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  /* ==========================================================================
     6. FAQ ACCORDION & GUIDELINES PDF UPLOAD / DOWNLOAD
     ========================================================================== */
  const faqQuestions = document.querySelectorAll(".faq-question");
  faqQuestions.forEach((question) => {
    question.addEventListener("click", () => {
      const item = question.closest(".faq-item");
      if (item) {
        item.classList.toggle("active");
      }
    });
  });


  /* ==========================================================================
     7. OUTREACH "OTHER (PLEASE SPECIFY)" DYNAMIC INPUT & FORM SUBMISSIONS
     ========================================================================== */
  const otherCheckbox = document.getElementById("collab-other-checkbox");
  const otherWrapper = document.getElementById("collab-other-wrapper");
  const otherInput = document.getElementById("outreach-other-specify");

  if (otherCheckbox && otherWrapper) {
    otherCheckbox.addEventListener("change", () => {
      if (otherCheckbox.checked) {
        otherWrapper.classList.add("visible");
        if (otherInput) otherInput.focus();
      } else {
        otherWrapper.classList.remove("visible");
      }
    });
  }

  // The film submission form lives in wizard.js.
  const byId = (id) => document.getElementById(id);
  const showFeedback = (el, ...parts) => {
    el.replaceChildren(...parts);
    el.classList.add("visible");
  };

  // formFields reads a form's named inputs; checkbox groups become one
  // comma-separated answer.
  function formFields(form) {
    const out = {};
    for (const el of form.elements) {
      const key = el.name || el.id;
      if (!key || el.type === "submit" || el.type === "button") continue;
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked) out[key] = out[key] ? `${out[key]}, ${el.value}` : el.value;
      } else if (el.value.trim()) {
        out[key] = el.value.trim();
      }
    }
    return out;
  }

  // Outreach and sponsor forms are stored by the FirstCut service; the thank-you
  // shows only once it confirms.
  function fieldMessage(el) {
    if (el.validity.valueMissing) return "This field is required.";
    if (el.validity.typeMismatch && el.type === "email") return "Enter a valid email address, like name@college.edu.";
    if (el.validity.typeMismatch || el.validity.patternMismatch) return "Check the format of this field.";
    return "Please check this field.";
  }
  function clearInquiryErrors(form) {
    form.querySelectorAll(".fc-error").forEach((n) => n.remove());
    form.querySelectorAll("[aria-invalid]").forEach((i) => { i.removeAttribute("aria-invalid"); i.removeAttribute("aria-describedby"); });
  }
  function showInquiryError(el, msg) {
    const group = el.closest(".form-group") || el.parentElement;
    const err = document.createElement("span");
    err.className = "fc-error";
    err.id = `err-${el.id || el.name}`;
    err.setAttribute("role", "alert");
    err.textContent = msg;
    el.setAttribute("aria-invalid", "true");
    el.setAttribute("aria-describedby", err.id);
    group.append(err);
  }

  // Outreach and sponsor forms are stored by the FirstCut service; the thank-you
  // shows only once it confirms.
  function wireInquiry(form, feedback, kind, thanks, contactEmail, after) {
    if (!form || !feedback) return;
    form.noValidate = true;
    const submitBtn = form.querySelector('[type="submit"]');
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form.dataset.sending === "1") return;
      clearInquiryErrors(form);
      feedback.classList.remove("visible");

      // Check every field and say exactly which ones need attention
      const invalid = [...form.elements].filter((el) => el.willValidate && el.type !== "submit" && !el.checkValidity());
      if (invalid.length) {
        invalid.forEach((el) => showInquiryError(el, fieldMessage(el)));
        showFeedback(feedback, `Please fix ${invalid.length} ${invalid.length === 1 ? "field" : "fields"} marked above, then send again.`);
        invalid[0].focus();
        return;
      }

      form.dataset.sending = "1";
      const label = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }
      showFeedback(feedback, "Sending your details…");

      let status = 0;
      let body = null;
      try {
        const res = await fetch(`/api/inquiries/${kind}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formFields(form)),
        });
        status = res.status;
        try { body = await res.json(); } catch (err) { /* no JSON body */ }
      } catch (err) { status = 0; }

      form.dataset.sending = "0";
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = label; }

      if (status === 201) {
        // Tracking: tells Tag Manager an enquiry was sent. No personal details are included.
        try { (window.dataLayer = window.dataLayer || []).push({ event: "form_submit_success", form_type: kind }); } catch (e) { /* tracking must never break the form */ }
        showFeedback(feedback, thanks);
        form.reset();
        if (after) after();
        return;
      }
      // Field-level errors from the service, if it sent any
      if (status === 400 || status === 422) {
        const errs = (body && body.errors) || {};
        let shown = 0;
        Object.entries(errs).forEach(([key, msg]) => {
          const el = form.elements[key] || byId(key);
          if (el && typeof msg === "string") { showInquiryError(el, msg); shown++; }
        });
        showFeedback(feedback, shown ? "Please fix the fields marked above, then send again." : "We couldn't accept those details. Please check each field and try again.");
        return;
      }
      if (status === 429) {
        showFeedback(feedback, "Too many attempts. Please wait a minute and send again. Your answers are still here.");
      } else if (status >= 500) {
        showFeedback(feedback, `Our server had a problem. Your answers are still here. Try again in a minute, or email ${contactEmail}.`);
      } else {
        showFeedback(feedback, `We couldn't reach the server. Check your connection and try again, or email ${contactEmail}. Your answers are still here.`);
      }
    });
  }
  wireInquiry(byId("outreach-form"), byId("outreach-form-feedback"), "outreach",
    "✓ Thank you! Your collaboration interest has been sent to the FirstCut Outreach team.",
    "outreach.firstcut@flame.edu.in",
    () => otherWrapper && otherWrapper.classList.remove("visible"));
  wireInquiry(byId("sponsor-form"), byId("sponsor-form-feedback"), "sponsor",
    "✓ Thank you! Our Sponsorship & Finance team will contact your brand shortly.",
    "sponsorships.firstcut@flame.edu.in");

  // Take 13 Events: clamp long text on phones with a "Read more" toggle
  (function () {
    const mq = window.matchMedia("(max-width: 640px)");
    document.querySelectorAll(".fe-card .fe-text").forEach((p, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fe-more";
      btn.textContent = "Read more";
      btn.setAttribute("aria-expanded", "false");
      p.id = p.id || `fe-text-${i}`;
      btn.setAttribute("aria-controls", p.id);
      p.after(btn);
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const open = p.classList.toggle("is-clamped") === false;
        btn.setAttribute("aria-expanded", String(open));
        btn.textContent = open ? "Show less" : "Read more";
      });
      const apply = () => { if (mq.matches) { p.classList.add("is-clamped"); } else { p.classList.remove("is-clamped"); } };
      apply();
      mq.addEventListener && mq.addEventListener("change", apply);
    });
  })();
});
