'use strict';

(function () {
  if (typeof SearchForm === 'undefined') return;

	class PredictiveSearch extends SearchForm {
		constructor() {
			super();
			this.cachedResults = {};
			this.predictiveSearchResults = this.querySelector('[data-predictive-search]'); this.allPredictiveSearchInstances = document.querySelectorAll('predictive-search');
			this.designation = this.querySelector('.collections-list__button span');
			this.stickyHeader = this.closest('sticky-header');
			this.isOpen = false;
			this.abortController = new AbortController();
			this.searchTerm = '';

      this.openComponent = this.openComponent.bind(this);
      this.closeComponent = this.closeComponent.bind(this);

			this.setupEventListeners();
		}

    disconnectedCallback() {
      this.removeEventListener('click', this.openComponent);
      document.removeEventListener('click', this.closeComponent, true);
    }

		setupEventListeners() {
			this.input.form.addEventListener('submit', this.onFormSubmit.bind(this));

			this.input.addEventListener('focus', this.onFocus.bind(this));
			this.addEventListener('focusout', this.onFocusOut.bind(this));
			this.addEventListener('keyup', this.onKeyup.bind(this));
			this.addEventListener('keydown', this.onKeydown.bind(this));

			this.fixStickyHeaderPredictiveSearch();

			this.addCollectionFilterHandler();

      this.addEventListener('click', this.openComponent);
      document.addEventListener('click', this.closeComponent, true);
		}

    openComponent(event) {
      event.stopPropagation();
			if (!this.classList.contains('predictive-search--recommendations')) return;
			if (event.target.closest('.collections-list')) return;
			if (event.target.closest('input[type="search"], .reset__button, .search__button')) return;
			if (!this.classList.contains('predictive-search--recommendations')) return;
			if (this.querySelector('.predictive-search__recommendations')) {
				this.classList.add('js-open');
				this.setAttribute('open', 'true');
			}

			const collectionFilter = this.querySelector('.collections-list');
			if (collectionFilter) {
				collectionFilter.removeAttribute('open');
			}
    }

    closeComponent(event) {
			if (!this.classList.contains('predictive-search--recommendations')) return;
      if (!this.contains(event.target)) {
        this.classList.remove('js-open');
				this.removeAttribute('open');
      }
    }
		
		addCollectionFilterHandler() {
			if(!this.designation) return;
			this.collections = this.querySelectorAll('.search-collection-item')
			if (this.collections && this.collections.length > 0) {
				
				this.collections.forEach(collection => {
					collection.addEventListener("click", (e) => {
						let clickedElement = e.target;
						let parentElement = clickedElement.closest('.search-collection-item');
						if (parentElement) clickedElement = parentElement;

						let getNewName = clickedElement.textContent;
						let getNewCollection = clickedElement.getAttribute("data-collection-handle");
						let nameDesignation = this.designation;
						let collectionsDropdown = document.querySelector('.collections-list');
				
						this.collections.forEach(item => item.classList.remove('active'));
						clickedElement.classList.add('active');
						removeStyles();
						nameDesignation.innerHTML = `<span>${getNewName}</span>`;
						collectionsDropdown.className = "collections-list";
				
						if (getNewCollection) {
							
							collectionsDropdown.classList.add(getNewCollection);
				
							function applyStyles() {
								let styleElement = document.createElement('style');
								styleElement.textContent = `
								.header .predictive-search__result-group:not(:has(.${getNewCollection})) .predictive-search__filter-empty {
									display: block;
								}

								.header .predictive-search__list-item--product:not(.${getNewCollection}),
								.header .predictive-search-suggestions { display: none; }`;
								let targetElement = document.querySelector('predictive-search.search-modal__form');
								targetElement.insertBefore(styleElement, targetElement.firstChild);
							}
				
							applyStyles();
						}
				
						collectionsDropdown.removeAttribute('open');
					});
				});
				
				function removeStyles() {
					let targetElement = document.querySelector('predictive-search.search-modal__form');
					let styleElement = targetElement.querySelector('style');
					if (styleElement) {
						let parentElement = styleElement.parentElement;
						parentElement.removeChild(styleElement);
					}
				}
			}
		}

		fixStickyHeaderPredictiveSearch() {
			if (!this.stickyHeader) return;

			const details = this.stickyHeader.querySelector('.header__search details');
			if (!details) return;

			details.addEventListener('click', (e) => {
				if(!details.hasAttribute('open') && !details.isOpen) {
					this.isOpen = true;
					details.isOpen = true;
				} else {
					details.isOpen = false;
				}
			}, {
				capture: true
			})
		}

		getQuery() {
			return this.input.value.trim();
		}

		onChange() {
			super.onChange();
			const newSearchTerm = this.getQuery();
			if (!this.searchTerm || !newSearchTerm.startsWith(this.searchTerm)) {
				// Remove the results when they are no longer relevant for the new search term
				// so they don't show up when the dropdown opens again
				this.querySelector('#predictive-search-results-groups-wrapper')?.remove();
			}

			// Update the term asap, don't wait for the predictive search query to finish loading
			this.updateSearchForTerm(this.searchTerm, newSearchTerm);

			this.searchTerm = newSearchTerm;

			if (!this.searchTerm.length) {
				this.close(true);
				return;
			}

			this.getSearchResults(this.searchTerm);
		}

		onFormSubmit(event) {
			if (!this.getQuery().length || this.querySelector('[aria-selected="true"] a')) event.preventDefault();
		}

		onFormReset(event) {
			super.onFormReset(event);
			if (super.shouldResetForm()) {
				this.searchTerm = '';
				this.abortController.abort();
				this.abortController = new AbortController();
				this.closeResults(true);
			}
		}

		onFocus() {
			const currentSearchTerm = this.getQuery();

			if (!currentSearchTerm.length) return;

			if (this.searchTerm !== currentSearchTerm) {
				// Search term was changed from other search input, treat it as a user change
				this.onChange();
			} else if (this.getAttribute('results') === 'true') {
				this.open();
			} else {
				this.getSearchResults(this.searchTerm);
			}
		}

		onFocusOut() {
			setTimeout(() => {
				if (!this.contains(document.activeElement)) this.close();
			});
		}

		onKeyup(event) {
			if (!this.getQuery().length) this.close(true);
			event.preventDefault();

			switch (event.code) {
				case 'ArrowUp':
					this.switchOption('up');
					break;
				case 'ArrowDown':
					this.switchOption('down');
					break;
				case 'Enter':
					this.selectOption();
					break;
			}
		}

		onKeydown(event) {
			// Prevent the cursor from moving in the input when using the up and down arrow keys
			if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
				event.preventDefault();
			}
		}

		updateSearchForTerm(previousTerm, newTerm) {
			const searchForTextElement = this.querySelector('[data-predictive-search-search-for-text]');
			const currentButtonText = searchForTextElement?.innerText;
			if (currentButtonText) {
				if (currentButtonText.match(new RegExp(previousTerm, 'g'))?.length > 1) {
					// The new term matches part of the button text and not just the search term, do not replace to avoid mistakes
					return;
				}
				const newButtonText = currentButtonText.replace(previousTerm, newTerm);
				searchForTextElement.innerText = newButtonText;
			}
		}

		switchOption(direction) {
			if (!this.getAttribute('open')) return;

			const moveUp = direction === 'up';
			const selectedElement = this.querySelector('[aria-selected="true"]');

			// Filter out hidden elements (duplicated page and article resources) thanks
			// to this https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
			const allVisibleElements = Array.from(this.querySelectorAll('li, button.predictive-search__item')).filter(
				(element) => element.offsetParent !== null
			);
			let activeElementIndex = 0;

			if (moveUp && !selectedElement) return;

			let selectedElementIndex = -1;
			let i = 0;

			while (selectedElementIndex === -1 && i <= allVisibleElements.length) {
				if (allVisibleElements[i] === selectedElement) {
					selectedElementIndex = i;
				}
				i++;
			}

			this.statusElement.textContent = '';

			if (!moveUp && selectedElement) {
				activeElementIndex = selectedElementIndex === allVisibleElements.length - 1 ? 0 : selectedElementIndex + 1;
			} else if (moveUp) {
				activeElementIndex = selectedElementIndex === 0 ? allVisibleElements.length - 1 : selectedElementIndex - 1;
			}

			if (activeElementIndex === selectedElementIndex) return;

			const activeElement = allVisibleElements[activeElementIndex];

			activeElement.setAttribute('aria-selected', true);
			if (selectedElement) selectedElement.setAttribute('aria-selected', false);

			this.input.setAttribute('aria-activedescendant', activeElement.id);
		}

		selectOption() {
			const selectedOption = this.querySelector('[aria-selected="true"] a, button[aria-selected="true"]');

			if (selectedOption) selectedOption.click();
		}

		getSearchResults(searchTerm) {
			const queryKey = searchTerm.replace(' ', '-').toLowerCase();
			this.setLiveRegionLoadingState();

			if (this.cachedResults[queryKey]) {
				this.renderSearchResults(this.cachedResults[queryKey]);
				return;
			}

			fetch(`${routes.predictive_search_url}?q=${encodeURIComponent(searchTerm)}&section_id=predictive-search`, {
				signal: this.abortController.signal,
			})
				.then((response) => {
					if (!response.ok) {
						var error = new Error(response.status);
						this.close();
						throw error;
					}

					return response.text();
				})
				.then((text) => {
					const resultsMarkup = new DOMParser()
						.parseFromString(text, 'text/html')
						.querySelector('#shopify-section-predictive-search').innerHTML;
					// Save bandwidth keeping the cache in all instances synced
					this.allPredictiveSearchInstances.forEach((predictiveSearchInstance) => {
						predictiveSearchInstance.cachedResults[queryKey] = resultsMarkup;
					});
					this.renderSearchResults(resultsMarkup);
				})
				.catch((error) => {
					if (error?.code === 20) {
						// Code 20 means the call was aborted
						return;
					}
					this.close();
					throw error;
				});
		}

		setLiveRegionLoadingState() {
			this.statusElement = this.statusElement || this.querySelector('.predictive-search-status');
			this.loadingText = this.loadingText || this.getAttribute('data-loading-text');

			this.setLiveRegionText(this.loadingText);
			this.setAttribute('loading', true);
		}

		setLiveRegionText(statusText) {
			this.statusElement.setAttribute('aria-hidden', 'false');
			this.statusElement.textContent = statusText;

			setTimeout(() => {
				this.statusElement.setAttribute('aria-hidden', 'true');
			}, 1000);
		}

		renderSearchResults(resultsMarkup) {
			this.predictiveSearchResults.innerHTML = resultsMarkup;
			this.setAttribute('results', true);

			this.setLiveRegionResults();
			this.open();
		}

		setLiveRegionResults() {
			this.removeAttribute('loading');
			this.setLiveRegionText(this.querySelector('[data-predictive-search-live-region-count-value]').textContent);
		}

		getResultsMaxHeight() {
			this.resultsMaxHeight =
				window.innerHeight - document.querySelector('.section-header').getBoundingClientRect().bottom;
			return this.resultsMaxHeight;
		}

		open() {
			this.predictiveSearchResults.style.maxHeight = this.resultsMaxHeight || `${this.getResultsMaxHeight()}px`;
			this.setAttribute('open', true);
			this.input.setAttribute('aria-expanded', true);
			this.isOpen = true;
		}

		close(clearSearchTerm = false) {
			this.closeResults(clearSearchTerm);
			this.isOpen = false;
		}

		closeResults(clearSearchTerm = false) {
			if (clearSearchTerm) {
				this.input.value = '';
				this.removeAttribute('results');
			}
			const selected = this.querySelector('[aria-selected="true"]');

			if (selected) selected.setAttribute('aria-selected', false);

			this.input.setAttribute('aria-activedescendant', '');
			this.removeAttribute('loading');
			this.removeAttribute('open');
			this.input.setAttribute('aria-expanded', false);
			this.resultsMaxHeight = false;
			this.predictiveSearchResults.removeAttribute('style');
		}
	}

	customElements.define('predictive-search', PredictiveSearch);
})();

