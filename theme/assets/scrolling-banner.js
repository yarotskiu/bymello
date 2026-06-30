'use strict';
(function () {
  if (!customElements.get('marquee-text')) {
    class MarqueeText extends HTMLElement {
      constructor() {
        super();
        this.scrollingTextTimeline = null;
        this.pauseInterval = null;
        this.isHovered = false;
        this.pauseDuration = parseInt(this.getAttribute('pause-duration')) || 2000;
        this.scrollSpeed = this.getScrollSpeed();
        this.availableColors = [];
        this.previousColorIndex = -1;
        this.applyRandomColors.bind(this);
      }

      getScrollSpeed() {
        const speed = this.getAttribute('data-speed') || 'fast';
        const speedMap = {
          slow: 50,
          normal: 100,
          fast: 200,
          'very-fast': 400,
          'ultra-fast': 700,
        };
        return speedMap[speed] || 200;
      }

      connectedCallback() {
        this.loadAvailableColors();
        this.addEventListener('mouseenter', this.applyRandomColors);
        this._deferInit();
      }

      _deferInit() {
        if ('IntersectionObserver' in window) {
          this._observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  this._observer.unobserve(this);
                  this._observer = null;
                  this.init();
                }
              });
            },
            { rootMargin: '200px' },
          );
          this._observer.observe(this);
        } else {
          this.init();
        }
      }

      disconnectedCallback() {
        this.removeEventListener('mouseenter', this.applyRandomColors);
        if (this._observer) {
          this._observer.unobserve(this);
          this._observer = null;
        }
        if (this.scrollingTextTimeline) this.scrollingTextTimeline.kill();
        if (this.pauseInterval) clearInterval(this.pauseInterval);
      }

      loadAvailableColors() {
        const maxPairs = 4; // Maximum number of hover color pairs (bg_hover_1 to bg_hover_4)

        for (let i = 1; i <= maxPairs; i++) {
          const bgColor = this.getAttribute(`data-bg-${i}`);
          const textColor = this.getAttribute(`data-text-${i}`);

          if (bgColor && textColor) {
            this.availableColors.push({ bg: `${bgColor}`, text: `${textColor}` });
          }
        }
      }

      applyRandomColors() {
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * this.availableColors.length);
        } while (randomIndex === this.previousColorIndex && this.availableColors.length > 1);

        this.previousColorIndex = randomIndex;
        if (this.availableColors.length > 0) {
          const { bg, text } = this.availableColors[randomIndex];
          this.parentElement.style.setProperty('--color-background-h', bg);
          this.parentElement.style.setProperty('--color-foreground-h', text);
        }
      }

      init() {
        if (!gsap) {
          console.error('GSAP must be loaded to use this component.');
          return;
        }

        gsap.registerPlugin(ScrollTrigger);

        // Ensure we have a valid container
        let container = this.querySelector('.rolling-text-container');
        if (!container) {
          container = this; // Fallback to 'this' if no dedicated container exists
        }

        const originalItems = gsap.utils.toArray(container.querySelectorAll('.rolling-text-item'));
        if (!originalItems.length) {
          console.warn('No items found for animation.');
          return;
        }

        // Duplicate items for a seamless loop
        originalItems.forEach((item) => {
          const clone = item.cloneNode(true);
          // container.appendChild(clone);
        });

        const allItems = gsap.utils.toArray(container.querySelectorAll('.rolling-text-item'));
        this.scrollingTextTimeline = this.createHorizontalLoop(allItems);
        this.setupPauseInterval();
        this.setupHoverEvents();
      }

      createHorizontalLoop(items) {
        const tl = gsap.timeline({ repeat: -1, paused: false, defaults: { ease: 'none' } });

        const totalWidth = items.reduce((sum, item) => sum + item.offsetWidth, 0);
        const duration = totalWidth / this.scrollSpeed;

        tl.fromTo(
          items,
          { xPercent: 0 },
          {
            xPercent: -100,
            duration,
            ease: 'linear',
            modifiers: {
              xPercent: gsap.utils.wrap(-100, 0), // Ensures seamless looping
            },
          },
        );

        return tl;
      }

      setupPauseInterval() {
        this.pauseInterval = setInterval(() => {
          if (!this.isHovered && this.scrollingTextTimeline) {
            gsap.to(this.scrollingTextTimeline, { timeScale: 0, duration: 1 }); // Smooth stop
            setTimeout(() => {
              gsap.to(this.scrollingTextTimeline, { timeScale: 1, duration: 1 }); // Resume
            }, this.pauseDuration);
          }
        }, 7000);
      }

      setupHoverEvents() {
        if (!this.parentElement) {
          console.warn('No parent element found for hover events.');
          return;
        }

        this.parentElement.addEventListener('mouseenter', () => {
          this.isHovered = true;
          gsap.to(this.scrollingTextTimeline, { timeScale: 0, duration: 1 });
        });

        this.parentElement.addEventListener('mouseleave', () => {
          this.isHovered = false;
          gsap.to(this.scrollingTextTimeline, { timeScale: 1, duration: 1 });
        });
      }
    }

    customElements.define('marquee-text', MarqueeText);
  }
})();
