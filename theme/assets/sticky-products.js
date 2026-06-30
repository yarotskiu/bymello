'use strict';

(function () {
  if (!customElements.get('sticky-products')) {
    class StickyProducts extends HTMLElement {
      constructor() {
        super();
        this.swiper = null;
        this.slider = this.querySelector('.swiper:not(.card-product__slider)');
        this.items = this.querySelectorAll('.sticky-products__right .grid-main__item');
        this._onResize = () => this.initSwiper();
      }

      connectedCallback() {
        if (!this.slider) return;

        this._initWhenReady();
        window.addEventListener('resize', this._onResize);
        window.addEventListener('orientationchange', this._onResize);
      }

      disconnectedCallback() {
        window.removeEventListener('resize', this._onResize);
        window.removeEventListener('orientationchange', this._onResize);

        if (this.swiper) {
          this.swiper.destroy(true, true);
          this.swiper = null;
        }
      }

      _initWhenReady() {
        if (typeof Swiper === 'undefined') {
          requestAnimationFrame(() => this._initWhenReady());
          return;
        }

        this.initSwiper();
      }

      initSwiper() {
        const windowWidth = window.innerWidth;
        const documentWidth = document.documentElement.clientWidth;
        const minWidth = Math.min(windowWidth, documentWidth);

        if (this.items) {
          this.items.forEach((slide) => {
            slide.classList.add('swiper-slide');
          });
        }

        let { spaceBetween = 16, spaceBetweenPc = 16 } = this.dataset;
        const scrollbarEl = this.slider.querySelector('.swiper-scrollbar');

        if (minWidth <= 989) {
          if (this.swiper) {
            this.swiper.destroy(true, true);
            this.swiper = null;
          }

          const slidesPerView = this.items.length >= 3 ? 2.5 : this.items.length;
          const swiperParams = {
            slidesPerView: 1,
            spaceBetween,
            scrollbar: scrollbarEl
              ? {
                  el: scrollbarEl,
                }
              : false,
            breakpoints: {
              640: {
                slidesPerView,
                spaceBetween: spaceBetweenPc,
              },
            },
          };

          this.swiper = new Swiper(this.slider, swiperParams);
        } else {
          if (this.items) {
            this.items.forEach((slide) => {
              slide.removeAttribute('style');
              slide.classList.remove('swiper-slide');
            });
          }

          if (this.swiper) {
            this.swiper.destroy(true, true);
            this.swiper = null;
          }
        }
      }
    }

    customElements.define('sticky-products', StickyProducts);
  }
})();
