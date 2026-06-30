if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
        };
        this.mql = window.matchMedia('(min-width: 750px)');
        if (!this.elements.thumbnails) return;

        this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
        this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => 				{
          mediaToSwitch
            .querySelector('button')
            .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
        });
        if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();
      }

      onSlideChanged(event) {
        const thumbnail = this.elements.thumbnails.querySelector(
          `[data-target="${event.detail.currentElement.dataset.mediaId}"]`
        );
        this.setActiveThumbnail(thumbnail);
      }

      setActiveMedia(mediaId, prepend, changeSLide) {
				if (!this.elements || !this.elements.viewer) {
					// Re-initialize elements if they don't exist
					this.elements = {
						liveRegion: this.querySelector('[id^="GalleryStatus"]'),
						viewer: this.querySelector('[id^="GalleryViewer"]'),
						thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
					};
				}

				const isSlider = this.elements.viewer && this.elements.viewer.classList.contains('swiper-initialized');
				if (isSlider) {
					// Ensure swiper instance exists
					if (!this.elements.viewer.swiper && typeof this.elements.viewer.connectedCallback === 'function') {
						this.elements.viewer.connectedCallback();
						// Wait a bit for swiper to initialize
						setTimeout(() => {
							this.setActiveMedia(mediaId, prepend, changeSLide);
						}, 100);
						return;
					}
					
					const activeSlider = this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`);
					if (activeSlider && this.elements.viewer.swiper) {
						const slideIndex = Array.from(this.elements.viewer.swiper.slides).indexOf(activeSlider);
						if (slideIndex !== -1) {
							this.elements.viewer.swiper.slideTo(slideIndex);
						}
					}

					if (!this.elements.thumbnails) return;
					const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
					this.setActiveThumbnail(activeThumbnail);
				} else {
					const activeMedia = this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`);
					this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
						element.classList.remove('is-active');
					});
					activeMedia.classList.add('is-active');

					if (prepend) {
						activeMedia.parentElement.prepend(activeMedia);
						if (this.elements.thumbnails) {
							const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
							activeThumbnail.parentElement.prepend(activeThumbnail);
						}
						if (this.elements.viewer.slider) this.elements.viewer.resetPages();
					}

					this.preventStickyHeader();
					window.setTimeout(() => {
						activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });

						const activeMediaRect = activeMedia.getBoundingClientRect();
						// Don't scroll if the image is already in view
						if (activeMediaRect.top > -0.5) return;
						const top = activeMediaRect.top + window.scrollY;
						window.scrollTo({ top: top, behavior: 'smooth' });
					});
					this.playActiveMedia(activeMedia);

					if (!this.elements.thumbnails) return;
					const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
					this.setActiveThumbnail(activeThumbnail);
					this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
				}
      }

      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail) return;

        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((element) => element.removeAttribute('aria-current'));
        thumbnail.querySelector('button').setAttribute('aria-current', true);
        if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

        this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
      }

      announceLiveRegion(activeItem, position) {
        const image = activeItem.querySelector('.product__modal-opener--image img');
        if (!image) return;
        image.onload = () => {
          this.elements.liveRegion.setAttribute('aria-hidden', false);
          this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
          setTimeout(() => {
            this.elements.liveRegion.setAttribute('aria-hidden', true);
          }, 2000);
        };
        image.src = image.src;
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);
      }

      preventStickyHeader() {
        this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
        if (!this.stickyHeader) return;
        this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
      }

      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems.forEach((slide) => slide.setAttribute('role', 'presentation'));
      }
    }
  );
}

if (!customElements.get('media-gallery-slider')) {
	class MediaGallerySlider extends HTMLElement {
		constructor() {
			super();
		}

		connectedCallback() {
			this.swiper = null;
			this.thumbnails = this.closest('media-gallery').querySelector('.thumbnail-slider');
			this.mediaGallery = this.closest('media-gallery');
			this.pagination = this.querySelector('.swiper-pagination');
			this.handleResize = debounce(this.swiperInitialization, 200).bind(this);
			this.swiperInitialization = this.swiperInitialization.bind(this);
			this.previousWidth = 0;

			this.swiperInitialization();
			this.handleResize()
			window.addEventListener('resize', this.handleResize);
			window.addEventListener('orientationchange', this.handleResize);
				function initMediaGallerySliders() {
					document.querySelectorAll('media-gallery-slider').forEach((slider) => {
						if (typeof slider.connectedCallback === 'function') {
							slider.connectedCallback();
						}
					});
				}

				document.addEventListener('DOMContentLoaded', initMediaGallerySliders);
				window.addEventListener('load', initMediaGallerySliders);

		}

		disconnectedCallback() {
			window.removeEventListener('resize', this.handleResize);
			window.removeEventListener('orientationchange', this.handleResize);
			// Destroy Swiper instance if exists
			if (this.swiper) {
				this.swiper.destroy(true, true);
				this.swiper = null;
			}
		}


		initSwiper() {
			this.nextBtn = this.querySelector('.swiper-button-next');
			this.prevBtn = this.querySelector('.swiper-button-prev');

			let navigation = false;
			const effect = 'fade';

			if (this.nextBtn && this.prevBtn) {
				navigation = {
					nextEl: this.nextBtn,
					prevEl: this.prevBtn,
				};
			}


			let pagination = false;

			if (this.pagination) {
				pagination = {
					el: '.swiper-pagination',
					clickable: true
				};
			}


			const swiperParams = {
				navigation,
				effect,
				grabCursor: true,
				pagination,
				slidesPerView: 1,
				on: {
					slideChange: () => {
						this.pauseVideos();
						this.setActiveThumbnail();
						this.updateBullets();
					},
					transitionEnd: () => {
						this.updateBullets();
					},
				}
			};

			if (effect === 'fade') {
				swiperParams.fadeEffect = { crossFade: true };
			}

			this.swiper = new Swiper(this, swiperParams);
		};
		pauseVideos() {
			if (!this.swiper) return;

			this.swiper.slides.forEach((slide) => {
				const slideVideos = slide.querySelectorAll("video, iframe");
				slideVideos.forEach((video) => {
					if (video.tagName === "VIDEO") {
						// Для HTML5 <video>
						if (!video.paused) {
							video.pause();
						}
					} else if (video.tagName === "IFRAME") {
						// Для YouTube <iframe>
						const youtubeSrc = video.src;
						if (youtubeSrc.includes("youtube.com") || youtubeSrc.includes("youtu.be")) {
							video.contentWindow.postMessage(
								'{"event":"command","func":"pauseVideo","args":""}',
								"*"
							);
						}
					}
				});
			});
		}
		
	setActiveThumbnail = (id) => {
		if (!this.thumbnails || !this.mediaGallery || !this.mediaGallery?.elements?.thumbnails || !this.swiper) return;

		const activeSlide = this.swiper.slides[this.swiper.activeIndex];
		const targetId = activeSlide.getAttribute('data-media-id');
		const currentThumbnail = this.mediaGallery.elements.thumbnails.querySelector(
			`aria-current`
		);
		const thumbnail = this.mediaGallery.elements.thumbnails.querySelector(
			`[data-target="${targetId}"]`
		);

		if (!thumbnail) return;

		// Check if mediaGallery has setActiveThumbnail method before calling it
		if (typeof this.mediaGallery.setActiveThumbnail === 'function') {
			this.mediaGallery.setActiveThumbnail(thumbnail);
		}
	}

		updateBullets() {
			if (!this.swiper || !this.swiper.pagination) return;
			this.swiper.pagination.update();

			if (this.swiper.activeIndex !== undefined) {
				const activeBullet = this.pagination.querySelector('.swiper-pagination-bullet-active');
				if (activeBullet) {
					activeBullet.classList.remove('swiper-pagination-bullet-active');
				}

				const bullets = this.pagination.querySelectorAll('.swiper-pagination-bullet');
				if (bullets.length > 0) {
					bullets[this.swiper.activeIndex].classList.add('swiper-pagination-bullet-active');
				}
			}
		}
	}

	MediaGallerySlider.prototype.swiperInitialization = function() {
		const currentWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
		if (this.previousWidth === currentWidth) return;

		this.previousWidth = currentWidth;
		if (!this.dataset) return;
		const { initSliderMb, initSliderPc } = this.dataset;


		if (this.swiper) {
			this.swiper.destroy(true, true);
			this.swiper = null;
		}

		if ((currentWidth >= 750 && initSliderPc == 'true') || (currentWidth < 750 && initSliderMb == 'true')) {
			this.initSwiper();
		}
	}

  customElements.define( 'media-gallery-slider', MediaGallerySlider);
}