/**
 * VERDANT AROMATICS — cursor.js
 * 커스텀 마우스 커서
 *
 * 구성:
 *   ① 메인 커서 (골드 점)  : 마우스 즉시 추적
 *   ② 트레일러 (반투명 링) : lerp으로 부드럽게 지연 추적
 *
 * 상태별 변화:
 *   기본      → 골드 점 8px + 링 36px
 *   호버      → 점 확대 12px + 링 확대 52px + 밝아짐
 *   클릭      → 점·링 수축 → 반동
 *   드래그    → 커서 숨김 (파티클 캔버스 전용)
 *   입력 필드 → 점 숨김 (text 커서 표시)
 *   모바일    → 전체 비활성화
 */

(function () {
  'use strict';

  /* 터치 기기는 커서 불필요 */
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

  /* 모션 감소 설정 존중 */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ── DOM 생성 ──────────────────────────── */

  /* ① 메인 커서 — 골드 점 */
  var dot = document.createElement('div');
  dot.id  = 'cursorDot';
  dot.style.cssText = [
    'position:fixed',
    'top:0', 'left:0',
    'width:8px', 'height:8px',
    'border-radius:50%',
    'background:rgba(233,193,118,0.95)',
    'pointer-events:none',
    'z-index:99999',
    'opacity:0',
    'transition:width 0.15s ease,height 0.15s ease,background 0.2s,opacity 0.25s',
    'will-change:transform'
  ].join(';');

  /* ② 트레일러 — 반투명 링 */
  var ring = document.createElement('div');
  ring.id  = 'cursorRing';
  ring.style.cssText = [
    'position:fixed',
    'top:0', 'left:0',
    'width:36px', 'height:36px',
    'border-radius:50%',
    'border:1px solid rgba(177,141,72,0.50)',
    'pointer-events:none',
    'z-index:99998',
    'opacity:0',
    'transition:width 0.25s ease,height 0.25s ease,border-color 0.25s,opacity 0.25s',
    'will-change:transform'
  ].join(';');

  document.body.appendChild(ring);
  document.body.appendChild(dot);

  /* 기본 커서 숨기기 */
  var styleEl = document.createElement('style');
  styleEl.textContent = '*, *::before, *::after { cursor: none !important; } input, textarea, [contenteditable] { cursor: text !important; }';
  document.head.appendChild(styleEl);

  /* ── 위치 변수 ─────────────────────────── */
  var mouseX = -200, mouseY = -200;
  var ringX  = -200, ringY  = -200;
  var LERP   = 0.10;

  /* ── 상태 변수 ─────────────────────────── */
  var isHover    = false;
  var isDragging = false;
  var isReady    = false; /* 첫 mousemove 전까지 숨김 */

  /* ── 마우스 이동 추적 ──────────────────── */
  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;

    /* 첫 이동 시 커서 표시 */
    if (!isReady) {
      isReady = true;
      if (!isDragging) {
        dot.style.opacity  = '1';
        ring.style.opacity = '1';
      }
    }
  });

  /* ── 화면 이탈/진입 ────────────────────── */
  document.addEventListener('mouseleave', function () {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', function () {
    if (!isDragging && isReady) {
      dot.style.opacity  = '1';
      ring.style.opacity = '1';
    }
  });

  /* ── 호버: 클릭 가능 요소 감지 ────────── */
  var HOVER_SEL = 'a, button, [role="button"], label, .btn, .nav__link, .feature-card, .bd__trigger, .ptab__btn, .pgallery__sub, .pgallery__main';

  document.addEventListener('mouseover', function (e) {
    if (e.target.closest(HOVER_SEL)) {
      isHover = true;
      dot.style.width      = '12px';
      dot.style.height     = '12px';
      dot.style.background = 'rgba(233,193,118,1.0)';
      ring.style.width       = '52px';
      ring.style.height      = '52px';
      ring.style.borderColor = 'rgba(233,193,118,0.70)';
    }
  });

  document.addEventListener('mouseout', function (e) {
    if (e.target.closest(HOVER_SEL)) {
      isHover = false;
      dot.style.width      = '8px';
      dot.style.height     = '8px';
      dot.style.background = 'rgba(233,193,118,0.95)';
      ring.style.width       = '36px';
      ring.style.height      = '36px';
      ring.style.borderColor = 'rgba(177,141,72,0.50)';
    }
  });

  /* ── 입력 필드: 점 숨기기 ──────────────── */
  var TEXT_SEL = 'input, textarea, [contenteditable]';
  document.addEventListener('mouseover', function (e) {
    if (e.target.closest(TEXT_SEL)) {
      dot.style.opacity = '0';
    }
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest(TEXT_SEL)) {
      dot.style.opacity = '1';
    }
  });

  /* ── 클릭 효과: 수축 → 반동 ───────────── */
  document.addEventListener('mousedown', function () {
    dot.style.width  = '5px';
    dot.style.height = '5px';
    ring.style.width  = '20px';
    ring.style.height = '20px';
  });
  document.addEventListener('mouseup', function () {
    dot.style.width  = isHover ? '12px' : '8px';
    dot.style.height = isHover ? '12px' : '8px';
    ring.style.width  = isHover ? '52px' : '36px';
    ring.style.height = isHover ? '52px' : '36px';
  });

  /* ── 히어로 캔버스 드래그: 커서 숨김 ───── */
  var heroCanvas = document.getElementById('heroMorphCanvas');
  if (heroCanvas) {
    heroCanvas.addEventListener('mousedown', function () {
      isDragging = true;
      dot.style.opacity  = '0';
      ring.style.opacity = '0';
    });
    window.addEventListener('mouseup', function () {
      if (isDragging) {
        isDragging = false;
        if (isReady) {
          dot.style.opacity  = '1';
          ring.style.opacity = '1';
        }
      }
    });
  }

  /* ── rAF 애니메이션 루프 ───────────────── */
  function animate() {
    requestAnimationFrame(animate);

    /* ① 메인 커서: 즉시 이동 */
    dot.style.transform = 'translate(' + (mouseX - 4) + 'px,' + (mouseY - 4) + 'px)';

    /* ② 트레일러: lerp으로 부드러운 지연 */
    ringX += (mouseX - ringX) * LERP;
    ringY += (mouseY - ringY) * LERP;
    ring.style.transform = 'translate(' + (ringX - 18) + 'px,' + (ringY - 18) + 'px)';
  }

  animate();

})();