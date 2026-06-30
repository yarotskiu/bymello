if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
		if (this.form) {
			this.form.querySelector('[name=id]').disabled = false;
			this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
		}
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        // On the cart page, do not use cart drawer/notification – let the page refresh/update instead
        const isCartPage = document.body.classList.contains('template-cart') || document.getElementById('main-cart-items');
        if (isCartPage) {
          this.cart = null;
        }
        this.submitButton = this.querySelector('[type="submit"]') || this.querySelector('.product-form__submit');

        if (document.querySelector('cart-drawer') && this.submitButton) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
        
        // Sync dynamic checkout button state with add to cart button on load
        this.syncDynamicCheckoutButton();
      }

      syncDynamicCheckoutButton() {
        if (!this.submitButton || !this.form) return;
        
        const dynamicCheckoutButton = this.form.querySelector('.shopify-payment-button__button');
        if (!dynamicCheckoutButton) return;
        
        // If add to cart button is disabled, disable dynamic checkout button too
        if (this.submitButton.hasAttribute('disabled')) {
          dynamicCheckoutButton.setAttribute('disabled', 'disabled');
          dynamicCheckoutButton.setAttribute('aria-disabled', 'true');
        }
      }

      getVariantQuantityInCart(items, variantId) {
        if (!items?.length) return 0;
        const variantIdInt = parseInt(variantId, 10);
        return items
          .filter((item) => item.variant_id === variantIdInt)
          .reduce((sum, item) => sum + item.quantity, 0);
      }

      formatPartialAddMessage(addedQty) {
        const template = window.cartStrings?.partialAdd;
        if (template) {
          return template.replace('[quantity]', addedQty);
        }
        return `Only ${addedQty} items were added to your cart due to availability.`;
      }

      async resolvePartialAddMessage(response, variantId) {
        let addedQty = this.getVariantQuantityInCart(response.items, variantId);

        try {
          const cart = await fetch(`${routes.cart_url}.js`).then((res) => res.json());
          const cartQty = this.getVariantQuantityInCart(cart.items, variantId);
          if (cartQty > addedQty) addedQty = cartQty;
        } catch (e) {
          console.error(e);
        }

        if (!addedQty && response.description) {
          const match = response.description.match(/only\s+(\d+)\s+items?\s+were\s+added/i);
          if (match) addedQty = parseInt(match[1], 10);
        }

        if (addedQty > 0) return this.formatPartialAddMessage(addedQty);
        return response.description;
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        const variantId = formData.get('id');
        let quantityInput = document.querySelector(`[form="${this.form.id}"][name="quantity"]`);
        if (!quantityInput) {
          quantityInput = document.querySelector('.main-product [name="quantity"]');
        }
        if (quantityInput) {
          formData.set('quantity', quantityInput.value);
        }
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');

              // Only open cart drawer on partial add (availability-limited) messages
              const msg = (response?.message || response?.description || '').toString().toLowerCase();
              const looksLikePartialAdd = msg.includes('only') && msg.includes('added') && msg.includes('cart');

              const showPartialAddMessage = (message) => {
                publish(PUB_SUB_EVENTS.cartError, {
                  source: 'product-form',
                  productVariantId: variantId,
                  errors: response.errors || message,
                  message: response.message,
                });
                this.handleErrorMessage(message);
              };

              if (looksLikePartialAdd) {
                this.resolvePartialAddMessage(response, variantId).then(showPartialAddMessage);
              } else {
                showPartialAddMessage(response.description);
              }

              if (looksLikePartialAdd && this.cart) {
                const quickAddModal = this.closest('quick-add-modal');
                
                // Fetch fresh cart HTML and header HTML to update cart drawer and icon bubbles
                Promise.all([
                  fetch(`${routes.cart_url}`).then(r => r.text()),
                  fetch(window.location.pathname).then(r => r.text())
                ]).then(([cartHTML, pageHTML]) => {
                  const cartDoc = new DOMParser().parseFromString(cartHTML, 'text/html');
                  const pageDoc = new DOMParser().parseFromString(pageHTML, 'text/html');
                  
                  // Update cart drawer elements from cart page
                  const cartSelectors = ['cart-drawer-items', '.drawer__footer'];
                  for (const selector of cartSelectors) {
                    const targetElement = document.querySelector(selector);
                    const sourceElement = cartDoc.querySelector(selector);
                    if (targetElement && sourceElement) {
                      targetElement.replaceWith(sourceElement);
                    }
                  }
                  
                  // Update cart icon bubbles from current page
                  const iconSelectors = ['#cart-icon-bubble', '#cart-icon-bubble-sticky'];
                  for (const selector of iconSelectors) {
                    const targetElement = document.querySelector(selector);
                    const sourceElement = pageDoc.querySelector(selector);
                    if (targetElement && sourceElement) {
                      targetElement.replaceWith(sourceElement);
                    }
                  }
                  
                  this.cart.classList.remove('is-empty');
                  if (typeof this.cart.open === 'function') this.cart.open();
                  
                  // Close quick-add modal if it exists
                  if (quickAddModal) {
                    quickAddModal.hide(true);
                  }
                })
                .catch((e) => console.error(e));
              } else {
                // True error (e.g., 1000001) – keep drawer closed, just refresh peripheral UI blocks
                this.updateBlocksOnError();
              }
							
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButton.querySelector('span').classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              });

            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    this.cart.renderContents(response);
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              this.cart.renderContents(response);
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
						
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');
          });
      }
			
			async updateBlocksOnError() {
				const response = await fetch(`${window.shopUrl}`);
				const text = await response.text();

				const parser = new DOMParser();
				const newDocument = parser.parseFromString(text, 'text/html');

				this.getSectionsToRender().forEach((section) => {
					let newContent;

					if (section.id) {
						newContent = newDocument.getElementById(section.id);
						const currentElement = document.getElementById(section.id);
						if (newContent && currentElement) {
							currentElement.innerHTML = newContent.innerHTML;
						}
					}

					if (section.selector) {
						newContent = newDocument.querySelector(section.selector);
						const currentElement = document.querySelector(section.selector);
						if (newContent && currentElement) {
							currentElement.innerHTML = newContent.innerHTML;
						}
						if (section.selector == 'cart-drawer-items') currentElement?.classList.remove('is-empty')
					}
				});

			}

			getSectionsToRender() {
				return [
					{
						selector: "cart-drawer-items",
					},
					{
						selector: ".drawer__footer",
					},
					{
						id: "cart-icon-bubble"
					}
				];
			}

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }
    }
  );
}
