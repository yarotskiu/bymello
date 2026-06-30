'use strict';

(function () {
  if (!customElements.get('featured-blog')) {
    class FeaturedBlog extends HTMLElement {
      constructor() {
        super();
        this.swiper = null;
        this.slider = this.querySelector('.swiper');
        this.handleResize = debounce(this.handleResize.bind(this), 200);
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

      initSwiper = () => {
        if (!this.slider || window.innerWidth >= 990 || this.swiper) return;
        if (!this.slider) return;

        let {
          slidesLength,
          spaceBetween = 16,
          spaceBetweenMd = 16,
          slidesPerView = 1.1,
          slidesPerViewLg,
        } = this.dataset;

        slidesLength = +slidesLength;

        slidesPerView = slidesLength < +slidesPerView ? +slidesLength : +slidesPerView;
        slidesPerViewLg = +slidesPerViewLg;

        let slidesPerViewMd = (slidesPerView + slidesPerViewLg) / 2;
        slidesPerViewMd = slidesLength < slidesPerViewMd ? slidesLength : slidesPerViewMd;

        const swiperParams = {
          speed: 300,
          slidesPerView,
          spaceBetween,
          scrollbar: {
            el: '.swiper-scrollbar',
            draggable: true,
          },
          breakpoints: {
            750: {
              slidesPerView: slidesPerViewMd,
              spaceBetween: spaceBetweenMd,
            },
          },
        };

        this.swiper = new Swiper(this.slider, {
          ...swiperParams,
        });
      };

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
    }

    customElements.define('featured-blog', FeaturedBlog);
  }
})();
