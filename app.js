document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // 1. CUSTOM CURSOR WITH LERP & INVERSION
  // ==========================================
  const cursor = document.getElementById('custom-cursor');
  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;
  
  // Track mouse coordinates
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  
  // Smoothly interpolate (lerp) cursor position
  function updateCursor() {
    cursorX += (mouseX - cursorX) * 0.15;
    cursorY += (mouseY - cursorY) * 0.15;
    
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;
    
    requestAnimationFrame(updateCursor);
  }
  updateCursor();
  
  // Add hover effect to interactive items
  const interactives = document.querySelectorAll('a, button, .event-card, .category-card, .strip-item, .team-circle');
  interactives.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
  });
  
  // Dynamic event delegation for cursor hover on future elements
  document.body.addEventListener('mouseover', (e) => {
    if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('a') || e.target.closest('button')) {
      cursor.classList.add('hovered');
    } else {
      if (!e.target.closest('.event-card') && !e.target.closest('.category-card') && !e.target.closest('.strip-item') && !e.target.closest('.team-circle')) {
        cursor.classList.remove('hovered');
      }
    }
  });

  // Ripple effect on click
  window.addEventListener('click', (e) => {
    const ripple = document.createElement('div');
    ripple.className = 'cursor-ripple';
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    document.body.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  });


  // ==========================================
  // 2. LOADING & REVEAL FLOW
  // ==========================================
  // Lock body scroll initially during loading
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';

  // Loader screen element
  const loader = document.getElementById('logo-loader');

  // We show the loader logo screen on page load, wait 2 seconds, then transition
  setTimeout(() => {
    gsap.to(loader, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        loader.style.display = 'none';
        triggerRectangleReveal();
      }
    });
  }, 2000);

  function triggerRectangleReveal() {
    const panels = document.querySelectorAll('.reveal-panel');
    
    // Animate reveal panels sliding up sequentially
    gsap.to(panels, {
      y: '-100%',
      stagger: 0.1,
      duration: 0.8,
      ease: 'power3.inOut',
      onStart: () => {
        // Display main website underneath the panels
        const mainSite = document.getElementById('main-website');
        mainSite.style.display = 'block';
      },
      onComplete: () => {
        const mainSite = document.getElementById('main-website');
        mainSite.classList.add('revealed');
        
        // Unlock normal page scrolling
        document.body.style.overflow = 'auto';
        document.body.style.position = 'static';
        
        // Clean up reveal overlay elements
        document.getElementById('reveal-overlay').remove();
        
        // Initialize Smooth Scrolling & Site Animations
        initMainWebsiteFX();
      }
    });
  }


  // ==========================================
  // 3. MAIN WEBSITE EFFECTS & SMOOTH SCROLL
  // ==========================================
  function initMainWebsiteFX() {
    // Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.2,
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
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Bind navigation smooth links to Lenis scroll
    document.querySelectorAll('.nav-link, .header-title, #contrib-link-submit, #footer-submit-btn').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId && targetId.startsWith('#')) {
          e.preventDefault();
          const targetEl = document.querySelector(targetId);
          if (targetEl) {
            lenis.scrollTo(targetEl, { offset: -80 });
          }
        }
      });
    });

    // Simple reveal animations on scroll using IntersectionObserver (since we don't need heavy ScrollTrigger scripts now)
    const animateOnScroll = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          gsap.to(entry.target, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out'
          });
          animateOnScroll.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    // Target elements to animate on scroll
    document.querySelectorAll('section, .stat-item, .category-card').forEach(el => {
      // Set initial styles for animation
      gsap.set(el, { opacity: 0, y: 30 });
      animateOnScroll.observe(el);
    });
  }


  // ==========================================
  // 4. EVENT CAROUSEL NAVIGATION
  // ==========================================
  const track = document.getElementById('event-carousel-track');
  const prevBtn = document.getElementById('carousel-prev-btn');
  const nextBtn = document.getElementById('carousel-next-btn');
  
  if (track && prevBtn && nextBtn) {
    let currentTranslate = 0;
    const cardStep = 352; // Card width + gap
    
    nextBtn.addEventListener('click', () => {
      const maxScroll = track.scrollWidth - track.parentElement.clientWidth;
      if (Math.abs(currentTranslate) < maxScroll) {
        currentTranslate -= cardStep;
        if (Math.abs(currentTranslate) > maxScroll) {
          currentTranslate = -maxScroll;
        }
        track.style.transform = `translateX(${currentTranslate}px)`;
      }
    });

    prevBtn.addEventListener('click', () => {
      if (currentTranslate < 0) {
        currentTranslate += cardStep;
        if (currentTranslate > 0) {
          currentTranslate = 0;
        }
        track.style.transform = `translateX(${currentTranslate}px)`;
      }
    });
  }

  // ==========================================
  // 5. GSAP LOOPING WORDS (HERO)
  // ==========================================
  const wordList = document.querySelector('[data-looping-words-list]');
  const edgeElement = document.querySelector('[data-looping-words-selector]');
  let loopingIndex = 0;

  if (wordList && edgeElement) {
    const listItems = wordList.children;
    const totalWords = listItems.length; // 6 items including duplicate
    const wordHeight = 100 / totalWords;

    function updateEdgeWidth() {
      // The word currently scrolling into view is at index loopingIndex
      const activeWordIndex = loopingIndex % totalWords;
      const activeWord = listItems[activeWordIndex];
      if (activeWord) {
        const textEl = activeWord.querySelector('.looping-words__p');
        const wordWidth = textEl ? textEl.getBoundingClientRect().width : activeWord.getBoundingClientRect().width;
        const listWidth = wordList.getBoundingClientRect().width;
        const percentageWidth = (wordWidth / listWidth) * 100;

        gsap.to(edgeElement, {
          width: `${percentageWidth}%`,
          duration: 0.5,
          ease: 'expo.out'
        });
      }
    }

    function moveWords() {
      loopingIndex++;

      gsap.to(wordList, {
        yPercent: -wordHeight * loopingIndex,
        duration: 1.2,
        ease: 'elastic.out(1, 0.85)',
        onStart: updateEdgeWidth,
        onComplete: function() {
          // If we reached the duplicate VISIONARIES (last item at index totalWords - 1)
          if (loopingIndex >= totalWords - 1) {
            loopingIndex = 0;
            gsap.set(wordList, { yPercent: 0 });
          }
        }
      });
    }

    // Set initial width on load
    setTimeout(updateEdgeWidth, 100);

    // Timeline for infinite looping words
    const loopingTimeline = gsap.timeline({ repeat: -1, delay: 1 });
    loopingTimeline
      .call(moveWords)
      .to({}, { duration: 2.2 }); // 2.2s pause before next cycle
  }

  // ==========================================
  // 6. ABOUT US STATS COUNTER ANIMATION
  // ==========================================
  const statGrid = document.querySelector('.about-stat-grid');
  if (statGrid) {
    const statItems = [
      { el: statGrid.querySelector('.stat-item:nth-child(1) h3'), target: 13, suffix: '+' },
      { el: statGrid.querySelector('.stat-item:nth-child(2) h3'), target: 1200, suffix: '+', format: true },
      { el: statGrid.querySelector('.stat-item:nth-child(3) h3'), target: 45, suffix: '+' }
    ];

    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          statItems.forEach(item => {
            if (!item.el) return;
            const data = { val: 0 };
            
            // Set initial state to 0+
            item.el.textContent = "0" + item.suffix;

            gsap.to(data, {
              val: item.target,
              duration: 2.5,
              ease: 'power2.out',
              onUpdate: () => {
                let displayVal = Math.floor(data.val);
                if (item.format) {
                  displayVal = displayVal.toLocaleString(); // Add commas, e.g. 1,200
                }
                item.el.textContent = displayVal + item.suffix;
              }
            });
          });
          statsObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    statsObserver.observe(statGrid);
  }

});
