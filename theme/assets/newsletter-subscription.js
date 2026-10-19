(function () {
	const subscribedKey = 'notificationSubscriptionDate';

	const signedUp =
		new URLSearchParams(window.location.search).get('customer_posted') === 'true' &&
		document.querySelector('[data-newsletter-success]') !== null;

	if (!signedUp || localStorage.getItem(subscribedKey) !== null) return;

	localStorage.setItem(subscribedKey, Date.now().toString());
	Shopify.analytics.publish('newsletter_signup', {
		source: window.location.hash.slice(1) || 'unknown',
	});
})();
