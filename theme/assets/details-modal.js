class DetailsModal extends HTMLElement {
  constructor() {
    super();
    this.detailsContainer = this.querySelector('details');
    this.summaryToggle = this.querySelector('summary');

    // Bind event handlers to preserve context
    this.handleKeyUp = (event) => event.code?.toUpperCase() === 'ESCAPE' && this.close();
    this.handleSummaryClick = this.onSummaryClick.bind(this);
    this.handleCloseClick = this.close.bind(this);

		if (this.detailsContainer) {
			this.detailsContainer.addEventListener('keyup', this.handleKeyUp);
		}

		if (this.summaryToggle) {
			this.summaryToggle.addEventListener('click', this.handleSummaryClick);
			this.summaryToggle.setAttribute('role', 'button');
		}

    this.closeButton = this.querySelector('button[type="button"]');
    if (this.closeButton) {
      this.closeButton.addEventListener('click', this.handleCloseClick);
    }
  }

  disconnectedCallback() {
    // Clean up event listeners when element is removed from DOM
    if (this.detailsContainer) {
      this.detailsContainer.removeEventListener('keyup', this.handleKeyUp);
    }

    if (this.summaryToggle) {
      this.summaryToggle.removeEventListener('click', this.handleSummaryClick);
    }

    if (this.closeButton) {
      this.closeButton.removeEventListener('click', this.handleCloseClick);
    }

    // Clean up body click listener if it exists
    if (this.onBodyClickEvent) {
      document.body.removeEventListener('click', this.onBodyClickEvent);
    }
  }

  isOpen() {
    return this.detailsContainer.hasAttribute('open');
  }

  onSummaryClick(event) {
    event.preventDefault();
    event.target.closest('details').hasAttribute('open') ? this.close() : this.open(event);
  }

  onBodyClick(event) {
    if (!this.contains(event.target) || event.target.classList.contains('modal-overlay')) this.close(false);
  }

  open(event) {
    this.onBodyClickEvent = this.onBodyClickEvent || this.onBodyClick.bind(this);
    event.target.closest('details').setAttribute('open', true);
    document.body.addEventListener('click', this.onBodyClickEvent);
    document.body.classList.add('overflow-hidden');

    trapFocus(
      this.detailsContainer.querySelector('[tabindex="-1"]'),
      this.detailsContainer.querySelector('input:not([type="hidden"])')
    );
  }

  close(focusToggle = true) {
    removeTrapFocus(focusToggle ? this.summaryToggle : null);
		if (this.detailsContainer) {
			this.detailsContainer.removeAttribute('open');
			
		}
    document.body.removeEventListener('click', this.onBodyClickEvent);
    document.body.classList.remove('overflow-hidden');
  }
}

customElements.define('details-modal', DetailsModal);
