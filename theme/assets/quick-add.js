if (!customElements.get('quick-add-modal')) {
  customElements.define(
    'quick-add-modal',
    class QuickAddModal extends ModalDialog {
      constructor() {
        super();
        this.modalContent = this.querySelector('[id^="QuickAddInfo-"]');
        this.overlay = this.querySelector('popup-overlay');
				this.hideOnOverlayClick();
      }

      hide(preventFocus = false) {
        const cartNotification = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        if (cartNotification) cartNotification.setActiveElement(this.openedBy);
        this.modalContent.innerHTML = '';

        if (preventFocus) this.openedBy = null;
        super.hide();
      }

      show(opener) {
        opener.setAttribute('aria-disabled', true);
        opener.classList.add('loading');
        const spinner = opener.querySelector('.loading__spinner');
        if (spinner) spinner.classList.remove('hidden');

				this.hideCompareModal();

				const productUrl = this.validateProductUrl(opener);

        fetch(productUrl)
          .then((response) => response.text())
          .then((responseText) => {
            const responseHTML = new DOMParser().parseFromString(responseText, 'text/html');
            this.productElement = responseHTML.querySelector('section[id^="MainProduct-"]');
            this.productElement.classList.forEach((classApplied) => {
              if (classApplied.startsWith('color-') || classApplied === 'gradient')
                this.modalContent.classList.add(classApplied);
            });
            this.preventDuplicatedIDs();
            this.removeDOMElements();
            this.setInnerHTML(this.modalContent, this.productElement.innerHTML);

            if (window.Shopify && Shopify.PaymentButton) {
              Shopify.PaymentButton.init();
            }

            if (window.ProductModel) window.ProductModel.loadShopifyXR();

            this.removeGalleryListSemantic();
            this.selectVariantFromOpener(opener);
            this.updateImageSizes();
            this.preventVariantURLSwitching();
            this.initializeMediaGallery();
            this.setupVariantChangeListener();
            super.show(opener);
          })
          .finally(() => {
            opener.removeAttribute('aria-disabled');
            opener.classList.remove('loading');
          const spinner = opener.querySelector('.loading__spinner');
          if (spinner) spinner.classList.add('hidden');
          });
      }
      
      // Try to find the product card container for a Quick View opener across different wrappers
      getOpenerCard(opener) {
        return (
          opener.closest('.product-card-wrapper') ||
          opener.closest('.card-wrapper') ||
          opener.closest('li.grid__item') ||
          opener.closest('[data-product-id]') ||
          opener.parentElement
        );
      }
      
      // Dynamically select options in modal to match opener's variant (no hardcoded option names)
      selectVariantFromOpener(opener) {
        const variantSelects = this.modalContent.querySelector('variant-selects');
        if (!variantSelects) return;

        const card = this.getOpenerCard(opener);
        const activeSwatchEl = card?.querySelector('.card-variants .card-variant.active')
          || card?.querySelector('.card-variants input[type="radio"]:checked')?.closest('.card-variant');

        if (activeSwatchEl) {
          const swatchInput = activeSwatchEl.querySelector('input');
          const swatchValue = swatchInput?.value || activeSwatchEl.getAttribute('aria-label');
          const firstGroup = variantSelects.querySelector('fieldset.js');
          if (swatchValue && firstGroup) {
            const input = firstGroup.querySelector(`input[type="radio"][value="${CSS.escape(swatchValue)}"]`);
            if (input) {
              input.checked = true;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }

       
        let desiredId = opener.dataset.productId;
        if (!desiredId && activeSwatchEl) desiredId = activeSwatchEl.dataset?.variantId;
        if (!desiredId) {
          const variantInput = card?.querySelector('input[name="id"], .product-variant-id');
          desiredId = variantInput?.value;
        }
        if (!desiredId) return;

        const json = variantSelects.querySelector('script[type="application/json"]')?.textContent;
        if (!json) return;
        let variants;
        try { variants = JSON.parse(json); } catch(e) { return; }
        const target = variants.find(v => String(v.id) === String(desiredId));
        if (!target) return;

        const groups = Array.from(variantSelects.querySelectorAll('fieldset.js'));
        ['option1','option2','option3'].forEach((key, idx) => {
          const val = target[key];
          if (!val) return;
          const group = groups[idx];
          if (!group) return;
          const input = group.querySelector(`input[type="radio"][value="${CSS.escape(val)}"]`);
          if (input && !input.checked) {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }

      validateProductUrl(opener) {
        let url = opener.getAttribute('data-product-url')
        // Prefer the selected swatch variant id from the card
        const card = this.getOpenerCard(opener);
        const activeSwatch = card?.querySelector('.card-variants .card-variant.active')
          || card?.querySelector('.card-variants input[type="radio"]:checked')?.closest('.card-variant');
        const swatchId = activeSwatch?.dataset?.variantId;
        if (swatchId) return `${url}?variant=${swatchId}`;

        const { productId } = opener.dataset;
        if (productId) return `${url}?variant=${productId}`;

        const variantInput = card?.querySelector('input[name="id"], .product-variant-id');
        const fallbackId = variantInput?.value;
        if (fallbackId) return `${url}?variant=${fallbackId}`;
        return url;
      }

      setInnerHTML(element, html) {
        element.innerHTML = html;

        // Reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
        element.querySelectorAll('script').forEach((oldScriptTag) => {
          const newScriptTag = document.createElement('script');
          Array.from(oldScriptTag.attributes).forEach((attribute) => {
            newScriptTag.setAttribute(attribute.name, attribute.value);
          });
          newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
          oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
        });
      }

      preventVariantURLSwitching() {
        const variantPicker = this.modalContent.querySelector('variant-selects');
        if (!variantPicker) return;

        variantPicker.setAttribute('data-update-url', 'false');
      }

      removeDOMElements() {
        const pickupAvailability = this.productElement.querySelector('pickup-availability');
        if (pickupAvailability) pickupAvailability.remove();

        const productModal = this.productElement.querySelector('product-modal');
        if (productModal) productModal.remove();

        const modalDialog = this.productElement.querySelectorAll('modal-dialog');
        if (modalDialog) modalDialog.forEach((modal) => modal.remove());
      }

      preventDuplicatedIDs() {
        const sectionId = this.productElement.dataset.section;
        this.productElement.innerHTML = this.productElement.innerHTML.replaceAll(sectionId, `quickadd-${sectionId}`);
        this.productElement.querySelectorAll('variant-selects, product-info, media-gallery').forEach((element) => {
          element.dataset.originalSection = sectionId;
        });
      }

      removeGalleryListSemantic() {
        const galleryList = this.modalContent.querySelector('[id^="Slider-Gallery"]');
        if (!galleryList) return;

        galleryList.setAttribute('role', 'presentation');
        galleryList.querySelectorAll('[id^="Slide-"]').forEach((li) => li.setAttribute('role', 'presentation'));
      }

      updateImageSizes() {
        const product = this.modalContent.querySelector('.product');
        const desktopColumns = product.classList.contains('product--columns');
        if (!desktopColumns) return;

        const mediaImages = product.querySelectorAll('.product__media img');
        if (!mediaImages.length) return;

        let mediaImageSizes =
          '(min-width: 1000px) 715px, (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)';

        if (product.classList.contains('product--medium')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '605px');
        } else if (product.classList.contains('product--small')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '495px');
        }

        mediaImages.forEach((img) => img.setAttribute('sizes', mediaImageSizes));
      }

			hideCompareModal() {
				const compareDrawer = document.querySelector('compare-drawer');
				if (!compareDrawer) return;
				compareDrawer.classList.remove('open');
			}

			hideOnOverlayClick() {
				if (!this.overlay) return;
				this.overlay.addEventListener('click', () => {
          this.hide();
        });
			}

		initializeMediaGallery() {
			// Use requestAnimationFrame to ensure DOM is fully rendered
			requestAnimationFrame(() => {
				const mediaGallery = this.modalContent.querySelector('media-gallery');
				const mediaGallerySlider = this.modalContent.querySelector('media-gallery-slider');
				
				// Ensure media-gallery custom element is properly set up FIRST
				if (mediaGallery) {
					// Initialize or re-initialize media-gallery elements
					mediaGallery.elements = {
						liveRegion: mediaGallery.querySelector('[id^="GalleryStatus"]'),
						viewer: mediaGallery.querySelector('[id^="GalleryViewer"]'),
						thumbnails: mediaGallery.querySelector('[id^="GalleryThumbnails"]'),
					};

					// Ensure setActiveThumbnail method exists
					if (!mediaGallery.setActiveThumbnail) {
						mediaGallery.setActiveThumbnail = function(thumbnail) {
							if (!this.elements.thumbnails || !thumbnail) return;

							this.elements.thumbnails
								.querySelectorAll('button')
								.forEach((element) => element.removeAttribute('aria-current'));
							thumbnail.querySelector('button').setAttribute('aria-current', true);
							if (this.elements.thumbnails.isSlideVisible && this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

							if (this.elements.thumbnails.slider) {
								this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
							}
						};
					}
				}
				
				// Initialize media-gallery slider AFTER media-gallery is ready
				if (mediaGallerySlider && typeof mediaGallerySlider.connectedCallback === 'function') {
					// Keep original data attributes from the loaded HTML
					// Don't force enable slider - respect the gallery_layout settings
					
					// Destroy existing swiper instance if present
					if (mediaGallerySlider.swiper) {
						mediaGallerySlider.swiper.destroy(true, true);
						mediaGallerySlider.swiper = null;
					}
					
					// Reset previousWidth to force re-initialization
					mediaGallerySlider.previousWidth = 0;
					
					// Ensure the slider knows about the parent mediaGallery
					mediaGallerySlider.mediaGallery = mediaGallery;
					mediaGallerySlider.thumbnails = mediaGallery ? mediaGallery.querySelector('.thumbnail-slider') : null;
					
					// Re-initialize the slider
					setTimeout(() => {
						mediaGallerySlider.connectedCallback();
					}, 100);
				}
			});
		}

			setupVariantChangeListener() {
				// Add a listener to ensure media updates when variant changes
				const variantSelects = this.modalContent.querySelector('variant-selects');
				if (!variantSelects) return;

				// Store reference to the modal for use in the listener
				const modalContent = this.modalContent;
				
				// Override the updateMedia method to ensure it works in quick-add
				const originalUpdateMedia = variantSelects.constructor.prototype.updateMedia;
				if (originalUpdateMedia) {
					variantSelects.updateMedia = function() {
						originalUpdateMedia.call(this);
						
						// Additional fallback: directly control the slider ONLY if swiper is initialized and active
						setTimeout(() => {
							const mediaGallery = modalContent.querySelector('media-gallery');
							const mediaGallerySlider = modalContent.querySelector('media-gallery-slider');
							
							// Only try to control swiper if it's initialized (respect gallery_layout settings)
							if (mediaGallerySlider && 
									mediaGallerySlider.swiper && 
									mediaGallerySlider.swiper.initialized &&
									this.currentVariant && 
									this.currentVariant.featured_media) {
								
								const sectionId = this.dataset.originalSection || this.dataset.section;
								const mediaId = `quickadd-${sectionId}-${this.currentVariant.featured_media.id}`;
								const targetSlide = mediaGallerySlider.querySelector(`[data-media-id="${mediaId}"]`);
								
								if (targetSlide) {
									const slideIndex = Array.from(mediaGallerySlider.swiper.slides).indexOf(targetSlide);
									if (slideIndex !== -1 && slideIndex !== mediaGallerySlider.swiper.activeIndex) {
										mediaGallerySlider.swiper.slideTo(slideIndex);
									}
								}
							}
						}, 50);
					};
				}
			}
    }
  );
}
