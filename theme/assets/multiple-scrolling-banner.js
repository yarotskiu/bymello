'use strict';

(function () {
  if (!customElements.get('scrolling-banner')) {
    class ScrollingBanner extends HTMLElement {
      constructor() {
        super();
        this.onScroll = this.onScroll.bind(this);
				this.onResize = this.onResize.bind(this); 
        this.container = this.querySelector('.multiple-scrolling-banner__image-wrapper');
        this.observer = null;
        this.isInView = false;
        this.elementHeight = 0;
        this.maxTranslate = 0;
      }

      connectedCallback() {
        this.elementHeight = this.getBoundingClientRect().height;
        this.initializeIntersectionObserver();
        window.addEventListener('scroll', this.onScroll, { passive: true });
				this.onScroll();
      }

      disconnectedCallback() {
        this.cleanup();
      }

      onScroll(e) {
        if (!this.isInView || !this.container) return;

        this.maxTranslate = this.container.getBoundingClientRect().height * 0.25;
        const rect = this.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const elementMidPoint = rect.top + this.elementHeight / 2;
        const positionPercentage = (elementMidPoint - viewportHeight / 2) / (viewportHeight / 2);
        let translateY = positionPercentage * this.maxTranslate;

        translateY = Math.max(-this.maxTranslate, Math.min(this.maxTranslate, translateY)).toFixed(1);

        requestAnimationFrame(() => {
          this.container.style.setProperty('--translate-y', `${translateY}px`);
        });
      }

      onResize() {
        this.elementHeight = this.getBoundingClientRect().height;
        this.maxTranslate = this.container.getBoundingClientRect().height * 0.25;
        this.onScroll(); // Call scroll to update immediately after resizing
      }

      initializeIntersectionObserver() {
        const options = {
          root: null,
          rootMargin: '0px',
          threshold: [0]
        };

        this.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            this.isInView = entry.isIntersecting;
          });
        }, options);
        this.observer.observe(this);
      }

      cleanup() {
        if (this.observer) {
          this.observer.disconnect();
        }
        window.removeEventListener('scroll', this.onScroll);
				window.removeEventListener('resize', this.onResize); 			
      }
    }

    customElements.define('scrolling-banner', ScrollingBanner);
  }
})();