/* ════════════════════════════════════════════════════════════
   SparkVy — Shared Chemistry Motion Helpers
   - chemMoleculeSVG(variant): returns inline SVG markup for a
     small atoms+bonds molecule icon used in floating decor.
   - injectMolecules(containerSelector, count): scatters molecule
     + bubble decor divs into a .chem-fx-layer container.
   - Scroll-reveal: auto-observes all .reveal elements and adds
     .in when they enter the viewport.
════════════════════════════════════════════════════════════ */
(function(){

  // Three small molecule "species" — atoms (circles) + bonds (lines).
  // Colors intentionally use currentColor-friendly hexes that read
  // well on both light and dark hero backgrounds.
  const MOLECULES = [
    // triangular 4-atom cluster
    `<svg width="84" height="64" viewBox="0 0 84 64" xmlns="http://www.w3.org/2000/svg">
      <line x1="18" y1="32" x2="42" y2="14" stroke="#1a3a6b" stroke-width="2"/>
      <line x1="42" y1="14" x2="66" y2="32" stroke="#1a3a6b" stroke-width="2"/>
      <line x1="42" y1="14" x2="42" y2="48" stroke="#1a3a6b" stroke-width="2"/>
      <circle cx="18" cy="32" r="6.5" fill="#e8560a"/>
      <circle cx="66" cy="32" r="6.5" fill="#e8560a"/>
      <circle cx="42" cy="14" r="8.5" fill="#1a3a6b"/>
      <circle cx="42" cy="48" r="5.5" fill="#f5a623"/>
    </svg>`,
    // bent 4-atom chain
    `<svg width="68" height="68" viewBox="0 0 68 68" xmlns="http://www.w3.org/2000/svg">
      <line x1="14" y1="14" x2="34" y2="34" stroke="#e8560a" stroke-width="2"/>
      <line x1="34" y1="34" x2="54" y2="14" stroke="#e8560a" stroke-width="2"/>
      <line x1="34" y1="34" x2="34" y2="58" stroke="#e8560a" stroke-width="2"/>
      <circle cx="14" cy="14" r="5.5" fill="#1a3a6b"/>
      <circle cx="54" cy="14" r="5.5" fill="#1a3a6b"/>
      <circle cx="34" cy="34" r="7.5" fill="#e8560a"/>
      <circle cx="34" cy="58" r="5" fill="#f5a623"/>
    </svg>`,
    // simple 2-bond diatomic pair
    `<svg width="58" height="58" viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg">
      <line x1="10" y1="29" x2="29" y2="10" stroke="#1a3a6b" stroke-width="2"/>
      <line x1="10" y1="29" x2="29" y2="48" stroke="#1a3a6b" stroke-width="2"/>
      <circle cx="10" cy="29" r="6.5" fill="#1a3a6b"/>
      <circle cx="29" cy="10" r="5" fill="#e8560a"/>
      <circle cx="29" cy="48" r="5" fill="#e8560a"/>
    </svg>`,
    // 5-ring style cluster (benzene-ish hint)
    `<svg width="74" height="64" viewBox="0 0 74 64" xmlns="http://www.w3.org/2000/svg">
      <polygon points="37,8 58,20 58,44 37,56 16,44 16,20" fill="none" stroke="#1a3a6b" stroke-width="1.6" opacity="0.55"/>
      <circle cx="37" cy="8" r="4.5" fill="#e8560a"/>
      <circle cx="58" cy="20" r="4.5" fill="#f5a623"/>
      <circle cx="58" cy="44" r="4.5" fill="#e8560a"/>
      <circle cx="37" cy="56" r="4.5" fill="#f5a623"/>
      <circle cx="16" cy="44" r="4.5" fill="#e8560a"/>
      <circle cx="16" cy="20" r="4.5" fill="#f5a623"/>
    </svg>`
  ];

  const DRIFT_CLASSES = ['drift-a','drift-b','drift-c'];

  // Deterministic-ish pseudo-random so layout doesn't jump on reflow
  function rand(seed){ return (Math.sin(seed * 999) + 1) / 2; }

  /**
   * Populate a .chem-fx-layer element with floating molecules and
   * rising bubbles. Safe to call multiple times (idempotent per element).
   * @param {string} selector - CSS selector for the layer container
   * @param {object} opts - { molecules: number, bubbles: number, mobileMolecules: number }
   */
  window.chemInjectFx = function(selector, opts){
    opts = opts || {};
    const molCount = opts.molecules != null ? opts.molecules : 4;
    const bubbleCount = opts.bubbles != null ? opts.bubbles : 6;
    // avoidLeft: fraction (0-1) of width from the left to keep clear of
    // decor — useful when hero text/buttons live in the left column.
    const avoidLeft = opts.avoidLeft || 0;
    document.querySelectorAll(selector).forEach(function(layer, layerIdx){
      if (layer.dataset.chemInjected) return;
      layer.dataset.chemInjected = 'true';

      // Spread molecules across a loose grid of "zones" so they never
      // cluster, then jitter within each zone for an organic feel.
      const usableWidth = 100 - (avoidLeft * 100);
      const cols = Math.max(2, Math.ceil(Math.sqrt(molCount)));
      const rows = Math.max(2, Math.ceil(molCount / cols));
      let html = '';
      for (let i = 0; i < molCount; i++){
        const seed = layerIdx * 17 + i * 7 + 3;
        const col = i % cols;
        const row = Math.floor(i / cols) % rows;
        const zoneW = usableWidth / cols;
        const zoneH = 100 / rows;
        const jitterX = (rand(seed) - 0.5) * zoneW * 0.6;
        const jitterY = (rand(seed + 1) - 0.5) * zoneH * 0.6;
        const top = Math.min(88, Math.max(4, row * zoneH + zoneH * 0.5 + jitterY));
        const left = Math.min(96, Math.max(avoidLeft * 100 + 2, avoidLeft * 100 + col * zoneW + zoneW * 0.5 + jitterX));
        const size = 0.65 + rand(seed + 2) * 0.55;
        const drift = DRIFT_CLASSES[i % DRIFT_CLASSES.length];
        const mol = MOLECULES[i % MOLECULES.length];
        const hideMobile = i >= 2 ? ' hide-mobile' : '';
        html += `<div class="molecule ${drift}${hideMobile}" style="top:${top.toFixed(1)}%; left:${left.toFixed(1)}%; transform:scale(${size.toFixed(2)});">${mol}</div>`;
      }
      for (let i = 0; i < bubbleCount; i++){
        const seed = layerIdx * 31 + i * 11 + 5;
        const left = avoidLeft * 100 + 4 + rand(seed) * (usableWidth - 8);
        const size = 5 + rand(seed + 1) * 11;
        const duration = (6 + rand(seed + 2) * 6).toFixed(1);
        const delay = (rand(seed + 3) * 6).toFixed(1);
        const hideMobile = i % 2 === 0 ? ' hide-mobile' : '';
        html += `<div class="chem-bubble${hideMobile}" style="left:${left.toFixed(1)}%; width:${size}px; height:${size}px; animation-duration:${duration}s; animation-delay:${delay}s;"></div>`;
      }
      layer.insertAdjacentHTML('beforeend', html);
    });
  };

  // ── Scroll reveal: observe all .reveal elements, add .in when visible ──
  function initScrollReveal(){
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)){
      items.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(el => io.observe(el));
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initScrollReveal);
  } else {
    initScrollReveal();
  }

  // Expose for pages that add .reveal elements dynamically (e.g. after fetch)
  window.chemInitScrollReveal = initScrollReveal;

})();
