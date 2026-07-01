/**
 * VERDANT AROMATICS — main.js
 * ✅ file:// 프로토콜 완전 호환
 *
 * 히어로 영상 스크롤 인터랙션:
 * ┌────────────────────────────────────────────────────────┐
 * │  hero-outer 높이 = 영상 길이 × 스크롤 배율(px/sec)    │
 * │  스크롤 진행률(0→1) = video.currentTime / duration    │
 * │  스크롤 내릴수록 영상 앞으로, 올리면 뒤로             │
 * │  영상 마지막 프레임 도달 → brand 섹션 자동 이동       │
 * └────────────────────────────────────────────────────────┘
 */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initScrollReveal();
  initHamburger();
  initSmoothScroll();
  initActiveNavLinks();
  initScrollVideo();
});


/* =============================================
   1. 내비게이션 스크롤 효과
============================================= */
function initNav() {
  const nav = document.getElementById('nav');
  const darkIds = ['main', 'quality', 'contact'];

  function update() {
    nav.classList.toggle('scrolled', window.scrollY > 64);
    nav.classList.toggle('on-light', !darkIds.includes(getVisibleSection()));
  }

  let raf = false;
  window.addEventListener('scroll', () => {
    if (!raf) { raf = true; requestAnimationFrame(() => { update(); raf = false; }); }
  }, { passive: true });
  update();
}

/* =============================================
   2. 현재 보이는 섹션 ID
============================================= */
function getVisibleSection() {
  const sections = document.querySelectorAll('section[id]');
  let cur = sections[0] ? sections[0].id : '';
  const line = window.innerHeight * 0.45;
  sections.forEach(s => {
    const r = s.getBoundingClientRect();
    if (r.top <= line && r.bottom > 0) cur = s.id;
  });
  return cur;
}

/* =============================================
   3. 스크롤 리빌
============================================= */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('visible')); return; }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -80px 0px', threshold: 0.1 });
  els.forEach(el => obs.observe(el));
}

/* =============================================
   4. 햄버거 메뉴
============================================= */
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
  document.addEventListener('click', e => { if (!btn.contains(e.target) && !drawer.contains(e.target)) close(); });
}

/* =============================================
   5. 앵커 부드러운 스크롤 (file:// 호환)
============================================= */
function initSmoothScroll() {
  const NAV = 64;
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const t = document.getElementById(a.getAttribute('href').replace('#', ''));
      if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - NAV, behavior: 'smooth' });
    });
  });
  window._scrollToSection = id => {
    const t = document.getElementById(id);
    if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' });
  };
}

/* =============================================
   6. 활성 내비게이션 링크
============================================= */
function initActiveNavLinks() {
  const links = document.querySelectorAll('.nav__link');
  function update() {
    const cur = getVisibleSection();
    links.forEach(l => l.classList.toggle('nav__link--active', l.getAttribute('data-section') === cur));
  }
  let last = 0;
  window.addEventListener('scroll', () => { const n = Date.now(); if (n - last >= 100) { last = n; update(); } }, { passive: true });
  update();
}

/* =============================================
   7. 폼 & 토스트
============================================= */
function handleSubmit() {
  const n = document.getElementById('name');
  const e = document.getElementById('email');
  const m = document.getElementById('message');
  if (!n.value.trim()) { shake(n); n.focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.value.trim())) { shake(e); e.focus(); return; }
  if (!m.value.trim()) { shake(m); m.focus(); return; }
  n.value = e.value = m.value = '';
  showToast('문의가 접수되었습니다. 감사합니다.');
}




function shake(el) { el.classList.add('shake'); el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true }); }
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}


/* =============================================
   8. 히어로 스크롤 드리븐 영상 (부드러운 버전)

   끊김 원인과 해결:
   ┌─────────────────────────────────────────────────┐
   │ 문제: currentTime을 매 frame 강제 변경           │
   │       → 브라우저가 매번 seek 처리 → 버벅임       │
   │                                                 │
   │ 해결 1) 변화량 임계값 필터링                      │
   │         0.05초 이상 차이날 때만 currentTime 적용  │
   │ 해결 2) 스크롤값 직접 반영 (lerp 제거)            │
   │         lerp는 오히려 seek를 더 자주 발생시킴     │
   │ 해결 3) 영상 preload="auto" + 전체 버퍼링 대기    │
   │         canplaythrough 이벤트 후 scrub 시작       │
   │ 해결 4) playbackRate=0으로 재생 유지 + pause      │
   │         seek 없이 currentTime만 이동             │
   └─────────────────────────────────────────────────┘

   최종 방식:
   - video.pause() + currentTime = target (seek 방식 유지)
   - 단, 스크롤 델타가 0.05초 이상일 때만 seek 호출
   - 스크롤 중 아닐 때 rAF 일시 중단 (CPU 절약)
   - 영상 완전 버퍼링(canplaythrough) 후 활성화
============================================= */
function initScrollVideo() {
  const video     = document.getElementById('heroVideo');
  const heroOuter = document.getElementById('main');
  const hint      = document.getElementById('heroHint');

  if (!video || !heroOuter) return;

  /* 스크롤 1초당 픽셀 (이 값 × 영상길이 = 히어로 섹션 높이) */
  const PX_PER_SEC = 250;

  /* seek 호출 최소 간격 (초) — 너무 작으면 끊김 */
  const SEEK_THRESHOLD = 1;

  /* ── 폴백: 영상 없거나 오류 ── */
  function fallback() {
    heroOuter.style.height = '100vh';
    if (hint) hint.classList.add('hidden');
  }
  video.addEventListener('error', fallback);

  /* ── 메타데이터 로드 후 섹션 높이 설정 ── */
  function onMeta() {
    const dur = video.duration;
    if (!dur || !isFinite(dur)) { fallback(); return; }

    /* 섹션 높이 = 스크롤 영역 + 뷰포트 1개 */
    const scrollRange = Math.round(dur * PX_PER_SEC);
    heroOuter.style.height = (scrollRange + window.innerHeight) + 'px';

    /* 첫 프레임 표시 */
    video.currentTime = 0;
    video.pause();

    /* 버퍼링 완료 후 scrub 시작 */
    if (video.readyState >= 4) {
      startScrub(dur, scrollRange);
    } else {
      video.addEventListener('canplaythrough', () => startScrub(dur, scrollRange), { once: true });
      /* 버퍼링 안 되도 일단 시작 (네트워크 환경 대응) */
      video.addEventListener('canplay', () => startScrub(dur, scrollRange), { once: true });
    }
  }

  if (video.readyState >= 1) {
    onMeta();
  } else {
    video.addEventListener('loadedmetadata', onMeta, { once: true });
  }

  /* ── 핵심 scrub 루프 ── */
  function startScrub(duration, scrollRange) {
    let lastSetTime = -1;   /* 마지막으로 실제 seek한 시간 */
    let rafId       = null;
    let hintHidden  = false;
    let released    = false;

    /* 스크롤 진행률 계산 */
    function getProgress() {
      const heroTop  = heroOuter.getBoundingClientRect().top + window.scrollY;
      const scrolled = window.scrollY - heroTop;
      return Math.max(0, Math.min(1, scrolled / scrollRange));
    }

    function tick() {
      rafId = null;

      const progress   = getProgress();
      const targetTime = progress * duration;

      /* 힌트 숨기기 */
      if (!hintHidden && progress > 0.01) {
        hintHidden = true;
        if (hint) hint.classList.add('hidden');
      }

      /* seek 임계값 필터 — 변화가 충분할 때만 currentTime 변경 */
      if (Math.abs(targetTime - lastSetTime) >= SEEK_THRESHOLD) {
        video.currentTime = targetTime;
        lastSetTime = targetTime;
      }

      /* 영상 끝 → brand 섹션 이동 */
      if (!released && progress >= 0.99) {
        released = true;
        setTimeout(() => window._scrollToSection('brand'), 300);
      }
    }

    /* 스크롤 이벤트 → rAF 예약 (중복 방지) */
    function onScroll() {
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    /* 초기 1회 실행 */
    tick();
  }
}