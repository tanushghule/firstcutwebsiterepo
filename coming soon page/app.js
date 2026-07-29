document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // 1. CUSTOM CAMERA CURSOR TRACKING
  // ==========================================
  const cameraCursor = document.getElementById('custom-camera-cursor');
  const cameraLens = document.getElementById('camera-lens');
  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;
  let isTouch = false;
  let touchTimeout;

  // Mouse Move tracking (Desktop)
  window.addEventListener('mousemove', (e) => {
    isTouch = false;
    mouseX = e.clientX;
    mouseY = e.clientY;
    cameraCursor.style.display = 'block';
  });

  // Touch Move / Start tracking (Mobile)
  window.addEventListener('touchstart', (e) => {
    isTouch = true;
    if (e.touches.length > 0) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
      
      // Instantly position cursor
      cursorX = mouseX;
      cursorY = mouseY;
      cameraCursor.style.left = `${cursorX}px`;
      cameraCursor.style.top = `${cursorY}px`;
      
      cameraCursor.classList.add('touch-active');
      clearTimeout(touchTimeout);
    }
  });

  window.addEventListener('touchmove', (e) => {
    isTouch = true;
    if (e.touches.length > 0) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
      cameraCursor.classList.add('touch-active');
      clearTimeout(touchTimeout);
    }
  });

  window.addEventListener('touchend', () => {
    isTouch = true;
    touchTimeout = setTimeout(() => {
      cameraCursor.classList.remove('touch-active');
    }, 1000);
  });

  // Smooth cursor follow (lerp factor: 0.18)
  function updateCursor() {
    if (!isTouch) {
      cursorX += (mouseX - cursorX) * 0.18;
      cursorY += (mouseY - cursorY) * 0.18;
      cameraCursor.style.left = `${cursorX}px`;
      cameraCursor.style.top = `${cursorY}px`;
    } else {
      cursorX += (mouseX - cursorX) * 0.3;
      cursorY += (mouseY - cursorY) * 0.3;
      cameraCursor.style.left = `${cursorX}px`;
      cameraCursor.style.top = `${cursorY}px`;
    }
    requestAnimationFrame(updateCursor);
  }
  updateCursor();

  // Hover states scale effects
  const hoverables = document.querySelectorAll('.festival-subtitle, .loading-text, .soon-text, .click-instructions');
  hoverables.forEach(el => {
    el.addEventListener('mouseenter', () => cameraCursor.classList.add('hovered'));
    el.addEventListener('mouseleave', () => cameraCursor.classList.remove('hovered'));
  });


  // ==========================================
  // 2. SYNTHESIZED CAMERA SHUTTER CLICK SOUND
  // ==========================================
  function playShutterClick() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      
      // Initial mechanical metallic latch click (Triangle wave)
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(1200, ctx.currentTime);
      clickOsc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);
      
      clickGain.gain.setValueAtTime(0.6, ctx.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
      
      clickOsc.start();
      clickOsc.stop(ctx.currentTime + 0.05);
      
      // Noise buffer for the curtain release
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      
      const noiseGain = ctx.createGain();
      
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      noiseGain.gain.setValueAtTime(0.4, ctx.currentTime + 0.01);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      noise.start(ctx.currentTime + 0.01);
      noise.stop(ctx.currentTime + 0.16);
      
    } catch (e) {
      console.warn('Web Audio click fail: ', e);
    }
  }


  // ==========================================
  // 3. SHUTTER FLASH PARTICLES ENGINE
  // ==========================================
  function createFlashParticles(x, y) {
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'flash-particle';
      document.body.appendChild(particle);
      
      // Initialize position at coordinates
      gsap.set(particle, {
        left: x,
        top: y,
        xPercent: -50,
        yPercent: -50,
        scale: 1 + Math.random() * 0.6
      });
      
      // Generate radial trajectory vectors
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 60;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;
      
      // Explode outwards and fade
      gsap.to(particle, {
        x: targetX,
        y: targetY,
        opacity: 0,
        scale: 0.1,
        duration: 0.35 + Math.random() * 0.3,
        ease: 'power2.out',
        onComplete: () => {
          particle.remove();
        }
      });
    }
  }


  // ==========================================
  // 4. CAPTURE COORDINATOR
  // ==========================================
  const flashOverlay = document.getElementById('flash-overlay');
  let isCapturing = false;

  function triggerPhotoCapture(clientX, clientY) {
    if (isCapturing) return;
    isCapturing = true;
    
    // Play sound click
    playShutterClick();
    
    // Spawn camera glow particles
    createFlashParticles(clientX, clientY);
    
    // Trigger Subtle screen flash overlay
    flashOverlay.classList.remove('active');
    void flashOverlay.offsetWidth; // Reflow
    flashOverlay.classList.add('active');
    
    // Trigger Camera Lens Snip Animation
    cameraLens.classList.remove('snip-active');
    void cameraLens.offsetWidth; // Reflow
    cameraLens.classList.add('snip-active');
    
    // Trigger Camera Cursor Rotation Flip
    cameraCursor.classList.remove('click-flip');
    void cameraCursor.offsetWidth; // Reflow
    cameraCursor.classList.add('click-flip');
    
    // Reset indicators
    setTimeout(() => {
      isCapturing = false;
      flashOverlay.classList.remove('active');
      cameraLens.classList.remove('snip-active');
      cameraCursor.classList.remove('click-flip');
    }, 400);
  }

  // Window click / touch event routers
  window.addEventListener('click', (e) => {
    // Avoid running on mobile touchend if it duplicates click
    if (isTouch) return;
    triggerPhotoCapture(e.clientX, e.clientY);
  });

  window.addEventListener('touchend', (e) => {
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      triggerPhotoCapture(touch.clientX, touch.clientY);
    }
  });

});
