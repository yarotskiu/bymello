const mobileStickyBar = document.querySelector('.mobile-sticky-bar');
const sectionsToHide = document.querySelectorAll('.hide-sticky-bar-section');

let cachedBarHeight = 0;
let resizeTicking = false;

function updateCachedValues() {
  cachedBarHeight = mobileStickyBar.offsetHeight;
}

function updateMobileStickyBarHeight() {
  let barHeight = `${cachedBarHeight}px`;
  if (window.innerWidth > 989) {
    barHeight = '0px';
  }

  document.documentElement.style.setProperty('--sticky-bar-height', barHeight);
}

function hideBarWhenOverSections() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          mobileStickyBar.classList.remove('active');
        } else {
          mobileStickyBar.classList.add('active');
        }
      });
    },
    {
      root: null,
      threshold: 0,
    },
  );

  sectionsToHide.forEach((section) => observer.observe(section));
}

window.addEventListener('load', () => {
  updateCachedValues();
  updateMobileStickyBarHeight();
  mobileStickyBar.classList.add('active');
  hideBarWhenOverSections();
});

window.addEventListener('resize', () => {
  if (!resizeTicking) {
    requestAnimationFrame(() => {
      updateCachedValues();
      updateMobileStickyBarHeight();
      resizeTicking = false;
    });
    resizeTicking = true;
  }
});
