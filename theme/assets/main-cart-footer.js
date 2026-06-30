'use strict';

(function () {
	const recommendationProducts = document.querySelector('.recommendation-products');
	if (recommendationProducts) {
		const slider = recommendationProducts.querySelector('.swiper');
		const slides = Array.from(recommendationProducts.querySelectorAll('.swiper-slide'));
		const nextBtn = recommendationProducts.querySelector('.swiper-button-next');
		const prevBtn = recommendationProducts.querySelector('.swiper-button-prev');

		const initSlider = () => {
			const slidesPerView = 2;
			const slidesPerViewMb = slides.length == 1 ? 1 : 1.2;
			const swiper = new Swiper(slider, {
				slidesPerView: slidesPerViewMb,
				spaceBetween: 20,
				navigation: {
					nextEl: nextBtn,
					prevEl: prevBtn,
				},
				breakpoints: {
					750: {
						slidesPerView: 1,
					},
					990: {
						slidesPerView: slidesPerViewMb,
					},
					1200: {
						slidesPerView,
						spaceBetween: 30,
					},
				},
			});
		}

		document.addEventListener('DOMContentLoaded', initSlider);
		document.addEventListener('shopify:section:load', initSlider);
		window.addEventListener('resize', initSlider);
	}

	document.addEventListener('DOMContentLoaded', function () {
		function isIE() {
			const ua = window.navigator.userAgent;
			const msie = ua.indexOf('MSIE ');
			const trident = ua.indexOf('Trident/');
	
			return msie > 0 || trident > 0;
		}
	
		if (!isIE()) return;
		const cartSubmitInput = document.createElement('input');
		cartSubmitInput.setAttribute('name', 'checkout');
		cartSubmitInput.setAttribute('type', 'hidden');
		document.querySelector('#cart').appendChild(cartSubmitInput);
		document.querySelector('#checkout').addEventListener('click', function (event) {
			document.querySelector('#cart').submit();
		});
	});
})();