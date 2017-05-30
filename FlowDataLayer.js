/* global ga, Flow, ShopifyAnalytics */
/* eslint-disable no-var, prefer-arrow-callback, prefer-template, object-shorthand */

(function flowDL() {

// dependencies
// cookie handling
function setCookie(cname,cvalue,exdays){var d=new Date();d.setTime(d.getTime()+(exdays*24*60*60*1000));var expires="expires="+d.toUTCString();document.cookie=cname+"="+cvalue+";"+expires+";path=/"}function getCookie(cname){var name=cname+"=";var decodedCookie=decodeURIComponent(document.cookie);var ca=decodedCookie.split(';');for(var i=0;i<ca.length;i++){var c=ca[i];while(c.charAt(0)==' '){c=c.substring(1)}if(c.indexOf(name)==0){return c.substring(name.length,c.length)}}return""};

var NOT_SET = '(not set)';

function gaReady() {
	return typeof ga !== 'undefined';
}

  // Flow is ready of 'getExperience' function exists
  function flowReady() {
  	return Flow && typeof Flow.getExperience === 'function';
  }

  // Wait until trekkie is loaded (lib will transition from an empty array to an object).
  function shopifyAnalyticsReady() {
  	return ShopifyAnalytics && typeof ShopifyAnalytics.lib === 'object';
  }

  function isReady() {
  	return gaReady() && flowReady() && shopifyAnalyticsReady();
  }

  /**
   * Exponential backoff. Keep trying but delay a little longer each attempt.
   */
   function backoff(test, callback, delay) {
   	function getNewDelay() {
   		if (!delay) {
   			return 1;
   		}

   		return (delay >= Number.MAX_VALUE) ? delay : delay * 2;
   	}

   	if (test()) {
   		callback();
   	} else {
   		setTimeout(function () {
   			backoff(test, callback, getNewDelay());
   		}, Math.log(getNewDelay()) * 100);
   	}
   }

   function getItemFromCart(id, cart) {
   	var len = cart.items.length;
   	var item;
   	var i = 0;

   	for (i = 0; i < len; i += 1) {
   		if (id.toString() === cart.items[i].variant_id.toString()) {
   			item = cart.items[i];
   		}
   	}

   	return item;
   }

   function getOrderPricing(order) {
   	var pricing = {};
   	var prices = order.prices;
   	var pricesLength = order.prices.length;
   	var i;

   	for (i = 0; i < pricesLength; i += 1) {
   		pricing[prices[i].key] = prices[i].base.amount;
   	}

   	return pricing;
   }

   function setupAddToCart() {
   	Flow.on('cart.addItem', function (data) {

	    	// clear any existing shopify cart items to prevent generic DL cart from being fired
	    	if($.cookie('clearCart') === undefined){
	    		$.removeCookie('cart', {path: '/'});
	    		$.cookie('clearCart','1');
	    	}

	    	var item = getItemFromCart(data.id, data.cart);
	    	var eventData = {
	    		'products': [{
	    			'variant': item.variant_id,
	    			'id': item.product_id,
	    			'quantity': data.quantity,
	    			'price': item.local.price.base.amount, 
	    			'name': item.title,
	    			'sku': item.sku,
	    		}],
	    	};

	      // push to dataLayer
	      dataLayer.push(eventData,{
	      	'pageType' : 'Add to Cart',
	      	'event'    : 'Add to Cart'
	      });
	      if(__bva__.debug){
	      	console.log("Add to Cart"+" :"+JSON.stringify(eventData, null, " "));
	      }
	});
   }

    function setupViewCart() {
    	// cart pageview
   	Flow.on('pageview.cart', function (data) {

	    	// clear any existing shopify cart items to prevent generic DL cart from being fired
	    	if(getCookie('clearCart') === "undefined"){
	    		document.cookie = "cart=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
	    		setCookie('clearCart','1',0);
	    	}

	    	var item = data.cart;
	    	testget = item;
	    	var eventData = {
	    		'products': [{
	    		'variant': item.variant_id,
	    		'id': item.product_id,
	    		'quantity': data.quantity,
	    		'price': item.local.price.base.amount, 
	    		'name': item.title,
	    		'sku': item.sku,
	    		}],
	    	};

	      // push to dataLayer
	      dataLayer.push(eventData,{
	      	'pageType' : 'Cart',
	      	'event'    : 'Cart'
	      });
	      if(__bva__.debug){
	      	console.log("Cart"+" :"+JSON.stringify(eventData, null, " "));
	      }

	});
   }

   function gaAddProducs(order) {
   	var lines = order.lines;
   	var linesLength = lines.length;
   	var i;

   	for (i = 0; i < linesLength; i += 1) {
   		ga('ec:addProduct', {
   			id: lines[i].shopify.product_id,
   			name: lines[i].shopify.title,
   			variant: lines[i].shopify.variant_id,
   			price: lines[i].price.base.amount,
   			quantity: lines[i].shopify.quantity,
   		});
   	}
   }

  // GA Funnel Step 1 - Cart
  function gaStep1() {
  	ga('ec:setAction', 'checkout', {
  		step: 1,
  	});

  }

  // GA Funnel Step 2 - Login
  function gaStep2() {
  	ga('ec:setAction', 'checkout', {
  		step: 2,
  	});

  }

  // GA Funnel Step 3 - Checkout: Customer Information
  function gaStep3(order) {
  	gaAddProducs(order);
  	ga('ec:setAction', 'checkout', {
  		step: 3,
  	});
  	gaDimensions();

  }

  // GA Funnel Step 4 - Checkout: Shipping Information
  function gaStep4(order) {
  	gaAddProducs(order);
  	ga('ec:setAction', 'checkout', {
  		step: 4,
  	});
  	gaDimensions();

  }

  // GA Funnel Step 5 - Checkout: Shipping Information
  function gaStep5(order) {
  	gaAddProducs(order);
  	ga('ec:setAction', 'checkout', {
  		step: 5,
  	});
  	gaDimensions();

  }

  // GA Funnel Step 6 - Checkout: Thank You
  function gaPurchase(order) {
  	var orderPricing = getOrderPricing(order);

  	gaAddProducs(order);
  	ga('ec:setAction', 'purchase', {
  		id: order.number,
  		revenue: order.total.base.amount,
  		tax: orderPricing.tax || 0,
  		shipping: getOrderPricing.shipping || 0,
  	});
  	gaDimensions();
  	ga('send', 'event', 'Flow Checkout', 'Thank You');
  	ga('send', 'event', 'Flow Checkout', 'Purchase');
  }

  function setupCheckoutStep1() {
  	Flow.set('on', 'pageview.checkout_step_1', function (data) {
  		gaStep1();
  		gaStep2();
  		gaStep3(data.order);
  	});
  }

  function setupCheckoutStep2() {
  	Flow.set('on', 'pageview.checkout_step_2', function (data) {
  		gaStep4(data.order);
  	});
  }

  function setupCheckoutStep3() {
  	Flow.set('on', 'pageview.checkout_step_3', function (data) {
  		gaStep5(data.order);
  	});
  }

  function setupCheckoutThankYou() {
  	Flow.set('on', 'pageview.checkout_thank_you', function (data) {
  		gaPurchase(data.order);
  	});
  }

  function setup() {
  	console.log('[flow_ga] Setup!');

  	// allPages();
  	setupAddToCart();
  	setupViewCart();
  	setupCheckoutStep1();
  	setupCheckoutStep2();
  	setupCheckoutStep3();
  	setupCheckoutThankYou();
  }

  function init() {
    // Wait for GA, Shopify and Flow to be ready.
    backoff(isReady, setup);
}

init();
}());