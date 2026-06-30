'use strict';
(function () {
  if (!customElements.get('featured-collection')) {
    class FeaturedCollection extends HTMLElement {
      constructor() {
        super();
        this.swiper = null;
        this.slider = this.querySelector('.swiper');
        this.nextBtns = this.querySelectorAll('.swiper-button-next');
        this.prevBtns = this.querySelectorAll('.swiper-button-prev');
        this.slidesPerView = this.dataset.slidesPerView;
        this.allSlides = +this.dataset.allSlides;

        const { spaceBetween, spaceBetweenTb, spaceBetweenPc } = this.dataset;
        const slidesPerView = this.allSlides < this.slidesPerView ? this.allSlides : this.slidesPerView;
        const slidesPerViewTb = this.allSlides < 2.5 ? this.allSlides : 2.5;

        this.swiperParams = {
          slidesPerView: 1,
          spaceBetween,
          scrollbar: true,
          scrollbar: {
            el: '.swiper-scrollbar',
          },
          breakpoints: {
            640: {
              slidesPerView: slidesPerViewTb,
              spaceBetween: spaceBetweenTb,
            },
            1024: {
              slidesPerView,
              spaceBetween: spaceBetweenPc,
            },
          },
        };
      }

      connectedCallback() {
        if (this.slider) {
          this._observer = new IntersectionObserver(
            (entries) => {
              if (entries[0].isIntersecting) {
                this._observer.disconnect();
                this._observer = null;
                this.initSwiper();
                this.setupExternalNavigation();
              }
            },
            { rootMargin: '200px' },
          );
          this._observer.observe(this);
        }
      }

      disconnectedCallback() {
        if (this._observer) {
          this._observer.disconnect();
          this._observer = null;
        }
      }

      setupExternalNavigation = () => {
        this.nextBtns.forEach((btn) => {
          btn.addEventListener('click', () => {
            this.swiper.slideNext();
          });
        });
        this.prevBtns.forEach((btn) => {
          btn.addEventListener('click', () => {
            this.swiper.slidePrev();
          });
        });
      };
    }

    FeaturedCollection.prototype.initSwiper = function () {
      this.swiper = new Swiper(this.slider, this.swiperParams);

      this.updateNavigationButtons();

      this.swiper.on('init', this.updateNavigationButtons.bind(this));
      this.swiper.on('slideChange', this.updateNavigationButtons.bind(this));
      this.swiper.init();
    };

    FeaturedCollection.prototype.toggleButtonState = function (button, shouldDisable) {
      if (shouldDisable) {
        button.classList.add('disabled');
        button.setAttribute('aria-disabled', 'true');
      } else {
        button.classList.remove('disabled');
        button.removeAttribute('aria-disabled');
      }
    };

    FeaturedCollection.prototype.updateNavigationButtons = function () {
      const { isBeginning, isEnd } = this.swiper;
      this.prevBtns.forEach((btn) => {
        this.toggleButtonState(btn, isBeginning);
      });

      this.nextBtns.forEach((btn) => {
        this.toggleButtonState(btn, isEnd);
      });
    };

    customElements.define('featured-collection', FeaturedCollection);
  }
})();
