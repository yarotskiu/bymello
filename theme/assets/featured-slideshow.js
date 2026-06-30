'use strict';
(function () {
  if (!customElements.get('featured-slideshow')) {
    class FeaturedSlideshow extends HTMLElement {
      constructor() {
        super();
        this.swiper = null;
        this.slider = this.querySelector('.swiper');
        let { slidesPerView, spaceBetween, spaceBetweenPc } = this.dataset;
        this.slides = this.querySelectorAll('.swiper-slide');
        slidesPerView = this.slides.length < slidesPerView ? this.slides.length : slidesPerView;
        const slidesPerViewMb = this.slides.length < 1.2 ? this.slides.length : 1.2;
        const slidesPerViewTb = this.slides.length < 2.2 ? this.slides.length : 2.2;

        this.swiperParams = {
          slidesPerView: slidesPerViewMb,
          grabCursor: true,
          spaceBetween,
          breakpoints: {
            640: {
              slidesPerView: slidesPerViewTb,
              spaceBetween,
            },
            1200: {
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
    }

    FeaturedSlideshow.prototype.initSwiper = function () {
      this.swiper = new Swiper(this.slider, this.swiperParams);
    };

    customElements.define('featured-slideshow', FeaturedSlideshow);
  }
})();
