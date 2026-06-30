'use strict';

(function () {
  if (!customElements.get('announcement-bar')) {
    class AnnouncementBar extends HTMLElement {
      constructor() {
        super();
        this.swiper = null;
        this.nextBtn = this.querySelector('.swiper-button-next');
        this.prevBtn = this.querySelector('.swiper-button-prev');
				this.slider = this.querySelector('.swiper');
      }

      connectedCallback() {
        this.initSwiper();
        this.setupExternalNavigation();
      }
    }

    AnnouncementBar.prototype.initSwiper = function () {
			if (!this.slider) return;

			const { speed, changeSpeed, slidesPerView, rotate } = this.slider.dataset;
			
			// Hide navigation arrows if only one slide
			const slides = this.slider.querySelectorAll('.swiper-slide');
			if (slides.length <= 1) {
				if (this.nextBtn) this.nextBtn.style.display = 'none';
				if (this.prevBtn) this.prevBtn.style.display = 'none';
			}

			const swiperOptions = {
				loop: true, 
				slidesPerView: 1, 
				spaceBetween: 20, 
				grabCursor: true, 
				longSwipesRatio: 0.3, 
				effect: 'fade',
				fadeEffect: {
					crossFade: true, 
				},			
				speed,
				breakpoints: {
					750: {
						slidesPerView: slidesPerView == 1 ? slidesPerView : 2,
					},
					1025: {
						slidesPerView,
						spaceBetween: 30
					}, 
				}
			}

			if (rotate == 'true') {
				swiperOptions.autoplay = {
					delay: changeSpeed
				};
			}

			this.swiper = new Swiper(this.slider, swiperOptions);
    };

		AnnouncementBar.prototype.setupExternalNavigation = function () {
				if (!this.nextBtn ||!this.prevBtn) return;

        this.nextBtn.addEventListener('click', () => {
          this.swiper.slideNext();
        });
        this.prevBtn.addEventListener('click', () => {
          this.swiper.slidePrev();
        });
      };

    customElements.define('announcement-bar', AnnouncementBar);
  }
})();
