document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // 1. CUSTOM CINEMA CURSOR & MULTI-WAVE CLICK FX
  // ==========================================
  const cursor = document.getElementById('custom-cursor');
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let cursorX = mouseX;
  let cursorY = mouseY;
  
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  
  function updateCursor() {
    cursorX += (mouseX - cursorX) * 0.2;
    cursorY += (mouseY - cursorY) * 0.2;
    
    if (cursor) {
      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;
    }
    requestAnimationFrame(updateCursor);
  }
  updateCursor();
  
  const interactiveSelector = 'a, button, input, select, textarea, label, .faq-question, .event-card, .category-card, .strip-item, .team-circle, .dept-portal-card, .team-member-card';
  
  document.body.addEventListener('mouseover', (e) => {
    if (!cursor) return;
    if (e.target.closest(interactiveSelector)) {
      cursor.classList.add('hovered');
    } else {
      cursor.classList.remove('hovered');
    }
  });

  // Multi-ring wave ripple animation on click
  window.addEventListener('mousedown', () => {
    if (cursor) cursor.classList.add('clicking');
  });

  window.addEventListener('mouseup', () => {
    if (cursor) cursor.classList.remove('clicking');
  });

  window.addEventListener('click', (e) => {
    const waveClasses = ['cursor-wave', 'cursor-wave wave-2', 'cursor-wave wave-3'];
    waveClasses.forEach((cls) => {
      const wave = document.createElement('div');
      wave.className = cls;
      wave.style.left = `${e.clientX}px`;
      wave.style.top = `${e.clientY}px`;
      document.body.appendChild(wave);
      
      setTimeout(() => {
        wave.remove();
      }, 1150);
    });
  });


  // ==========================================
  // 2. LOADING & REVEAL FLOW
  // ==========================================
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';

  const loader = document.getElementById('logo-loader');

  setTimeout(() => {
    gsap.to(loader, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        loader.style.display = 'none';
        triggerRectangleReveal();
      }
    });
  }, 1600);

  let lenisInstance = null;

  function triggerRectangleReveal() {
    const panels = document.querySelectorAll('.reveal-panel');
    
    gsap.to(panels, {
      y: '-100%',
      stagger: 0.08,
      duration: 0.75,
      ease: 'power3.inOut',
      onStart: () => {
        const mainSite = document.getElementById('main-website');
        mainSite.style.display = 'block';
      },
      onComplete: () => {
        const mainSite = document.getElementById('main-website');
        mainSite.classList.add('revealed');
        
        document.body.style.overflow = 'auto';
        document.body.style.position = 'static';
        
        const revealOverlay = document.getElementById('reveal-overlay');
        if (revealOverlay) revealOverlay.remove();
        
        initMainWebsiteFX();
      }
    });
  }


  // ==========================================
  // 3. MULTI-PAGE DEPARTMENT ROUTER & SMOOTH SCROLL
  // ==========================================
  const validPages = ['home', 'submissions', 'outreach', 'sponsorship', 'team'];

  function switchDepartmentPage(pageName, updateHash = true) {
    const targetPage = validPages.includes(pageName) ? pageName : 'home';

    // Toggle active department page
    document.querySelectorAll('.dept-page').forEach((pageEl) => {
      if (pageEl.dataset.page === targetPage) {
        pageEl.classList.add('active');
      } else {
        pageEl.classList.remove('active');
      }
    });

    // Update desktop nav links & mobile pill links
    document.querySelectorAll('.header-nav .nav-link, .mobile-dept-bar .mobile-nav-pill').forEach((link) => {
      if (link.dataset.pageTarget === targetPage) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Close mobile menu dropdown if open
    const desktopNav = document.getElementById('desktop-nav');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (desktopNav) desktopNav.classList.remove('mobile-open');
    if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');

    // Update URL hash cleanly
    if (updateHash) {
      history.pushState(null, '', `#${targetPage}`);
    }

    // Scroll to top of page
    if (lenisInstance) {
      lenisInstance.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Re-trigger looping words width calculation if returning to Home
    if (targetPage === 'home' && typeof window.recalcLoopingWords === 'function') {
      setTimeout(window.recalcLoopingWords, 80);
    }
  }

  // Bind all [data-page-target] links & buttons
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-page-target]');
    if (trigger) {
      e.preventDefault();
      const targetPage = trigger.getAttribute('data-page-target');
      switchDepartmentPage(targetPage, true);
    }
  });

  // Mobile hamburger menu button
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const desktopNav = document.getElementById('desktop-nav');
  if (mobileMenuBtn && desktopNav) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = desktopNav.classList.toggle('mobile-open');
      mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Handle browser back/forward hash navigation
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (validPages.includes(hash)) {
      switchDepartmentPage(hash, false);
    }
  });

  // Check initial URL hash on load
  const initialHash = window.location.hash.replace('#', '').toLowerCase();
  if (validPages.includes(initialHash)) {
    switchDepartmentPage(initialHash, false);
  }

  // Smooth scroll to on-page Film Submission Portal Form
  const scrollPortalBtn = document.getElementById('btn-scroll-portal-form');
  if (scrollPortalBtn) {
    scrollPortalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const formBox = document.getElementById('film-submission-form-box');
      if (formBox) {
        if (lenisInstance) {
          lenisInstance.scrollTo(formBox, { offset: -95 });
        } else {
          formBox.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }

  function initMainWebsiteFX() {
    if (typeof Lenis !== 'undefined') {
      lenisInstance = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
      });

      function raf(time) {
        lenisInstance.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }


  // ==========================================
  // 4. GSAP LOOPING WORDS (HERO)
  // ==========================================
  const wordList = document.querySelector('[data-looping-words-list]');
  const edgeElement = document.querySelector('[data-looping-words-selector]');
  
  if (wordList && edgeElement) {
    const totalWords = wordList.children.length;
    const wordHeight = 100 / totalWords;
    let currentIndex = 0;

    function updateEdgeWidth() {
      const centerWordIndex = (currentIndex + 1) % totalWords;
      const centerWord = wordList.children[centerWordIndex];

      if (centerWord) {
        const textEl = centerWord.querySelector('.looping-words__p');
        const centerWordWidth = textEl ? textEl.getBoundingClientRect().width : centerWord.getBoundingClientRect().width;
        const listWidth = wordList.getBoundingClientRect().width;
        if (listWidth > 0) {
          const percentageWidth = (centerWordWidth / listWidth) * 100;
          gsap.to(edgeElement, {
            width: `${percentageWidth}%`,
            duration: 0.5,
            ease: 'expo.out',
          });
        }

        Array.from(wordList.children).forEach((li, idx) => {
          if (idx === centerWordIndex) {
            li.classList.add('is-active');
          } else {
            li.classList.remove('is-active');
          }
        });
      }
    }

    window.recalcLoopingWords = updateEdgeWidth;
    window.addEventListener('resize', updateEdgeWidth);

    function moveWords() {
      currentIndex++;

      gsap.to(wordList, {
        yPercent: -wordHeight * currentIndex,
        duration: 1.2,
        ease: 'elastic.out(1, 0.85)',
        onStart: updateEdgeWidth,
        onComplete: function() {
          if (currentIndex >= totalWords - 3) {
            wordList.appendChild(wordList.children[0]);
            currentIndex--;
            gsap.set(wordList, { yPercent: -wordHeight * currentIndex });
          }
        },
      });
    }

    setTimeout(updateEdgeWidth, 200);

    const loopingTimeline = gsap.timeline({ repeat: -1, delay: 1 });
    loopingTimeline
      .call(moveWords)
      .to({}, { duration: 2 });
  }


  // ==========================================
  // 5. ABOUT US STATS COUNTER ANIMATION
  // ==========================================
  const statGrid = document.querySelector('.about-stat-grid');
  if (statGrid) {
    const statEls = statGrid.querySelectorAll('.stat-item h3[data-target]');
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          statEls.forEach(el => {
            const targetVal = parseInt(el.getAttribute('data-target'), 10) || 0;
            const suffix = el.getAttribute('data-suffix') || '+';
            const data = { val: 0 };
            el.textContent = '0' + suffix;

            gsap.to(data, {
              val: targetVal,
              duration: 2.2,
              ease: 'power2.out',
              onUpdate: () => {
                el.textContent = Math.floor(data.val) + suffix;
              }
            });
          });
          statsObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    statsObserver.observe(statGrid);
  }


  // ==========================================
  // 6. SUBMISSIONS FAQ ACCORDION & GUIDELINES PDF UPLOAD
  // ==========================================
  document.querySelectorAll('.faq-question').forEach((questionEl) => {
    questionEl.addEventListener('click', () => {
      const parentItem = questionEl.closest('.faq-item');
      if (parentItem) {
        parentItem.classList.toggle('active');
      }
    });
  });

  const uploadPdfInput = document.getElementById('upload-guidelines-pdf');
  const downloadPdfBtn = document.getElementById('btn-download-guidelines-pdf');
  const downloadPdfText = document.getElementById('guidelines-pdf-btn-text');

  if (uploadPdfInput && downloadPdfBtn) {
    uploadPdfInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file && file.type === 'application/pdf') {
        const fileUrl = URL.createObjectURL(file);
        downloadPdfBtn.href = fileUrl;
        downloadPdfBtn.setAttribute('download', file.name);
        if (downloadPdfText) {
          downloadPdfText.textContent = `Download: ${file.name}`;
        }
      }
    });
  }


  // ==========================================
  // 7. FORMS HANDLING (SUBMISSIONS, OUTREACH, SPONSORSHIP)
  // ==========================================
  // Outreach "Other (please specify)" auto-focus
  const otherCheckbox = document.getElementById('collab-other-checkbox');
  const otherInput = document.getElementById('outreach-other-specify');
  if (otherCheckbox && otherInput) {
    otherCheckbox.addEventListener('change', () => {
      if (otherCheckbox.checked) {
        otherInput.required = true;
        otherInput.focus();
      } else {
        otherInput.required = false;
      }
    });
    otherInput.addEventListener('input', () => {
      if (otherInput.value.trim().length > 0) {
        otherCheckbox.checked = true;
      }
    });
  }

  // Custom 20-Field Film Submission Form
  const filmSubForm = document.getElementById('custom-film-submission-form');
  const filmSubFeedback = document.getElementById('film-submission-feedback');
  if (filmSubForm && filmSubFeedback) {
    filmSubForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const filmTitle = document.getElementById('sub-film-name')?.value || 'Your film';
      const category = document.getElementById('sub-category')?.value || 'selected';
      filmSubFeedback.textContent = `Thank you! "${filmTitle}" has been successfully registered for FirstCut 2027 Take 13 (${category} Category).`;
      filmSubFeedback.classList.add('visible');
      filmSubForm.reset();
    });
  }

  // Outreach Form
  const outreachForm = document.getElementById('outreach-form');
  const outreachFeedback = document.getElementById('outreach-form-feedback');
  if (outreachForm && outreachFeedback) {
    outreachForm.addEventListener('submit', (e) => {
      e.preventDefault();
      outreachFeedback.textContent = 'Thank you for your interest in collaborating with FirstCut Take 13! Our Outreach team will contact you shortly.';
      outreachFeedback.classList.add('visible');
      outreachForm.reset();
    });
  }

  // Sponsorship Form
  const sponsorForm = document.getElementById('sponsor-form');
  const sponsorFeedback = document.getElementById('sponsor-form-feedback');
  if (sponsorForm && sponsorFeedback) {
    sponsorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sponsorFeedback.textContent = 'Thank you! Your sponsorship inquiry for FirstCut Take 13 has been received. Our Sponsorship team will reach out soon.';
      sponsorFeedback.classList.add('visible');
      sponsorForm.reset();
    });
  }

});
