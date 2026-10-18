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

  // Custom 20-Field Film Submission Form Handler
  const filmForm = document.getElementById("custom-film-submission-form");
  const filmFeedback = document.getElementById("film-submission-feedback");
  if (filmForm && filmFeedback) {
    filmForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const filmTitle = document.getElementById("sub-film-name")?.value || "Your film";
      filmFeedback.textContent = `✓ "${filmTitle}" has been registered for FirstCut 2027 Take 13! We have recorded your submission details.`;
      filmFeedback.classList.add("visible");
      filmForm.reset();
    });
  }

  // Outreach Form Handler
  const outreachForm = document.getElementById("outreach-form");
  const outreachFeedback = document.getElementById("outreach-form-feedback");
  if (outreachForm && outreachFeedback) {
    outreachForm.addEventListener("submit", (e) => {
      e.preventDefault();
      outreachFeedback.textContent =
        "✓ Thank you! Your collaboration interest has been sent to the FirstCut Outreach team.";
      outreachFeedback.classList.add("visible");
      outreachForm.reset();
      if (otherWrapper) otherWrapper.classList.remove("visible");
    });
  }

  // Sponsorship Form Handler
  const sponsorForm = document.getElementById("sponsor-form");
  const sponsorFeedback = document.getElementById("sponsor-form-feedback");
  if (sponsorForm && sponsorFeedback) {
    sponsorForm.addEventListener("submit", (e) => {
      e.preventDefault();
      sponsorFeedback.textContent =
        "✓ Thank you! Our Sponsorship & Finance team will contact your brand shortly.";
      sponsorFeedback.classList.add("visible");
      sponsorForm.reset();
    });
  }
});
