'use strict';
(function () {

  if (!customElements.get('showcase-scroller')) {
    class ShowcaseScroller extends HTMLElement {
      constructor() {
        super();
        this.onScroll = this.onScroll.bind(this);
				this.onResize = this.onResize.bind(this);
        this.container = this.querySelector('.showcase-scroller__inner');
        this.observer = null;
        this.isInView = false;
				this.elementHeight = 0;			
      }

      connectedCallback() {
				this.elementHeight = this.getBoundingClientRect().height;			
        this.initializeIntersectionObserver();
        window.addEventListener('scroll', this.onScroll, { passive: true });
      }

      disconnectedCallback() {
				this.cleanup();
      }

			onScroll(e) {
				if (!this.isInView) return; 
				this.elementHeight = this.getBoundingClientRect().height;
        const rect = this.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const scrolledThroughViewport = Math.min(Math.max(0, viewportHeight - rect.top), this.elementHeight + viewportHeight);
        const translateX = ((scrolledThroughViewport / this.elementHeight) * 100).toFixed(1); 

				requestAnimationFrame(() => {
					this.style.setProperty('--translate-x', `-${translateX}px`);
				});			
			}

			onResize() {
        this.elementHeight = this.getBoundingClientRect().height;
      }

			initializeIntersectionObserver() {
        const options = {
          root: null, // Use the viewport as the root
          rootMargin: '0px',
          threshold: [0] // Trigger when any part of the element is visible
        };

        this.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
						this.isInView = entry.isIntersecting;
          });
        }, options);
				this.observer.observe(this)
			}

			cleanup() {
				if (this.observer) {
					this.observer.disconnect();
				}
				window.removeEventListener('scroll', this.onScroll);
				window.removeEventListener('resize', this.onResize);
			}		
    }

    customElements.define('showcase-scroller', ShowcaseScroller);
  }

})();
