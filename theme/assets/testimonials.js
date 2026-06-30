'use strict';

(function () {
  if (!customElements.get('testimonials-section')) {
    class TestimonialsSection extends HTMLElement {
      constructor() {
        super();
        this.swiper = null;
        this.nextBtn = null;
        this.prevBtn = null;
      }

      connectedCallback() {
        // Prefer side buttons (one-slide-per-page), fallback to header navigation
        this.nextBtn = this.querySelector('.one-slide-per-page.swiper-button-next') || this.querySelector('.title-wrapper .swiper-button-next');
        this.prevBtn = this.querySelector('.one-slide-per-page.swiper-button-prev') || this.querySelector('.title-wrapper .swiper-button-prev');

        this.initSwiper();
        this.setupExternalNavigation();
        this.updateNavigationButtons();
      }

      setupExternalNavigation = () => {
        if (!this.nextBtn || !this.prevBtn) return;
        this.nextBtn.addEventListener('click', () => {
          this.swiper?.slideNext();
          this.updateNavigationButtons();
        });
        this.prevBtn.addEventListener('click', () => {
          this.swiper?.slidePrev();
          this.updateNavigationButtons();
        });
      };

      updateNavigationButtons = () => {
        if (!this.swiper || !this.nextBtn || !this.prevBtn) return;
        if (this.swiper.isBeginning && !this.swiper.isEnd) {
          this.nextBtn.classList.remove('disabled');
          this.prevBtn.classList.add('disabled');
        } else if (this.swiper.isEnd && !this.swiper.isBeginning) {
          this.prevBtn.classList.remove('disabled');
          this.nextBtn.classList.add('disabled');
        } else if (this.swiper.isEnd && this.swiper.isBeginning) {
          this.prevBtn.classList.add('disabled');
          this.nextBtn.classList.add('disabled');
        } else {
          this.prevBtn.classList.remove('disabled');
          this.nextBtn.classList.remove('disabled');
        }
      };

      initSwiper = () => {
        this.slider = this.querySelector('.swiper');
        if(!this.slider) return;

        let { autoplay, speed, changeSpeed, spaceBetween = 16, spaceBetweenPc = 16} = this.dataset;
        const speedNum = Number(speed);
        const slideSpeed = Number.isFinite(speedNum) && speedNum > 0 ? speedNum : 400;
        const spaceMb = Number(spaceBetween) || 16;
        const spacePc = Number(spaceBetweenPc) || 16;

        // External nav in the title wrapper
        const nextEl = this.querySelector('.title-wrapper .swiper-button-next');
        const prevEl = this.querySelector('.title-wrapper .swiper-button-prev');

        const swiperParams = {
          speed: slideSpeed,
          slidesPerView: 'auto',
          scrollbar: true,
          spaceBetween: spaceMb,
          scrollbar: {
            el: '.swiper-scrollbar',
          },
          navigation: nextEl && prevEl ? { nextEl, prevEl } : undefined,
          breakpoints: {
            750: {
              spaceBetween: spacePc,
            },
          },
        }

        if (autoplay == 'true') {
          swiperParams.autoplay = {
            delay: Number(changeSpeed) || 4000
          };
        }

        this.swiper = new Swiper(this.slider, {
          ...swiperParams,
          on: {
            slideChange: this.updateNavigationButtons,
            init: this.updateNavigationButtons,
            autoplay: () => {
              this.updateNavigationButtons();
            }
          },
        });
      };
    }

    TestimonialsSection.prototype.swiperParams = {
    };

    customElements.define('testimonials-section', TestimonialsSection);
  }
})();
