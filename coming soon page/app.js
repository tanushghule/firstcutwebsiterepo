document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // 1. CUSTOM CAMERA CURSOR TRACKING
  // ==========================================
  const cameraCursor = document.getElementById('custom-camera-cursor');
  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;
  let isTouch = false;
  let touchTimeout;

  // Mouse Move tracking (Desktop)
  window.addEventListener('mousemove', (e) => {
    isTouch = false;
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Make sure cursor is visible on desktop
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
    // Fade cursor out after a period of inactivity on mobile
    touchTimeout = setTimeout(() => {
      cameraCursor.classList.remove('touch-active');
    }, 1000);
  });

  // Smooth cursor follow (lerping)
  function updateCursor() {
    if (!isTouch) {
      cursorX += (mouseX - cursorX) * 0.18;
      cursorY += (mouseY - cursorY) * 0.18;
      cameraCursor.style.left = `${cursorX}px`;
      cameraCursor.style.top = `${cursorY}px`;
    } else {
      // Direct drag on mobile touch
      cursorX += (mouseX - cursorX) * 0.3;
      cursorY += (mouseY - cursorY) * 0.3;
      cameraCursor.style.left = `${cursorX}px`;
      cameraCursor.style.top = `${cursorY}px`;
    }
    requestAnimationFrame(updateCursor);
  }
  updateCursor();

  // Add scale animation over links or hoverable elements
  const hoverables = document.querySelectorAll('.festival-subtitle, .loading-text, .main-coming-soon, .click-instructions');
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
      
      // 1. Initial mechanical high frequency metallic click (Triangle wave)
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
      
      // 2. White noise for the shutter leaf release decay (curtains closing)
      const bufferSize = ctx.sampleRate * 0.15; // 150ms buffer
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      // Bandpass filter for the noise
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
  // 3. CAPTURE SIMULATION (FLASH + FLIP + SOUND)
  // ==========================================
  const flashOverlay = document.getElementById('flash-overlay');
  let isCapturing = false;

  function triggerPhotoCapture(e) {
    // Avoid double trigger from click and touch
    if (isCapturing) return;
    isCapturing = true;
    
    // Play shutter sound
    playShutterClick();
    
    // Trigger Screen Flash
    flashOverlay.classList.remove('active');
    void flashOverlay.offsetWidth; // Force CSS reflow
    flashOverlay.classList.add('active');
    
    // Trigger Camera Cursor Flip
    cameraCursor.classList.remove('click-flip');
    void cameraCursor.offsetWidth; // Force CSS reflow
    cameraCursor.classList.add('click-flip');
    
    // Clean up flags after animations finish
    setTimeout(() => {
      isCapturing = false;
      flashOverlay.classList.remove('active');
      cameraCursor.classList.remove('click-flip');
    }, 400);
  }

  // Bind clicks and taps
  window.addEventListener('click', (e) => {
    triggerPhotoCapture(e);
  });

  window.addEventListener('touchend', (e) => {
    // Check target to avoid touch events blocking other elements if any
    triggerPhotoCapture(e);
  });

});
