(function () {
	
	const isConsentVisible = () => {
		return ['shopify-pc__banner', 'shopify-pc__prefs__dialog'].some((id) => {
			const el = document.getElementById(id);
			return el && el.getClientRects().length > 0;
		});
	};

	const openWhenConsentClosed = (open) => {
		if (!isConsentVisible()) {
			open();
			return;
		}
		setTimeout(() => openWhenConsentClosed(open), 500);
	};

	const addNotification = () => {
		const notification = document.querySelector('.notification');
		const notificationOverlay = document.querySelector('.notification-overlay');
		
		if (!notification) return;
		
		const timeout = notification.dataset.timeout * 1000;
		let times = notification.dataset.times;
		let notificationShowedTimes = parseInt(localStorage.getItem('notificationCounter') || 0);
		
		const btn = document.querySelector('.notification__btn');
		const form = document.querySelector('#notification-form');

		
		const checkSubscriptionStatus = () => {
			return !localStorage.getItem('notificationSubscriptionDate');
		};

		const hideNotification = () => {
			btn.closest('.notification').classList.add('close');
		};

		if (btn) {
			btn.addEventListener('click', hideNotification);
		}
		
		if (notificationOverlay) {
			notificationOverlay.addEventListener('click', hideNotification);
		}

		const submittedFromPopup = window.location.hash === '#notification-form';
		const subscribed = new URLSearchParams(window.location.search).get('customer_posted') === 'true';
		const hasFormError = (form?.querySelector('.form__message')?.textContent.trim() ?? '') !== '';
		if (submittedFromPopup && (subscribed || hasFormError)) {
			notification.classList.toggle('notification--subscribed', subscribed);
			notification.classList.add('open');
			return;
		}

		if (notification && notificationShowedTimes < times && checkSubscriptionStatus() && !sessionStorage.getItem('notificationShownThisVisit')) {
			setTimeout(() => {
				openWhenConsentClosed(() => {
					notification.classList.add('open');
					sessionStorage.setItem('notificationShownThisVisit', '1');
					localStorage.setItem('notificationCounter', notificationShowedTimes + 1);
				});
			}, timeout);
		}
	};
	
	document.addEventListener('DOMContentLoaded', addNotification);
	document.addEventListener('shopify:section:load', addNotification);
})();