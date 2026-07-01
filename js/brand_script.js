/**
 * VERDANT AROMATICS — brand.js
 * ✅ file:// 프로토콜 완전 호환
 */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initScrollReveal();
  initHamburger();
  initSmoothScroll();
  initAccordion();
  initScrollProgress();
});


/* ── 1. 내비게이션 ───────────────────────── */
function initNav() {
  const nav = document.getElementById('nav');

  function update() {
    const y = window.scrollY;
    /* hero는 크림 배경 → 스크롤 전부터 on-light */
    nav.classList.toggle('scrolled', y > 80);
    /* 어두운 섹션(method, incense) 위에서만 흰 텍스트 */
    const dark = isOverDarkSection();
    nav.classList.toggle('on-light', !dark);
  }

  function isOverDarkSection() {
    const darkIds = ['method', 'incense'];
    const line = window.innerHeight * 0.4;
    for (const id of darkIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) return true;
    }
    return false;
  }

  let raf = false;
  window.addEventListener('scroll', () => {
    if (!raf) { raf = true; requestAnimationFrame(() => { update(); raf = false; }); }
  }, { passive: true });

  /* brand 페이지 초기: 히어로가 크림이므로 on-light */
  nav.classList.add('on-light');
  update();
}


/* ── 2. 스크롤 리빌 ──────────────────────── */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('visible')); return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.08 });
  els.forEach(el => obs.observe(el));
}


/* ── 3. 햄버거 ───────────────────────────── */
function initHamburger() {
  const btn    = document.getElementById('hamburger');
  const drawer = document.getElementById('drawer');
  if (!btn || !drawer) return;
  function close() {
    drawer.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }
  btn.addEventListener('click', () => {
    const open = drawer.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
  drawer.querySelectorAll('.nav__drawer-link').forEach(l => l.addEventListener('click', close));
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !drawer.contains(e.target)) close();
  });
}


/* ── 4. 부드러운 앵커 스크롤 ─────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const t = document.getElementById(a.getAttribute('href').slice(1));
      if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' });
    });
  });
}


/* ── 5. 차별점 아코디언 ─────────────────── */
function initAccordion() {
  const items = document.querySelectorAll('.bd__item');

  items.forEach((item, idx) => {
    const trigger = item.querySelector('.bd__trigger');
    if (!trigger) return;

    /* 첫 번째 항목 기본 열림 */
    if (idx === 0) item.classList.add('bd__item--open');

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('bd__item--open');

      /* 모두 닫기 */
      items.forEach(i => {
        i.classList.remove('bd__item--open');
        const t = i.querySelector('.bd__trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
      });

      /* 클릭한 것만 토글 */
      if (!isOpen) {
        item.classList.add('bd__item--open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });
}


/* ── 6. 페이지 스크롤 진행 바 ─────────────
   .bh__progress-fill 의 width를
   전체 페이지 스크롤 진행률로 업데이트
─────────────────────────────────────────── */
function initScrollProgress() {
  const bar = document.getElementById('bhProgress');
  if (!bar) return;

  function update() {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
    bar.style.width = pct + '%';
  }

  let raf = false;
  window.addEventListener('scroll', () => {
    if (!raf) { raf = true; requestAnimationFrame(() => { update(); raf = false; }); }
  }, { passive: true });

  update();
}