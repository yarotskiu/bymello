(function () {
	const trackedKey = 'newsletterSignupTracked';
	const signedUp = new URLSearchParams(window.location.search).get('customer_posted') === 'true';

	if (!signedUp || sessionStorage.getItem(trackedKey)) return;

	sessionStorage.setItem(trackedKey, '1');
	Shopify.analytics.publish('newsletter_signup', {
		source: window.location.hash.slice(1) || 'unknown',
	});
})();
