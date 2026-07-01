/**
 * VERDANT AROMATICS — smoke.js
 * ✅ file:// 완전 호환 / 외부 의존성 없음
 *
 * 동작 원리 (codepen 참고 + 커스텀):
 *   - 캔버스(Canvas) 위에 반투명 원 파티클을 배치
 *   - 각 파티클은 z(깊이)값이 다름 → 스크롤 속도에 비례해 다른 속도로 이동
 *   - 빠르게 스크롤 → 파티클이 수직으로 늘어남 (scaleY stretch)
 *   - 마우스 움직임 → 근처 파티클이 살짝 밀려남 (척력)
 *   - 색상: 크림/올리브/골드 계열의 매우 연한 반투명 → 연기처럼 보임
 *   - 배경: 각 페이지 배경색에 blend-mode로 자연스럽게 섞임
 */

(function () {
  'use strict';

  /* ── 설정값 ────────────────────────────── */
  var CONFIG = {
    count:       55,      /* 파티클 총 수 */
    minSize:     60,      /* 최소 반지름(px) */
    maxSize:     180,     /* 최대 반지름(px) */
    baseSpeed:   0.012,   /* 기본 부유 속도 */
    scrollMult:  0.06,    /* 스크롤 → 이동 배율 */
    stretchMax:  3.5,     /* 최대 stretch 배율 */
    mouseRadius: 160,     /* 마우스 척력 반경(px) */
    mouseForce:  0.018,   /* 마우스 척력 강도 */
    fps:         60       /* 목표 프레임 */
  };

  /* ── 브랜드 색 팔레트 (매우 연한 연기 느낌) ── */
  var COLORS = [
    'rgba(212, 200, 170, VAL)', /* 크림/모래 */
    'rgba(180, 205, 184, VAL)', /* 연한 그린 */
    'rgba(177, 141,  72, VAL)', /* 골드 */
    'rgba(200, 195, 175, VAL)', /* 웜 그레이 */
    'rgba(160, 178, 155, VAL)', /* 올리브 그린 */
    'rgba(230, 220, 195, VAL)'  /* 밝은 크림 */
  ];

  /* ── 캔버스 생성 ────────────────────────── */
  var canvas = document.createElement('canvas');
  canvas.id  = 'smokeCanvas';
  canvas.style.cssText = [
    'position:fixed',
    'top:0', 'left:0',
    'width:100%', 'height:100%',
    'pointer-events:none',   /* 클릭 통과 */
    'z-index:0',
    'mix-blend-mode:screen', /* 밝은 배경엔 자연스럽게 섞임 */
    'opacity:0.55'
  ].join(';');

  /* body 첫 번째 자식으로 삽입 (콘텐츠 뒤) */
  document.body.insertBefore(canvas, document.body.firstChild);

  var ctx = canvas.getContext('2d');

  /* ── 상태 변수 ──────────────────────────── */
  var W = 0, H = 0;
  var particles = [];
  var scrollY   = window.scrollY;
  var lastScrollY = scrollY;
  var velocity  = 0;         /* 스크롤 속도 */
  var mouseX = -9999, mouseY = -9999;
  var animId  = null;
  var lastTime = 0;

  /* ── 파티클 생성 ────────────────────────── */
  function createParticle(forceY) {
    var colorBase = COLORS[Math.floor(Math.random() * COLORS.length)];
    /* 불투명도: 0.02 ~ 0.08 (매우 연하게) */
    var alpha = 0.025 + Math.random() * 0.055;
    var color = colorBase.replace('VAL', alpha.toFixed(3));

    /* z: 깊이 레이어 (0.15 ~ 1.0) */
    var isDistant = Math.random() < 0.25;
    var z = isDistant ? 0.1 + Math.random() * 0.15
                      : 0.3 + Math.random() * 0.7;

    var r = CONFIG.minSize + Math.random() * (CONFIG.maxSize - CONFIG.minSize);
    /* 먼 파티클은 작게 */
    if (isDistant) r *= 0.55;

    return {
      x:      Math.random() * W,
      y:      (forceY !== undefined) ? forceY : Math.random() * H,
      initY:  0,           /* 기준 Y (스크롤 오프셋 계산용) */
      r:      r,
      color:  color,
      z:      z,           /* 깊이 (높을수록 빠르게 이동) */
      vx:     (Math.random() - 0.5) * 0.25, /* 자체 drift */
      vy:     (Math.random() - 0.5) * 0.12,
      phase:  Math.random() * Math.PI * 2,  /* sin 위상 (유기적 흔들림) */
      scaleY: 1,           /* stretch 값 */
      static: isDistant    /* 정적(먼) 파티클 여부 */
    };
  }

  /* ── 리사이즈 ───────────────────────────── */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  /* ── 초기화 ─────────────────────────────── */
  function init() {
    resize();
    particles = [];
    for (var i = 0; i < CONFIG.count; i++) {
      particles.push(createParticle());
    }
    /* 파티클의 initY를 현재 scrollY 기준으로 설정 */
    updateInitY();
  }

  function updateInitY() {
    particles.forEach(function(p) { p.initY = p.y; });
  }

  /* ── 메인 루프 ──────────────────────────── */
  function loop(now) {
    animId = requestAnimationFrame(loop);

    /* fps 제한 */
    if (now - lastTime < 1000 / CONFIG.fps) return;
    var dt = Math.min((now - lastTime) / 16.67, 3); /* 프레임 델타 */
    lastTime = now;

    /* 스크롤 속도 계산 */
    scrollY  = window.scrollY;
    velocity = (scrollY - lastScrollY) * 0.08 + velocity * 0.92; /* 지수 평활 */
    lastScrollY = scrollY;

    ctx.clearRect(0, 0, W, H);

    var stretch = Math.max(1, Math.min(1 + Math.abs(velocity) * 0.18, CONFIG.stretchMax));

    particles.forEach(function(p) {
      /* 1. 자체 부유 이동 */
      var t = now * 0.00035;
      p.x += p.vx * dt + Math.sin(t + p.phase) * 0.18 * dt;
      p.y += p.vy * dt + Math.cos(t * 0.7 + p.phase) * 0.10 * dt;

      /* 2. 스크롤 패럴랙스 이동 */
      if (!p.static) {
        p.y -= velocity * p.z * CONFIG.scrollMult * dt;
        p.scaleY = stretch;
      } else {
        p.scaleY = 1;
      }

      /* 3. 마우스 척력 */
      var dx = p.x - mouseX;
      var dy = p.y - mouseY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.mouseRadius && dist > 1) {
        var force = (1 - dist / CONFIG.mouseRadius) * CONFIG.mouseForce;
        p.x += (dx / dist) * force * p.r * dt;
        p.y += (dy / dist) * force * p.r * dt;
      }

      /* 4. 경계 순환 (위로 벗어나면 아래에서 재진입) */
      if (p.y + p.r < -20)   { p.y = H + p.r; p.x = Math.random() * W; }
      if (p.y - p.r > H + 20){ p.y = -p.r;    p.x = Math.random() * W; }
      if (p.x + p.r < -20)   p.x = W + p.r;
      if (p.x - p.r > W + 20) p.x = -p.r;

      /* 5. 렌더링 */
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(1, p.scaleY);

      /* 방사형 그라디언트로 연기 느낌 */
      var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r);
      grad.addColorStop(0,   p.color);
      grad.addColorStop(0.5, p.color.replace(/[\d.]+\)$/, function(m) {
        /* 중간: 절반 불투명도 */
        return (parseFloat(m) * 0.45).toFixed(3) + ')';
      }));
      grad.addColorStop(1,   'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    });
  }

  /* ── 이벤트 ─────────────────────────────── */
  window.addEventListener('resize', function() {
    resize();
    /* 파티클 재분배 */
    particles.forEach(function(p) {
      if (p.x > W) p.x = Math.random() * W;
      if (p.y > H) p.y = Math.random() * H;
    });
  }, { passive: true });

  window.addEventListener('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  /* 터치: 마우스와 동일하게 처리 */
  window.addEventListener('touchmove', function(e) {
    if (e.touches.length > 0) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchend', function() {
    mouseX = -9999; mouseY = -9999;
  }, { passive: true });

  /* 마우스 이탈 시 척력 비활성화 */
  document.addEventListener('mouseleave', function() {
    mouseX = -9999; mouseY = -9999;
  });

  /* ── 모션 감소 설정 존중 ─────────────────── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  /* ── 시작 ───────────────────────────────── */
  init();
  requestAnimationFrame(loop);

  /* ── 페이지별 캔버스 opacity 미세 조정 ─────
     다크 배경 섹션이 많은 페이지는 좀 더 선명하게 */
  var bodyClass = document.body.className;
  if (bodyClass.indexOf('brand-page') !== -1 ||
      bodyClass.indexOf('product-page') !== -1) {
    canvas.style.opacity = '0.45';
  }

})();


/* ── 페이지별 추가 튜닝 (선택) ───────────────
   index.html: 히어로 영상 위에 연기가 살짝 보이도록
   캔버스는 z-index:0이므로 nav(1000), 히어로 콘텐츠(2) 뒤에 위치
   → 영상 위에는 overlay가 있어서 연기가 overlay 위로 살짝 비침
   원하면 z-index를 2로 올려서 overlay 위에 띄울 수도 있음
─────────────────────────────────────────── */