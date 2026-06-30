(function () {
  'use strict';

  class StickyHeader extends HTMLElement {
    constructor() {
      super();
      this.setHeaderHeight = this.setHeaderHeight.bind(this);
    }

    connectedCallback() {
      this.header = document.querySelector('.section-header');
      this.headerIsAlwaysSticky =
        this.getAttribute('data-sticky-type') === 'always' ||
        this.getAttribute('data-sticky-type') === 'reduce-logo-size';
      this.headerBounds = {};
      this.headerTransparent = this.header.querySelector('.header-transparent');

      this.setHeaderHeight();

      if (this.headerTransparent) {
        const setTopPosition = () => {
          const headerHeight = this.header.offsetHeight;
          this.headerTopPosition = headerHeight;
          this.header.style.marginBottom = `-${headerHeight}px`;
        };

        // Mark header as active for transparent styling
        requestAnimationFrame(setTopPosition);

        this.resizeHandler = () => {
          if (this.headerResizeTimeout) {
            clearTimeout(this.headerResizeTimeout);
          }
          this.headerResizeTimeout = setTimeout(setTopPosition, 60);
        };

        window.addEventListener('resize', this.resizeHandler);
        document.body.classList.add('header-transparent-active');
      }

      window.addEventListener('resize', this.setHeaderHeight);
      window.matchMedia('(max-width: 990px)').addEventListener('change', this.setHeaderHeight);

      if (this.headerIsAlwaysSticky) {
        this.header.classList.add('shopify-section-header-sticky');
      }

      this.currentScrollTop = 0;
      this.preventReveal = false;
      this.predictiveSearch = this.querySelector('predictive-search');
      this.resizeTimeouts = new Set(); // Track all timeouts

      this.onScrollHandler = this.onScroll.bind(this);
      this.hideHeaderOnScrollUp = () => {
        this.preventReveal = true;
      };

      this.addEventListener('preventHeaderReveal', this.hideHeaderOnScrollUp);
      window.addEventListener('scroll', this.onScrollHandler, false);

      this.onScroll();
      this.createObserver();
    }

    setHeaderHeight() {
      const updateHeaderHeight = () => {
        document.documentElement.style.setProperty('--header-height', `${this.header.offsetHeight}px`);
      };

      updateHeaderHeight();

      // Remove existing listeners if they exist
      if (this.heightResizeHandler) {
        window.removeEventListener('resize', this.heightResizeHandler);
        window.removeEventListener('orientationchange', this.heightResizeHandler);
      }

      this.heightResizeHandler = () => {
        if (this.heightResizeTimeout) {
          clearTimeout(this.heightResizeTimeout);
        }
        this.heightResizeTimeout = setTimeout(updateHeaderHeight, 60);
      };

      window.addEventListener('resize', this.heightResizeHandler);
      window.addEventListener('orientationchange', this.heightResizeHandler);
    }

    disconnectedCallback() {
      this.removeEventListener('preventHeaderReveal', this.hideHeaderOnScrollUp);
      this.headerTransparent?.classList.remove('header-transparent');
      window.removeEventListener('scroll', this.onScrollHandler);

      // Clean up resize handlers
      if (this.resizeHandler) {
        window.removeEventListener('resize', this.resizeHandler);
      }

      if (this.heightResizeHandler) {
        window.removeEventListener('resize', this.heightResizeHandler);
        window.removeEventListener('orientationchange', this.heightResizeHandler);
      }

      // Clean up timeouts
      if (this.headerResizeTimeout) {
        clearTimeout(this.headerResizeTimeout);
      }

      if (this.heightResizeTimeout) {
        clearTimeout(this.heightResizeTimeout);
      }

      if (this.isScrolling) {
        clearTimeout(this.isScrolling);
      }
    }

    createObserver() {
      let observer = new IntersectionObserver((entries, observer) => {
        this.headerBounds = entries[0].intersectionRect;
        observer.disconnect();
      });

      observer.observe(this.header);
    }

    onScroll() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (this.predictiveSearch && this.predictiveSearch.isOpen) return;

      if (scrollTop > this.currentScrollTop && scrollTop > this.headerBounds.bottom) {
        this.header.classList.add('scrolled-past-header');
        if (this.preventHide) return;
        requestAnimationFrame(this.hide.bind(this));
        this.classList.add('sticky');
      } else if (scrollTop < this.currentScrollTop && scrollTop > this.headerBounds.bottom) {
        this.header.classList.add('scrolled-past-header');
        if (!this.preventReveal) {
          requestAnimationFrame(this.reveal.bind(this));
        } else {
          window.clearTimeout(this.isScrolling);

          this.isScrolling = setTimeout(() => {
            this.preventReveal = false;
          }, 66);

          requestAnimationFrame(this.hide.bind(this));
        }
      } else if (scrollTop <= this.headerBounds.top) {
        this.classList.remove('sticky');
        this.header.classList.remove('scrolled-past-header');
        requestAnimationFrame(this.reset.bind(this));
      }

      if (scrollTop === 0) {
        this.classList.add('header-at-top');
      } else {
        this.classList.remove('header-at-top');
      }

      this.currentScrollTop = scrollTop;
    }

    hide() {
      if (this.headerIsAlwaysSticky) return;
      this.header.classList.add('shopify-section-header-hidden', 'shopify-section-header-sticky');
      this.closeMenuDisclosure();
      this.closeSearchModal();
    }

    reveal() {
      if (this.headerIsAlwaysSticky) return;
      this.header.classList.add('shopify-section-header-sticky', 'animate');
      this.classList.add('sticky');
      this.header.classList.remove('shopify-section-header-hidden');
    }

    reset() {
      if (this.headerIsAlwaysSticky) return;
      this.header.classList.remove('shopify-section-header-hidden', 'shopify-section-header-sticky', 'animate');
    }

    closeMenuDisclosure() {
      this.disclosures = this.disclosures || this.header.querySelectorAll('header-menu');
      if (this.disclosures.length == 0) return;
      this.disclosures.forEach((disclosure) => {
        if (disclosure && typeof disclosure.close === 'function') {
          disclosure.close();
        }
      });
    }

    closeSearchModal() {
      this.searchModal = this.searchModal || this.header.querySelector('details-modal');

      if (this.searchModal && typeof this.searchModal.close === 'function') {
        this.searchModal.close(false);
      }
    }
  }

  customElements.define('sticky-header', StickyHeader);

  if (!customElements.get('search-filter')) {
    class SearchFilter extends HTMLElement {
      constructor() {
        super();
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleSummaryKeyDown = this.handleSummaryKeyDown.bind(this);
        this.toggleDropdown = this.toggleDropdown.bind(this);
        this.handleItemKeyDown = this.handleItemKeyDown.bind(this);
      }

      connectedCallback() {
        this.setupElements();
        this.setupEventListeners();
        this.setInitialTabIndex();
      }

      setupElements() {
        this.elements = {
          summary: this.querySelector('[data-component="search-filter-summary"]'),
          dropdown: this.querySelector('[data-component="search-filter-dropdown"]'),
          items: this.querySelectorAll('.search-collection-item'),
        };
      }

      setInitialTabIndex() {
        if (!this.elements.items.length) return;
        this.elements.items.forEach((item) => item.setAttribute('tabindex', '-1'));
      }

      setupEventListeners() {
        if (!this.elements.summary || !this.elements.dropdown) return;

        this.elements.summary.addEventListener('click', (event) => {
          event.preventDefault();
          const isOpen = this.hasAttribute('open');
          this.toggleDropdown(!isOpen);
        });
        this.elements.summary.addEventListener('keydown', this.handleSummaryKeyDown);
        document.addEventListener('click', this.handleDocumentClick);
        this.elements.dropdown.addEventListener('focusout', this.handleFocusOut.bind(this));

        this.elements.items.forEach((item) => {
          item.addEventListener('keydown', this.handleItemKeyDown);
        });
      }

      handleFocusOut(event) {
        setTimeout(() => {
          const activeElement = document.activeElement;
          if (!this.contains(activeElement)) {
            this.toggleDropdown(false);
          }
        }, 0);
      }

      toggleDropdown(open) {
        if (open) {
          this.setAttribute('open', '');
          this.elements.summary.setAttribute('aria-expanded', 'true');
          this.elements.dropdown.removeAttribute('aria-hidden');

          if (this.elements.items.length > 0) {
            // Make list items focusable
            this.elements.items.forEach((item) => item.setAttribute('tabindex', '0'));
            setTimeout(() => this.elements.items[0].focus(), 100);
          }
        } else {
          this.removeAttribute('open');
          this.elements.summary.setAttribute('aria-expanded', 'false');
          this.elements.dropdown.setAttribute('aria-hidden', 'true');
          // Remove focusability when closed
          this.elements.items.forEach((item) => item.setAttribute('tabindex', '-1'));
        }
      }

      handleDocumentClick(event) {
        if (!this.contains(event.target)) {
          this.toggleDropdown(false);
        }
      }

      handleKeyDown(event) {
        if (this.hasAttribute('open')) {
          const { key } = event;
          const focusableItems = [...this.elements.items];
          const currentIndex = focusableItems.indexOf(document.activeElement);

          if (key === 'ArrowDown') {
            event.preventDefault();
            const nextIndex = (currentIndex + 1) % focusableItems.length;
            focusableItems[nextIndex].focus();
          }

          if (key === 'ArrowUp') {
            event.preventDefault();
            const prevIndex = (currentIndex - 1 + focusableItems.length) % focusableItems.length;
            focusableItems[prevIndex].focus();
          }

          if (key === 'Escape') {
            this.toggleDropdown(false);
          }
        }
      }

      handleSummaryKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          const isOpen = this.hasAttribute('open');
          this.toggleDropdown(!isOpen);
        }
      }
      handleItemKeyDown(event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          this.setActiveCollection(event.target);
        }
      }

      setActiveCollection(selectedItem) {
        selectedItem.click();
        if (this.elements.items.length > 0) {
          this.elements.items.forEach((item) => item.setAttribute('tabindex', '-1'));
        }
      }

      disconnectedCallback() {
        document.removeEventListener('click', this.handleDocumentClick);
        document.removeEventListener('keydown', this.handleKeyDown);
      }
    }

    customElements.define('search-filter', SearchFilter);
  }

  if (!customElements.get('mm-collections')) {
    class MmCollections extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.setupElements();
        this.setupEventListeners();
        this.showTab(0); // Show first tab by default
      }

      disconnectedCallback() {
        this.cleanupEventListeners();
      }

      setupElements() {
        this.headings = this.querySelectorAll('.mm-collection-list__heading');
        this.contents = this.querySelectorAll('.mm-collection-list__content > div');
      }

      setupEventListeners() {
        this.headings.forEach((heading, index) => {
          heading.addEventListener('click', () => this.showTab(index));
          heading.addEventListener('mouseenter', () => this.showTab(index));
          heading.addEventListener('keydown', (event) => this.handleKeyDown(event, index));
        });
      }

      cleanupEventListeners() {
        this.headings.forEach((heading, index) => {
          heading.removeEventListener('click', () => this.showTab(index));
          heading.removeEventListener('mouseenter', () => this.showTab(index));
        });
      }

      handleKeyDown(event, index) {
        if (event.key === 'Enter') {
          event.preventDefault();
          this.showTab(index);
        }
      }

      showTab(index) {
        this.contents.forEach((content, i) => {
          content.classList.toggle('active', i === index);
        });
        this.headings.forEach((heading, i) => {
          heading.classList.toggle('active', i === index);
        });

        this.contents.forEach((content, i) => {
          if (i === index) {
            content.classList.add('active-content');
          } else {
            content.classList.remove('active-content');
          }
        });
      }
    }

    customElements.define('mm-collections', MmCollections);
  }
})();


/* Bymello: open mega menu on hover (desktop) */
(function(){
  function isDesktop(){return window.matchMedia("(min-width: 990px)").matches;}
  function bind(){
    document.querySelectorAll("details.mega-menu").forEach(function(d){
      if(d.__bm)return; d.__bm=true; var t=null;
      function open(){ if(!isDesktop())return; if(t){clearTimeout(t);t=null;} if(!d.hasAttribute("open")) d.setAttribute("open",""); }
      function close(){ if(!isDesktop())return; if(t)clearTimeout(t); t=setTimeout(function(){ d.removeAttribute("open"); t=null; },220); }
      d.addEventListener("mouseenter",open); d.addEventListener("mouseleave",close);
    });
  }
  if(document.readyState!=="loading")bind();else document.addEventListener("DOMContentLoaded",bind);
})();
