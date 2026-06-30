'use strict';
(function () {

	if (!customElements.get('product-bundle')) {
		class ProductBundle extends HTMLElement {
					constructor() {
			super();
			this.min = parseInt(this.dataset.min, 10) || 0;
			this.max = Math.max(this.min, parseInt(this.dataset.max, 10) || 0);
			this.notification = this.dataset.notification;
			this.bundleCount = 0; 
			this.productIds = [];
			this.totalPrice = 0;
			this.storageKey = `product-bundle-${window.location.pathname}`;
			this.bundleProducts = new Map();
			this.currentCurrency = window.cartStrings?.currencyCode || window.cartStrings?.currency || '';
			this.currentLocale = document.documentElement.lang || 'en';
		}

			connectedCallback() {
				this.elements = {
					bundle: this.querySelector('[data-component="product-bundle"]'),
					progressBar: this.querySelector('[data-component="product-bundle-progress-bar"]'),
					totals: this.querySelectorAll('[data-component="product-bundle-total"]'),
					submitButton: this.querySelector('[data-component="product-bundle-submit"]'),
					items: Array.from(this.querySelectorAll('[data-component="product-bundle-item"]')),
					addToBundleBtns: Array.from(this.querySelectorAll('[data-component="product-bundle-button"]')),
					error: this.querySelector('[data-component="product-bundle-error"]'),
					removeButtons: Array.from(this.querySelectorAll('[data-component="product-bundle-remove-btn"]')),
				};

				this.addEventListener('click', (event) => this.handleButtonClick(event));
				if (this.elements.removeButtons.length > 0) {
					this.elements.removeButtons.forEach(button => {
						button.addEventListener('keydown', (event) => this.handleKeyPress(event, button));
					});
				}

				this.restoreBundleState();
				this.updateProgress();
        this.updateSubmitButtonState();
			}

			handleKeyPress(event, button) {
				if (event.key === 'Enter') {
					this.removeProductFromBundle(button);
				}
			}

			checkTargetELement(element, selector) {
				let targetEl = null;

				if (element.matches(`${selector}`) || element.closest(`${selector}`)) {
					targetEl = element
				}

				return targetEl
			}

			parsePrice(priceString) {
				const cleaned = priceString.replace(/[^\d.,-]/g, '');

				const lastDot = cleaned.lastIndexOf('.');
				const lastComma = cleaned.lastIndexOf(',');

				let normalized = cleaned;

				if (lastDot > -1 && lastComma > -1) {
					if (lastDot > lastComma) {
					normalized = cleaned.replace(/,/g, '');
					} else {
					normalized = cleaned.replace(/\./g, '').replace(',', '.');
					}
				} else if (lastComma > -1) {
					normalized = cleaned.replace(',', '.');
				} else {
					normalized = cleaned;
				}

				const value = parseFloat(normalized);
				return isNaN(value) ? 0 : value;
			}

			formatPrice(price) {
				const numericPrice = isNaN(price) ? 0 : parseFloat(price);
  				return window.cartStrings.currency + numericPrice.toFixed(2);
      		}


			handleButtonClick(event) {
        const addButton = this.checkTargetELement(event.target, '[data-component="product-bundle-button"]');
        const removeButton = this.checkTargetELement(event.target, '[data-component="product-bundle-remove-btn"]');
        const submitButton = this.checkTargetELement(event.target, '[data-component="product-bundle-submit"]');

        if (addButton) {
          this.addProductToBundle(addButton);
        } else if (removeButton) {
          this.removeProductFromBundle(removeButton);
        } else if (submitButton) {
					this.addBundleToCart(submitButton);
				}
      }

      addProductToBundle(button) {
        if (this.bundleCount < this.max) {
          this.bundleCount++;
					const { productId, productTitle, productPrice, productImage } = button.dataset;
					
					this.productIds.push({
						id: productId,
						currentId: productId,
					});

					this.bundleProducts.set(productId, {
						productTitle,
						productPrice,
						productImage,
						currentId: productId
					});

					const priceValue = this.parsePrice(productPrice);
					this.totalPrice += priceValue;

					const item = this.elements.items.find(el => el.hasAttribute('available'));
					
					if (!item) {
						return;
					}
					
					item.oldPrice = priceValue;
					item.currentPrice = priceValue;
					item.dataset.productId = productId;
					item.dataset.currentId = productId;
					item.removeAttribute('available');

					this.addVariants(button, item.querySelector('[data-component="product-bundle-item-variants"]'));
					this.updateItemElement(item.querySelector('[data-component="product-bundle-item-title"]'), productTitle);
          this.updateItemElement(item.querySelector('[data-component="product-bundle-item-price"]'), productPrice);
          this.updateItemElement(item.querySelector('[data-component="product-bundle-item-media"]'), productImage ? `<img src="${productImage}" alt="${productTitle}"/>` : '');

          this.updateProgress();
          this.updateSubmitButtonState();
					this.updateTotalPrice();

					button.setAttribute('disabled', 'true');
					button.inBundle = true;

					this.saveBundleToStorage();

					if (this.bundleCount === this.min && this.notification) {
						this.showMessage(this.notification);
					}
					

				}
				this.checkItemsCount();
      }

		addVariants(button, item, selectedVariantId = null) {
			const { productVariants } = button.dataset;
			const template = button.querySelector('template');

			if (template) {
				const clone = template.content.cloneNode(true); 
				const select = clone.querySelector('[data-component="product-bundle-select"]');
				if (select) {
					// Set the selected variant value BEFORE appending to DOM
					if (selectedVariantId) {
						const selectElement = select.querySelector('select');
						if (selectElement) {
							selectElement.value = selectedVariantId;
						}
					}
					
					item.appendChild(select);

					this.initVariantSelect(select);
				}
			} else {
				this.updateItemElement(item, productVariants);
			}
		}

			initVariantSelect(select) {
				const tryInit = () => {
					if (select && typeof select.init === 'function') {
						try {
							select.init();
							return true;
						} catch (error) {
							return false;
						}
					}
					return false;
				};

				if (!tryInit()) {
					requestAnimationFrame(() => {
						if (!tryInit()) {
							setTimeout(() => {
								tryInit();
							}, 100);
						}
					});
				}
			}

			updateItemElement(item, html = '') {
				if (item) {
					item.innerHTML = html;
				}
			}

			checkItemsCount() {
				if (this.elements.addToBundleBtns.length == 0) return;
        if (this.bundleCount >= this.max) {
					this.elements.addToBundleBtns.forEach(btn => btn.setAttribute('disabled', 'true'));
				} else {
					this.elements.addToBundleBtns.forEach(btn => { 
						if (!btn.inBundle && btn.dataset.outOfStock != 'true') {
							btn.removeAttribute('disabled')
						}
					});
				}
			}

			cleanBundleAfterSubmit() {
				this.bundleCount = 0;
				this.productIds = [];
				this.totalPrice = 0;
				this.bundleProducts.clear(); 

				this.elements.items.forEach((item) => {
					item.setAttribute('available', 'true');
					item.dataset.productId = '';
					item.dataset.currentId = '';
					this.updateItemElement(item.querySelector('[data-component="product-bundle-item-title"]'), '');
					this.updateItemElement(item.querySelector('[data-component="product-bundle-item-price"]'), '');
					this.updateItemElement(item.querySelector('[data-component="product-bundle-item-variants"]'), '');
					this.updateItemElement(item.querySelector('[data-component="product-bundle-item-media"]'), '');
				});

				this.elements.addToBundleBtns.forEach((btn) => {
					if (btn.dataset.outOfStock !== 'true') {
						btn.removeAttribute('disabled');
						btn.inBundle = false;
					}
				});

				this.updateProgress();
				this.updateSubmitButtonState();
				this.updateTotalPrice();

				this.clearBundleStorage();
			}

			removeProductFromBundle(button) {
        if (this.bundleCount > 0) {
          this.bundleCount--;
					const bundleProduct = button.closest('[data-component="product-bundle-item"]');
          if (!bundleProduct) return;

					const productId = bundleProduct.dataset.productId;
					this.bundleProducts.delete(productId);
					this.productIds = this.productIds.filter(product => product.id !== productId);

          const buttonData = Array.from(this.elements.addToBundleBtns).find((btn) => btn.dataset.productId === productId);
          const productPrice = buttonData ? buttonData.dataset.productPrice : '0';
          const priceValue = this.parsePrice(productPrice);
          this.totalPrice -= +bundleProduct.currentPrice;

					bundleProduct.setAttribute('available', 'true');
          bundleProduct.dataset.productId = '';
					bundleProduct.dataset.currentId = '';

					this.updateItemElement(bundleProduct.querySelector('[data-component="product-bundle-item-title"]'), '');
          this.updateItemElement(bundleProduct.querySelector('[data-component="product-bundle-item-price"]'), '');
          this.updateItemElement(bundleProduct.querySelector('[data-component="product-bundle-item-variants"]'), '');
          this.updateItemElement(bundleProduct.querySelector('[data-component="product-bundle-item-media"]'), '');

					this.elements.addToBundleBtns.forEach(btn => {
						if (btn.dataset.productId == productId && btn.dataset.outOfStock != 'true') {
							btn.removeAttribute('disabled')
							btn.inBundle = false;
						}
					});

					if (this.bundleCount < this.min && this.elements.error) {
						this.elements.error.classList.remove('visible');
						this.showMessage('');
					}	

          this.updateProgress();
          this.updateSubmitButtonState();
					this.updateTotalPrice();

					this.saveBundleToStorage();
        }

				this.checkItemsCount();
      }

			updateProgress() {
        const progress = Math.min((this.bundleCount / this.min) * 100, 100);
        this.elements.progressBar.style.setProperty('--progress', `${progress}%`);
      }

			updateSubmitButtonState() {
        const isComplete = this.bundleCount >= this.min;

        this.elements.submitButton.disabled = !isComplete;
      }

			updateTotalPrice() {
        const formattedPrice = this.formatPrice(this.totalPrice);
        this.elements.totals.forEach((el) => {
          el.textContent = `${formattedPrice}`; 
        });
      }

		saveBundleToStorage() {
			try {
				const products = this.productIds.map(productIdData => {
					const productData = this.bundleProducts.get(productIdData.id);
					if (!productData) return null;
					
					// Find the item element to get current variant selection
					const item = Array.from(this.elements.items).find(
						el => el.dataset.productId === productIdData.id
					);
					
					let selectedVariantId = productData.currentId;
					
					// If item exists, try to get the current selected variant from select
					if (item) {
						const variantSelect = item.querySelector('[data-component="product-bundle-select"]');
						if (variantSelect) {
							selectedVariantId = variantSelect.value || productData.currentId;
						}
					}
					
					return {
						id: productIdData.id,
						...productData,
						selectedVariantId: selectedVariantId
					};
				}).filter(Boolean);

				const bundleData = {
					bundleCount: this.bundleCount,
					productIds: this.productIds,
					totalPrice: this.totalPrice,
					products: products,
					timestamp: Date.now(),
					currency: this.currentCurrency,
					locale: this.currentLocale
				};
				
				localStorage.setItem(this.storageKey, JSON.stringify(bundleData));
			} catch (error) {
				// Handle error silently
				console.error(error);
				console.error('Error saving bundle to storage');
			}
		}

		loadBundleFromStorage() {
			try {
				const stored = localStorage.getItem(this.storageKey);
				if (!stored) {
					return null;
				}
				
				const bundleData = JSON.parse(stored);
				
				// Check if data is expired (24 hours)
				const isExpired = Date.now() - bundleData.timestamp > 24 * 60 * 60 * 1000;
				if (isExpired) {
					this.clearBundleStorage();
					return null;
				}
				
				// Check if currency or locale has changed
				const currencyChanged = bundleData.currency && bundleData.currency !== this.currentCurrency;
				const localeChanged = bundleData.locale && bundleData.locale !== this.currentLocale;
				
				if (currencyChanged || localeChanged) {
					console.log('Currency or locale changed, clearing all bundle storage');
					this.clearAllBundleStorage();
					return null;
				}
				
				return bundleData;
			} catch (error) {
				this.clearBundleStorage();
				return null;
			}
		}

		clearBundleStorage() {
			try {
				localStorage.removeItem(this.storageKey);
			} catch (error) {
				// Handle error silently
			}
		}

		clearAllBundleStorage() {
			try {
				// Clear all product-bundle entries from localStorage
				const keysToRemove = [];
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (key && key.startsWith('product-bundle-')) {
						keysToRemove.push(key);
					}
				}
				keysToRemove.forEach(key => localStorage.removeItem(key));
			} catch (error) {
				// Handle error silently
			}
		}

			validateBundleProducts(bundleData) {
				if (!bundleData || !bundleData.products) {
					return false;
				}
				
				for (const product of bundleData.products) {
					const productButton = this.elements.addToBundleBtns.find(btn => 
						String(btn.dataset.productId) === String(product.id)
					);
					
					if (!productButton) {
						this.clearBundleStorage();
						return false;
					}
				}
				
				return true;
			}

		restoreBundleState() {
			const bundleData = this.loadBundleFromStorage();
			
			if (!bundleData || !this.validateBundleProducts(bundleData)) {
				return;
			}
			
			this.bundleCount = bundleData.bundleCount || 0;
			this.productIds = bundleData.productIds || [];
			this.totalPrice = bundleData.totalPrice || 0;
			
			if (bundleData.products) {
				bundleData.products.forEach(product => {
					this.bundleProducts.set(product.id, {
						productTitle: product.productTitle,
						productPrice: product.productPrice,
						productImage: product.productImage,
						currentId: product.currentId
					});
				});
			}
			
			this.restoreUIState(bundleData);
			
			// Recalculate total price based on restored items with their variants
			this.recalculateTotalPrice();
			
			this.updateProgress();
			this.updateSubmitButtonState();
			this.updateTotalPrice();
		}

		restoreUIState(bundleData) {
			if (!bundleData.products) {
				return;
			}
			
			bundleData.products.forEach((product, index) => {
				const item = this.elements.items.find(el => el.hasAttribute('available'));
				if (!item) {
					return;
				}
				
				item.dataset.productId = product.id;
				item.dataset.currentId = product.currentId || product.id;
				item.removeAttribute('available');
				item.oldPrice = this.parsePrice(product.productPrice);
				item.currentPrice = this.parsePrice(product.productPrice);
				
				this.updateItemElement(item.querySelector('[data-component="product-bundle-item-title"]'), product.productTitle);
				this.updateItemElement(item.querySelector('[data-component="product-bundle-item-price"]'), product.productPrice);
				this.updateItemElement(item.querySelector('[data-component="product-bundle-item-media"]'), product.productImage ? `<img src="${product.productImage}" alt="${product.productTitle}"/>` : '');
				
			const productButton = this.elements.addToBundleBtns.find(btn => String(btn.dataset.productId) === String(product.id));
			if (productButton) {
				const variantsContainer = item.querySelector('[data-component="product-bundle-item-variants"]');
				
				// Pass selectedVariantId to addVariants so it's set before DOM insertion
				const selectedVariantId = product.selectedVariantId || product.currentId;
				this.addVariants(productButton, variantsContainer, selectedVariantId);
				
				// Restore selected variant data after adding variants
				if (selectedVariantId) {
					this.restoreVariantSelection(variantsContainer, selectedVariantId, product, item);
				}
				
				productButton.setAttribute('disabled', 'true');
				productButton.inBundle = true;
			}
			});
			
			this.checkItemsCount();
		}

	restoreVariantSelection(variantsContainer, selectedVariantId, product, item) {
		if (!variantsContainer) return;
		
		// Restore variant data (select value is already set in addVariants)
		const tryRestore = () => {
			const variantSelect = variantsContainer.querySelector('[data-component="product-bundle-select"]');
			
			if (!variantSelect) {
				return false;
			}
			
			const selectElement = variantSelect.querySelector('select');
			if (!selectElement) {
				return false;
			}
			
			// Verify the value is set correctly, set it again if needed
			if (selectElement.value !== selectedVariantId) {
				selectElement.value = selectedVariantId;
			}
			
			// Get the selected option
			const option = selectElement.querySelector(`option[value="${selectedVariantId}"]`);
			if (option) {
				// Update the item with variant data
				item.dataset.currentId = selectedVariantId;
				
				// Get price and media from option dataset
				const { price, media } = option.dataset;
				
				if (price) {
					const priceValue = this.parsePrice(price);
					item.currentPrice = priceValue;
					item.oldPrice = priceValue;
					
					// Update the displayed price
					const priceElement = item.querySelector('[data-component="product-bundle-item-price"]');
					if (priceElement) {
						priceElement.textContent = price;
					}
				}
				
				if (media) {
					// Update the displayed image
					const imgElement = item.querySelector('[data-component="product-bundle-item-media"] img');
					if (imgElement) {
						imgElement.src = media;
					}
				}
				
				// Update bundle products map with current variant data
				const productData = this.bundleProducts.get(product.id);
				if (productData) {
					productData.currentId = selectedVariantId;
					if (price) {
						productData.productPrice = price;
					}
					if (media) {
						productData.productImage = media;
					}
					this.bundleProducts.set(product.id, productData);
				}
				
				// Update product IDs with current variant
				this.productIds = this.productIds.map(p => {
					if (p.id === product.id) {
						return { ...p, currentId: selectedVariantId };
					}
					return p;
				});
				
				return true;
			}
			
			return false;
		};
		
		// Try immediately
		if (!tryRestore()) {
			// If failed, try after animation frame
			requestAnimationFrame(() => {
				if (!tryRestore()) {
					// If still failed, try after a short delay
					setTimeout(() => {
						tryRestore();
					}, 100);
				}
			});
		}
	}

		recalculateTotalPrice() {
			// Recalculate total price from current items
			this.totalPrice = 0;
			
			this.elements.items.forEach(item => {
				if (!item.hasAttribute('available') && item.currentPrice !== undefined) {
					this.totalPrice += item.currentPrice;
				}
			});
		}

		onVariantChange(item) {
			const { productId, currentId } = item.dataset;
			if (item.oldPrice !== undefined && item.oldPrice !== null) {
				this.totalPrice -= item.oldPrice;
			}

			if (item.currentPrice !== undefined && item.currentPrice !== null) {
				this.totalPrice += item.currentPrice;
				item.oldPrice = item.currentPrice;
			}

			this.updateTotalPrice();

				if (productId && currentId) {
					this.productIds.map(product => {
						if (product.id == productId) {
							product.currentId = currentId;
						}
						return product;
					});

					const productData = this.bundleProducts.get(productId);
					if (productData) {
						productData.currentId = currentId;
						this.bundleProducts.set(productId, productData);
					}

					this.saveBundleToStorage();
				}
			}

			async addBundleToCart(button) {
				if (!button) return;
				button.setAttribute('disable', 'true');
        const bundleProducts = this.productIds.map((id) => {
				const prodId = +id.currentId;
				return {
          id: prodId,
          quantity: 1, 
        }});

				const bundleData = {
					items: bundleProducts
				}

        try {
          const response = await fetch(window.routes.cart_url + '/add.js', {
            method: 'POST',
						headers: {
							"Content-Type": "application/json",
							"Accept": "application/json"
						},
            body: JSON.stringify(bundleData),
          });

          if (!response.ok) {
            throw new Error(`${window.bundleStrings.error}`);
          } else {
						if(this.CartDrawer) {
						fetch(`${routes.cart_url}`)
							.then((response) => response.text())
							.then((responseText) => {
						const html = new DOMParser().parseFromString(responseText, 'text/html');
						
						// Update cart drawer items and footer
						const drawerSelectors = ['cart-drawer-items', '.drawer__footer'];
						for (const selector of drawerSelectors) {
							const targetElement = document.querySelector(selector);
							const sourceElement = html.querySelector(selector);
							
							if (targetElement && sourceElement) {
								targetElement.replaceWith(sourceElement);
							}
						}
						
						// Update cart icon bubbles by replacing innerHTML
						const iconSelectors = ['#cart-icon-bubble', '#cart-icon-bubble-sticky'];
						for (const selector of iconSelectors) {
							const targetElement = document.querySelector(selector);
							const sourceElement = html.querySelector(selector);
							
							if (targetElement && sourceElement) {
								targetElement.innerHTML = sourceElement.innerHTML;
							}
						}
					})
							this.CartDrawer.classList.remove('is-empty')
							this.CartDrawer.open()
						}

						button.removeAttribute('disabled');
						this.cleanBundleAfterSubmit();
					}
				
        } catch (error) {
          this.showMessage(error.message);
        }
      }

      showMessage(message) {
        if (this.elements.error) {
          this.elements.error.textContent = message;
          this.elements.error.classList.add('visible');
        }
      }
		}
	
		ProductBundle.prototype.CartDrawer = document.querySelector('cart-drawer')

		customElements.define('product-bundle', ProductBundle);
	}

	if (!customElements.get('product-bundle-sidebar')) {
		class ProductBundleSidebar extends HTMLElement {
			constructor() {
				super();
        this.tabletBreakpoint = 1023; 
        this.isTablet = window.innerWidth < this.tabletBreakpoint;

				this.toggleAccordion = this.toggleAccordion.bind(this);
				this.handleResize = this.handleResize.bind(this);
			}

			connectedCallback() {
        if (this.isTablet) {
          this.setupElements();
          this.setupEventListeners();
          this.initializeState();
        }

        window.addEventListener('resize', this.handleResize);
			}
			
      setupElements() {
        this.toggleButton = this.querySelector('.product-bundle__sidebar-top');
        this.dropdownContent = this.querySelector('.product-bundle__sidebar-body');
        
        // this.toggleButton.setAttribute('aria-expanded', 'false');
        this.dropdownContent.setAttribute('aria-hidden', 'true');
        this.dropdownContent.hidden = true;
      }

      setupEventListeners() {
        if (this.toggleButton) {
          this.toggleButton.addEventListener('click', this.toggleAccordion);
        }
      }

      initializeState() {
        if (this.hasAttribute('open')) {
          this.expandAccordion();
        }
      }

      toggleAccordion() {
        if (this.dropdownContent.hidden) {
          this.expandAccordion();
        } else {
          this.collapseAccordion();
        }
      }

      expandAccordion() {
        this.dropdownContent.hidden = false;
        this.dropdownContent.setAttribute('aria-hidden', 'false');
        // this.toggleButton.setAttribute('aria-expanded', 'true');
        this.classList.add('js-active');
      }

      collapseAccordion() {
        this.dropdownContent.hidden = true;
        this.dropdownContent.setAttribute('aria-hidden', 'true');
        // this.toggleButton.setAttribute('aria-expanded', 'false');
        this.classList.remove('js-active');
      }

      handleResize() {
        const newIsTablet = window.innerWidth < this.tabletBreakpoint;

        if (newIsTablet !== this.isTablet) {
          this.isTablet = newIsTablet;

          if (this.isTablet) {
            this.setupElements();
            this.setupEventListeners();
          } else {
            this.cleanupAccordion();
          }
        }
      }

      cleanupAccordion() {
        this.classList.remove('js-active');
        this.dropdownContent.hidden = false;
        this.toggleButton.setAttribute('aria-expanded', 'false');
        this.dropdownContent.setAttribute('aria-hidden', 'true');
        this.toggleButton.removeEventListener('click', this.toggleAccordion);
      }

      disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize);
        if (this.toggleButton) {
          this.toggleButton.removeEventListener('click', this.toggleAccordion);
        }
      }
		}

		customElements.define('product-bundle-sidebar', ProductBundleSidebar);
	}
	
	if (!customElements.get('bundle-variants')) {
		class BundleVariants extends HTMLElement {
			constructor() {
				super();
				this.onChange = this.onChange.bind(this);
				this.select = null;
				this.productBundle = null;
				this.product = null;
				this.currentValue = null;
				this.initialized = false;
				this.eventListenerAdded = false;
			}

			connectedCallback() {
				// Get select element in connectedCallback to ensure it's available
				if (!this.select) {
					this.select = this.querySelector('select');
				}
				
				if(this.select) {
					// Store the current value from select (could be pre-set)
					this.currentValue = this.select.value;
				}
			}
			
      disconnectedCallback() {
				if (!this.select) return;

				this.select.removeEventListener('change', this.onChange);
				this.initialized = false;
				this.eventListenerAdded = false;
      }

		init() {
			if (this.initialized) {
				return;
			}

			// Ensure select is available
			if (!this.select) {
				this.select = this.querySelector('select');
			}
			
			// Update currentValue with the actual select value
			if (this.select) {
				this.currentValue = this.select.value;
			}

			this.addOnChangeHandler();

			this.productBundle = this.closest('product-bundle')
			this.product = this.closest('[data-component="product-bundle-item"]');
			
			this.initialized = true;
		}

		addOnChangeHandler() {
			// Ensure select is available
			if (!this.select) {
				this.select = this.querySelector('select');
			}
			
			if (!this.select) return;
			
			if (this.eventListenerAdded) {
				return;
			}
			
			this.select.addEventListener('change', this.onChange);
			this.eventListenerAdded = true;
		}

			onChange(e) {
				const id = e.target.value;
				if (this.currentValue == id) return;

				this.currentValue = id;
				this.updateProduct(id);
				this.updateProductBundle();
			}

			updateProduct(id) {
				if (!this.product) return;
				const option = this.select.querySelector(`option[value="${id}"]`);
				
				const { price, media } = option.dataset;
				this.updateCurrentId(option.value);
				this.updatePrice(price);
				this.updateMedia(media);
			}

			updatePrice(price) {
				if (!price) return;
				this.product.currentPrice = this.parsePrice(price);
				const priceContainer = this.product.querySelector('[data-component="product-bundle-item-price"]');
				priceContainer.innerText = price
			}

			parsePrice(priceString) {
				const cleaned = priceString.replace(/[^\d.,-]/g, '');

				const lastDot = cleaned.lastIndexOf('.');
				const lastComma = cleaned.lastIndexOf(',');

				let normalized = cleaned;

				if (lastDot > -1 && lastComma > -1) {
					if (lastDot > lastComma) {
					normalized = cleaned.replace(/,/g, '');
					} else {
					normalized = cleaned.replace(/\./g, '').replace(',', '.');
					}
				} else if (lastComma > -1) {
					normalized = cleaned.replace(',', '.');
				} else {
					normalized = cleaned;
				}

				const value = parseFloat(normalized);
				return isNaN(value) ? 0 : value;
			}

			updateCurrentId(id) {
				if (!id) return;
				this.product.dataset.currentId = id
			}

			updateMedia(media) {
				if (!media) return;
				const img = this.product.querySelector('[data-component="product-bundle-item-media"] img');
				if (!img) return;
				img.src = media;
			}

			updateProductBundle() {
				if (!this.productBundle && !this.product) return;
        this.productBundle.onVariantChange(this.product);
			}
		}

		customElements.define('bundle-variants', BundleVariants);
	}
	
})();