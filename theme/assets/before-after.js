'use strict';

(function () {
  if (!customElements.get('image-comparison')) {
    class ImageComparison extends HTMLElement {
      constructor() {
        super();
        this.slider = this.querySelector('.image-comparison__range');
        this.beforeImage = this.querySelector('.image-comparison__slider-wrapper .image--before');
        this.afterImage = this.querySelector('.image-comparison__slider-wrapper .image--after');
      }

      connectedCallback() {
        this._observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              this._observer.disconnect();
              this._observer = null;
              this.init();
            }
          },
          { rootMargin: '200px' },
        );
        this._observer.observe(this);
      }

      disconnectedCallback() {
        if (this._observer) {
          this._observer.disconnect();
          this._observer = null;
        }
      }

      init() {
        this.slider.addEventListener('input', () => {
          this.moveSlider();
          this.trackSliderMovement();
        });

        this.moveSlider();
        this.trackSliderMovement();
      }

      moveSlider() {
        const value = this.slider.value;
        this.beforeImage.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
        this.afterImage.style.clipPath = `inset(0 0 0 ${value}%)`;

        const percent = ((value - this.slider.min) / (this.slider.max - this.slider.min)) * 100;
        const sliderElement = this.querySelector('.image-comparison__slider');
        sliderElement.style.setProperty('--percent', `${percent}%`);
      }

      trackSliderMovement() {
        this.classList.add('js-active');

        const value = this.slider.value;
        const isNarrowScreen = window.innerWidth < 990;

        if (isNarrowScreen && value >= 50) {
          this.classList.add('slider-high-value');
        } else {
          this.classList.remove('slider-high-value');
        }

        clearTimeout(this.activeTimeout);
        this.activeTimeout = setTimeout(() => {
          this.classList.remove('js-active');
        }, 500);
      }
    }

    customElements.define('image-comparison', ImageComparison);
  }
})();
