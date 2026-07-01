/**
 * VERDANT AROMATICS — leaf-particle.js
 * brand.html 전용 Three.js 파티클 잎 인터랙션
 *
 * 동작 흐름:
 *   Phase 0 (0~33%)  : 파티클이 랜덤 위치에서 잎 형태로 모임
 *   Phase 1 (33~66%) : 잎이 Y축 360° 천천히 회전 (3D 입체감)
 *   Phase 2 (66~100%): 파티클이 다시 흩어짐 + 다음 섹션 진입
 *
 * 기술 스택:
 *   - Three.js r128 (CDN)
 *   - BufferGeometry + Points (성능 최적화)
 *   - 잎 형태: 베지어 곡선 기반 수학적 좌표 생성
 *   - 스크롤 → progress(0~1) → 파티클 lerp 위치
 */

(function () {
  'use strict';

  /* ── Three.js CDN 로드 후 실행 ─────────── */
  var script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  script.onload = initLeafScene;
  script.onerror = function () {
    /* CDN 실패 시 캔버스 숨김 처리 */
    var scene = document.getElementById('leafScene');
    if (scene) scene.style.display = 'none';
  };
  document.head.appendChild(script);

  /* ── 설정 ───────────────────────────────── */
  var PARTICLE_COUNT = 4000;   /* 파티클 수 */
  var LEAF_SCALE     = 2.8;    /* 잎 크기 배율 */
  var PARTICLE_SIZE  = 2.2;    /* 파티클 점 크기(px) */

  /* 브랜드 색 팔레트 */
  var COLORS_HEX = [
    0x4a7c59,  /* 미디엄 그린 */
    0x2d5a3a,  /* 딥 그린 */
    0x6b9e74,  /* 라이트 그린 */
    0xb4cdb8,  /* 연한 그린 */
    0xb18d48,  /* 골드 */
    0x364c3c,  /* 다크 올리브 */
    0x819986   /* 세이지 */
  ];

  function initLeafScene() {
    var THREE = window.THREE;
    if (!THREE) return;

    var canvas  = document.getElementById('leafCanvas');
    var scene2D = document.getElementById('leafScene');
    var sticky  = document.getElementById('leafSticky');
    if (!canvas || !scene2D || !sticky) return;

    /* ── 렌더러 ──────────────────────────── */
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x061b0e, 1); /* 포레스트 그린 배경 */

    /* ── 씬 & 카메라 ──────────────────────── */
    var scene  = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    /* ── 크기 설정 ────────────────────────── */
    function resize() {
      var w = sticky.clientWidth;
      var h = sticky.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    /* ── 바질 잎 좌표 생성 ────────────────────
       수학적으로 잎 실루엣을 근사:
       - 타원형 몸통 + 뾰족한 끝 + 잎맥 구조
       - 법선 방향으로 살짝 돌출 → 3D 입체감
    ─────────────────────────────────────────── */
    function generateLeafPoints(count) {
      var pts = [];

      for (var i = 0; i < count; i++) {
        /* 잎 파라메트릭 좌표 (t: 0~1 세로 위치) */
        var t  = Math.random(); /* 세로 0~1 */
        var u  = Math.random(); /* 가로 -1~1 균등 */

        /* 잎의 세로 위치: -1(아래 끝) ~ 1(위 끝) */
        var y = (t * 2 - 1) * LEAF_SCALE;

        /* 잎 폭: 중간이 가장 넓고 양 끝이 뾰족 */
        /* sin 곡선 기반 잎 윤곽 */
        var halfWidth = Math.sin(t * Math.PI) * LEAF_SCALE * 0.52;

        /* 가로 위치 */
        var x = (u * 2 - 1) * halfWidth;

        /* 잎 표면 굴곡 (Z축): 중앙 잎맥은 볼록, 가장자리는 평평 */
        var normX    = halfWidth > 0 ? Math.abs(x) / halfWidth : 0;
        var zCurve   = (1 - normX * normX) * 0.35; /* 중앙 볼록 */
        var zVein    = (1 - Math.abs(x) * 0.8) * 0.08; /* 잎맥 */
        var z        = (zCurve + zVein) * LEAF_SCALE * 0.3;

        /* 노이즈: 자연스러운 불규칙성 */
        x += (Math.random() - 0.5) * 0.08;
        y += (Math.random() - 0.5) * 0.08;
        z += (Math.random() - 0.5) * 0.04;

        pts.push(x, y, z);
      }
      return pts;
    }

    /* ── 랜덤(흩어진) 좌표 생성 ──────────── */
    function generateRandomPoints(count) {
      var pts = [];
      var spread = 7;
      for (var i = 0; i < count; i++) {
        pts.push(
          (Math.random() - 0.5) * spread * 2,
          (Math.random() - 0.5) * spread * 1.5,
          (Math.random() - 0.5) * spread
        );
      }
      return pts;
    }

    /* ── 좌표 버퍼 ───────────────────────── */
    var leafPts   = generateLeafPoints(PARTICLE_COUNT);
    var randomPts = generateRandomPoints(PARTICLE_COUNT);

    /* 현재 파티클 위치 (lerp 대상) */
    var currentPts = randomPts.slice(); /* 처음엔 랜덤 위치 */

    /* ── 색상 버퍼 ───────────────────────── */
    var colorsArr = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var hex = COLORS_HEX[Math.floor(Math.random() * COLORS_HEX.length)];
      var col = new THREE.Color(hex);
      colorsArr.push(col.r, col.g, col.b);
    }

    /* ── Geometry & Material ─────────────── */
    var geometry = new THREE.BufferGeometry();

    var posAttr = new THREE.Float32BufferAttribute(currentPts, 3);
    geometry.setAttribute('position', posAttr);

    var colAttr = new THREE.Float32BufferAttribute(colorsArr, 3);
    geometry.setAttribute('color', colAttr);

    var material = new THREE.PointsMaterial({
      size:          PARTICLE_SIZE * 0.02,
      vertexColors:  true,
      transparent:   true,
      opacity:       0.88,
      sizeAttenuation: true,  /* 카메라 거리에 따라 크기 변화 → 3D감 */
      depthWrite:    false
    });

    var points = new THREE.Points(geometry, material);
    scene.add(points);

    /* 미세한 조명 효과: 안개로 입체감 */
    scene.fog = new THREE.FogExp2(0x061b0e, 0.06);

    /* ── 스크롤 상태 ─────────────────────── */
    var scrollProgress = 0; /* 0~1 */
    var currentRotY    = 0;
    var targetRotY     = 0;

    /* ── 텍스트 엘리먼트 ──────────────────── */
    var textEls = [
      document.getElementById('leafText0'),
      document.getElementById('leafText1'),
      document.getElementById('leafText2')
    ];

    function showText(idx) {
      textEls.forEach(function (el, i) {
        if (!el) return;
        el.classList.toggle('visible', i === idx);
      });
    }

    /* ── lerp 유틸 ───────────────────────── */
    function lerp(a, b, t) { return a + (b - a) * t; }

    /* ── 메인 렌더 루프 ──────────────────── */
    var rafId = null;
    var prevTime = 0;

    function animate(now) {
      rafId = requestAnimationFrame(animate);

      var dt = Math.min((now - prevTime) / 16.67, 3);
      prevTime = now;

      /* 씬 스크롤 진행률 계산 */
      var sceneTop    = scene2D.getBoundingClientRect().top + window.scrollY;
      var sceneHeight = scene2D.offsetHeight - window.innerHeight;
      var raw = (window.scrollY - sceneTop) / sceneHeight;
      var prog = Math.max(0, Math.min(1, raw));
      scrollProgress = prog;

      /* ── Phase 분기 ─────────────────────── */
      var posArr  = geometry.attributes.position.array;

      if (prog < 0.33) {
        /* Phase 0: 흩어짐 → 잎으로 모임 */
        var t0 = prog / 0.33;           /* 0~1 */
        var ease = t0 * t0 * (3 - 2 * t0); /* smoothstep */

        for (var i = 0; i < PARTICLE_COUNT * 3; i++) {
          posArr[i] = lerp(randomPts[i], leafPts[i], ease);
        }

        /* 회전: 서서히 똑바로 */
        targetRotY = 0;
        points.rotation.x = lerp(0.3, 0, ease);

        /* 파티클 크기: 가까워질수록 커짐 */
        material.opacity = lerp(0.3, 0.88, ease);

        showText(0);

      } else if (prog < 0.66) {
        /* Phase 1: 잎 형태 유지 + Y축 360° 회전 */
        var t1 = (prog - 0.33) / 0.33;  /* 0~1 */

        for (var j = 0; j < PARTICLE_COUNT * 3; j++) {
          posArr[j] = leafPts[j];
        }

        /* 360° 회전 */
        targetRotY = t1 * Math.PI * 2;
        material.opacity = 0.88;
        points.rotation.x = 0;

        showText(1);

      } else {
        /* Phase 2: 잎 → 흩어짐 */
        var t2 = (prog - 0.66) / 0.34;  /* 0~1 */
        var ease2 = t2 * t2 * (3 - 2 * t2);

        for (var k = 0; k < PARTICLE_COUNT * 3; k++) {
          posArr[k] = lerp(leafPts[k], randomPts[k], ease2);
        }

        targetRotY = Math.PI * 2 + ease2 * 0.5;
        material.opacity = lerp(0.88, 0.1, ease2);
        points.rotation.x = lerp(0, -0.2, ease2);

        showText(2);
      }

      /* 회전 부드럽게 보간 */
      currentRotY += (targetRotY - currentRotY) * 0.04 * dt;
      points.rotation.y = currentRotY;

      /* 자체 미세 흔들림 (유기적) */
      var time = now * 0.0004;
      points.rotation.z = Math.sin(time) * 0.012;
      camera.position.x = Math.sin(time * 0.5) * 0.08;
      camera.position.y = Math.cos(time * 0.3) * 0.05;

      geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    }

    /* 씬이 뷰포트 안에 있을 때만 렌더링 (성능) */
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (!rafId) {
            prevTime = performance.now();
            requestAnimationFrame(animate);
          }
        } else {
          if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        }
      });
    }, { threshold: 0.01 });

    observer.observe(scene2D);

    /* 모션 감소 설정 */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      /* 잎 형태만 고정 표시 */
      var pa = geometry.attributes.position.array;
      for (var m = 0; m < PARTICLE_COUNT * 3; m++) pa[m] = leafPts[m];
      geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      scene2D.style.height = '100vh';
    }
  }

})();