/**
 * VERDANT AROMATICS — hero-morph.js
 * ✅ file:// 완전 호환
 *
 * 파티클 형태: 원형 (Canvas 2D 텍스처 → PointsMaterial.map)
 *   - 32×32 캔버스에 방사형 그라디언트 원 그려서 텍스처 생성
 *   - alphaTest: 0.05 로 사각형 경계 완전 제거
 *
 * 동작:
 *   [모핑]  오른쪽 드래그 → 구 → 잎 변형
 *   [회전]  잎 완성 후 → X+Y 자유 360° + 관성 + 자동회전
 *   [리셋]  스크롤로 히어로 벗어남 → 구로 복귀
 */

(function () {
  'use strict';

  /* Three.js CDN */
  var scr = document.createElement('script');
  scr.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  scr.onload  = boot;
  scr.onerror = function () {
    var c = document.getElementById('heroMorphCanvas');
    if (c) c.style.display = 'none';
  };
  document.head.appendChild(scr);

  /* ── 설정 ── */
  var N          = 2500;
  var SPHERE_R   = 2.0;
  var LEAF_SCALE = 2.2;
  var DRAG_FULL  = 800;
  var DRAG_BACK  = 0.55;
  var ROT_SENS   = 0.007;
  var INERTIA    = 0.88;
  var AUTO_SPEED = 0.006;

  var PAL = [
    [0.29, 0.49, 0.35],
    [0.18, 0.35, 0.23],
    [0.42, 0.62, 0.45],
    [0.70, 0.80, 0.72],
    [0.69, 0.55, 0.28],
    [0.50, 0.64, 0.53],
    [0.22, 0.42, 0.28]
  ];

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smoothstep(t) { return t * t * (3 - 2 * t); }

  /* ── 원형 파티클 텍스처 생성 ────────────────
     Canvas 2D로 부드러운 원 그라디언트를 그린 뒤
     THREE.CanvasTexture로 변환
     → PointsMaterial.map 에 적용하면 원형 파티클  */
  function makeCircleTexture() {
    var size = 64;
    var c    = document.createElement('canvas');
    c.width  = size;
    c.height = size;
    var ctx  = c.getContext('2d');
    var half = size / 2;

    /* 방사형 그라디언트: 중앙 불투명 → 가장자리 투명 */
    var grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.0, 'rgba(255,255,255,1.0)');  /* 중심: 완전 불투명 */
    grad.addColorStop(0.5, 'rgba(255,255,255,0.85)'); /* 중간 */
    grad.addColorStop(0.8, 'rgba(255,255,255,0.25)'); /* 가장자리 흐릿 */
    grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');  /* 끝: 완전 투명 */

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    return c;
  }

  /* 구 좌표 */
  function makeSphere(n, r) {
    var pts = new Float32Array(n * 3);
    var ga  = Math.PI * (1 + Math.sqrt(5));
    for (var i = 0; i < n; i++) {
      var phi   = Math.acos(1 - 2 * (i + 0.5) / n);
      var theta = ga * i;
      pts[i*3]   = r * Math.sin(phi) * Math.cos(theta) + (Math.random()-.5)*.07;
      pts[i*3+1] = r * Math.cos(phi)                   + (Math.random()-.5)*.07;
      pts[i*3+2] = r * Math.sin(phi) * Math.sin(theta) + (Math.random()-.5)*.07;
    }
    return pts;
  }

  /* 잎 좌표 */
  function makeLeaf(n, sc) {
    var pts = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var t  = Math.random();
      var hw = Math.sin(t * Math.PI) * sc * 0.50;
      var x  = (Math.random()*2-1) * hw;
      var y  = (t*2-1) * sc;
      var nx = hw > .001 ? Math.abs(x)/hw : 0;
      var z  = (1-nx*nx)*sc*.18 + (1-Math.abs(nx))*.05;
      pts[i*3]   = x + (Math.random()-.5)*.06;
      pts[i*3+1] = y + (Math.random()-.5)*.06;
      pts[i*3+2] = z + (Math.random()-.5)*.025;
    }
    return pts;
  }

  function makeColors(n) {
    var arr = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var c = PAL[Math.floor(Math.random()*PAL.length)];
      arr[i*3]=c[0]; arr[i*3+1]=c[1]; arr[i*3+2]=c[2];
    }
    return arr;
  }

  function boot() {
    var THREE = window.THREE;
    if (!THREE) return;

    var canvas = document.getElementById('heroMorphCanvas');
    var outer  = document.getElementById('main');
    if (!canvas || !outer) return;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    var scene  = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 5.8);

    function resize() {
      var r = outer.getBoundingClientRect();
      var w = r.width  || window.innerWidth;
      var h = r.height || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    /* 파티클 좌표 */
    var spherePts = makeSphere(N, SPHERE_R);
    var leafPts   = makeLeaf(N, LEAF_SCALE);

    var geo  = new THREE.BufferGeometry();
    var posA = new THREE.BufferAttribute(new Float32Array(spherePts), 3);
    posA.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posA);
    geo.setAttribute('color', new THREE.BufferAttribute(makeColors(N), 3));

    /* ── 원형 텍스처 적용 ────────────────────────
       map:       원형 그라디언트 텍스처
       alphaMap:  같은 텍스처를 알파로도 사용
       alphaTest: 0.05 → 투명 픽셀 완전 제거 (사각형 없음)
       vertexColors: 각 파티클마다 다른 색               */
    var circleTex = new THREE.CanvasTexture(makeCircleTexture());

    var mat = new THREE.PointsMaterial({
      size:          0.08,         /* 원형이라 약간 크게 */
      map:           circleTex,
      alphaMap:      circleTex,
      alphaTest:     0.05,         /* 핵심: 사각형 모서리 제거 */
      vertexColors:  true,
      transparent:   true,
      opacity:       0.90,
      sizeAttenuation: true,
      depthWrite:    false,
      blending:      THREE.AdditiveBlending  /* 겹치면 더 밝아짐 → 빛나는 느낌 */
    });

    var group  = new THREE.Group();
    var points = new THREE.Points(geo, mat);
    group.add(points);
    scene.add(group);
    scene.fog = new THREE.FogExp2(0x061b0e, 0.038);

    /* ── 상태 변수 ── */
    var morphProg       = 0;
    var totalDrag       = 0;
    var isDragging      = false;
    var lastX = 0, lastY = 0;
    var lastPhase       = -1;
    var morphRotY       = 0;
    var morphTargetRotY = 0;
    var freeRotX        = 0;
    var freeRotY        = 0;
    var velX            = 0;
    var velY            = AUTO_SPEED;
    var isLeafMode      = false;
    var prevIsLeaf      = false;

    /* DOM */
    var hint      = document.getElementById('morphHint');
    var progressB = document.getElementById('morphProgressBar');
    var progressL = document.getElementById('morphProgressLabel');
    var headline  = document.querySelector('.hero__headline');
    var sub       = document.querySelector('.hero__sub');
    var LABELS    = ['Sphere', 'Morphing', 'Basil Leaf'];

    /* ── 리셋 ── */
    function resetToSphere() {
      totalDrag       = 0;
      morphProg       = 0;
      morphRotY       = 0;
      morphTargetRotY = 0;
      freeRotX        = 0;
      freeRotY        = 0;
      velX            = 0;
      velY            = AUTO_SPEED;
      isLeafMode      = false;
      prevIsLeaf      = false;
      lastPhase       = -1;
      isDragging      = false;
      group.rotation.set(0, 0, 0);
      if (hint) hint.style.opacity = '1';
      if (progressB) progressB.style.setProperty('--morph-pct', '0%');
      if (progressL) progressL.textContent = LABELS[0];
      if (headline) {
        headline.style.opacity = '0';
        setTimeout(function () {
          headline.innerHTML     = '깊은 향을 키운<br />바질 생잎';
          headline.style.opacity = '1';
        }, 300);
      }
      if (sub) {
        sub.style.opacity = '0';
        setTimeout(function () {
          sub.textContent   = '오른쪽으로 드래그해서 바질 잎을 발견하세요';
          sub.style.opacity = '1';
        }, 300);
      }
    }

    /* ── 스크롤 감지: 히어로 벗어남 → 리셋 ── */
    var heroVisible  = true;
    var resetPending = false;

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            heroVisible  = false;
            resetPending = true;
          } else {
            if (resetPending && !heroVisible) {
              resetToSphere();
              resetPending = false;
            }
            heroVisible = true;
          }
        });
      }, { threshold: [0, 0.30] }).observe(outer);
    }

    /* ── 드래그 ── */
    function onDown(x, y) {
      isDragging = true;
      lastX = x; lastY = y;
      velX  = 0; velY  = 0;
    }
    function onMove(x, y) {
      if (!isDragging) return;
      var dx = x - lastX;
      var dy = y - lastY;
      lastX = x; lastY = y;
      if (!isLeafMode) {
        morphTargetRotY += dx * ROT_SENS;
        totalDrag = dx > 0
          ? clamp(totalDrag + Math.abs(dx), 0, DRAG_FULL)
          : clamp(totalDrag - Math.abs(dx) * DRAG_BACK, 0, DRAG_FULL);
        if (hint) hint.style.opacity = Math.max(0, 1 - totalDrag / 100).toFixed(2);
      } else {
        velY = dx * ROT_SENS;
        velX = dy * ROT_SENS;
        freeRotY += velY;
        freeRotX += velX;
      }
    }
    function onUp() { isDragging = false; }

    canvas.addEventListener('mousedown', function(e) { onDown(e.clientX, e.clientY); e.preventDefault(); });
    window.addEventListener('mousemove', function(e) { onMove(e.clientX, e.clientY); });
    window.addEventListener('mouseup',   onUp);
    canvas.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchmove', function(e) {
      if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchend', onUp);

    canvas.style.cursor = 'grab';
    canvas.addEventListener('mousedown', function() { canvas.style.cursor = 'grabbing'; });
    window.addEventListener('mouseup',   function() { canvas.style.cursor = 'grab'; });

    /* ── 텍스트 전환 ── */
    function updateText(phase) {
      if (phase === lastPhase || !headline || !sub) return;
      lastPhase = phase;
      headline.style.opacity = '0';
      sub.style.opacity      = '0';
      var texts = [
        { h: '깊은 향을 키운<br />바질 생잎',  s: '오른쪽으로 드래그해서 바질 잎을 발견하세요' },
        { h: '형태가<br />드러납니다',          s: '계속 오른쪽으로 드래그해 보세요' },
        { h: '깊은 향을 키운<br />바질 생잎',  s: '자유롭게 드래그해서 360° 회전해 보세요' }
      ];
      setTimeout(function () {
        headline.innerHTML    = texts[phase].h;
        sub.textContent       = texts[phase].s;
        headline.style.opacity = '1';
        sub.style.opacity      = '1';
      }, 480);
    }

    /* ── 렌더 루프 ── */
    var prevT = 0;
    function animate(now) {
      requestAnimationFrame(animate);
      var dt = clamp((now - prevT) / 16.67, 0.1, 4);
      prevT  = now;

      morphProg  = lerp(morphProg, totalDrag / DRAG_FULL, 0.04 * dt);
      isLeafMode = morphProg > 0.95;

      if (isLeafMode && !prevIsLeaf) {
        freeRotX = group.rotation.x;
        freeRotY = group.rotation.y;
        velX     = 0;
        velY     = AUTO_SPEED;
      }
      prevIsLeaf = isLeafMode;

      /* 파티클 보간 */
      var ease = smoothstep(morphProg);
      var pa   = geo.attributes.position.array;
      for (var i = 0; i < N * 3; i++) {
        pa[i] = lerp(spherePts[i], leafPts[i], ease);
      }
      geo.attributes.position.needsUpdate = true;
      mat.size    = lerp(0.090, 0.055, ease);  /* 잎일 때 촘촘하게 */
      mat.opacity = lerp(0.80, 0.95, ease);

      /* 회전 */
      if (!isLeafMode) {
        morphRotY += (morphTargetRotY - morphRotY) * 0.07 * dt;
        group.rotation.y = morphRotY;
        var t = now * 0.00035;
        group.rotation.x = Math.sin(t * 0.8) * 0.018;
        group.rotation.z = Math.cos(t * 0.5) * 0.010;
      } else {
        if (!isDragging) {
          velX *= Math.pow(INERTIA, dt);
          velY *= Math.pow(INERTIA, dt);
          if (Math.abs(velY) < AUTO_SPEED * 1.5) {
            velY = lerp(velY, AUTO_SPEED, 0.02 * dt);
          }
          freeRotY += velY * dt;
          freeRotX += velX * dt;
          freeRotX  = lerp(freeRotX, 0, 0.008 * dt);
        }
        group.rotation.x = freeRotX;
        group.rotation.y = freeRotY;
        group.rotation.z = 0;
      }

      if (progressB) progressB.style.setProperty('--morph-pct', (morphProg*100).toFixed(1)+'%');
      var phase = morphProg < 0.30 ? 0 : morphProg < 0.95 ? 1 : 2;
      if (progressL) progressL.textContent = LABELS[phase];
      updateText(phase);

      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var pa2 = geo.attributes.position.array;
      for (var j = 0; j < N*3; j++) pa2[j] = leafPts[j];
      geo.attributes.position.needsUpdate = true;
      totalDrag = DRAG_FULL; morphProg = 1; isLeafMode = true;
    }
  }

})();