/* global ga, Flow, ShopifyAnalytics */
/* eslint-disable no-var, prefer-arrow-callback, prefer-template, object-shorthand */

(function flowGa() {
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

  function getCountry() {
    return Flow.getCountry() || NOT_SET;
  }

  function gaDimensions() {
    var country = getCountry();
    var dim19 = country === NOT_SET ? 'Domestic' : 'International';

    ga('set', 'dimension18', country);
    ga('set', 'dimension19', dim19);
  }

  // Not generic, specific to MVMT -- Can be set outside of this code.
  function allPages() {
    var country = getCountry();
    var dim19 = country === NOT_SET ? 'Domestic' : 'International';

    // Call this ONCE for every page.
    // Thows errors. Should not be set here. Only once at some higher level.
    ga('require', 'ec');

    gaDimensions();
    ga('send', 'event', 'All Pages', 'Flow ' + dim19, country, {
      nonInteraction: 1,
    });
  }

  function setupAddToCart() {
    Flow.on('cart.addItem', function (data) {
      var item = getItemFromCart(data.id, data.cart);
      var eventData = {
        variantId: item.variant_id,
        productId: item.product_id,
        currency: window.ShopifyAnalytics.meta.currency,
        quantity: data.quantity,
        price: item.local.price.base.amount, 
        name: item.title,
        sku: item.sku,
        brand: item.vendor,
        variant: item.variant_title,
        category: item.product_type,
      };

      if (window.ShopifyAnalytics.meta.page) {
        eventData.pageType = window.ShopifyAnalytics.meta.page.pageType;
        eventData.resourceType = window.ShopifyAnalytics.meta.page.resourceType;
        eventData.resourceId = window.ShopifyAnalytics.meta.page.resourceId;
      }

      // Trigger same code that Shopify uses internally.
      window.ShopifyAnalytics.lib.track('Added Product', eventData);


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
    ga('send', 'event', 'Checkout', 'Cart');
  }

  // GA Funnel Step 2 - Login
  function gaStep2() {
    ga('ec:setAction', 'checkout', {
      step: 2,
    });
    ga('send', 'event', 'Checkout', 'Login');
  }

  // GA Funnel Step 3 - Checkout: Customer Information
  function gaStep3(order) {
    gaAddProducs(order);
    ga('ec:setAction', 'checkout', {
      step: 3,
    });
    gaDimensions();
    ga('send', 'event', 'Flow Checkout', 'Customer Information');
  }

  // GA Funnel Step 4 - Checkout: Shipping Information
  function gaStep4(order) {
    gaAddProducs(order);
    ga('ec:setAction', 'checkout', {
      step: 4,
    });
    gaDimensions();
    ga('send', 'event', 'Flow Checkout', 'Shipping Information');
  }

  // GA Funnel Step 5 - Checkout: Shipping Information
  function gaStep5(order) {
    gaAddProducs(order);
    ga('ec:setAction', 'checkout', {
      step: 5,
    });
    gaDimensions();
    ga('send', 'event', 'Flow Checkout', 'Add Payment Info');
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

    allPages();
    setupAddToCart();
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