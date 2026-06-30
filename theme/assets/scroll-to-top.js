const scrollToTopWrp = document.querySelector('.scroll-to-top');
const scrollToTopBtn = scrollToTopWrp?.querySelector('.scrollToTop');

// Global variable to track animation timeout
let scrollAnimation = null;
let wheelHandler = null;

function showScrollToTop() {
  if (document.body.scrollTop > (window.innerHeight / 2) || document.documentElement.scrollTop > (window.innerHeight / 2)) {
    scrollToTopWrp?.classList.add('active');
  } else {
    scrollToTopWrp?.classList.remove('active');
  }
}

// Bound function for easy removal
const scrollHandler = () => {
  showScrollToTop();
};

if (scrollToTopWrp) {
  window.addEventListener('scroll', scrollHandler);
}

function scrollToTop() {
  let position = document.body.scrollTop || document.documentElement.scrollTop;

  // Clear any existing animation
  if (scrollAnimation) {
    clearTimeout(scrollAnimation);
    scrollAnimation = null;
  }

  // Remove existing wheel handler
  if (wheelHandler) {
    window.removeEventListener('wheel', wheelHandler);
    wheelHandler = null;
  }

  if (position) {
    window.scrollBy(0, -Math.max(1, Math.floor(position / 10)));
    scrollAnimation = setTimeout(scrollToTop, 30);
    
    // Create new wheel handler
    wheelHandler = () => {
      if (scrollAnimation) {
        clearTimeout(scrollAnimation);
        scrollAnimation = null;
      }
      window.removeEventListener('wheel', wheelHandler);
      wheelHandler = null;
    };
    
    window.addEventListener('wheel', wheelHandler);
  } else {
    if (scrollAnimation) {
      clearTimeout(scrollAnimation);
      scrollAnimation = null;
    }
    if (wheelHandler) {
      window.removeEventListener('wheel', wheelHandler);
      wheelHandler = null;
    }
  }
}

if (scrollToTopBtn) {
  scrollToTopBtn.addEventListener('click', () => {
    scrollToTop();
  });
}

// Cleanup function for potential use
window.cleanupScrollToTop = function() {
  if (scrollAnimation) {
    clearTimeout(scrollAnimation);
    scrollAnimation = null;
  }
  if (wheelHandler) {
    window.removeEventListener('wheel', wheelHandler);
    wheelHandler = null;
  }
  window.removeEventListener('scroll', scrollHandler);
};