'use strict';

(function () {
  if (!customElements.get('multi-scroll-gallery')) {
    class MultiScrollGallery extends HTMLElement {
      constructor() {
        super();
        this.activeItem = 0;
        this.selectors = {
          horizontalSection: '.multi-scroll-gallery__horizontal-section',
          stickyWrapper: '.multi-scroll-gallery__sticky-wrapper',
          imgWrapper: '.multi-scroll-gallery__right',
          contentWrapper: '.multi-scroll-gallery__left',
          item: '.multi-scroll-gallery__item',
          imageWrapper: '.multi-scroll-gallery__right .multi-scroll-gallery__image-wrapper',
        };

        this.horizontalSection = this.querySelector(this.selectors.horizontalSection);
        this.stickyWrapper = this.querySelector(this.selectors.stickyWrapper);
        this.imgWrapper = this.querySelector(this.selectors.imgWrapper);
        this.contentWrapper = this.querySelector(this.selectors.contentWrapper);
        this.contentItems = this.querySelectorAll(this.selectors.item);
        this.images = this.querySelectorAll(this.selectors.imageWrapper);

        this.onScroll = this.onScroll.bind(this);
        this.initScroll = this.initScroll.bind(this);
        this.centerStickyWrapper = this.centerStickyWrapper.bind(this);
        this.delayedInit = this.delayedInit.bind(this);
      }

      connectedCallback() {
        if (this.contentItems.length < 2) return;

        // Ensure images are loaded before initializing layout
        if (this.images.length > 0) {
          const firstImage = this.images[0].querySelector('img');
          if (firstImage && !firstImage.complete) {
            firstImage.onload = this.initScroll;
          } else {
            this.initScroll();
          }
        } else {
          this.initScroll();
        }

        window.addEventListener('resize', this.delayedInit);
        window.addEventListener('scroll', this.onScroll, { passive: true });
      }

      disconnectedCallback() {
        window.removeEventListener('resize', this.delayedInit);
        window.removeEventListener('scroll', this.onScroll);
      }

      delayedInit() {
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(this.initScroll, 100);
      }

      centerStickyWrapper(height) {
        const availableHeight = Math.max(window.innerHeight - height, 0);
        const topOffset = Math.max(availableHeight / 2, 0);
        this.stickyWrapper.style.top = `${topOffset}px`;
        return topOffset;
      }

      initScroll() {
        if (!this.images.length) return;

        // Reset styles first to allow natural resize
        this.horizontalSection.style.height = '';
        this.imgWrapper.style.maxHeight = '';
        this.contentWrapper.style.maxHeight = '';
        this.stickyWrapper.style.maxHeight = '';

        this.imageHeight = this.images[0].offsetHeight;
        // Fallback or retry if height is 0 (image not rendered yet)
        if (this.imageHeight === 0 && this.images[0].clientHeight === 0) {
          requestAnimationFrame(this.initScroll);
          return;
        }

        this.topOffset = this.centerStickyWrapper(this.imageHeight);
        this.scrollDistance = this.imageHeight * this.images.length;

        // Use getBoundingClientRect for absolute position relative to document
        const rect = this.horizontalSection.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        this.sectionOffsetTop = rect.top + scrollTop;

        // Cache these for scroll performance
        this.imageOffsets = Array.from(this.images).map((image) => image.offsetTop);

        if (window.innerWidth >= 1200) {
          // Total height needed for scroll interaction
          this.horizontalSection.style.height = `${this.scrollDistance + this.topOffset}px`;
          this.imgWrapper.style.maxHeight = `${this.imageHeight}px`;
          this.contentWrapper.style.maxHeight = `${this.imageHeight}px`;
          this.stickyWrapper.style.maxHeight = `${this.imageHeight}px`;
        } else {
          this.horizontalSection.style.height = 'auto';
          this.imgWrapper.style.maxHeight = '100%';
          this.contentWrapper.style.maxHeight = '100%';
          this.stickyWrapper.style.maxHeight = '100%';
          this.imgWrapper.style.transform = 'translateY(0)';
          this.stickyWrapper.style.top = '0'; // Reset top specifically for mobile
        }

        // Trigger one scroll event to set initial state
        this.onScroll();
      }

      onScroll() {
        if (window.innerWidth < 1200) return;

        requestAnimationFrame(() => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

          // Calculate scroll position relative to when the section becomes sticky
          // stickyWrapper has 'top: topOffset', so it sticks when scrollTop >= sectionOffsetTop - topOffset.
          const startPoint = this.sectionOffsetTop - this.topOffset;
          const scrollPosition = Math.max(0, Math.min(scrollTop - startPoint, this.scrollDistance - this.imageHeight));

          this.imgWrapper.style.transform = `translateY(-${scrollPosition}px)`;

          // Optimize active item detection
          let newActiveIndex = this.activeItem;

          for (let i = 0; i < this.imageOffsets.length; i++) {
            const offset = this.imageOffsets[i];
            // Allow some buffer for active state change
            if (offset <= scrollPosition + this.imageHeight / 2 && scrollPosition < offset + this.imageHeight) {
              newActiveIndex = i;
            }
          }

          if (this.activeItem !== newActiveIndex || !this.hasInitializedClasses) {
            this.activeItem = newActiveIndex;
            this.hasInitializedClasses = true;
            this.updateActiveClasses();
          }
        });
      }

      updateActiveClasses() {
        this.contentItems.forEach((item, index) => {
          item.classList.remove('active', 'prev-item');
          if (index === this.activeItem) {
            item.classList.add('active');
          }
          if (index === this.activeItem - 1 && index >= 0) {
            item.classList.add('prev-item');
          }
        });
      }
    }

    customElements.define('multi-scroll-gallery', MultiScrollGallery);
  }
})();
