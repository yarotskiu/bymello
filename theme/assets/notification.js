(function () {
	
	const DAYS_TO_HIDE_AFTER_SUBSCRIBE = 5;
	
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
			const subscriptionTimestamp = localStorage.getItem('notificationSubscriptionDate');
			
			if (subscriptionTimestamp) {
				const subscriptionDate = new Date(parseInt(subscriptionTimestamp));
				const currentDate = new Date();
				const daysPassed = (currentDate - subscriptionDate) / (1000 * 60 * 60 * 24);
				
				if (daysPassed < DAYS_TO_HIDE_AFTER_SUBSCRIBE) {
					return false;
				}
			}
			return true;
		};

		const hideNotification = () => {
			btn.closest('.notification').classList.add('close');
			if (typeof MOUSE_CURSOR !== 'undefined' && MOUSE_CURSOR) {
				MOUSE_CURSOR.hide();
			}
		};

	const handleSubscription = () => {
		localStorage.setItem('notificationSubscriptionDate', Date.now().toString());
	};

		if (btn) {
			btn.addEventListener('click', hideNotification);
		}
		
		if (notificationOverlay) {
			notificationOverlay.addEventListener('click', hideNotification);
		}

	if (form) {
		form.addEventListener('submit', () => {
			handleSubscription();
		});
	}

		if (notification && notificationShowedTimes < times && checkSubscriptionStatus()) {
			setTimeout(() => {
				notification.classList.add('open');
			}, timeout);
			++notificationShowedTimes;
			localStorage.setItem('notificationCounter', notificationShowedTimes);
		}
	};
	
	document.addEventListener('DOMContentLoaded', addNotification);
	document.addEventListener('shopify:section:load', addNotification);
})();