/**
 * VERDANT AROMATICS — product.js
 * ✅ file:// 프로토콜 완전 호환
 *
 * 핵심 수정사항:
 *   - onclick 속성 완전 제거 → addEventListener 사용
 *   - href="#id" 앵커 사용 안 함 (file:// 보안 오류 원인)
 *   - 탭 전환은 JS display 토글로만 처리
 */

document.addEventListener('DOMContentLoaded', function() {
  initNav();
  initTabs();         /* 탭 전환 핵심 */
  initScrollReveal();
  initHamburger();
});


/* =============================================
   1. 네비게이션 스크롤 효과
   - 히어로(다크) / 이후 섹션(라이트) 자동 전환
============================================= */
function initNav() {
  var nav = document.getElementById('nav');
  if (!nav) return;

  /* 다크 배경인 섹션 클래스 목록 */
  var darkClasses = ['.ph', '.pb-diff', '.pb-enjoy', '.pb-cta',
                     '.pi-diff', '.pi-space', '.pi-cta'];

  function isOverDark() {
    var midY = window.innerHeight * 0.2;
    for (var i = 0; i < darkClasses.length; i++) {
      var els = document.querySelectorAll(darkClasses[i]);
      for (var j = 0; j < els.length; j++) {
        var r = els[j].getBoundingClientRect();
        if (r.top <= midY && r.bottom > midY) return true;
      }
    }
    return false;
  }

  function update() {
    nav.classList.toggle('scrolled', window.scrollY > 80);
    if (isOverDark()) {
      nav.classList.remove('on-light');
    } else {
      nav.classList.add('on-light');
    }
  }

  var pending = false;
  window.addEventListener('scroll', function() {
    if (!pending) {
      pending = true;
      requestAnimationFrame(function() { update(); pending = false; });
    }
  }, { passive: true });

  update();
}


/* =============================================
   2. 탭 전환
   - addEventListener로만 처리 (onclick 없음)
   - 패널: display block/none
   - 버튼: ptab__btn--active 클래스 토글
   - 인디케이터: 버튼 위치 기반 translateX
   - 서브카피: 전환 시 텍스트 교체
============================================= */
var TAB_TAGLINES = {
  basil:   '깊은 향과 두꺼운 잎이 만드는 분명한 차이',
  incense: '생잎의 가치를 향의 경험으로 확장한 제품'
};

function initTabs() {
  var btnBasil    = document.getElementById('tabBasil');
  var btnIncense  = document.getElementById('tabIncense');
  var panelBasil  = document.getElementById('panelBasil');
  var panelIncense= document.getElementById('panelIncense');

  if (!btnBasil || !btnIncense || !panelBasil || !panelIncense) return;

  /* 버튼 클릭 이벤트 등록 */
  btnBasil.addEventListener('click', function() {
    switchTab('basil');
  });
  btnIncense.addEventListener('click', function() {
    switchTab('incense');
  });

  /* 초기 인디케이터 위치 설정 */
  requestAnimationFrame(function() {
    updateIndicator(btnBasil);
  });

  /* 창 크기 바뀔 때 인디케이터 재계산 */
  window.addEventListener('resize', function() {
    var activeBtn = document.querySelector('.ptab__btn--active');
    if (activeBtn) updateIndicator(activeBtn);
  });

  /* 태그라인 transition */
  var tagline = document.getElementById('tabTagline');
  if (tagline) tagline.style.transition = 'opacity 0.25s';
}

function switchTab(tab) {
  var btnBasil    = document.getElementById('tabBasil');
  var btnIncense  = document.getElementById('tabIncense');
  var panelBasil  = document.getElementById('panelBasil');
  var panelIncense= document.getElementById('panelIncense');
  var tagline     = document.getElementById('tabTagline');

  if (tab === 'basil') {
    /* 패널 전환 */
    panelBasil.style.display   = 'block';
    panelIncense.style.display = 'none';
    /* 버튼 상태 */
    btnBasil.classList.add('ptab__btn--active');
    btnBasil.setAttribute('aria-selected', 'true');
    btnIncense.classList.remove('ptab__btn--active');
    btnIncense.setAttribute('aria-selected', 'false');
    /* 인디케이터 */
    updateIndicator(btnBasil);
  } else {
    panelIncense.style.display = 'block';
    panelBasil.style.display   = 'none';
    btnIncense.classList.add('ptab__btn--active');
    btnIncense.setAttribute('aria-selected', 'true');
    btnBasil.classList.remove('ptab__btn--active');
    btnBasil.setAttribute('aria-selected', 'false');
    updateIndicator(btnIncense);
  }

  /* 서브카피 페이드 교체 */
  if (tagline) {
    tagline.style.opacity = '0';
    setTimeout(function() {
      tagline.textContent = TAB_TAGLINES[tab];
      tagline.style.opacity = '1';
    }, 250);
  }

  /* 탭 영역으로 스크롤 (탭이 화면 밖에 있을 때) */
  var tabEl = document.getElementById('productTab');
  if (tabEl) {
    var tabTop = tabEl.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top: tabTop, behavior: 'smooth' });
  }

  /* 새 패널의 reveal 요소 등록 */
  setTimeout(function() { reinitReveal(); }, 100);
}

/* 슬라이딩 인디케이터 위치/너비 업데이트 */
function updateIndicator(activeBtn) {
  var indicator = document.getElementById('tabIndicator');
  var tabInner  = document.querySelector('.ptab__inner');
  if (!indicator || !activeBtn || !tabInner) return;

  var btnRect   = activeBtn.getBoundingClientRect();
  var innerRect = tabInner.getBoundingClientRect();

  indicator.style.width     = btnRect.width + 'px';
  indicator.style.transform = 'translateX(' + (btnRect.left - innerRect.left) + 'px)';
}


/* =============================================
   3. 스크롤 리빌 (.reveal → .visible)
============================================= */
function initScrollReveal() {
  observeReveal(document.querySelectorAll('.reveal'));
}

function observeReveal(els) {
  if (!('IntersectionObserver' in window)) {
    els.forEach(function(el) { el.classList.add('visible'); });
    return;
  }
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.08 });
  els.forEach(function(el) { obs.observe(el); });
}

/* 탭 전환 후 새 패널의 reveal 재관찰 */
function reinitReveal() {
  var newEls = document.querySelectorAll('.ppanel:not([style*="none"]) .reveal:not(.visible)');
  observeReveal(newEls);
}


/* =============================================
   4. 햄버거 메뉴
============================================= */
function initHamburger() {
  var btn    = document.getElementById('hamburger');
  var drawer = document.getElementById('drawer');
  if (!btn || !drawer) return;

  function close() {
    drawer.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', function() {
    var open = drawer.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  });

  drawer.querySelectorAll('.nav__drawer-link').forEach(function(l) {
    l.addEventListener('click', close);
  });

  document.addEventListener('click', function(e) {
    if (!btn.contains(e.target) && !drawer.contains(e.target)) close();
  });
}


/* =============================================
   갤러리 라이트박스
   — 서브/메인 이미지 클릭 시 크게 보기
   — 배경 클릭 또는 닫기 버튼으로 닫기
   — ESC 키로 닫기
============================================= */
(function initGalleryLightbox() {

  /* 라이트박스 DOM 생성 (없으면 주입) */
  var lb = document.createElement('div');
  lb.className = 'pgallery__lightbox';
  lb.id = 'galleryLightbox';
  lb.innerHTML =
    '<button class="pgallery__lightbox-close" id="lbClose" aria-label="닫기">&#x2715;</button>' +
    '<img id="lbImg" src="" alt="제품 이미지 크게 보기" />';
  document.body.appendChild(lb);

  var lbImg   = document.getElementById('lbImg');
  var lbClose = document.getElementById('lbClose');

  /* 라이트박스 열기 */
  function openLb(src, alt) {
    if (!src || src === '') return;
    lbImg.src = src;
    lbImg.alt = alt || '';
    lb.classList.add('pgallery__lightbox--open');
    document.body.style.overflow = 'hidden';
  }

  /* 라이트박스 닫기 */
  function closeLb() {
    lb.classList.remove('pgallery__lightbox--open');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  /* 갤러리 이미지에 클릭 이벤트 위임 */
  document.addEventListener('click', function(e) {
    /* 갤러리 이미지 클릭 */
    var target = e.target;
    if (target.tagName === 'IMG' && target.closest('.pgallery__sub, .pgallery__main')) {
      e.stopPropagation();
      openLb(target.src, target.alt);
      return;
    }
    /* 배경 클릭 → 닫기 */
    if (target === lb) { closeLb(); return; }
    /* 닫기 버튼 */
    if (target === lbClose || lbClose.contains(target)) { closeLb(); }
  });

  /* ESC 키 닫기 */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLb();
  });

})();