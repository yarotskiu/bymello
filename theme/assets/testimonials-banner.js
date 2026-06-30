'use strict';

(function () {
  if (!customElements.get('testimonials-banner')) {
    class TestimonialsBanner extends HTMLElement {
      constructor() {
        super();
        this.swiper = null;
      }

      connectedCallback() {
        this._observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              this._observer.disconnect();
              this._observer = null;
              this.initSwiper();
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

      initSwiper = () => {
        this.slider = this.querySelector('.swiper');
        if (!this.slider) return;

        let { autoplay, speed, changeSpeed } = this.dataset;

        const swiperParams = {
          speed,
          slidesPerView: 1,
          scrollbar: true,
          spaceBetween: 20,
          effect: 'fade',
          breakpoints: {
            1024: {
              spaceBetween: 30,
            },
          },
          navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          },
        };

        if (autoplay == 'true') {
          swiperParams.autoplay = {
            delay: changeSpeed,
          };
        }

        this.swiper = new Swiper(this.slider, {
          ...swiperParams,
        });
      };
    }

    customElements.define('testimonials-banner', TestimonialsBanner);
  }
})();
