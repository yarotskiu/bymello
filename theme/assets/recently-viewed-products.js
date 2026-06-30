'use strict';

if (!window.customElements.get("recently-viewed-products")) {
  class RecentlyViewedProducts extends HTMLElement {
    constructor() {
      super();
			this.onLoad = this.onLoad.bind(this);
      this.observer = new IntersectionObserver(this.onIntersect.bind(this), {
        threshold: 0,
      });
      this.loaded = false;
    }

    connectedCallback() {
			this.slider = this.querySelector('.swiper');
			this.nextBtn = this.querySelector('.swiper-button-next');
			this.prevBtn = this.querySelector('.swiper-button-prev');
			this.swiper = null;
      this.observer.observe(this);

      document.addEventListener("DOMContentLoaded", this.onLoad);

			if (!this.loaded) {
				this.loadProductsIfNotVisible();
			}
    }

		disconnectedCallback() {
      document.removeEventListener("DOMContentLoaded", this.onLoad);
		}
		
		onLoad() {
			if (!this.loaded) {
				this.loadProductsIfNotVisible();
			}
		}

		initializeSwiper() {
			this.initSwiper();
			this.setupExternalNavigation();
			this.updateNavigationButtons();
		}

    async onIntersect(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting && !this.loaded) {
          this.observer.unobserve(entry.target);
          this.loaded = true;

          const query = this.buildQuery();
          if (query) {
            this.loadProducts(query);
          }
        }
      }
    }

    loadProductsIfNotVisible() {
      if (!this.loaded) {
        this.loaded = true;
        const query = this.buildQuery();
				
        if (query) {
          this.loadProducts(query);
        }
      }
    }

    buildQuery() {
      const items = JSON.parse(localStorage.getItem("recently-viewed") || "[]");
      const excludeId = this.getAttribute("data-product-id");
			
      if (excludeId) {
        const index = items.indexOf(parseInt(excludeId));
        if (index !== -1) {
          items.splice(index, 1);
        }
      }

      const limitedItems = items.slice(-this.productLimit).reverse();
			
      return limitedItems.map((id) => `id:${id}`).join(" OR ");
    }

    async loadProducts(query) {
      try {
        const showColorVariants = this.dataset.enableProductVariants === "true";
        const swatchesParam = showColorVariants ? "1" : "0";
        const encodedQuery = encodeURIComponent(query);
        const response = await fetch(
          `${window.routes.root_url}search?section_id=main-search&q=${encodedQuery}&resources[limit]=40&resources[type]=product&recently_viewed_swatches=${swatchesParam}`
        );
    
        const html = await response.text();
				
        const products = new DOMParser()
          .parseFromString(html, "text/html")
          .querySelector("#search-list-id");
					

        if (products && products.hasChildNodes()) {
          const innerSection = this.querySelector(".product-grid");
          if (innerSection) {
            const productElements = Array.from(products.children);
						
            const items = JSON.parse(localStorage.getItem("recently-viewed") || "[]").slice(-this.productLimit).reverse();
            const sortedProducts = items
              .map((id) =>
                productElements.find((el) => {
									el.classList.add('swiper-slide')
                  const productId = el.querySelector("[data-product-id]")?.getAttribute("data-product-id");
                  return productId && productId === id.toString();
                })
              )
              .filter((el) => el);

            // Strip scroll-reveal classes from the carousel cards. Otherwise, after a sort/filter
            // AJAX update the theme re-runs initializeScrollAnimationTrigger(document), which rewrites
            // each .scroll-trigger element's inline `style` to "--animation-order: N" and wipes the
            // width/margin-right Swiper set on the slides — making the cards clump together.
            sortedProducts.forEach((el) => {
              el.classList.remove('scroll-trigger', 'scroll-trigger--offscreen');
              el.querySelectorAll('.scroll-trigger').forEach((n) =>
                n.classList.remove('scroll-trigger', 'scroll-trigger--offscreen')
              );
            });

            if (!showColorVariants) {
              sortedProducts.forEach((el) => {
                el.querySelectorAll(".card-variants-wrapp").forEach((swatchWrap) => swatchWrap.remove());
              });
            }
    
            innerSection.innerHTML = "";
            sortedProducts.forEach((el) => innerSection.appendChild(el));
          }

					this.initializeSwiper();
        } else {
          console.warn("No products found in the response.");
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    }    

    get sectionId() {
      return this.getAttribute("data-section-id");
    }

    get productLimit() {
      return parseInt(this.getAttribute("data-products-limit")) + 1 || 4;
    }

		initSwiper = () => {
			if(!this.slider) return;
			const slides = this.querySelectorAll('.swiper-slide');
			const slidesLength = slides?.length || 1;
			let { slidesPerView = 1, slidesPerViewSm, slidesPerViewLg, spaceBetween = 16, spaceBetweenPc = 16 } = this.dataset;

			if (!slidesPerViewSm) slidesPerViewSm = slidesPerView;
			if (!slidesPerViewLg) slidesPerViewLg = slidesPerView;

			slidesPerView = slidesLength < +slidesPerView ? Math.floor(+slidesPerView) : +slidesPerView;
			slidesPerViewSm = slidesLength < +slidesPerViewSm ? Math.floor(+slidesPerViewSm) : +slidesPerViewSm;
			slidesPerViewLg = slidesLength < +slidesPerViewLg ? Math.floor(+slidesPerViewLg) : +slidesPerViewLg;
			this.swiper = new Swiper(this.slider, {
				slidesPerView,
				loop: false,
				scrollbar: true,
				spaceBetween,
				navigation: {
					nextEl: ".swiper-button-next",
					prevEl: ".swiper-button-prev",
				},
				scrollbar: {
					el: '.swiper-scrollbar',
				},
				breakpoints: {
					750: {
						spaceBetween: spaceBetweenPc,
						slidesPerView: slidesPerViewSm
					},
					990: {
						slidesPerView: slidesPerViewLg
					},
				},
				on: {
					slideChange: this.updateNavigationButtons,
					init: this.updateNavigationButtons,
					resize: this.alignEnd,
				},
			})
			requestAnimationFrame(this.alignEnd);
		};

		// Keep the first visible card always whole. With a fractional slidesPerView the carousel
		// shows a half-card "peek" on the right — good — but at the very end Swiper right-aligns the
		// last card and cuts the LEFT card. We add trailing space (slidesOffsetAfter) so the final
		// snap lands on a card boundary: first card stays whole, the leftover shows as an empty gap.
		alignEnd = () => {
			if (!this.swiper || !this.swiper.slidesSizesGrid || !this.swiper.slidesSizesGrid.length) return;
			const prev = this.swiper.params.slidesOffsetAfter || 0;
			const pitch = this.swiper.slidesSizesGrid[0] + Number(this.swiper.params.spaceBetween || 0);
			if (!pitch) return;
			// max scroll distance of the content itself (without our previously added offset)
			const base = -this.swiper.maxTranslate() - prev;
			const remainder = base % pitch;
			const desired = base > pitch && remainder > 1 ? pitch - remainder : 0;
			if (Math.abs(desired - prev) > 0.5) {
				this.swiper.params.slidesOffsetAfter = desired;
				this.swiper.update();
				this.updateNavigationButtons();
			}
		};

		setupExternalNavigation = () => {
			if(!this.swiper) return;

			if (this.nextBtn) {
				this.nextBtn.addEventListener('click', () => {
					this.swiper.slideNext();
				});
			}
			if(this.prevBtn) {
				this.prevBtn.addEventListener('click', () => {
					this.swiper.slidePrev();
				});
			}
		};

		updateNavigationButtons = () => {
			if (!this.swiper) return;

			if (this.swiper.isBeginning) {
				this.prevBtn.classList.add('disabled');
			} else {
				this.prevBtn.classList.remove('disabled');
			}

			if (this.swiper.isEnd) {
				this.nextBtn.classList.add('disabled');
			} else {
				this.nextBtn.classList.remove('disabled');
			}
		};
  }

  window.customElements.define("recently-viewed-products", RecentlyViewedProducts);
}