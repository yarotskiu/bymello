'use strict';
(function () {

	if (!customElements.get('sticky-atc-bar')) {

    class StickyAtcBar extends HTMLElement {
      constructor() {
        super();
				this.setStickyBarHeight.bind(this)			
				this.parent = this.closest('.sticky-atc-bar');
				this.select = this.querySelector('.atc-product-form .select')
				this.formBtn = this.querySelector('.button-add-card')
      }

      connectedCallback() {
        this.onVariantChange();
				this.attachResizeHandler(); 
				this.setStickyBarHeight(); // Need for correctly positioning scroll to top btn
      }

      disconnectedCallback() {
        this.cleanup(); // Clean up listeners and observers
      }

      onVariantChange = () => {
				if (!this.select) return;
				this.select.addEventListener('change', (e) => {
					this.updateMasterId(e);
					this.renderProductInfo();
				})
      };

			updateMasterId(e) {
				this.currentVariant = e.target.value;
			}

			renderProductInfo() {
				const requestedVariantId = this.currentVariant;
				fetch(
					`${this.dataset.url}?variant=${requestedVariantId}`
				)
					.then((response) => response.text())
					.then((responseText) => {
						const html = new DOMParser().parseFromString(responseText, 'text/html');
						const addButtonUpdated = html.querySelector('.main-product .product-form__submit');
						this.toggleAddButton(
							addButtonUpdated.hasAttribute('disabled'),
							window.variantStrings.soldOut
						);

						const priceContainer = html.querySelector('.main-product .price__container');
						this.updatePrice(priceContainer);
					})
					.catch((error) => {
            console.error('Error:', error);
          })
			}

			toggleAddButton(disable = true, text, modifyClass = true) {
				const addButton = this.formBtn;
				if (!addButton) return;

				const addButtonText = addButton.querySelector('span');

				if (disable) {
					addButton.setAttribute('disabled', 'disabled');
					if (text) {
						if (addButtonText) addButtonText.textContent = text;
					}
				} else {
					addButton.removeAttribute('disabled');
					if (addButtonText) addButtonText.textContent = window.variantStrings.addToCart;
				}

				if (!modifyClass) return;
			}
			
			updatePrice(newPrice) {
				if (!newPrice) return;

				const oldPrice = this.querySelector('.price__container');
				if (!oldPrice) return;
				
				const parent = oldPrice.parentNode;
				parent.replaceChild(newPrice, oldPrice);
				this.markEmptyStrike();			
			}

			markEmptyStrike() {
				const wrapper = this.querySelector('.price');
				if (!wrapper) return;
				const strike = wrapper.querySelector('.price__sale .price-item--regular');
				if (!strike) return;
				const txt = (strike.textContent || '').trim();
				const isEmpty = txt.length === 0;
				strike.classList.toggle('is-empty', isEmpty);
				const spanWrap = strike.closest('span');
				if (spanWrap) {
					spanWrap.classList.toggle('is-empty', isEmpty);
					spanWrap.style.display = isEmpty ? 'none' : '';
				}
				wrapper.classList.toggle('has-strike', !isEmpty);
			}

			setStickyBarHeight() {
				let height = 0;
				if (this.parent) {
					height = this.parent.offsetHeight;
				}

        document.documentElement.style.setProperty('--atc-bar-height', `${height}px`);
      }

      attachResizeHandler() {
        this.resizeObserver = new ResizeObserver(() => this.setStickyBarHeight());
        this.resizeObserver.observe(this);
        window.addEventListener('resize', () => {
					this.setStickyBarHeight.call(this)
				});
      }

			cleanup() {
        if (this.resizeObserver) {
          this.resizeObserver.disconnect(); // Stop observing size changes
        }
      }	
    }

    customElements.define('sticky-atc-bar', StickyAtcBar);

		function checkBarVisibility() {
			const stickyAtcBar = document.querySelector(".sticky-atc-bar");
			const productVisible = document.querySelector(".product .product__info-wrapper");
			document.addEventListener("scroll", (e) => {
				let productVisibleHeight = productVisible.offsetHeight / 2;
				let scrolled = document.scrollingElement.scrollTop;
		
				if (scrolled > productVisibleHeight && !stickyAtcBar.classList.contains("js-hidden")) {
					stickyAtcBar.classList.add('atc-visible');
				} else {
					stickyAtcBar.classList.remove('atc-visible');
				}
			});
		}

		document.addEventListener('DOMContentLoaded', checkBarVisibility);
		document.addEventListener('shopify:section:load', checkBarVisibility);

		function addStickySpace() {
			const checkMobileStickyBar = document.querySelector('.mobile-sticky-bar ');
			const stickyAtcBar = document.querySelector(".sticky-atc-bar");
			const style = stickyAtcBar.dataset.style;
			const bottom = style == 'default' || style == 'default-swatches' | window.innerWidth < 750 ? 0 : 15;

			if ( window.innerWidth < 750 && checkMobileStickyBar && checkMobileStickyBar.classList.contains('active') ) {
				const mobileStickyBarHeight = checkMobileStickyBar.offsetHeight;
				stickyAtcBar.style.bottom = `${mobileStickyBarHeight + bottom}px`;
			} else {
				stickyAtcBar.style.bottom = `${bottom}px`;
			}
		}

		document.addEventListener('DOMContentLoaded', addStickySpace);
		document.addEventListener('shopify:section:load', addStickySpace);
		window.addEventListener('resize', addStickySpace);
		window.addEventListener('scroll', addStickySpace);

		const stickyAtcSelect = document.querySelector('sticky-atc-bar .select__select');
		let atcImage = document.querySelector('sticky-atc-bar img');
		if (stickyAtcSelect) {
			stickyAtcSelect.onchange = function(){
				// Price is updated via renderProductInfo() replacing .price__container
				const getNewImage = stickyAtcSelect.options[this.selectedIndex].getAttribute('data-media');
				if ( getNewImage != null && atcImage ) {
					atcImage.src = getNewImage;
				}
			};
		}
	}

	if (!customElements.get('sticky-atc-variants')) {
		class StickyAtcVariants extends HTMLElement {
			constructor() {
				super();
				this.handleSwatchClick = this.handleSwatchClick.bind(this);
				this.handleSwatchKeydown = this.handleSwatchKeydown.bind(this);
				this.addActiveState = this.addActiveState.bind(this);
				this.checkCurrentVariant = this.checkCurrentVariant.bind(this);
			}

			connectedCallback() {
				this.init();
			}

			disconnectedCallback() {
				this.cleanup();
			}

			init() {
				this.productCard = this.closest('sticky-atc-bar');
				if (!this.productCard) return;

				this.url = this.productCard.dataset.url || '';
				this.select = this.productCard.querySelector('.select__select');
				this.cardColorSwatches = [...this.querySelectorAll('.card-variant')];
				if (!this.cardColorSwatches.length || !this.select) return;

				this.currentId = this.select.value || this.cardColorSwatches[0]?.dataset.variantId;

				this.cardColorSwatches.forEach((swatch) => {
					swatch.addEventListener('click', this.handleSwatchClick);
					swatch.addEventListener('keydown', this.handleSwatchKeydown);
				});

				// Set the active state initially
				this.addActiveState();
			}

			handleSwatchClick(event) {
				event.preventDefault();
				event.stopPropagation();
				const swatch = event.currentTarget;
				this.updateActiveSwatch(swatch);
			}

			handleSwatchKeydown(event) {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					const swatch = event.currentTarget;
					this.updateActiveSwatch(swatch);
				}
			}

			updateActiveSwatch(swatch) {
				const { variantId } = swatch.dataset;
				if (!variantId || this.checkCurrentVariant(variantId)) return;

				const matchingOption = Array.from(this.select.options).find(
					(option) => option.value === variantId
				);

				if (matchingOption) {
					this.select.value = variantId;
					this.select.dispatchEvent(new Event('change', { bubbles: true }));
				}

				this.addActiveState();
			}

			addActiveState() {
				let foundActive = false;

				this.cardColorSwatches.forEach((swatch) => {
					const { variantId } = swatch.dataset;

					if (variantId === this.select.value && !foundActive) {
						swatch.classList.add('active');
						foundActive = true; // Ensure only one swatch is active
					} else {
						swatch.classList.remove('active');
					}
				});
			}

			checkCurrentVariant(id) {
				if (this.currentId === id) {
					return true; 
				}
				this.currentId = id; 
				return false;
			}

			cleanup() {
				// Remove all event listeners
				this.cardColorSwatches.forEach((swatch) => {
					swatch.removeEventListener('click', this.handleSwatchClick);
					swatch.removeEventListener('keydown', this.handleSwatchKeydown);
				});
			}
		}

		customElements.define('sticky-atc-variants', StickyAtcVariants);
	}

	const stickyAtcBtn = document.querySelector('.sticky-atc-bar__close');

	if (stickyAtcBtn) {
		const addOnClickHandler = () => {
			const stickyAtcBar = document.querySelector(".sticky-atc-bar");
			if (!stickyAtcBar) return;

			stickyAtcBtn.addEventListener('click', () => {
				stickyAtcBar.classList.add('js-hidden');
				stickyAtcBar.classList.remove('atc-visible');
			})
		}

		addOnClickHandler();
	}
})();
