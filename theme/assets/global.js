function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe",
    ),
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer, menu-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus.tagName === 'INPUT' &&
    ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN',
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true,
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this)),
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    if (event.target.name === 'plus') {
      if (parseInt(this.input.dataset.min) > parseInt(this.input.step) && this.input.value == 0) {
        this.input.value = this.input.dataset.min;
      } else {
        this.input.stepUp();
      }
    } else {
      this.input.stepDown();
    }

    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);

    if (this.input.dataset.min === previousValue && event.target.name === 'minus') {
      this.input.value = parseInt(this.input.min);
    }
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', parseInt(value) <= min);
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}

customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');
    this.overlay = this.querySelector('.popup-overlay');
    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();

    if (this.overlay) {
      this.overlay.addEventListener('click', this.closeMenuDrawer.bind(this));
    }
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this)),
    );
    this.querySelectorAll(
      'button:not(.localization-selector):not(.country-selector__close-button):not(.country-filter__reset-button)',
    ).forEach((button) => button.addEventListener('click', this.onCloseButtonClick.bind(this)));
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'))
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);

      if (window.matchMedia('(max-width: 990px)')) {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches
          ? addTrapFocus()
          : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove('menu-opening');
    this.mainDetailsToggle.querySelectorAll('details').forEach((details) => {
      details.removeAttribute('open');
      details.classList.remove('menu-opening');
    });
    this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach((submenu) => {
      submenu.classList.remove('submenu-open');
    });
    document.body.classList.remove(`overflow-hidden-${this.dataset.breakpoint}`);
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);

    if (event instanceof KeyboardEvent) elementToFocus?.setAttribute('aria-expanded', false);
  }

  onFocusOut() {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement))
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        if (detailsElement.closest('details[open]')) {
          trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('menu-drawer', MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.querySelector('.section-header');
    this.borderOffset =
      this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    document.documentElement.style.setProperty(
      '--header-bottom-position',
      `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`,
    );
    this.header.classList.add('menu-open');

    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    window.addEventListener('resize', this.onResize);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus) {
    if (!elementToFocus) return;
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
    window.removeEventListener('resize', this.onResize);
  }

  onResize = () => {
    this.header &&
      document.documentElement.style.setProperty(
        '--header-bottom-position',
        `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`,
      );
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  };
}

customElements.define('header-drawer', HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener('click', this.hide.bind(this, false));
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', (event) => {
      // Prevent parent anchors or forms from handling this click
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });

    const quickAdd = this.querySelector('.quick-add__submit');

    if (quickAdd) {
      quickAdd.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          const modal = document.querySelector(this.getAttribute('data-modal'));
          if (modal) modal.show(button);

          quickAdd.click();
          modal.show(quickAdd);
        }
      });
      this.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const modal = document.querySelector(this.getAttribute('data-modal'));
          if (modal) modal.show(button);
          quickAdd.click();
          modal.show(quickAdd);
        }
      });
    }
  }
}
customElements.define('modal-opener', ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    this.addIframeOverlay = this.addIframeOverlay.bind(this);
    this.overlayClick = this.overlayClick.bind(this);
    const poster = this.querySelector('[id^="Deferred-Poster-"]');

    this.addEventListener(
      'click',
      (event) => {
        document.querySelectorAll('video, iframe').forEach((media) => {
          if (!this.contains(media)) {
            if (media.tagName === 'VIDEO' && !media.paused) {
              media.pause();
            } else if (media.tagName === 'IFRAME') {
              const youtubeSrc = media.src;
              if (youtubeSrc.includes('youtube.com') || youtubeSrc.includes('youtu.be')) {
                media.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
              }
            }
          }
        });
      },
      { capture: true },
    );

    this.addEventListener('click', this.addIframeOverlay);

    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
  }

  addIframeOverlay() {
    const deferredMedias = document.querySelectorAll('deferred-media');
    const currentIframe = this.querySelector('iframe');

    if (deferredMedias.length === 0) return;

    deferredMedias.forEach((deferredMedia) => {
      const iframe = deferredMedia.querySelector('iframe');

      if (iframe && iframe !== currentIframe) {
        this.overlayClick();
      }
    });

    // Видаляємо active-клас у поточного DeferredMedia
    this.removeIframeActive();

    this.updateIframesState();
  }

  loadContent(focus = true) {
    window.pauseAllMedia();

    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

      const deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      if (focus) deferredElement.focus();
      if (deferredElement.nodeName === 'VIDEO' && deferredElement.getAttribute('autoplay')) {
        // force autoplay for safari
        deferredElement.play();
      }

      const iframe = this.querySelector('iframe');

      if (iframe) {
        const overlay = document.createElement('div');
        overlay.classList.add('iframe-overlay');
        overlay.setAttribute('data-overlay', '');

        iframe.insertAdjacentElement('afterend', overlay);

        overlay.addEventListener('click', () => {
          document.querySelectorAll('video, iframe').forEach((media) => {
            if (!this.contains(media)) {
              if (media.tagName === 'VIDEO' && !media.paused) {
                media.pause();
              } else if (media.tagName === 'IFRAME') {
                const youtubeSrc = media.src;
                if (youtubeSrc.includes('youtube.com') || youtubeSrc.includes('youtu.be')) {
                  media.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                }
              }
            }
          });

          this.updateIframesState();
        });
      }

      this.setAttribute('loaded', true);
    }
  }

  overlayClick() {
    const iframe = this.querySelector('iframe');
    if (iframe) {
      const overlay = document.createElement('div');
      overlay.classList.add('iframe-overlay');
      overlay.setAttribute('data-overlay', '');

      iframe.insertAdjacentElement('afterend', overlay);
      this.updateIframesState();
    }
  }

  updateIframesState() {
    const deferredMedias = document.querySelectorAll('deferred-media');

    // Перевіряємо, чи є хоча б один `iframe-overlay`
    let anyOverlayExists = false;

    deferredMedias.forEach((deferredMedia) => {
      const overlay = deferredMedia.querySelector('.iframe-overlay');
      if (overlay) {
        anyOverlayExists = true;
      }
    });

    deferredMedias.forEach((deferredMedia) => {
      const overlay = deferredMedia.querySelector('.iframe-overlay');

      if (overlay) {
        if (anyOverlayExists) {
          overlay.classList.add('iframe-active');
        } else {
          overlay.classList.remove('iframe-active');
        }
      }
    });

    this.removeIframeActive();
  }

  removeIframeActive() {
    const overlay = this.querySelector('.iframe-overlay');
    if (overlay) {
      overlay.classList.remove('iframe-active');
    }
  }
}

customElements.define('deferred-media', DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]');
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    // Slider scrollbar elements
    this.scrollbar = this.querySelector('.slider-scrollbar');
    this.scrollbarTrack = this.scrollbar?.querySelector('.slider-scrollbar__track');
    this.scrollbarThumb = this.scrollbar?.querySelector('.slider-scrollbar__thumb');

    if (!this.slider) return;

    this.initPages();
    const resizeObserver = new ResizeObserver((entries) => this.initPages());
    resizeObserver.observe(this.slider);

    this.slider.addEventListener('scroll', this.update.bind(this));

    // Додати обробники подій тільки якщо кнопки існують
    if (this.prevButton) {
      this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
    }
    if (this.nextButton) {
      this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
    }

    // Initialize scrollbar if present
    this.initScrollbar();
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter((element) => element.clientWidth > 0);
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
    this.slidesPerPage = Math.floor(
      (this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset,
    );
    // this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage;
    this.update();
  }

  initScrollbar() {
    // Безпечна ініціалізація scrollbar тільки якщо всі елементи присутні
    if (!this.scrollbar || !this.scrollbarTrack || !this.scrollbarThumb) {
      return; // Вихід без помилок, якщо scrollbar не відображається
    }

    // Додавання обробника кліку на scrollbar track
    this.scrollbarTrack.addEventListener('click', this.onScrollbarClick.bind(this));

    // Додавання обробника перетягування для scrollbar thumb
    this.scrollbarThumb.addEventListener('mousedown', this.onScrollbarMouseDown.bind(this));

    // Ініціалізація стану scrollbar
    this.updateScrollbar();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
    // Оновити scrollbar після зміни сторінок
    this.updateScrollbar();
  }

  update() {
    // Temporarily prevents unneeded updates resulting from variant changes
    // This should be refactored as part of https://github.com/Shopify/dawn/issues/2057
    if (!this.slider) return;

    const previousPage = this.currentPage;
    this.currentPage = Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }

    if (this.currentPage != previousPage) {
      this.dispatchEvent(
        new CustomEvent('slideChanged', {
          detail: {
            currentPage: this.currentPage,
            currentElement: this.sliderItemsToShow[this.currentPage - 1],
          },
        }),
      );
    }

    if (this.enableSliderLooping) return;

    // Оновлення стану кнопок тільки якщо вони існують
    if (this.prevButton) {
      if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.slider.scrollLeft === 0) {
        this.prevButton.setAttribute('disabled', 'disabled');
      } else {
        this.prevButton.removeAttribute('disabled');
      }
    }

    if (this.nextButton) {
      if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
        this.nextButton.setAttribute('disabled', 'disabled');
      } else {
        this.nextButton.removeAttribute('disabled');
      }
    }

    // Оновити позицію scrollbar
    this.updateScrollbar();
  }

  updateScrollbar() {
    // Безпечне оновлення scrollbar тільки якщо він присутній
    if (!this.scrollbarThumb || !this.slider) return;

    const maxScrollLeft = this.slider.scrollWidth - this.slider.clientWidth;
    if (maxScrollLeft <= 0) {
      // Приховати scrollbar якщо немає можливості скролити
      this.scrollbar?.classList.add('slider-scrollbar--hidden');
      return;
    } else {
      this.scrollbar?.classList.remove('slider-scrollbar--hidden');
    }

    // Розрахунок ширини та позиції thumb
    const scrollRatio = this.slider.clientWidth / this.slider.scrollWidth;
    const thumbWidth = Math.max(20, this.scrollbarTrack.clientWidth * scrollRatio); // Мінімальна ширина 20px

    const scrollProgress = this.slider.scrollLeft / maxScrollLeft;
    const maxThumbLeft = this.scrollbarTrack.clientWidth - thumbWidth;
    const thumbLeft = scrollProgress * maxThumbLeft;

    // Застосування стилів до thumb
    this.scrollbarThumb.style.width = `${thumbWidth}px`;
    this.scrollbarThumb.style.transform = `translateX(${thumbLeft}px)`;
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
    if (!element) return;
    return element.offsetLeft + element.clientWidth <= lastVisibleSlide && element.offsetLeft >= this.slider.scrollLeft;
  }

  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    this.slideScrollPosition =
      event.currentTarget.name === 'next'
        ? this.slider.scrollLeft + step * this.sliderItemOffset
        : this.slider.scrollLeft - step * this.sliderItemOffset;
    this.setSlidePosition(this.slideScrollPosition);
  }

  setSlidePosition(position) {
    this.slider.scrollTo({
      left: position,
    });
  }

  onScrollbarClick(event) {
    // Безпечний обробник кліку на scrollbar track
    if (!this.scrollbarTrack || !this.slider) return;

    // Запобігти спрацьовуванню якщо клік на thumb
    if (event.target === this.scrollbarThumb) return;

    const rect = this.scrollbarTrack.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const trackWidth = this.scrollbarTrack.clientWidth;

    const clickRatio = clickX / trackWidth;
    const maxScrollLeft = this.slider.scrollWidth - this.slider.clientWidth;
    const targetScrollLeft = clickRatio * maxScrollLeft;

    this.setSlidePosition(targetScrollLeft);
  }

  onScrollbarMouseDown(event) {
    // Безпечний обробник початку перетягування thumb
    if (!this.scrollbarTrack || !this.scrollbarThumb || !this.slider) return;

    event.preventDefault();

    const startX = event.clientX;
    const startScrollLeft = this.slider.scrollLeft;
    const maxScrollLeft = this.slider.scrollWidth - this.slider.clientWidth;
    const trackWidth = this.scrollbarTrack.clientWidth;
    const thumbWidth = this.scrollbarThumb.clientWidth;
    const maxThumbLeft = trackWidth - thumbWidth;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const thumbDelta = deltaX;
      const scrollDelta = (thumbDelta / maxThumbLeft) * maxScrollLeft;
      const newScrollLeft = Math.max(0, Math.min(maxScrollLeft, startScrollLeft + scrollDelta));

      this.setSlidePosition(newScrollLeft);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.scrollbarThumb.classList.remove('slider-scrollbar__thumb--dragging');
    };

    this.scrollbarThumb.classList.add('slider-scrollbar__thumb--dragging');
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector('.slideshow__slide');
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.announcementBarSlider = this.querySelector('.announcement-bar-slider');
    // Value below should match --duration-announcement-bar CSS value
    this.announcerBarAnimationDelay = this.announcementBarSlider ? 250 : 0;

    this.sliderControlLinksArray = Array.from(this.sliderControlWrapper.querySelectorAll('.slider-counter__link'));
    this.sliderControlLinksArray.forEach((link) => link.addEventListener('click', this.linkToSlide.bind(this)));
    this.slider.addEventListener('scroll', this.setSlideVisibility.bind(this));
    this.setSlideVisibility();

    if (this.announcementBarSlider) {
      this.announcementBarArrowButtonWasClicked = false;

      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion.addEventListener('change', () => {
        if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
      });

      [this.prevButton, this.nextButton].forEach((button) => {
        button.addEventListener(
          'click',
          () => {
            this.announcementBarArrowButtonWasClicked = true;
          },
          { once: true },
        );
      });
    }

    if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
  }

  setAutoPlay() {
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    this.addEventListener('mouseover', this.focusInHandling.bind(this));
    this.addEventListener('mouseleave', this.focusOutHandling.bind(this));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));

    if (this.querySelector('.slideshow__autoplay')) {
      this.sliderAutoplayButton = this.querySelector('.slideshow__autoplay');
      this.sliderAutoplayButton.addEventListener('click', this.autoPlayToggle.bind(this));
      this.autoplayButtonIsSetToPlay = true;
      this.play();
    } else {
      this.reducedMotion.matches || this.announcementBarArrowButtonWasClicked ? this.pause() : this.play();
    }
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    this.wasClicked = true;

    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) {
      this.applyAnimationToAnnouncementBar(event.currentTarget.name);
      return;
    }

    if (isFirstSlide && event.currentTarget.name === 'previous') {
      this.slideScrollPosition =
        this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === 'next') {
      this.slideScrollPosition = 0;
    }

    this.setSlidePosition(this.slideScrollPosition);

    this.applyAnimationToAnnouncementBar(event.currentTarget.name);
  }

  setSlidePosition(position) {
    if (this.setPositionTimeout) clearTimeout(this.setPositionTimeout);
    this.setPositionTimeout = setTimeout(() => {
      this.slider.scrollTo({
        left: position,
      });
    }, this.announcerBarAnimationDelay);
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach((link) => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
    this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
      this.play();
    } else if (!this.reducedMotion.matches && !this.announcementBarArrowButtonWasClicked) {
      this.play();
    }
  }

  focusInHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
        this.play();
      } else if (this.autoplayButtonIsSetToPlay) {
        this.pause();
      }
    } else if (this.announcementBarSlider.contains(event.target)) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    clearInterval(this.autoplay);
    this.autoplay = setInterval(this.autoRotateSlides.bind(this), this.autoplaySpeed);
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.playSlideshow);
    } else {
      this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.pauseSlideshow);
    }
  }

  autoRotateSlides() {
    const slideScrollPosition =
      this.currentPage === this.sliderItems.length ? 0 : this.slider.scrollLeft + this.sliderItemOffset;

    this.setSlidePosition(slideScrollPosition);
    this.applyAnimationToAnnouncementBar();
  }

  setSlideVisibility(event) {
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll('a');
      if (index === this.currentPage - 1) {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.removeAttribute('tabindex');
          });
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');
      } else {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.setAttribute('tabindex', '-1');
          });
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
      }
    });
    this.wasClicked = false;
  }

  applyAnimationToAnnouncementBar(button = 'next') {
    if (!this.announcementBarSlider) return;

    const itemsCount = this.sliderItems.length;
    const increment = button === 'next' ? 1 : -1;

    const currentIndex = this.currentPage - 1;
    let nextIndex = (currentIndex + increment) % itemsCount;
    nextIndex = nextIndex === -1 ? itemsCount - 1 : nextIndex;

    const nextSlide = this.sliderItems[nextIndex];
    const currentSlide = this.sliderItems[currentIndex];

    const animationClassIn = 'announcement-bar-slider--fade-in';
    const animationClassOut = 'announcement-bar-slider--fade-out';

    const isFirstSlide = currentIndex === 0;
    const isLastSlide = currentIndex === itemsCount - 1;

    const shouldMoveNext = (button === 'next' && !isLastSlide) || (button === 'previous' && isFirstSlide);
    const direction = shouldMoveNext ? 'next' : 'previous';

    currentSlide.classList.add(`${animationClassOut}-${direction}`);
    nextSlide.classList.add(`${animationClassIn}-${direction}`);

    setTimeout(() => {
      currentSlide.classList.remove(`${animationClassOut}-${direction}`);
      nextSlide.classList.remove(`${animationClassIn}-${direction}`);
    }, this.announcerBarAnimationDelay * 2);
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition =
      this.slider.scrollLeft +
      this.sliderFirstItemNode.clientWidth *
        (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition,
    });
  }

  disconnectedCallback() {
    // Clean up autoplay interval
    if (this.autoplay) {
      clearInterval(this.autoplay);
      this.autoplay = null;
    }

    // Clean up reducedMotion listener
    if (this.reducedMotion && this.reducedMotionHandler) {
      this.reducedMotion.removeEventListener('change', this.reducedMotionHandler);
    }

    // Clean up event listeners
    if (this.sliderControlLinksArray) {
      this.sliderControlLinksArray.forEach((link) => link.removeEventListener('click', this.linkToSlide.bind(this)));
    }

    if (this.slider) {
      this.slider.removeEventListener('scroll', this.setSlideVisibility.bind(this));
    }

    if (this.sliderAutoplayButton) {
      this.sliderAutoplayButton.removeEventListener('click', this.autoPlayToggle.bind(this));
    }

    // Clean up autoplay event listeners
    this.removeEventListener('mouseover', this.focusInHandling.bind(this));
    this.removeEventListener('mouseleave', this.focusOutHandling.bind(this));
    this.removeEventListener('focusin', this.focusInHandling.bind(this));
    this.removeEventListener('focusout', this.focusOutHandling.bind(this));
  }
}

customElements.define('slideshow-component', SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
  }

  connectedCallback() {
    this.stickyAddToCartBtn = document.querySelector('.section-sticky-atc-bar .button-add-card');
  }
  updateStickyAddToCartInput(id) {
    if (!this.stickyAddToCartBtn) return;

    const input = this.stickyAddToCartBtn.parentElement.querySelector('input[name="id"]');
    if (!input) return;
    input.value = id;

    const select = this.stickyAddToCartBtn.parentElement.querySelector('.select__select');
    if (!select) return;
    select.value = id;

    const colorVariants = this.stickyAddToCartBtn.parentElement.querySelector('.card-variants');
    if (!colorVariants) return;
    const variants = [...colorVariants.querySelectorAll('.card-variant')];
    variants.forEach((variant) => {
      if (id == variant.dataset.variantId) {
        variant.click();
      }
    });
  }

  updateStickyAddToCartPrice(price) {
    this.stickyAddToCartPrice = document.querySelector('.section-sticky-atc-bar .price__container');
    if (!this.stickyAddToCartPrice || !price) return;
    const duplicatePrice = price.cloneNode(true);
    this.stickyAddToCartPrice.replaceWith(duplicatePrice);
    // Ensure strike/has-strike state is recalculated for the sticky bar
    const stickyAtcBarEl = document.querySelector('sticky-atc-bar');
    if (stickyAtcBarEl && typeof stickyAtcBarEl.markEmptyStrike === 'function') {
      stickyAtcBarEl.markEmptyStrike();
    }
  }

  updateStickyAddToCartButton(disable, text) {
    if (!this.stickyAddToCartBtn) return;
    if (disable) {
      this.stickyAddToCartBtn.setAttribute('disabled', 'disabled');
    } else {
      this.stickyAddToCartBtn.removeAttribute('disabled');
    }

    const span = this.stickyAddToCartBtn.querySelector('span');
    if (!span || !text) return;
    span.textContent = text;
  }
  onVariantChange(event) {
    this.updateOptions();
    this.updateMasterId();
    this.updateSelectedSwatchValue(event);
    this.toggleAddButton(true, '', false);
    this.updatePickupAvailability();
    this.removeErrorMessage();
    this.updateVariantStatuses();

    if (!this.currentVariant && this.selectNearestAvailableOptions(event.target)) {
      this.updateOptions();
      this.updateMasterId();
      this.updateVariantStatuses();
    }

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }

  // Bymello: when changing an earlier option (e.g. Color) leaves a later one
  // (e.g. Size) pointing at a now-unavailable value, jump to the closest
  // available value instead of leaving the selection stuck on "Unavailable".
  // Distance is measured on the standard size scale, not the option's
  // configured value order - that order isn't reliably size-sequential in
  // this catalog (e.g. one product's Size values are literally
  // ["S","XXL","M","L","XL"]), so index-based "nearest" would pick nonsense.
  selectNearestAvailableOptions(changedElement) {
    const inputWrappers = [...this.querySelectorAll('.product-form__input')];
    const changedWrapper = changedElement.closest('.product-form__input');
    const changedIndex = inputWrappers.indexOf(changedWrapper);
    if (changedIndex === -1) return false;

    let corrected = false;
    for (let i = changedIndex + 1; i < inputWrappers.length; i++) {
      const wrapper = inputWrappers[i];
      const priorOptionValues = this.options.slice(0, i);
      const optionKey = `option${i + 1}`;

      const availableValues = this.variantData
        .filter(
          (variant) =>
            variant.available && priorOptionValues.every((val, idx) => variant[`option${idx + 1}`] === val),
        )
        .map((variant) => variant[optionKey]);

      const currentValue = this.options[i];
      if (availableValues.includes(currentValue) || availableValues.length === 0) continue;

      const orderedValues = [...wrapper.querySelectorAll('input[type="radio"], option')].map((element) =>
        element.getAttribute('value'),
      );
      const ranks = orderedValues.map((value) => this.sizeRank(value));
      const useRank = !ranks.includes(null);
      const positionOf = (value) => (useRank ? this.sizeRank(value) : orderedValues.indexOf(value));

      const currentPosition = positionOf(currentValue);
      if (currentPosition === null || currentPosition === -1) continue;

      let nearestValue = null;
      let nearestDistance = Infinity;
      orderedValues.forEach((value) => {
        if (!availableValues.includes(value)) return;
        const distance = Math.abs(positionOf(value) - currentPosition);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestValue = value;
        }
      });
      if (nearestValue === null) continue;

      this.selectOptionValue(wrapper, nearestValue);
      this.options[i] = nearestValue;
      corrected = true;
    }

    return corrected;
  }

  // Ranks common apparel size labels on a fixed scale, plus plain numeric
  // sizes (EU/US style). Returns null when a value doesn't match either, so
  // callers can fall back to the option's configured order instead.
  sizeRank(value) {
    if (value == null) return null;
    const normalized = value.trim().toUpperCase().replace(/\s+/g, '');
    const canonicalSizes = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
    const aliases = { XXL: '2XL', XXXL: '3XL', XXXXL: '4XL', XXXXXL: '5XL', '1XL': 'XL' };
    const key = aliases[normalized] || normalized;
    const rank = canonicalSizes.indexOf(key);
    if (rank !== -1) return rank;
    if (/^-?\d+([.,]\d+)?$/.test(normalized)) return parseFloat(normalized.replace(',', '.'));
    return null;
  }

  selectOptionValue(wrapper, value) {
    const select = wrapper.querySelector('select');
    if (select) {
      select.value = value;
      return;
    }
    const radio = [...wrapper.querySelectorAll('input[type="radio"]')].find((input) => input.value === value);
    if (radio) radio.checked = true;
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select, fieldset'), (element) => {
      if (element.tagName === 'SELECT') {
        return element.value;
      }
      if (element.tagName === 'FIELDSET') {
        return Array.from(element.querySelectorAll('input')).find((radio) => radio.checked)?.value;
      }
    });
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateSelectedSwatchValue({ target }) {
    const { name, value, tagName } = target;

    if (tagName === 'SELECT' && target.selectedOptions.length) {
      const swatchValue = target.selectedOptions[0].dataset.optionSwatchValue;
      const selectedDropdownSwatchValue = this.querySelector(`[data-selected-dropdown-swatch="${name}"] > .swatch`);
      if (!selectedDropdownSwatchValue) return;
      if (swatchValue) {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', swatchValue);
        selectedDropdownSwatchValue.classList.remove('swatch--unavailable');
      } else {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', 'unset');
        selectedDropdownSwatchValue.classList.add('swatch--unavailable');
      }

      selectedDropdownSwatchValue.style.setProperty(
        '--swatch-focal-point',
        target.selectedOptions[0].dataset.optionSwatchFocalPoint || 'unset',
      );
    } else if (tagName === 'INPUT' && target.type === 'radio') {
      const selectedSwatchValue = this.querySelector(`[data-selected-swatch-value="${name}"]`);
      if (selectedSwatchValue) selectedSwatchValue.innerHTML = value;
    }
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    // Use originalSection for quick-add modal, otherwise use section
    const sectionId = this.dataset.originalSection || this.dataset.section;

    // Find all media galleries that contain the section ID in their ID
    const mediaGalleries = document.querySelectorAll(`media-gallery[id*="${sectionId}"]`);

    mediaGalleries.forEach((mediaGallery) => {
      // Extract the actual section ID from the gallery's ID attribute
      const galleryIdMatch = mediaGallery.id.match(/MediaGallery-(.+?)(?:-duplicate)?$/);
      const actualSectionId = galleryIdMatch ? galleryIdMatch[1] : sectionId;
      const mediaId = `${actualSectionId}-${this.currentVariant.featured_media.id}`;

      // Check if the custom element is properly defined and has the method
      if (mediaGallery.setActiveMedia && typeof mediaGallery.setActiveMedia === 'function') {
        mediaGallery.setActiveMedia(mediaId, true);
      } else {
        // Fallback: try to find the media element and activate it manually
        const activeMedia = mediaGallery.querySelector(`[data-media-id="${mediaId}"]`);
        if (activeMedia) {
          const mediaGallerySlider = mediaGallery.querySelector('media-gallery-slider');

          // If it's a swiper slider
          if (mediaGallerySlider && mediaGallerySlider.swiper) {
            const slideIndex = Array.from(mediaGallerySlider.swiper.slides).findIndex(
              (slide) => slide.getAttribute('data-media-id') === mediaId,
            );
            if (slideIndex !== -1) {
              mediaGallerySlider.swiper.slideTo(slideIndex);
            }
          } else {
            // Standard non-swiper gallery
            mediaGallery.querySelectorAll('[data-media-id]').forEach((element) => {
              element.classList.remove('is-active');
            });
            activeMedia.classList.add('is-active');
            activeMedia.parentElement.prepend(activeMedia);
          }
        }
      }
    });

    const modalContent = document.querySelector(`#ProductModal-${sectionId} .product-media-modal__content`);
    if (!modalContent) return;
    const newMediaModal = modalContent.querySelector(`[data-media-id="${this.currentVariant.featured_media.id}"]`);
    if (newMediaModal) modalContent.prepend(newMediaModal);
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateShareUrl() {
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`,
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => this.querySelector(':checked').value === variant.option1,
    );
    const inputWrappers = [...this.querySelectorAll('.product-form__input')];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [...option.querySelectorAll('input[type="radio"], option')];
      const previousOptionSelected = inputWrappers[index - 1].querySelector(':checked').value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter((variant) => variant.available && variant[`option${index}`] === previousOptionSelected)
        .map((variantOption) => variantOption[`option${index + 1}`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  setInputAvailability(elementList, availableValuesList) {
    elementList.forEach((element) => {
      const value = element.getAttribute('value');
      const availableElement = availableValuesList.includes(value);

      if (element.tagName === 'INPUT') {
        element.classList.toggle('disabled', !availableElement);
      } else if (element.tagName === 'OPTION') {
        element.innerText = availableElement
          ? value
          : window.variantStrings.unavailable_with_option.replace('[value]', value);
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;

    fetch(
      `${this.dataset.url}?variant=${requestedVariantId}&section_id=${
        this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section
      }`,
    )
      .then((response) => response.text())
      .then((responseText) => {
        // prevent unnecessary ui changes from abandoned selections
        if (this.currentVariant.id !== requestedVariantId) return;

        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const destination = document.getElementById(`price-${this.dataset.section}`);
        const source = html.getElementById(
          `price-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`,
        );
        const skuSource = html.getElementById(
          `Sku-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`,
        );
        const skuDestination = document.getElementById(`Sku-${this.dataset.section}`);
        const inventorySource = html.getElementById(
          `Inventory-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`,
        );
        const inventoryDestination = document.getElementById(`Inventory-${this.dataset.section}`);

        const volumePricingSource = html.getElementById(
          `Volume-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`,
        );

        const pricePerItemDestination = document.getElementById(`Price-Per-Item-${this.dataset.section}`);
        const pricePerItemSource = html.getElementById(
          `Price-Per-Item-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`,
        );

        const volumePricingDestination = document.getElementById(`Volume-${this.dataset.section}`);
        const qtyRules = document.getElementById(`Quantity-Rules-${this.dataset.section}`);
        const volumeNote = document.getElementById(`Volume-Note-${this.dataset.section}`);

        if (volumeNote) volumeNote.classList.remove('hidden');
        if (volumePricingDestination) volumePricingDestination.classList.remove('hidden');
        if (qtyRules) qtyRules.classList.remove('hidden');

        if (source && destination) destination.innerHTML = source.innerHTML;
        if (inventorySource && inventoryDestination) inventoryDestination.innerHTML = inventorySource.innerHTML;
        if (skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle('hidden', skuSource.classList.contains('hidden'));
        }

        if (volumePricingSource && volumePricingDestination) {
          volumePricingDestination.innerHTML = volumePricingSource.innerHTML;
        }

        if (pricePerItemSource && pricePerItemDestination) {
          pricePerItemDestination.innerHTML = pricePerItemSource.innerHTML;
          pricePerItemDestination.classList.toggle('hidden', pricePerItemSource.classList.contains('hidden'));
        }

        this.updateStickyAddToCartInput(this.currentVariant.id);

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) {
          price.classList.remove('hidden');
          const priceHtml = price.querySelector('.price__container');
          this.updateStickyAddToCartPrice(priceHtml);
        }

        if (inventoryDestination) inventoryDestination.classList.toggle('hidden', inventorySource.innerText === '');

        const addButtonUpdated = html.getElementById(`ProductSubmitButton-${sectionId}`);
        this.toggleAddButton(
          addButtonUpdated ? addButtonUpdated.hasAttribute('disabled') : true,
          window.variantStrings.soldOut,
        );

        publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId,
            html,
            variant: this.currentVariant,
          },
        });
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    const dynamicCheckoutButton = productForm.querySelector('.shopify-payment-button__button');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) {
        if (addButtonText) addButtonText.textContent = text;
      }
      // Disable dynamic checkout button
      if (dynamicCheckoutButton) {
        dynamicCheckoutButton.setAttribute('disabled', 'disabled');
        dynamicCheckoutButton.setAttribute('aria-disabled', 'true');
      }
      this.updateStickyAddToCartButton(disable, text);
    } else {
      addButton.removeAttribute('disabled');
      if (addButtonText) addButtonText.textContent = window.variantStrings.addToCart;
      // Enable dynamic checkout button
      if (dynamicCheckoutButton) {
        dynamicCheckoutButton.removeAttribute('disabled');
        dynamicCheckoutButton.removeAttribute('aria-disabled');
      }
      this.updateStickyAddToCartButton(disable, window.variantStrings.addToCart);
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(`Inventory-${this.dataset.section}`);
    const sku = document.getElementById(`Sku-${this.dataset.section}`);
    const pricePerItem = document.getElementById(`Price-Per-Item-${this.dataset.section}`);
    const volumeNote = document.getElementById(`Volume-Note-${this.dataset.section}`);
    const volumeTable = document.getElementById(`Volume-${this.dataset.section}`);
    const qtyRules = document.getElementById(`Quantity-Rules-${this.dataset.section}`);

    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;

    if (price) price.classList.add('hidden');
    if (inventory) inventory.classList.add('hidden');
    if (sku) sku.classList.add('hidden');
    if (pricePerItem) pricePerItem.classList.add('hidden');
    if (volumeNote) volumeNote.classList.add('hidden');
    if (volumeTable) volumeTable.classList.add('hidden');
    if (qtyRules) qtyRules.classList.add('hidden');
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

customElements.define('variant-selects', VariantSelects);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
    this.swiper = null;
    this.onClickHandler = this.onClickHandler.bind(this);
  }

  connectedCallback() {
    this.nextBtn = this.querySelector('.swiper-button-next');
    this.prevBtn = this.querySelector('.swiper-button-prev');

    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);

      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement('div');
          html.innerHTML = text;
          const recommendations = html.querySelector('product-recommendations');

          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
          }

          if (html.querySelector('.grid__item')) {
            this.classList.add('product-recommendations--loaded');
          }

          // Initialize scroll animations for dynamically loaded content
          if (typeof initializeScrollAnimationTrigger === 'function') {
            initializeScrollAnimationTrigger(this);
          }

          this.slides = this.querySelectorAll('.grid__item');
          this.slider = this.querySelector('.swiper');
          this.nextBtns = Array.from(this.querySelectorAll('.swiper-button-next'));
          this.prevBtns = Array.from(this.querySelectorAll('.swiper-button-prev'));

          const { enableSlideshow } = this.dataset;

          if (enableSlideshow == 'true') {
            this.initSlider();
            this.updateNavigationButtons();
            window.addEventListener('resize', () => {
              if (this.slider) {
                this.slider.closest('.shopify-section')?.removeEventListener('click', this.onClickHandler);
                this.slider.closest('.shopify-section')?.removeEventListener('keydown', this.onKeyDownHandler);
              }
              this.initSlider();
            });
          }
        })
        .catch((e) => {
          console.error(e);
        });
    };

    new IntersectionObserver(handleIntersection.bind(this), { rootMargin: '0px 0px 400px 0px' }).observe(this);
  }

  disconnectedCallback() {
    if (this.slider) {
      this.slider.closest('.shopify-section')?.removeEventListener('click', this.onClickHandler);
    }
  }

  initSlider() {
    const slidesLength = this.slides.length;

    if (slidesLength == 0 || !this.slider) {
      return;
    }

    let { slidesPerView = 1, slidesPerViewTb = 1, slidesPerViewPc = 1, slidesPerViewPcLg = 1 } = this.dataset;

    slidesPerView = slidesLength < +slidesPerView ? Math.floor(+slidesPerView) : +slidesPerView;
    slidesPerViewTb = slidesLength < +slidesPerViewTb ? Math.floor(+slidesPerViewTb) : +slidesPerViewTb;
    slidesPerViewPc = slidesLength < +slidesPerViewPc ? Math.floor(+slidesPerViewPc) : +slidesPerViewPc;
    slidesPerViewPcLg = slidesLength < +slidesPerViewPcLg ? Math.floor(+slidesPerViewPcLg) : +slidesPerViewPcLg;

    this.swiper = new Swiper(this.slider, {
      slidesPerView,
      loop: false,
      scrollbar: true,
      spaceBetween: 16,
      scrollbar: {
        el: '.swiper-scrollbar',
      },
      breakpoints: {
        750: {
          slidesPerView: slidesPerViewTb,
        },
        990: {
          slidesPerView: slidesPerViewPc,
        },
        1400: {
          slidesPerView: slidesPerViewPcLg,
        },
      },
      on: {
        slideChange: this.updateNavigationButtons,
        init: this.updateNavigationButtons,
      },
    });

    this.setupExternalNavigation();
    this.updateNavigationButtons();
  }
  setupExternalNavigation = () => {
    if (this.nextBtns.length === 0 || this.prevBtns.length === 0) return;

    const parentContainer = this.slider.closest('.shopify-section');
    if (!parentContainer) return;

    parentContainer.addEventListener('click', this.onClickHandler);
    parentContainer.addEventListener('keydown', this.onKeyDownHandler);
  };

  onKeyDownHandler = (event) => {
    if (event.key === 'Enter') {
      this.onClickHandler(event);
    }
  };

  onClickHandler = (event) => {
    let button = event.target;
    const parent = event.target.closest('.swiper-button-next, .swiper-button-prev');
    button = parent ? parent : button;
    if (!button) return;

    if (button.classList.contains('swiper-button-next')) {
      this.swiper.slideNext();
    } else if (button.classList.contains('swiper-button-prev')) {
      this.swiper.slidePrev();
    }
  };

  updateNavigationButtons = () => {
    if (!this.swiper) return;
    if (this.prevBtns.length) {
      this.prevBtns.forEach((btn) => {
        if (this.swiper.isBeginning) {
          btn.classList.add('disabled');
        } else {
          btn.classList.remove('disabled');
        }
      });
    }

    if (this.nextBtns.length) {
      this.nextBtns.forEach((btn) => {
        if (this.swiper.isEnd) {
          btn.classList.add('disabled');
        } else {
          btn.classList.remove('disabled');
        }
      });
    }
  };
}

customElements.define('product-recommendations', ProductRecommendations);

if (!customElements.get('variant-megamenu-img')) {
  class MegaMenuHover extends HTMLElement {
    constructor() {
      super();
      this.menuWrapper = this.closest('header-menu');
      this.menuWrapper.addEventListener('mouseover', this.onLinkHover.bind(this));
      this.activeLink = null;
      this.prevLink = null;
    }

    onLinkHover(event) {
      const link = event.target.closest('a[data-image]');
      if (!link) return;
      this.prevLink = this.activeLink || link;
      this.activeLink = link;

      if (this.prevLink) {
        this.prevLink.classList.remove('js-active');
      }

      this.activeLink.classList.add('js-active');

      const linkDataImage = link.dataset.image;
      const menuWrapper = link.closest('.mega-menu__wrapper');
      const id = link.dataset.itemHandle;
      const type = link.dataset.itemType;
      if (!linkDataImage || !menuWrapper) return;

      this.updateImage(menuWrapper, linkDataImage);
      if (id && type) {
        this.changeData(id, menuWrapper, type);
      }
    }

    updateImage(menuWrapper, linkDataImage) {
      const imgWrapper = menuWrapper.querySelector('.js-megaMenuImgWrp');
      const mediaWrapper = menuWrapper.querySelector('.mega-menu__media-wrapper');
      if (!imgWrapper) return;

      const existingImg = imgWrapper.querySelector('img');
      if (existingImg) {
        existingImg.srcset = linkDataImage;
        existingImg.src = linkDataImage;
      } else {
        const newImg = this.createImageElement(linkDataImage);
        mediaWrapper.innerHTML = '';
        mediaWrapper.appendChild(newImg);
      }
    }

    createImageElement(src) {
      const newImg = new Image();
      newImg.srcset = src;
      newImg.src = src;
      newImg.className = 'motion-reduce mm-featured-image';
      return newImg;
    }

    changeData(id, menuWrapper, itemType) {
      if (itemType != 'CollectionDrop' && itemType != 'ProductDrop') return;
      const url = itemType === 'CollectionDrop' ? `/collections/${id}.json` : `/products/${id}.json`;
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error();
          }
          return response.json();
        })
        .then((data) => {
          const isCollection = itemType === 'CollectionDrop';
          const description = isCollection ? data.collection.description : data.product.description;
          const title = isCollection ? data.collection.title : data.product.title;

          // Ensure description element exists inside media wrapper for second style
          let heading = menuWrapper.querySelector('[data-component="variant-mega-menu-description"]');
          const mediaWrapper = menuWrapper.querySelector('.mega-menu__media-wrapper');
          if (!heading && mediaWrapper) {
            const el = document.createElement('p');
            el.dataset.component = 'variant-mega-menu-description';
            el.className = 'mega-menu__description';
            mediaWrapper.appendChild(el);
            heading = el;
          }
          const headingLink = menuWrapper.querySelector('.mega-menu__collection-link');
          if (headingLink) {
            headingLink.href = isCollection ? `/collections/${id}` : `/products/${id}`;
          }

          // Update arrow button link for second style
          const arrowButton = menuWrapper.querySelector('.slider-button');
          if (arrowButton) {
            arrowButton.href = isCollection ? `/collections/${id}` : `/products/${id}`;
          }

          const hasDescription = typeof description === 'string' && description.trim() !== '';
          // Use raw HTML only when description exists; fallback to plain text title
          if (heading) {
            if (hasDescription) {
              heading.innerHTML = description;
            } else {
              heading.textContent = title || '';
            }
          }
        })
        .catch((error) => console.error('Error while fetching collection data:', error));
    }
  }

  customElements.define('variant-megamenu-img', MegaMenuHover);
}

document.addEventListener('DOMContentLoaded', function () {
  if (document.querySelector('.image-hotspot--item')) {
    if (!customElements.get('image-hotspot')) {
      class ImageHotspot extends HTMLElement {
        connectedCallback() {
          this.attachEvents();
        }
      }

      ImageHotspot.prototype.attachEvents = function () {
        const imageHubspotBubbles = this.querySelectorAll('.image-hotspot--item-icon');
        if (imageHubspotBubbles) {
          imageHubspotBubbles.forEach((imageHubspotBubble) => {
            imageHubspotBubble.addEventListener('click', () => {
              this.classList.add('active');
            });

            let closeBuble = this.querySelector('.bubble-close');
            closeBuble.addEventListener('click', () => {
              this.classList.remove('active');
            });
          });
        }
      };

      customElements.define('image-hotspot', ImageHotspot);
    }
  }
});

class CardVariants extends HTMLElement {
  constructor() {
    super();
    this.productCard = this.closest('.card-wrapper');
    this.quickAdd = this.productCard?.querySelectorAll('.quick-add__submit');
    this.url = this.productCard.dataset.url;
    this.cardColorSwatches = this.querySelectorAll('.card-variant');
    this.currentId = this.cardColorSwatches[0].dataset.variantId;

    this.cardColorSwatches.forEach((swatch) => {
      swatch.addEventListener('click', (event) => this.handleSwatchInteraction(event, swatch));
      swatch.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.handleSwatchInteraction(event, swatch);
        }
      });
    });

    this.addActiveState();
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    if (!this.productCard) return;

    const productForm = this.productCard.querySelector('.product-form');
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', true);
      if (text) {
        if (addButtonText) addButtonText.textContent = text;
      }
    } else {
      addButton.removeAttribute('disabled');
      if (addButtonText) addButtonText.textContent = window.variantStrings.addToCart;
    }
    if (!modifyClass) return;
  }

  toggleQuickAddId() {
    if (!this.quickAdd.length) return;
    [...this.quickAdd].forEach((btn) => (btn.dataset.productId = this.currentId));
  }

  handleSwatchInteraction(event, swatch) {
    event.stopPropagation();
    event.preventDefault();

    const { variantId } = swatch.dataset;
    if (this.checkCurrentVariant(variantId)) return;

    const isDisabled = swatch.classList.contains('card-variant--disabled');
    this.toggleAddButton(isDisabled, window.variantStrings.soldOut);
    this.updateVariantInput(variantId);
    this.toggleQuickAddId();
    this.updatePrice(swatch);

    const cardColorSwatches = this.querySelectorAll('.card-variant');
    cardColorSwatches.forEach((s) => s.classList.remove('active'));
    swatch.classList.add('active');

    const variantImage = swatch.dataset.variantImg;
    const swatchParent = swatch.closest('.product-card-wrapper');
    const { productStyle } = this.dataset;

    if (productStyle == 'p-style-2') {
      const slider = swatchParent.querySelector('swiper-slider');
      if (!slider) return;

      const slides = slider.querySelectorAll('.swiper-slide');
      slides.forEach((slide, ind) => {
        const img = slide.querySelector('.media img');
        if (!img) return;

        if (img.src.includes(variantImage)) {
          slider.swiper.slideTo(ind);
        }
      });
    } else {
      const productImages = swatchParent.querySelectorAll('.card__media img');

      productImages.forEach((image) => {
        if (typeof variantImage === 'undefined') return;
        image.src = variantImage;
        image.srcset = variantImage;
        image.dataset.defaultSrc = variantImage;
        image.dataset.defaultSrcset = variantImage;
      });
    }
  }

  updatePrice(swatch) {
    if (!this.productCard) return;

    const priceContainer = this.productCard.querySelector('.price');
    if (!priceContainer) return;

    const { variantPrice, variantPriceValue, variantCompareAtPrice, variantCompareAtPriceValue } = swatch.dataset;
    if (!variantPrice) return;

    const regularPriceEl = priceContainer.querySelector('.price__regular .price-item--regular');
    const salePriceEl = priceContainer.querySelector('.price__sale .price-item--sale');

    // Update prices
    if (regularPriceEl) {
      regularPriceEl.textContent = variantPrice;
    }
    if (salePriceEl) {
      salePriceEl.textContent = variantPrice;
    }

    // Handle sale state
    const hasCompareAtPrice = variantCompareAtPrice && variantCompareAtPriceValue;
    const isOnSale = hasCompareAtPrice && parseInt(variantCompareAtPriceValue) > parseInt(variantPriceValue);

    if (isOnSale) {
      priceContainer.classList.add('price--on-sale');

      // Update compare at price (old price)
      const salePriceContainer = priceContainer.querySelector('.price__sale');
      if (salePriceContainer) {
        // Try to find existing <s> element
        let compareAtPriceEl = salePriceContainer.querySelector('s.price-item--regular');

        if (compareAtPriceEl) {
          compareAtPriceEl.textContent = variantCompareAtPrice;
        } else {
          // Find or create the wrapper span for compare at price
          const salePriceSpan = salePriceContainer.querySelector('.price-item--sale');
          if (salePriceSpan) {
            // Create wrapper span and <s> element before the sale price
            const wrapperSpan = document.createElement('span');
            const sElement = document.createElement('s');
            sElement.className = 'price-item price-item--regular';
            sElement.textContent = variantCompareAtPrice;
            wrapperSpan.appendChild(sElement);
            salePriceSpan.parentNode.insertBefore(wrapperSpan, salePriceSpan);
          }
        }
      }
    } else {
      priceContainer.classList.remove('price--on-sale');
    }
  }

  updateVariantInput(id) {
    // Update ALL variant inputs in the product card, not just the first one
    const inputs = this.productCard.querySelectorAll('input[name="id"], input.product-variant-id');
    inputs.forEach((input) => {
      input.value = id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  addActiveState() {
    if (!this.cardColorSwatches) return;

    const swatchParent = this.closest('.product-card-wrapper');
    if (!swatchParent) return;

    const productImages = swatchParent.querySelectorAll('.card__media img');
    if (!productImages) return;

    const { productStyle } = this.dataset;

    let isActive = false;
    let activeSwatch = null;

    this.cardColorSwatches.forEach((swatch) => {
      if (isActive) return;

      const variantImage = swatch.dataset.variantImg;
      if (!variantImage) return;

      const imgUrl = productImages[0].src;
      if (imgUrl.includes(variantImage)) {
        isActive = true;
        activeSwatch = swatch;
        swatch.classList.add('active');

        const isDisabled = swatch.classList.contains('card-variant--disabled');
        this.toggleAddButton(isDisabled, window.variantStrings.soldOut);

        const input = swatch.querySelector('input');
        if (input && !input.checked) {
          input.checked = true;
        }
      }
    });

    // If no variant was activated (no images match), activate the first available variant
    if (!isActive && this.cardColorSwatches.length > 0) {
      const firstSwatch = this.cardColorSwatches[0];
      activeSwatch = firstSwatch;
      firstSwatch.classList.add('active');

      const isDisabled = firstSwatch.classList.contains('card-variant--disabled');
      this.toggleAddButton(isDisabled, window.variantStrings.soldOut);

      const input = firstSwatch.querySelector('input');
      if (input && !input.checked) {
        input.checked = true;
      }
    }

    // Set initial price based on active variant
    if (activeSwatch) {
      this.updatePrice(activeSwatch);
    }
  }

  checkCurrentVariant(id) {
    if (!id || this.currentId === id) {
      return true;
    }
    this.currentId = id;
    return false;
  }
}

customElements.define('card-variants', CardVariants);

const addKeyboardInteraction = () => {
  const swiperBtns = document.querySelectorAll('.swiper-button');
  if (!swiperBtns.length) return;

  swiperBtns.forEach(function (button) {
    button.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); // Prevent scrolling if the spacebar is pressed
        button.click();
      }
    });
  });
};

addKeyboardInteraction();

// FORM VALIDATION START

document.addEventListener('DOMContentLoaded', addEmailInputsValidation);

function addEmailInputsValidation() {
  const emailInputs = document.querySelectorAll("input[type='email']");

  if (emailInputs.length === 0) return;

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  emailInputs.forEach((input) => {
    const form = input.closest('form');
    const submitBtn = form?.querySelector("button[type='submit']");
    const message = form?.querySelector('.form__message');
    const successMessage = form?.querySelector('.form__message--success');

    if (!submitBtn) return;

    const validateEmail = () => {
      const emailValue = input.value.trim();
      const isValid = emailPattern.test(emailValue);

      if (!isValid) {
        if (message) {
          message.textContent = window.forms.emailError;
        }
        input.classList.add('invalid');
        submitBtn.setAttribute('disabled', 'true');

        if (emailValue === '') {
          message.textContent = '';
          input.classList.remove('invalid');
          submitBtn.removeAttribute('disabled');
        }

        if (successMessage) {
          successMessage.textContent = '';
        }
      } else {
        if (message) {
          message.textContent = '';
        }
        input.classList.remove('invalid');
        submitBtn.removeAttribute('disabled');
      }
    };

    // Validate email when the user changes input (debounced)
    const debouncedValidateEmail = debounce(validateEmail, 300);
    input.addEventListener('input', debouncedValidateEmail);
    input.addEventListener('change', debouncedValidateEmail);

    // Remove message and enable button when user starts typing again
    input.addEventListener('focus', () => {
      const emailValue = input.value.trim();
      const isValid = emailPattern.test(emailValue);

      if (!isValid) {
        message.textContent = window.forms.emailError;
        input.classList.add('invalid');
        submitBtn.setAttribute('disabled', 'true');

        if (emailValue === '') {
          message.textContent = '';
          input.classList.remove('invalid');
          submitBtn.removeAttribute('disabled');
        }
      } else {
        message.textContent = '';
        input.classList.remove('invalid');
        submitBtn.removeAttribute('disabled');
      }
    });
  });
}
// FORM VALIDATION END

document.addEventListener('DOMContentLoaded', async () => {
  const supportsXR = await checkShopifyXRSupport();

  if (supportsXR) {
    document.body.classList.add('supports-xr');
  } else {
    document.body.classList.add('no-xr');
  }
});

async function checkShopifyXRSupport() {
  // WebXR (VR/AR) support
  if (navigator.xr && navigator.xr.isSessionSupported) {
    try {
      const ar = await navigator.xr.isSessionSupported('immersive-ar');
      const vr = await navigator.xr.isSessionSupported('immersive-vr');
      return ar || vr;
    } catch (err) {
      return false;
    }
  }

  // Fallback: check for iOS/Android native support
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  // Check for file format support
  const hasUSDZ = !!window.navigator && isIOS;
  const hasSceneViewer = isAndroid;

  return hasUSDZ || hasSceneViewer;
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

      this._observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            this._observer.disconnect();
            this._observer = null;
            this.swiperInitialization();
            this.handleResize();
            window.addEventListener('resize', this.handleResize);
            window.addEventListener('orientationchange', this.handleResize);
          }
        },
        { rootMargin: '200px' },
      );
      this._observer.observe(this);
    }

    disconnectedCallback() {
      if (this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }
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
          clickable: true,
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
        },
      };

      if (effect === 'fade') {
        swiperParams.fadeEffect = { crossFade: true };
      }

      this.swiper = new Swiper(this, swiperParams);
    }
    pauseVideos() {
      if (!this.swiper) return;

      this.swiper.slides.forEach((slide) => {
        const slideVideos = slide.querySelectorAll('video, iframe');
        slideVideos.forEach((video) => {
          if (video.tagName === 'VIDEO') {
            // Для HTML5 <video>
            if (!video.paused) {
              video.pause();
            }
          } else if (video.tagName === 'IFRAME') {
            // Для YouTube <iframe>
            const youtubeSrc = video.src;
            if (youtubeSrc.includes('youtube.com') || youtubeSrc.includes('youtu.be')) {
              video.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            }
          }
        });
      });
    }

    setActiveThumbnail = (id) => {
      if (!this.thumbnails || !this.mediaGallery || !this.mediaGallery?.elements?.thumbnails || !this.swiper) return;

      const activeSlide = this.swiper.slides[this.swiper.activeIndex];
      const targetId = activeSlide.getAttribute('data-media-id');
      const currentThumbnail = this.mediaGallery.elements.thumbnails.querySelector(`aria-current`);
      const thumbnail = this.mediaGallery.elements.thumbnails.querySelector(`[data-target="${targetId}"]`);

      if (!thumbnail) return;

      // Check if mediaGallery has setActiveThumbnail method before calling it
      if (typeof this.mediaGallery.setActiveThumbnail === 'function') {
        this.mediaGallery.setActiveThumbnail(thumbnail);
      }
    };

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

  MediaGallerySlider.prototype.swiperInitialization = function () {
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
  };

  customElements.define('media-gallery-slider', MediaGallerySlider);
}

console.log('Elixira-4.1.0');


/* Bymello: product-card image carousel */
(function(){
  function wire(slider){
    if(slider.__bm) return; slider.__bm = true;
    var track = slider.querySelector('.bm-card-slider__track');
    if(!track) return;
    function w(){ var s = track.querySelector('.bm-card-slider__slide'); return s ? s.getBoundingClientRect().width : track.clientWidth; }
    var card = slider.closest('.card-wrapper') || slider;
    var firstSlideImg = track.querySelector('.bm-card-slider__slide img');

    function activeSwatchAltImage(){
      if (card.querySelectorAll('.card-variant').length < 2) return null;
      var activeSwatch = card.querySelector('.card-variant.active');
      return activeSwatch ? activeSwatch.dataset.variantImgAlt : null;
    }

    slider.addEventListener('mouseenter', function(){
      var altImage = activeSwatchAltImage();
      if (altImage && firstSlideImg) {
        if (firstSlideImg.dataset.defaultSrc === undefined) {
          firstSlideImg.dataset.defaultSrc = firstSlideImg.src;
          firstSlideImg.dataset.defaultSrcset = firstSlideImg.srcset;
        }
        firstSlideImg.src = altImage;
        firstSlideImg.srcset = altImage;
        return;
      }
      track.scrollTo({left:w(),behavior:'smooth'});
    });
    slider.addEventListener('mouseleave', function(){
      var altImage = activeSwatchAltImage();
      if (altImage && firstSlideImg && firstSlideImg.dataset.defaultSrc !== undefined) {
        firstSlideImg.src = firstSlideImg.dataset.defaultSrc;
        firstSlideImg.srcset = firstSlideImg.dataset.defaultSrcset;
        return;
      }
      track.scrollTo({left:0,behavior:'smooth'});
    });
  }
  function init(){ document.querySelectorAll('.bm-card-slider').forEach(wire); }
  if(document.readyState!=='loading') init(); else document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('shopify:section:load', init);
  var mo = new MutationObserver(function(){ init(); });
  mo.observe(document.body || document.documentElement, {subtree:true, childList:true});
})();

/* Bymello: featured-product card (card-featured-product.liquid) image swap on hover —
   its swiper-slider has no built-in hover trigger, unlike the .bm-card-slider carousel. */
(function(){
  function wire(el){
    if (el.__bmHover) return; el.__bmHover = true;
    el.addEventListener('mouseenter', function(){
      if (el.swiper && el.swiper.slides.length > 1) el.swiper.slideNext();
    });
    el.addEventListener('mouseleave', function(){
      if (el.swiper) el.swiper.slideTo(0);
    });
  }
  function init(){ document.querySelectorAll('.card-product__slider').forEach(wire); }
  if(document.readyState!=='loading') init(); else document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('shopify:section:load', init);
  var mo = new MutationObserver(function(){ init(); });
  mo.observe(document.body || document.documentElement, {subtree:true, childList:true});
})();

/* Bymello: wishlist. Cards on the wishlist page are the real card-product
   markup (swatches, quick-add) fetched via the search page's section
   rendering, the same technique recently-viewed-products.js uses to turn
   an arbitrary list of product IDs into fully-featured cards. */
(function(){
  var KEY='bm_wishlist';
  function read(){
    var a; try{ a=JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; }
    var clean=a.filter(function(x){ return x.id; });
    if(clean.length!==a.length) write(clean);
    return clean;
  }
  function write(a){ localStorage.setItem(KEY, JSON.stringify(a)); }
  function has(id){ return read().some(function(x){return String(x.id)===String(id);}); }
  function toggle(item){
    var a=read(); var i=-1;
    a.forEach(function(x,idx){ if(String(x.id)===String(item.id)) i=idx; });
    if(i>=0){ a.splice(i,1); } else { a.push(item); }
    write(a);
    return i<0;
  }
  function updateHeader(){ var n=read().length; document.querySelectorAll('[data-wishlist-count]').forEach(function(e){ e.textContent = n>9 ? '9+' : (n>0 ? n : ''); }); }
  function markButtons(){ document.querySelectorAll('.bm-wishlist-btn').forEach(function(b){ b.classList.toggle('is-active', has(b.getAttribute('data-wl-id'))); }); }
  function wireButtons(){ document.querySelectorAll('.bm-wishlist-btn').forEach(function(b){
      if(b.__bmwl) return; b.__bmwl=true;
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation();
        var item={id:b.getAttribute('data-wl-id'),handle:b.getAttribute('data-wl-handle'),url:b.getAttribute('data-wl-url'),title:b.getAttribute('data-wl-title'),price:b.getAttribute('data-wl-price'),image:b.getAttribute('data-wl-image')};
        var added=toggle(item); b.classList.toggle('is-active', added); updateHeader(); renderPage();
      });
    });
  }
  function addRemoveButton(el, it){
    var media = el.querySelector('.card__media') || el.querySelector('.media');
    if(!media || media.querySelector('.bm-wl-remove')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bm-wl-remove';
    btn.setAttribute('aria-label', 'Remove from wishlist');
    btn.innerHTML = '&times;';
    btn.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      toggle({id:it.id});
      updateHeader();
      renderPage();
    });
    media.appendChild(btn);
  }
  function renderPage(){
    var grid=document.getElementById('bm-wishlist-grid'); if(!grid) return;
    var items=read().slice().reverse();
    var empty=document.querySelector('.bm-wishlist-empty');
    if(!items.length){ grid.innerHTML=''; if(empty) empty.removeAttribute('hidden'); return; }
    if(empty) empty.setAttribute('hidden','');
    var showVariants = grid.getAttribute('data-show-variants') === 'true';
    var imageRatio = grid.getAttribute('data-image-ratio') || 'portrait';
    var imageHeight = grid.getAttribute('data-image-height') || '120';
    var query = items.map(function(it){ return 'id:'+it.id; }).join(' OR ');
    fetch(window.routes.root_url + 'search?section_id=main-search&q=' + encodeURIComponent(query) + '&resources[limit]=' + items.length + '&resources[type]=product&recently_viewed_swatches=' + (showVariants ? '1' : '0') + '&wishlist_image_ratio=' + imageRatio + '&wishlist_image_height=' + imageHeight)
      .then(function(r){ return r.text(); })
      .then(function(html){
        var results = new DOMParser().parseFromString(html, 'text/html').querySelector('#search-list-id');
        grid.innerHTML='';
        if(!results) return;
        var elements = Array.from(results.children);
        items.forEach(function(it){
          var el = elements.find(function(el){
            var pid = el.querySelector('[data-product-id]');
            return pid && pid.getAttribute('data-product-id') === String(it.id);
          });
          if(!el) return;
          el.classList.remove('scroll-trigger', 'scroll-trigger--offscreen');
          el.querySelectorAll('.scroll-trigger').forEach(function(n){ n.classList.remove('scroll-trigger', 'scroll-trigger--offscreen'); });
          addRemoveButton(el, it);
          grid.appendChild(el);
        });
        wireButtons();
        markButtons();
      })
      .catch(function(e){ console.error('Wishlist render failed', e); });
  }
  function init(){ wireButtons(); markButtons(); updateHeader(); renderPage(); }
  if(document.readyState!=='loading') init(); else document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('shopify:section:load', init);
  var mo=new MutationObserver(function(){ wireButtons(); markButtons(); }); mo.observe(document.body||document.documentElement,{subtree:true,childList:true});
})();

/* Glides a dropdown trigger's width between its compact (closed) and longest (open) states,
   which the component's CSS otherwise snaps. Driven from the trigger's 'click' rather than
   the 'toggle'/state-change event: click runs BEFORE the open state is applied, whereas Chrome
   fires 'toggle' only after painting the snapped state — which caused a one-frame jump.
   Delegated on document so it also covers dropdowns facets.js recreates on AJAX re-render.
   Animated with the Web Animations API so the glide overrides the base width regardless of
   when the browser recomputes it. Shared by the sort-by dropdown (native <details>/[open]) and
   the language selector (button[aria-expanded]) — same mechanism, different open/close signal. */
(function () {
  var GLIDE_CONFIGS = [
    {
      root: '.sort-by-disclosure',
      trigger: '.facets__summary',
      head: '.facets__summary > div',
      sizer: '.sort-by__sizer',
      isOpen: function (root) {
        return root.hasAttribute('open');
      },
      close: function (root) {
        root.removeAttribute('open');
        var summary = root.querySelector('.facets__summary');
        if (summary) summary.setAttribute('aria-expanded', 'false');
      },
    },
    {
      root: '.language-selector',
      trigger: '.disclosure__button',
      head: '.disclosure__button > div',
      sizer: '.language-selector__sizer',
      isOpen: function (root) {
        var button = root.querySelector('.disclosure__button');
        return !!button && button.getAttribute('aria-expanded') === 'true';
      },
      close: function (root) {
        var form = root.closest('localization-form');
        if (form && typeof form.hidePanel === 'function') form.hidePanel();
      },
    },
  ];

  function measureCompactAndLongest(head, sizer) {
    sizer.style.display = 'none';
    var compactW = head.getBoundingClientRect().width;
    sizer.style.display = 'grid';
    var longestW = head.getBoundingClientRect().width;
    sizer.style.display = '';
    return [compactW, longestW];
  }

  function animate(config, root, willOpen) {
    var head = root.querySelector(config.head);
    var sizer = root.querySelector(config.sizer);
    if (!head || !sizer || !head.animate) return;

    var widths = measureCompactAndLongest(head, sizer);
    var from = willOpen ? widths[0] : widths[1];
    var to = willOpen ? widths[1] : widths[0];

    if (Math.abs(from - to) < 1) return;

    if (head.__glideAnim) head.__glideAnim.cancel();

    if (willOpen) {
      /* The open state (details[open] / aria-expanded) lands the instant this click's default
         action runs — way before our 320ms glide finishes. That flips the sizer to display:grid
         immediately, snapping the grid track (and anything riding along inside it) to full width
         for one frame before sliding back — the "jumps right, then returns" glitch. Keep the
         sizer out of the grid until the glide actually reaches that width. */
      sizer.style.display = 'none';
    }

    head.__glideAnim = head.animate(
      [{ width: from + 'px' }, { width: to + 'px' }],
      { duration: 320, easing: 'cubic-bezier(0.33, 0, 0.2, 1)' }
    );

    if (willOpen) {
      head.__glideAnim.finished
        .then(function () { sizer.style.display = ''; })
        .catch(function () {});
    } else {
      sizer.style.display = '';
    }
  }

  function closeOthers(exceptRoot) {
    GLIDE_CONFIGS.forEach(function (config) {
      document.querySelectorAll(config.root).forEach(function (root) {
        if (root === exceptRoot || !config.isOpen(root)) return;
        animate(config, root, false);
        config.close(root);
      });
    });
  }

  document.addEventListener('click', function (e) {
    for (var i = 0; i < GLIDE_CONFIGS.length; i++) {
      var config = GLIDE_CONFIGS[i];
      var trigger = e.target.closest && e.target.closest(config.trigger);
      if (!trigger) continue;
      var root = trigger.closest(config.root);
      if (root) {
        var willOpen = !config.isOpen(root);
        if (willOpen) closeOthers(root);
        animate(config, root, willOpen);
      }
      return;
    }
  }, true);
})();

/* Bymello: size guide modal */
(function(){
  function open(id){
    var m=document.getElementById(id);
    if(!m) return;
    m.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }
  function close(m){
    m.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }
  document.addEventListener('click',function(e){
    var btn=e.target.closest('[data-bm-modal]');
    if(btn){ open(btn.dataset.bmModal); return; }
    if(e.target.closest('[data-bm-close]')){
      var modal=e.target.closest('.bm-modal');
      if(modal) close(modal);
    }
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      document.querySelectorAll('.bm-modal[aria-hidden="false"]').forEach(close);
    }
  });

  var DEFAULT_WIDTH=680, MAX_WIDTH=1100;
  function fitBoxToTable(modal){
    var box=modal.querySelector('.bm-modal__box');
    if(!box) return;
    var tables=modal.querySelectorAll('.bm-modal__body table');
    var tableWidth=0;
    tables.forEach(function(t){ tableWidth=Math.max(tableWidth,t.scrollWidth); });
    if(!tableWidth){ box.style.removeProperty('--bm-sg-width'); return; }
    var boxStyle=getComputedStyle(box);
    var padding=(parseFloat(boxStyle.paddingLeft)||0)+(parseFloat(boxStyle.paddingRight)||0);
    var needed=Math.min(tableWidth+padding, MAX_WIDTH);
    if(needed>DEFAULT_WIDTH){ box.style.setProperty('--bm-sg-width', needed+'px'); }
    else{ box.style.removeProperty('--bm-sg-width'); }
  }
  new MutationObserver(function(mutations){
    mutations.forEach(function(m){
      if(m.attributeName==='aria-hidden' && m.target.classList.contains('bm-modal') && m.target.getAttribute('aria-hidden')==='false'){
        fitBoxToTable(m.target);
      }
    });
  }).observe(document.body, {attributes:true, attributeFilter:['aria-hidden'], subtree:true});
})();
