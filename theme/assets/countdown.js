(function () {
  'use strict';

  if (!customElements.get('countdown-bar')) {
    class CountdownBar extends HTMLElement {
      constructor() {
        super();
        this.buyButtons = null;
        this.daysCounter = null;
        this.hoursCounter = null;
        this.minutesCounter = null;
        this.secondsCounter = null;
        this.intervalId = null;
      }

      connectedCallback() {
        this.daysCounter = this.querySelector('.countdown-bar__days .countdown-bar__number');
        this.hoursCounter = this.querySelector('.countdown-bar__hours .countdown-bar__number');
        this.minutesCounter = this.querySelector('.countdown-bar__min .countdown-bar__number');
        this.secondsCounter = this.querySelector('.countdown-bar__sec .countdown-bar__number');

        this._observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              this._observer.disconnect();
              this._observer = null;
              if (!document.hidden) {
                this.startTimer();
              }
            }
          },
          { rootMargin: '200px' },
        );
        this._observer.observe(this);
      }

      startTimer() {
        if (this.intervalId) return;
        this.updateTimer();
        this.intervalId = setInterval(() => this.updateTimer(), 1000);
      }

      stopTimer() {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      disconnectedCallback() {
        // Clean up timer when element is removed from DOM
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
      }

      updateTimer() {
        const currentTime = new Date().getTime();

        let { date, complited } = this.dataset;
        if (!date) return;

        let endTime = new Date(date).getTime();
        let timeLeft = endTime - currentTime;

        if (timeLeft <= 0) {
          if (complited === 'show_zeroes') {
            this.updateDigits(this.daysCounter, 0);
            this.updateDigits(this.hoursCounter, 0);
            this.updateDigits(this.minutesCounter, 0);
            this.updateDigits(this.secondsCounter, 0);
          } else if (complited === 'hide_countdown') {
            this.remove();
          } else if (complited === 'disable_buttons') {
            this.updateDigits(this.daysCounter, 0);
            this.updateDigits(this.hoursCounter, 0);
            this.updateDigits(this.minutesCounter, 0);
            this.updateDigits(this.secondsCounter, 0);
            if (this.buyButtons) {
              this.buyButtons.forEach((button) => {
                button.setAttribute('disabled', true);
              });
            }
          } else if (complited === 'cycle') {
            endTime = currentTime + 2.33 * 24 * 60 * 60 * 1000;
            this.dataset.date = new Date(endTime).toISOString();
            timeLeft = endTime - currentTime;
            this.startTimer();
          }
        } else {
          const days = Math.max(Math.floor(timeLeft / (1000 * 60 * 60 * 24)), 0);
          const hours = Math.max(Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), 0);
          const minutes = Math.max(Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)), 0);
          const seconds = Math.max(Math.floor((timeLeft % (1000 * 60)) / 1000), 0);

          this.updateDigits(this.daysCounter, days);
          this.updateDigits(this.hoursCounter, hours);
          this.updateDigits(this.minutesCounter, minutes);
          this.updateDigits(this.secondsCounter, seconds);
        }
      }

      updateDigits(container, value) {
        const valueStr = value.toString().padStart(2, '0'); // Ensure at least 2 digits
        let digits = container.querySelectorAll('countdown-digit');

        while (digits.length > valueStr.length) {
          const excessDigit = digits.pop(); // Remove the last element from the array
          container.removeChild(excessDigit); // Remove it from the DOM
          digits = container.querySelectorAll('countdown-digit');
        }

        for (let i = digits.length; i < valueStr.length; i++) {
          const newDigit = document.createElement('countdown-digit');
          container.appendChild(newDigit);
        }

        // Update the NodeList after adding new elements
        digits = container.querySelectorAll('countdown-digit');

        // Update each digit element's `data-number` attribute
        valueStr.split('').forEach((digit, index) => {
          const digitElement = digits[index];
          if (digitElement.dataset.number !== digit) {
            digitElement.dataset.number = digit;
          }
        });
      }
    }

    customElements.define('countdown-bar', CountdownBar);
  }

  if (!customElements.get('countdown-digit')) {
    class CountdownDigit extends HTMLElement {
      static get observedAttributes() {
        return ['data-number'];
      }

      constructor() {
        super();
      }

      attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'data-number' && oldValue !== newValue) {
          this.animateNumberChange(newValue);
        }
      }

      animateNumberChange(newNumber) {
        this.classList.remove('js-animated');
        void this.offsetWidth;
        this.classList.add('js-animated');
        setTimeout(() => {
          this.textContent = newNumber;
        }, 250);
      }
    }

    customElements.define('countdown-digit', CountdownDigit);
  }
})();
