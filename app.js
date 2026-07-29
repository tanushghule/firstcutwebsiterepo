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

});
