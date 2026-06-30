'use strict';

(function () {
  if (!customElements.get('slideshow-banner-product-slider')) {
    class SlideshowBannerProductSlider extends HTMLElement {
      constructor() {
        super();
        this.swiper = null;
        this.slider = this.querySelector('.swiper');
        this.nextBtns = this.querySelectorAll('.swiper-button-next');
        this.prevBtns = this.querySelectorAll('.swiper-button-prev');
      }

      connectedCallback() {
        if (this.slider) {
          this.setInitialButtonState();
          this.initSwiper();
          this.setupExternalNavigation();
        }
      }

      setInitialButtonState = () => {
        // Initially disable prev button (we start from first slide)
        this.prevBtns.forEach(btn => {
          this.toggleButtonState(btn, true);
        });
        
        // Check if we should disable next button (if only one slide)
        const slides = this.querySelectorAll('.swiper-slide');
        if (slides.length <= 1) {
          this.nextBtns.forEach(btn => {
            this.toggleButtonState(btn, true);
          });
        } else {
          this.nextBtns.forEach(btn => {
            this.toggleButtonState(btn, false);
          });
        }
      };

      initSwiper = () => {
        const slides = this.querySelectorAll('.swiper-slide');
        const slidesLength = slides.length;
        
        let { 
          spaceBetween = '16', 
          spaceBetweenPc = '24' 
        } = this.dataset;

        const swiperParams = {
          slidesPerView: 1,
          spaceBetween: +spaceBetween,
          grabCursor: true,
          watchOverflow: true,
          centeredSlides: false,
          slidesPerGroup: 1,
          loopedSlides: 1,
          width: null,
          breakpoints: {
            640: {
              slidesPerView: 1,
              spaceBetween: +spaceBetweenPc,
              slidesPerGroup: 1,
            },
            1024: {
              slidesPerView: 1,
              spaceBetween: +spaceBetweenPc,
              slidesPerGroup: 1,
            },
          },
          on: {
            init: this.updateNavigationButtons.bind(this),
            slideChange: this.updateNavigationButtons.bind(this),
          }
        };

        this.swiper = new Swiper(this.slider, swiperParams);
      };

      setupExternalNavigation = () => {
        this.nextBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            this.swiper.slideNext();
          });
        });
        
        this.prevBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            this.swiper.slidePrev();
          });
        });
      };

      toggleButtonState = (button, shouldDisable) => {
        if (shouldDisable) {
          button.classList.add('disabled');
          button.setAttribute('aria-disabled', 'true');
        } else {
          button.classList.remove('disabled');
          button.removeAttribute('aria-disabled');
        }
      };

      updateNavigationButtons = () => {
        if (!this.swiper) return;
        
        const { isBeginning, isEnd } = this.swiper;
        
        this.prevBtns.forEach(btn => {
          this.toggleButtonState(btn, isBeginning);
        });

        this.nextBtns.forEach(btn => {
          this.toggleButtonState(btn, isEnd);
        });
      };
    }

    customElements.define('slideshow-banner-product-slider', SlideshowBannerProductSlider);
  }
})();