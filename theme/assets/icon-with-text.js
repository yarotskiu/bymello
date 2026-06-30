'use strict';

(function () {
  if (!customElements.get('icon-with-text')) {
    class IconWithText extends HTMLElement {
      constructor() {
        super();
        this.swiper = null;
        this.slider = this.querySelector('.swiper');
        this.pagination = this.querySelector('.swiper-pagination');
        this.handleResize = this.debounce(this.handleResize.bind(this), 200);
      }

      connectedCallback() {
        this._observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              this._observer.disconnect();
              this._observer = null;
              this.initSwiper();
              window.addEventListener('resize', this.handleResize);
            }
          },
          { rootMargin: '200px' },
        );
        this._observer.observe(this);
      }

      disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize);
        this.destroySwiper();
      }

      initSwiper() {
        if (!this.slider || window.innerWidth >= 990 || this.swiper) return;

        let {
          autoplay = 'false',
          speed = '300',
          changeSpeed = '3000',
          spaceBetween = '0',
          enableSwiperMb = 'true',
          slidesPerView = '1',
          slidesPerViewLg,
          slidesLength,
        } = this.dataset;

        if (enableSwiperMb === 'false') return;

        slidesPerView = slidesLength < +slidesPerView ? slidesLength : +slidesPerView;
        let slidesPerViewMd = (slidesPerView + +slidesPerViewLg) / 2;
        slidesPerViewMd = slidesLength < slidesPerViewMd ? slidesPerView : slidesPerViewMd;

        const swiperParams = {
          speed,
          slidesPerView,
          spaceBetween,
          breakpoints: {
            750: {
              slidesPerView: slidesPerViewMd,
            },
          },
        };

        if (autoplay === 'true') {
          swiperParams.autoplay = { delay: parseInt(changeSpeed, 10) };
        }

        if (this.pagination) {
          swiperParams.pagination = {
            el: this.pagination,
            clickable: true,
          };
        }

        this.swiper = new Swiper(this.slider, swiperParams);
      }

      destroySwiper() {
        if (this.swiper) {
          this.swiper.destroy(true, true);
          this.swiper = null;
        }
      }

      handleResize() {
        if (window.innerWidth < 990) {
          this.initSwiper();
        } else {
          this.destroySwiper();
        }
      }

      debounce(func, wait) {
        let timeout;
        return function (...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      }
    }

    customElements.define('icon-with-text', IconWithText);
  }
})();
