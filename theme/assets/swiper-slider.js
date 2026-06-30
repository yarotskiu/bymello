'use strict';

(function () {
  if (!customElements.get('swiper-slider')) {
    const BREAKPOINTS = {
      sm: 750,
      lg: 1024,
    };

    class SwiperSlider extends HTMLElement {
      constructor() {
        super();
        this.swiper = null;
      }

      connectedCallback() {
        this.nextBtn = this.querySelector('.swiper-button-next');
        this.prevBtn = this.querySelector('.swiper-button-prev');
        this.scrollbar = this.querySelector('.swiper-scrollbar');

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
                  this.initSwiper();
                  this.updateNavigationButtons();
                }
              });
            },
            { rootMargin: '200px' },
          );
          this._observer.observe(this);
        } else {
          this.initSwiper();
          this.updateNavigationButtons();
        }
      }

      disconnectedCallback() {
        if (this._observer) {
          this._observer.unobserve(this);
          this._observer = null;
        }
        if (this.swiper) {
          this.swiper.destroy(true, true);
          this.swiper = null;
        }
      }

      initSwiper = () => {
        const slides = this.querySelectorAll('.swiper-slide');
        const slidesLength = slides.length;

        let { slidesPerView = 1, slidesPerViewSm, slidesPerViewLg, effect } = this.dataset;
        if (!slidesPerViewSm) slidesPerViewSm = slidesPerView;
        if (!slidesPerViewLg) slidesPerViewLg = slidesPerView;

        slidesPerView = slidesLength < +slidesPerView ? slidesLength : +slidesPerView;
        slidesPerViewSm = slidesLength < +slidesPerViewSm ? slidesLength : +slidesPerViewSm;
        slidesPerViewLg = slidesLength < +slidesPerViewLg ? slidesLength : +slidesPerViewLg;
        effect = effect || 'slide';

        let scrollbar = false;

        if (this.scrollbar) {
          scrollbar = {
            el: '.swiper-scrollbar',
            draggable: true,
          };
        }

        let navigation = false;

        if (this.nextBtn && this.prevBtn) {
          navigation = {
            nextEl: this.nextBtn,
            prevEl: this.prevBtn,
          };
        }

        const swiperParams = {
          slidesPerView,
          scrollbar,
          navigation,
          effect,
          spaceBetween: 20,
          breakpoints: {
            [BREAKPOINTS.sm]: {
              slidesPerView: slidesPerViewSm,
              spaceBetween: 20,
            },
            [BREAKPOINTS.lg]: {
              slidesPerView: slidesPerViewLg,
              spaceBetween: 30,
            },
          },
          on: {
            slideChange: this.updateNavigationButtons,
            init: this.updateNavigationButtons,
          },
        };

        if (effect === 'fade') {
          swiperParams.fadeEffect = { crossFade: true };
        }

        this.swiper = new Swiper(this, swiperParams);
      };

      updateNavigationButtons = () => {
        if (this.swiper) {
          if (this.swiper.isBeginning) {
            this.prevBtn?.classList.add('disabled');
          } else {
            this.prevBtn?.classList.remove('disabled');
          }

          if (this.swiper.isEnd) {
            this.nextBtn?.classList.add('disabled');
          } else {
            this.nextBtn?.classList.remove('disabled');
          }
        }
      };
    }

    customElements.define('swiper-slider', SwiperSlider);
  }
})();
