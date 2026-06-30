class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

		const customSortByOptions = this.querySelectorAll('.sort-by--item label');
		
		if (customSortByOptions.length > 0) {

			customSortByOptions.forEach(option => {
				option.addEventListener('keydown', (event) => {
					
					if (event.key === 'Enter' || event.keyCode === 13) {
						event.preventDefault();
						option.click(); 
					}
				});
			})
		}

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 800);

    const facetForm = this.querySelector('form');
    facetForm.addEventListener('input', this.debouncedOnSubmit.bind(this));

    const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
    if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
  }

	static verticalFIlterBtn = document.querySelector('vertical-filter-button');
  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    };
    window.addEventListener('popstate', onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((element) => {
      element.classList.toggle('disabled', disable);
    });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    const countContainer = document.getElementById('ProductCount');
    const countContainerDesktop = document.getElementById('ProductCountDesktop');
    const loadingSpinners = document.querySelectorAll(
      '.facets-container .loading__spinner, facet-filters-form .loading__spinner'
    );
    loadingSpinners.forEach((spinner) => spinner.classList.remove('hidden'));
    document.getElementById('ProductGridContainer').querySelector('.collection').classList.add('loading');
    if (countContainer) {
      countContainer.classList.add('loading');
    }
    if (countContainerDesktop) {
      countContainerDesktop.classList.add('loading');
    }

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = (element) => element.url === url;

      FacetFiltersForm.filterData.some(filterDataUrl)
        ? FacetFiltersForm.renderSectionFromCache(filterDataUrl, event)
        : FacetFiltersForm.renderSectionFromFetch(url, event);
    });

    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);

		FacetFiltersForm.updateFocusableItems();
  }
	
	static updateFocusableItems() {
		const grid = document.querySelector('.facets-top + .facets-vertical');
		if (!grid) return;

		const focusableItems = grid.querySelectorAll('.facets-wrapper :is(input:not(.field__range), summary, select, button, a, textarea)')
		if (focusableItems.length == 0) return;

		const focusable = grid.classList.contains('js-active');
		focusableItems.forEach((el) => {
			el.tabIndex = focusable ? 0 : -1;
		});

		const customSortByOptions = document.querySelectorAll('.sort-by--item label');
		
		if (customSortByOptions.length > 0) {

			customSortByOptions.forEach(option => {
				option.addEventListener('keydown', (event) => {
					
					if (event.key === 'Enter' || event.keyCode === 13) {
						event.preventDefault();
						option.click(); 
					}
				});
			})
		}
	}

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, { html, url }];
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);
        if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
      });

		FacetFiltersForm.updateFocusableItems();
  }

  static renderSectionFromCache(filterDataUrl, event) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    FacetFiltersForm.renderFilters(html, event);
    FacetFiltersForm.renderProductGridContainer(html);
    FacetFiltersForm.renderProductCount(html);
    if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
  }

  static renderProductGridContainer(html) {
    document.getElementById('ProductGridContainer').innerHTML = new DOMParser()
      .parseFromString(html, 'text/html')
      .getElementById('ProductGridContainer').innerHTML;

    document
      .getElementById('ProductGridContainer')
      .querySelectorAll('.scroll-trigger')
      .forEach((element) => {
        element.classList.add('scroll-trigger--cancel');
      });
  }

  static renderProductCount(html) {
    const count = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount').innerHTML;
    const container = document.getElementById('ProductCount');
    const containerDesktop = document.getElementById('ProductCountDesktop');
    container.innerHTML = count;
    container.classList.remove('loading');
    if (containerDesktop) {
      containerDesktop.innerHTML = count;
      containerDesktop.classList.remove('loading');
    }
    const loadingSpinners = document.querySelectorAll(
      '.facets-container .loading__spinner, facet-filters-form .loading__spinner'
    );
    loadingSpinners.forEach((spinner) => spinner.classList.add('hidden'));
  }

  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
    const facetDetailsElementsFromFetch = parsedHTML.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );
    const facetDetailsElementsFromDom = document.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );

    // Remove facets that are no longer returned from the server
    Array.from(facetDetailsElementsFromDom).forEach((currentElement) => {
      if (!Array.from(facetDetailsElementsFromFetch).some(({ id }) => currentElement.id === id)) {
        currentElement.remove();
      }
    });

    const matchesId = (element) => {
      const jsFilter = event ? event.target.closest('.js-filter') : undefined;
      return jsFilter ? element.id === jsFilter.id : false;
    };
    const facetsToRender = Array.from(facetDetailsElementsFromFetch).filter((element) => !matchesId(element));
    const countsToRender = Array.from(facetDetailsElementsFromFetch).find(matchesId);

    facetsToRender.forEach((elementToRender, index) => {
      const currentElement = document.getElementById(elementToRender.id);
      // Element already rendered in the DOM so just update the innerHTML
      if (currentElement) {
        document.getElementById(elementToRender.id).innerHTML = elementToRender.innerHTML;
      } else {
        if (index > 0) {
          const { className: previousElementClassName, id: previousElementId } = facetsToRender[index - 1];
          // Same facet type (eg horizontal/vertical or drawer/mobile)
          if (elementToRender.className === previousElementClassName) {
            document.getElementById(previousElementId).after(elementToRender);
            return;
          }
        }

        if (elementToRender.parentElement) {
          document.querySelector(`#${elementToRender.parentElement.id} .js-filter`).before(elementToRender);
        }
      }
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);
    FacetFiltersForm.renderAdditionalElements(parsedHTML);

    if (countsToRender) {
      const closestJSFilterID = event.target.closest('.js-filter').id;

      if (closestJSFilterID) {
        FacetFiltersForm.renderCounts(countsToRender, event.target.closest('.js-filter'));
        FacetFiltersForm.renderMobileCounts(countsToRender, document.getElementById(closestJSFilterID));

        const newFacetDetailsElement = document.getElementById(closestJSFilterID);
        const newElementSelector = newFacetDetailsElement.classList.contains('mobile-facets__details')
          ? `.mobile-facets__close-button`
          : `.facets__summary`;
        const newElementToActivate = newFacetDetailsElement.querySelector(newElementSelector);
        // if (newElementToActivate) newElementToActivate.focus();
      }
    }

		FacetFiltersForm.updateFocusableItems();
  }

  static renderActiveFacets(html) {
    const activeFacetElementSelectors = ['.active-facets-mobile', '.active-facets-desktop'];

    activeFacetElementSelectors.forEach((selector) => {
      const activeFacetsElement = html.querySelector(selector);
      if (!activeFacetsElement) return;
      document.querySelector(selector).innerHTML = activeFacetsElement.innerHTML;
    });

    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    const mobileElementSelectors = ['.mobile-facets__open', '.mobile-facets__count', '.sorting'];

    mobileElementSelectors.forEach((selector) => {
      if (!html.querySelector(selector)) return;
      document.querySelector(selector).innerHTML = html.querySelector(selector).innerHTML;
    });

    document.getElementById('FacetFiltersFormMobile').closest('menu-drawer').bindEvents();
  }

  static renderCounts(source, target) {
    const targetSummary = target.querySelector('.facets__summary');
    const sourceSummary = source.querySelector('.facets__summary');

    if (sourceSummary && targetSummary) {
      targetSummary.outerHTML = sourceSummary.outerHTML;
    }

    const targetHeaderElement = target.querySelector('.facets__header');
    const sourceHeaderElement = source.querySelector('.facets__header');

    if (sourceHeaderElement && targetHeaderElement) {
      targetHeaderElement.outerHTML = sourceHeaderElement.outerHTML;
    }

    const targetWrapElement = target.querySelector('.facets-wrap');
    const sourceWrapElement = source.querySelector('.facets-wrap');

    if (sourceWrapElement && targetWrapElement) {
      const isShowingMore = Boolean(target.querySelector('show-more-button .label-show-more.hidden'));
      if (isShowingMore) {
        sourceWrapElement
          .querySelectorAll('.facets__item.hidden')
          .forEach((hiddenItem) => hiddenItem.classList.replace('hidden', 'show-more-item'));
      }

      targetWrapElement.outerHTML = sourceWrapElement.outerHTML;
    }
  }

  static renderMobileCounts(source, target) {
    const targetFacetsList = target.querySelector('.mobile-facets__list');
    const sourceFacetsList = source.querySelector('.mobile-facets__list');

    if (sourceFacetsList && targetFacetsList) {
      targetFacetsList.outerHTML = sourceFacetsList.outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  static getSections() {
    return [
      {
        section: document.getElementById('product-grid').dataset.id,
      },
    ];
  }

  createSearchParams(form) {
    const formData = new FormData(form);
    return new URLSearchParams(formData).toString();
  }

  onSubmitForm(searchParams, event) {
    FacetFiltersForm.renderPage(searchParams, event);
  }
  onSubmitHandler(event) {
    event.preventDefault();
    const sortFilterForms = document.querySelectorAll('facet-filters-form form');
    if (event.srcElement.className == 'mobile-facets__checkbox') {
      const searchParams = this.createSearchParams(event.target.closest('form'));
      this.onSubmitForm(searchParams, event);
    } else {
      const forms = [];
      const isMobile = event.target.closest('form').id === 'FacetFiltersFormMobile';
			const facetDrawer = document.querySelector('.facets-drawer');
			
      sortFilterForms.forEach((form) => {
        if (!isMobile) {
          if (form.id === 'FacetSortForm' || form.id === 'FacetFiltersForm' || form.id === 'FacetSortDrawerForm') {
            const noJsElements = document.querySelectorAll('.no-js-list');
            noJsElements.forEach((el) => el.remove());
            forms.push(this.createSearchParams(form));
          } else if (facetDrawer && window.innerWidth > 750 && form.id === 'FacetFiltersFormMobile') {
            forms.push(this.createSearchParams(form));
					}
        } else if (form.id === 'FacetFiltersFormMobile') {
          forms.push(this.createSearchParams(form));
        }
      });
      this.onSubmitForm(forms.join('&'), event);
    }
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const url =
      event.currentTarget.href.indexOf('?') == -1
        ? ''
        : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

class PriceRange extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('input').forEach((element) => {
				element.addEventListener('change', this.onRangeChange.bind(this))
				element.addEventListener('keydown', this.onKeyDown.bind(this));
				element.addEventListener('focus', (e) => element.value = '');
			}
    );
    this.setMinAndMaxValues();
		this.controlSlider();
    this.controlInput();
    this.fillSlider();
  }
  onKeyDown(event) {
    if (event.metaKey) return;

    const pattern = /[0-9]|\.|,|'| |Tab|Backspace|Enter|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Delete|Escape/;
    if (!event.key.match(pattern)) event.preventDefault();
  }

  onRangeChange(event) {
    this.adjustToValidValues(event.currentTarget);
    this.setMinAndMaxValues();
  }

  setMinAndMaxValues() {
    const inputs = this.querySelectorAll('input');
    const minInput = inputs[0];
    const maxInput = inputs[1];
    if (maxInput.value) minInput.setAttribute('max', maxInput.value);
    if (minInput.value) maxInput.setAttribute('min', minInput.value);
    if (minInput.value === '' || minInput == NaN) maxInput.setAttribute('min', 0);
    if (maxInput.value === '') minInput.setAttribute('max', maxInput.getAttribute('max'));
  }

  adjustToValidValues(input) {
    const value = Number(input.value);
    const min = Number(input.getAttribute('min'));
    const max = Number(input.getAttribute('max'));

    if (value < min) input.value = min;
    if (value > max) input.value = max;
  }

	fillSlider() {
    document.querySelectorAll(".facets__price .facets__range").forEach(inputWrapper => {
      const inputsRange = inputWrapper.querySelectorAll(".field__range");
      const inputRangeFrom = inputsRange[0];
      const inputRangeTo = inputsRange[1];
      const range = inputRangeTo.max - inputRangeTo.min;
      const fromCurrent = inputRangeFrom.value - inputRangeTo.min;
      const toCurrent = inputRangeTo.value - inputRangeTo.min;
      const minRange = (fromCurrent / range) * 100;
      const maxRange = (toCurrent / range) * 100;

      inputWrapper.setAttribute("style", `--range-min: ${minRange}%; --range-max: ${maxRange}%`);
    });
  }

	controlSlider() {
    const inputRangeWrappers = document.querySelectorAll(".facets__price .facets__range");
    const inputNumberWrappers = document.querySelectorAll(".facets__price .facets__price-wrapper");

    inputRangeWrappers.forEach((inputWrapper, index) => {
      const inputsRange = inputWrapper.querySelectorAll(".field__range");
      const inputRangeFrom = inputsRange[0];
      const inputRangeTo = inputsRange[1];
      const inputNumberFrom = inputNumberWrappers[index].querySelectorAll(".field__input")[0];
      const inputNumberTo = inputNumberWrappers[index].querySelectorAll(".field__input")[1];

      inputRangeFrom.oninput = () => {
        let from = parseInt(inputRangeFrom.value, 10);
				if (!from) from = 0;
        const to = parseInt(inputRangeTo.value, 10);

        if (from > to) {
          inputRangeFrom.value = to;
          inputNumberFrom.value = to;
        } else {
          inputNumberFrom.value = from;
        }
        this.fillSlider();
      };

      if (Number(inputRangeTo.value) <= 0) {
        inputRangeTo.style.zIndex = 2;
      } else {
        inputRangeTo.style.zIndex = 0;
      }

      inputRangeTo.oninput = () => {
        let from = parseInt(inputRangeFrom.value, 10);
				if (!from) from = 0;
        const to = parseInt(inputRangeTo.value, 10);

        if (from <= to) {
          inputRangeTo.value = to;
          inputNumberTo.value = to;
        } else {
          inputNumberTo.value = from;
          inputRangeTo.value = from;
        }

        if (Number(inputRangeTo.value) <= 0) {
          inputRangeTo.style.zIndex = 2;
        } else {
          inputRangeTo.style.zIndex = 0;
        }
        this.fillSlider();
      };
    });
  }

	controlInput() {
    const inputRangeWrappers = document.querySelectorAll(".facets__price .facets__range");

    document.querySelectorAll(".facets__price .facets__price-wrapper").forEach((inputWrapper, index) => {
      const inputsNumber = inputWrapper.querySelectorAll(".field__input");
      const inputNumberFrom = inputsNumber[0];
      const inputNumberTo = inputsNumber[1];
      const inputRangeFrom = inputRangeWrappers[index].querySelectorAll(".field__range")[0];
      const inputRangeTo = inputRangeWrappers[index].querySelectorAll(".field__range")[1];

      inputNumberFrom.oninput = () => {
        let from = parseInt(inputNumberFrom.value, 10);
				if (!from) from = 0;
        const to = parseInt(inputNumberTo.value, 10);

        if (from > to) {
          inputRangeFrom.value = to;
          inputNumberFrom.value = to;
        } else {
          inputRangeFrom.value = from;
        }
        this.fillSlider();
      };

      inputNumberTo.oninput = () => {
        let from = parseInt(inputNumberFrom.value, 10);
				if (!from) from = 0;
        const to = parseInt(inputNumberTo.value, 10);

        if (from <= to) {
          inputRangeTo.value = to;
          inputNumberTo.value = to;
        } else {
          inputRangeTo.value = from;
        }
        this.fillSlider();
      };
    });
  }
}

customElements.define('price-range', PriceRange);

class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const facetLink = this.querySelector('a');
    facetLink.setAttribute('role', 'button');
    facetLink.addEventListener('click', this.closeFilter.bind(this));
    facetLink.addEventListener('keyup', (event) => {
      event.preventDefault();
      if (event.code.toUpperCase() === 'SPACE') this.closeFilter(event);
    });
  }

  closeFilter(event) {
    event.preventDefault();
    const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
    form.onActiveFilterClick(event);
  }
}

customElements.define('facet-remove', FacetRemove);


if (!customElements.get('vertical-filter-button')) {
	class VerticalFilterButton extends HTMLElement {
		constructor() {
			super();
			this.toggleOpen = this.toggleOpen.bind(this);
			this.elements = {
				filter: document.querySelector('.facets-vertical'),
				grid: document.querySelector('.facets-vertical .product-grid'),
			}

			this.elements.focusableItems = this.elements.filter
        ? this.elements.filter.querySelectorAll('.facets-wrapper :is(input:not(.field__range), summary, select, button, a, textarea)')
        : [];
		}

		connectedCallback() {
			this.addEventListener('click', this.toggleOpen);

      this.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.toggleOpen();
        }
      });
		}

		disconnectedCallback() {
      this.removeEventListener('click', this.toggleOpen);
    }
		toggleOpen() {
      if (this.hasAttribute('open')) {
        this.removeAttribute('open');
				if (this.elements.filter) {
					this.elements.filter.classList.remove('js-active');
					this.updateGridColumns('increase');
					this.updateFocusableState(false);
				}
      } else {
        this.setAttribute('open', '');
				if (this.elements.filter) {
					this.elements.filter.classList.add('js-active');
					this.updateGridColumns('reset');
					this.updateFocusableState(true);
				}
      }
    }
    updateFocusableState(isOpen) {
			this.elements.focusableItems = this.elements.filter
        ? this.elements.filter.querySelectorAll('.facets-wrapper :is(input:not(.field__range), summary, select, button, a, textarea)')
        : [];
			if (this.elements.focusableItems.length == 0) return
			
      this.elements.focusableItems.forEach((el) => {
        el.tabIndex = isOpen ? 0 : -1;
      });
    }

		updateGridColumns(action) {
			this.elements.grid = document.querySelector('.facets-vertical .product-grid');

      if (!this.elements.grid) return;

      const gridClassMatch = this.elements.grid.className.match(/grid--(\d+)-col-desktop/);
      if (!gridClassMatch) return;

      const currentColumns = parseInt(gridClassMatch[1], 10);
      let newColumns = currentColumns;

      if (action === 'increase') {
        newColumns = Math.min(currentColumns + 1, 5); 
      } else if (action === 'reset') {
				newColumns = Math.max(currentColumns - 1, 1);
      }

      const newClass = `grid--${newColumns}-col-desktop`;
      this.elements.grid.className = this.elements.grid.className.replace(/grid--\d+-col-desktop/, newClass);
    }
	}

	customElements.define('vertical-filter-button', VerticalFilterButton);
}
