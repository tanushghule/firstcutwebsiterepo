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

  if (typeof gsap !== "undefined" && loader && mainWebsite) {
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
  const validPages = ["home", "submissions", "outreach", "sponsorship", "team"];
  const pageContainers = document.querySelectorAll(".dept-page");
  const drawerBackdrop = document.getElementById("mobile-drawer-backdrop");
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const drawerCloseBtn = document.getElementById("drawer-close-btn");

  function switchDepartmentPage(targetPage, updateHash = true) {
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
        } else {
          link.classList.remove("active");
        }
      });

    if (drawerBackdrop) {
      drawerBackdrop.classList.remove("open");
    }
    if (mobileMenuBtn) {
      mobileMenuBtn.setAttribute("aria-expanded", "false");
    }

    if (updateHash) {
      history.replaceState(null, "", `#${pageName}`);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Bind all elements with data-page-target
  document.addEventListener("click", (e) => {
    const targetEl = e.target.closest("[data-page-target]");
    if (targetEl) {
      const targetPage = targetEl.getAttribute("data-page-target");
      if (targetPage && validPages.includes(targetPage)) {
        e.preventDefault();
        switchDepartmentPage(targetPage, true);
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

  // Handle initial URL hash
  const initialHash = window.location.hash.replace("#", "").trim().toLowerCase();
  if (validPages.includes(initialHash)) {
    switchDepartmentPage(initialHash, false);
  }

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "").trim().toLowerCase();
    if (validPages.includes(hash)) {
      switchDepartmentPage(hash, false);
    }
  });

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

  const pdfUploadInput = document.getElementById("upload-guidelines-pdf");
  const pdfDownloadBtn = document.getElementById("btn-download-guidelines-pdf");
  const pdfBtnText = document.getElementById("guidelines-pdf-btn-text");

  if (pdfUploadInput && pdfDownloadBtn) {
    pdfUploadInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file && file.type === "application/pdf") {
        const blobUrl = URL.createObjectURL(file);
        pdfDownloadBtn.href = blobUrl;
        pdfDownloadBtn.setAttribute("download", file.name);
        if (pdfBtnText) {
          pdfBtnText.textContent = `Download: ${file.name}`;
        }
      }
    });
  }

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

  // Custom 20-Field Film Submission Form Handler: sends the entry to the
  // FirstCut service (upload.js) and says "registered" only once every file
  // is stored on the server.
  const filmForm = document.getElementById("custom-film-submission-form");
  const filmFeedback = document.getElementById("film-submission-feedback");
  const ROLES = ["director", "cinematographer", "editor", "scriptwriter"];
  const TEXT_FIELDS = ["film-name", "submitter-name", "university", "email", "mobile", "origin", "category",
    "language", "completion-date", "director-name", "cinematographer-name", "editor-name", "scriptwriter-name", "notes"];
  const byId = (id) => document.getElementById(id);
  const showFeedback = (el, ...parts) => {
    el.replaceChildren(...parts);
    el.classList.add("visible");
  };

  // The Vimeo password only matters when the film is a link.
  const filmFile = byId("sub-film-file");
  const filmLink = byId("sub-link");
  const passwordGroup = byId("sub-password-group");
  const syncPassword = () => {
    if (passwordGroup) passwordGroup.style.display = filmLink.value.trim() && !filmFile.files.length ? "" : "none";
  };
  if (filmFile && filmLink) {
    filmFile.addEventListener("change", syncPassword);
    filmLink.addEventListener("input", syncPassword);
  }

  // item turns a file input + link input pair into the API's upload-or-link shape.
  function item(fileInput, linkInput, password) {
    const file = fileInput.files[0];
    if (file) return { file, body: { mode: "upload", filename: file.name, size: file.size } };
    const url = linkInput.value.trim();
    if (url) return { body: { mode: "link", url, password: password || "" } };
    return null;
  }

  // The server names the input each problem belongs to; show it right under it.
  const ERROR_INPUT = { screener: "sub-film-file" };
  ROLES.forEach((r) => { ERROR_INPUT[r + "-id"] = `sub-${r}-id-file`; });
  function showFieldErrors(errors) {
    filmForm.querySelectorAll(".fc-field-error").forEach((n) => n.remove());
    for (const [key, msg] of Object.entries(errors)) {
      const input = byId(ERROR_INPUT[key] || "sub-" + key);
      const group = input && input.closest(".form-group");
      if (!group) continue;
      const note = document.createElement("span");
      note.className = "fc-field-error";
      note.style.cssText = "color:#f39a8b;font-size:.82rem";
      note.textContent = msg;
      group.append(note);
    }
  }

  if (filmForm && filmFeedback) {
    filmForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!window.FirstCutUpload) {
        // upload.js didn't load: never fall back to the browser's own submit,
        // which would put the filmmaker's details in the URL.
        showFeedback(filmFeedback, "Couldn't load the uploader — please reload the page.");
        return;
      }
      const fields = {};
      TEXT_FIELDS.forEach((k) => { fields[k] = (byId("sub-" + k)?.value || "").trim(); });
      const errors = {};
      const screener = item(filmFile, filmLink, byId("sub-password")?.value.trim());
      if (!screener) errors.screener = "Upload your film or paste a link to it.";
      const ids = {};
      for (const r of ROLES) {
        ids[r] = item(byId(`sub-${r}-id-file`), byId(`sub-${r}-id`));
        if (!ids[r]) errors[r + "-id"] = "Upload the ID card or paste a link to it.";
      }
      showFieldErrors(errors);
      if (Object.keys(errors).length) {
        showFeedback(filmFeedback, "Please fix the highlighted fields.");
        return;
      }

      const files = { screener: screener.file };
      const idBodies = {};
      ROLES.forEach((r) => { files[r] = ids[r].file; idBodies[r] = ids[r].body; });
      const button = byId("btn-submit-film-portal");
      button.disabled = true;
      showFeedback(filmFeedback, "Sending your details…");
      try {
        const res = await window.FirstCutUpload.submit(
          { fields, screener: screener.body, ids: idBodies },
          files,
          (text) => showFeedback(filmFeedback, text),
        );
        const link = Object.assign(document.createElement("a"), { href: res.manage_url, textContent: res.manage_url });
        showFeedback(filmFeedback,
          `✓ "${fields["film-name"]}" is registered. Tracking ID: ${res.tracking_id}. Your manage link: `, link,
          " — save this link, it's also in your email.");
        filmForm.reset();
        syncPassword();
      } catch (err) {
        if (err.fieldErrors) {
          showFieldErrors(err.fieldErrors);
          showFeedback(filmFeedback, err.fieldErrors.form || err.message);
        } else if (err.existing) {
          const link = Object.assign(document.createElement("a"), { href: err.manageUrl, textContent: err.manageUrl });
          showFeedback(filmFeedback, "We've already received this submission. To finish uploading or change anything, use your manage link: ", link);
        } else if (err.manageUrl) {
          const link = Object.assign(document.createElement("a"), { href: err.manageUrl, textContent: err.manageUrl });
          showFeedback(filmFeedback, "Your details are saved but the upload didn't finish. Use the manage link to resume: ", link);
        } else {
          showFeedback(filmFeedback, err.message || "Couldn't submit — please try again.");
        }
      } finally {
        button.disabled = false;
      }
    });
  }

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
  function wireInquiry(form, feedback, kind, thanks, after) {
    if (!form || !feedback) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let ok = false;
      try {
        const res = await fetch(`/api/inquiries/${kind}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formFields(form)),
        });
        ok = res.status === 201;
      } catch (err) { /* network error: falls through to the retry message */ }
      showFeedback(feedback, ok ? thanks : "Couldn't send — please try again.");
      if (ok) {
        form.reset();
        if (after) after();
      }
    });
  }
  wireInquiry(byId("outreach-form"), byId("outreach-form-feedback"), "outreach",
    "✓ Thank you! Your collaboration interest has been sent to the FirstCut Outreach team.",
    () => otherWrapper && otherWrapper.classList.remove("visible"));
  wireInquiry(byId("sponsor-form"), byId("sponsor-form-feedback"), "sponsor",
    "✓ Thank you! Our Sponsorship & Finance team will contact your brand shortly.");
});
