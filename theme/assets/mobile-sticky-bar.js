const mobileStickyBar = document.querySelector('.mobile-sticky-bar');
const sectionsToHide = document.querySelectorAll('.hide-sticky-bar-section');

// Cache layout values — only recalculate on resize
let cachedBarHeight = 0;
let cachedBodyHeight = 0;
let resizeTicking = false;

function updateCachedValues() {
  cachedBarHeight = mobileStickyBar.offsetHeight;
  cachedBodyHeight = document.body.offsetHeight;
}

function updateMobileStickyBarHeight() {
  let barHeight = `${cachedBarHeight}px`;
  if (window.innerWidth > 749) {
    barHeight = '0px';
  }

  document.documentElement.style.setProperty('--sticky-bar-height', barHeight);
}

let scrollTicking = false;

function showmobileStickyBar() {
  const endScreenOnScroll = cachedBodyHeight - window.innerHeight * 1.5;

  if (
    document.documentElement.scrollTop > window.innerHeight / 2 &&
    document.documentElement.scrollTop < endScreenOnScroll &&
    !mobileStickyBar.classList.contains('js-hidden')
  ) {
    mobileStickyBar.classList.add('active');
  } else {
    mobileStickyBar.classList.remove('active');
  }
}

function hideBarWhenOverSections() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          mobileStickyBar.classList.add('js-hidden'); // Add a class to hide the bar
        } else {
          mobileStickyBar.classList.remove('js-hidden'); // Remove the class when not overlapping
        }
      });
    },
    {
      root: null, // Use the viewport as the container
      threshold: 0, // Trigger when 10% of the section is visible
    },
  );

  sectionsToHide.forEach((section) => observer.observe(section));
}

window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    requestAnimationFrame(() => {
      showmobileStickyBar();
      scrollTicking = false;
    });
    scrollTicking = true;
  }
});

window.addEventListener('load', () => {
  updateCachedValues();
  updateMobileStickyBarHeight();
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
