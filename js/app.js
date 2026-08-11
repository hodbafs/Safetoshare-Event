/* ==========================================================================
   SAFE TO SHARE : ปลอดภัยที่จะเล่า (น้องพิงใจ) — MAIN JAVASCRIPT (PRO MAX FRAMELESS)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // 1. DOOR PORTAL ENTRANCE LOGIC
  const landingPortal = document.getElementById('landing-portal');
  const mainContent = document.getElementById('main-content');
  const doorFrame = document.getElementById('door-frame');
  const topNav = document.querySelector('.top-nav');

  // Generate Floating Particles
  const particlesContainer = document.getElementById('landing-particles');
  if (particlesContainer) {
    const particleColors = ['rgba(13,148,136,0.25)', 'rgba(45,212,191,0.2)', 'rgba(255,255,255,0.5)', 'rgba(16,185,129,0.18)'];
    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');
      const size = 4 + Math.random() * 6;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = (60 + Math.random() * 50) + '%';
      particle.style.background = particleColors[Math.floor(Math.random() * particleColors.length)];
      particle.style.animationDuration = (12 + Math.random() * 18) + 's';
      particle.style.animationDelay = (Math.random() * 10) + 's';
      particlesContainer.appendChild(particle);
    }
  }

  // Hide top nav initially
  if (topNav) {
    topNav.style.opacity = '0';
    topNav.style.transition = 'opacity 0.6s ease';
  }

  // Door Click Handler
  function openDoor() {
    if (landingPortal.classList.contains('door-opening')) return;
    landingPortal.classList.add('door-opening');

    // After door animation completes → hide landing, show main
    setTimeout(() => {
      landingPortal.classList.add('door-hidden');
      setTimeout(() => {
        landingPortal.style.display = 'none';
        if (mainContent) mainContent.classList.add('visible');
        if (topNav) topNav.style.opacity = '1';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }, 900);
  }

  if (doorFrame) {
    doorFrame.addEventListener('click', openDoor);
    doorFrame.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDoor();
      }
    });
  }

  // 2. COUNTDOWN TIMER TO 19/08/2026 09:30 AM
  const targetDate = new Date('2026-08-19T09:30:00').getTime();

  function updateCountdown() {
    const now = new Date().getTime();
    const difference = targetDate - now;

    const cdDays = document.getElementById('cd-days');
    const cdHours = document.getElementById('cd-hours');
    const cdMinutes = document.getElementById('cd-minutes');
    const cdSeconds = document.getElementById('cd-seconds');

    if (!cdDays || !cdHours || !cdMinutes || !cdSeconds) return;

    if (difference <= 0) {
      cdDays.textContent = '00';
      cdHours.textContent = '00';
      cdMinutes.textContent = '00';
      cdSeconds.textContent = '00';
      return;
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    cdDays.textContent = days < 10 ? '0' + days : days;
    cdHours.textContent = hours < 10 ? '0' + hours : hours;
    cdMinutes.textContent = minutes < 10 ? '0' + minutes : minutes;
    cdSeconds.textContent = seconds < 10 ? '0' + seconds : seconds;
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

  // 3. MODAL CONTROLS FOR VIP TICKET
  const ticketModal = document.getElementById('ticket-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const rsvpButtons = [
    document.getElementById('nav-btn-rsvp'),
    document.getElementById('hero-btn-rsvp'),
    document.getElementById('info-btn-rsvp')
  ].filter(Boolean);

  rsvpButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (ticketModal) {
        const stepSeat = document.getElementById('modal-step-seat');
        const stepForm = document.getElementById('modal-step-form');
        const stepTicket = document.getElementById('modal-step-ticket');

        if (stepSeat) stepSeat.style.display = 'block';
        if (stepForm) stepForm.style.display = 'none';
        if (stepTicket) stepTicket.style.display = 'none';

        ticketModal.classList.add('active');
      }
    });
  });

  if (modalCloseBtn && ticketModal) {
    modalCloseBtn.addEventListener('click', () => {
      ticketModal.classList.remove('active');
    });
  }

  if (ticketModal) {
    ticketModal.addEventListener('click', (e) => {
      if (e.target === ticketModal) {
        ticketModal.classList.remove('active');
      }
    });
  }

});
