/**
 * CLIMATIZAR.COM — THE ULTIMATE HVAC DIGITAL EXPERIENCE
 * Core Interaction, Motion Engine & Engineering Utility Suite
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollProgressBar();
  initCursorSpotlight();
  initStickyHeader();
  initMobileDrawer();
  initScrollSpy();
  initFrigoriasCalculator();
  initGalleryFilterAndLightbox();
  initCoverageSearch();
  initFAQAccordion();
  initQuickQuoteForm();
  initScrollTop();
  initScrollAnimations();
  initCounters();
});

/* ==========================================================================
   1. SCROLL PROGRESS BAR
   ========================================================================== */
function initScrollProgressBar() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;

  const updateProgress = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (height > 0) {
      const percentage = (scrollTop / height) * 100;
      bar.style.width = `${percentage}%`;
    }
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

/* ==========================================================================
   2. AMBIENT CURSOR SPOTLIGHT (DESKTOP)
   ========================================================================== */
function initCursorSpotlight() {
  if (window.innerWidth < 1024) return;

  const spotlight = document.createElement('div');
  spotlight.className = 'cursor-spotlight';
  document.body.appendChild(spotlight);

  let mouseX = 0, mouseY = 0;
  let currentX = 0, currentY = 0;
  let isMoving = false;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isMoving) {
      isMoving = true;
      requestAnimationFrame(render);
    }
  }, { passive: true });

  function render() {
    currentX += (mouseX - currentX) * 0.15;
    currentY += (mouseY - currentY) * 0.15;
    spotlight.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%)`;

    if (Math.abs(mouseX - currentX) > 0.5 || Math.abs(mouseY - currentY) > 0.5) {
      requestAnimationFrame(render);
    } else {
      isMoving = false;
    }
  }
}

/* ==========================================================================
   3. STICKY HEADER
   ========================================================================== */
function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const onScroll = () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ==========================================================================
   4. MOBILE DRAWER NAVIGATION
   ========================================================================== */
function initMobileDrawer() {
  const hamburger = document.querySelector('.hamburger-btn');
  const drawer = document.querySelector('.mobile-drawer');
  const overlay = document.querySelector('.mobile-drawer-overlay');
  const closeBtn = document.querySelector('.mobile-drawer-close');
  const navLinks = document.querySelectorAll('.mobile-nav-item');

  if (!hamburger || !drawer || !overlay) return;

  const open = () => {
    drawer.classList.add('active');
    overlay.classList.add('active');
    hamburger.classList.add('active');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  hamburger.addEventListener('click', () => {
    if (drawer.classList.contains('active')) close();
    else open();
  });

  if (closeBtn) closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);

  navLinks.forEach(link => {
    link.addEventListener('click', close);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('active')) {
      close();
    }
  });
}

/* ==========================================================================
   5. SCROLL SPY ACTIVE NAV HIGHLIGHT
   ========================================================================== */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const desktopLinks = document.querySelectorAll('.nav-desktop .nav-item');
  const mobileLinks = document.querySelectorAll('.mobile-nav-item');

  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        const updateLinks = (links) => {
          links.forEach(link => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            } else if (link.getAttribute('href')?.startsWith('#')) {
              link.classList.remove('active');
            }
          });
        };
        updateLinks(desktopLinks);
        updateLinks(mobileLinks);
      }
    });
  }, { rootMargin: '-20% 0px -65% 0px' });

  sections.forEach(sec => observer.observe(sec));
}

/* ==========================================================================
   6. INTERACTIVE FRIGORÍAS CALCULATOR
   ========================================================================== */
function initFrigoriasCalculator() {
  const slider = document.getElementById('calc-area-slider');
  const areaValDisplay = document.getElementById('calc-area-val');
  const roomButtons = document.querySelectorAll('.calc-room-btn');
  const sunButtons = document.querySelectorAll('.calc-sun-btn');
  const resultDisplay = document.getElementById('calc-result-number');
  const btuDisplay = document.getElementById('calc-result-btu');
  const kwDisplay = document.getElementById('calc-result-kw');
  const waBtn = document.getElementById('calc-wa-btn');

  if (!slider || !resultDisplay) return;

  let currentArea = parseInt(slider.value, 10) || 25;
  let currentRoomFactor = 120; // default living
  let currentRoomLabel = 'Living / Estar';
  let currentSunFactor = 1.0;  // default normal
  let currentSunLabel = 'Exposición normal';

  const calculate = () => {
    const rawFrigorias = currentArea * currentRoomFactor * currentSunFactor;

    // Commercial step brackets (split market reality)
    let bracket = 2250;
    let btu = 9000;
    let kw = 2.6;

    if (rawFrigorias <= 2400) {
      bracket = 2250;
      btu = 9000;
      kw = 2.6;
    } else if (rawFrigorias <= 3300) {
      bracket = 3000;
      btu = 12000;
      kw = 3.5;
    } else if (rawFrigorias <= 4800) {
      bracket = 4500;
      btu = 18000;
      kw = 5.2;
    } else if (rawFrigorias <= 5800) {
      bracket = 5500;
      btu = 22000;
      kw = 6.4;
    } else if (rawFrigorias <= 6800) {
      bracket = 6000;
      btu = 24000;
      kw = 7.0;
    } else {
      bracket = 8000;
      btu = 32000;
      kw = 9.2;
    }

    const formattedFrigorias = bracket.toLocaleString('es-AR');
    resultDisplay.textContent = formattedFrigorias;
    if (btuDisplay) btuDisplay.textContent = `${btu.toLocaleString('es-AR')} BTU`;
    if (kwDisplay) kwDisplay.textContent = `Capacidad equivalente: ~${kw} kW • Ahorro Inverter sugerido`;

    if (waBtn) {
      const message = `Hola Climatizar.com! Estuve usando su calculadora web para un ambiente de ${currentArea}m² (${currentRoomLabel}, ${currentSunLabel}). Me dio una estimación de ${formattedFrigorias} frigorías (${btu} BTU). ¿Me podrían enviar presupuesto para provisión e instalación de equipo?`;
      const encoded = encodeURIComponent(message);
      waBtn.href = `https://wa.me/5491176768392?text=${encoded}`;
    }
  };

  slider.addEventListener('input', (e) => {
    currentArea = parseInt(e.target.value, 10);
    if (areaValDisplay) areaValDisplay.textContent = `${currentArea} m²`;
    calculate();
  });

  roomButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      roomButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRoomFactor = parseFloat(btn.dataset.factor) || 120;
      currentRoomLabel = btn.dataset.label || 'Ambiente';
      calculate();
    });
  });

  sunButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sunButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSunFactor = parseFloat(btn.dataset.factor) || 1.0;
      currentSunLabel = btn.dataset.label || 'Exposición normal';
      calculate();
    });
  });

  calculate();
}

/* ==========================================================================
   7. GALLERY FILTER & LIGHTBOX MODAL
   ========================================================================== */
function initGalleryFilterAndLightbox() {
  const filterBtns = document.querySelectorAll('.filter-pill');
  const cards = document.querySelectorAll('.gallery-card-item');
  const modal = document.getElementById('lightbox-modal');
  const modalImg = document.getElementById('lightbox-img');
  const modalTitle = document.getElementById('lightbox-title');
  const modalDesc = document.getElementById('lightbox-desc');
  const modalClose = document.getElementById('lightbox-close');

  if (filterBtns.length && cards.length) {
    const cardTimers = new WeakMap();
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;

        cards.forEach(card => {
          const prevTimer = cardTimers.get(card);
          if (prevTimer) clearTimeout(prevTimer);

          const category = card.dataset.category;
          if (filter === 'all' || category === filter) {
            card.style.display = 'block';
            const t = setTimeout(() => {
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            }, 30);
            cardTimers.set(card, t);
          } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(12px)';
            const t = setTimeout(() => {
              card.style.display = 'none';
            }, 220);
            cardTimers.set(card, t);
          }
        });
      });
    });
  }

  // Lightbox Modal Setup
  if (modal && modalImg) {
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const imgSrc = card.dataset.fullImg || card.querySelector('img')?.src;
        const title = card.dataset.title || card.querySelector('.gallery-item-title')?.textContent;
        const desc = card.dataset.desc || card.querySelector('.gallery-item-meta')?.textContent;

        modalImg.src = imgSrc;
        if (modalTitle) modalTitle.textContent = title || 'Trabajo realizado';
        if (modalDesc) modalDesc.textContent = desc || 'Instalación técnica certificada';

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeLightbox = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(() => {
        modalImg.src = '';
      }, 300);
    };

    if (modalClose) modalClose.addEventListener('click', closeLightbox);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeLightbox();
      }
    });
  }
}

/* ==========================================================================
   8. COBERTURA ZONE SEARCH ENGINE
   ========================================================================== */
function initCoverageSearch() {
  const searchInput = document.getElementById('zone-search-input');
  const searchBtn = document.getElementById('zone-search-btn');
  const statusMsg = document.getElementById('zone-status-msg');

  if (!searchInput || !statusMsg) return;

  const validate = () => {
    const val = searchInput.value.trim();
    if (!val) {
      statusMsg.innerHTML = '<span style="color: rgba(255,255,255,0.7); font-size: 0.85rem;">Ingresá tu barrio o partido para consultar disponibilidad.</span>';
      return;
    }

    statusMsg.innerHTML = `
      <span class="zone-feedback-alert verified">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        ¡Confirmado! Tenemos cobertura técnica disponible en <strong>${val}</strong> con turnos de 24 a 48 hs.
      </span>
    `;
  };

  if (searchBtn) searchBtn.addEventListener('click', validate);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      validate();
    }
  });
}

/* ==========================================================================
   9. FAQ ACCORDION
   ========================================================================== */
function initFAQAccordion() {
  const items = document.querySelectorAll('.accordion-tab-item');
  if (!items.length) return;

  items.forEach(item => {
    const btn = item.querySelector('.accordion-trigger-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      items.forEach(other => {
        if (other !== item) {
          other.classList.remove('active');
          const otherBtn = other.querySelector('.accordion-trigger-btn');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });

      if (isActive) {
        item.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ==========================================================================
   10. QUICK CONSULTATION FORM
   ========================================================================== */
function initQuickQuoteForm() {
  const form = document.getElementById('quick-quote-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('form-name')?.value.trim() || 'Cliente';
    const zone = document.getElementById('form-zone')?.value.trim() || 'CABA / GBA';
    const service = document.getElementById('form-service')?.value || 'Instalación de split';
    const details = document.getElementById('form-details')?.value.trim() || '';

    let text = `Hola Climatizar.com! Mi nombre es *${name}* de la zona de *${zone}*.\nQuisiera solicitar presupuesto para: *${service}*.\n`;
    if (details) {
      text += `Detalles técnicos adicionales: ${details}\n`;
    }
    text += `¿Tienen disponibilidad esta semana? Muchas gracias!`;

    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/5491176768392?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  });
}

/* ==========================================================================
   11. SCROLL TO TOP
   ========================================================================== */
function initScrollTop() {
  const btn = document.getElementById('scroll-top-btn');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ==========================================================================
   12. SCROLL REVEAL ANIMATIONS
   ========================================================================== */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.motion-reveal');
  if (!elements.length) return;

  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

  elements.forEach(el => observer.observe(el));
}

/* ==========================================================================
   13. NUMBER COUNTERS (EASE-OUT EASING)
   ========================================================================== */
function initCounters() {
  const counterEls = document.querySelectorAll('[data-counter]');
  if (!counterEls.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.counter, 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        let current = 0;
        const duration = 1400; // ms
        const startTime = performance.now();

        function step(now) {
          const progress = Math.min((now - startTime) / duration, 1);
          // Ease-out expo
          const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          current = Math.floor(easeProgress * target);
          el.textContent = `${prefix}${current.toLocaleString('es-AR')}${suffix}`;

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.textContent = `${prefix}${target.toLocaleString('es-AR')}${suffix}`;
          }
        }

        requestAnimationFrame(step);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.4 });

  counterEls.forEach(el => observer.observe(el));
}
