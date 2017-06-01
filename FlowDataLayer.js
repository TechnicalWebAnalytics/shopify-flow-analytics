/* global ga, Flow, ShopifyAnalytics */
/* eslint-disable no-var, prefer-arrow-callback, prefer-template, object-shorthand */

(function flowDL() {

  window.__bva__ = window.__bva__ || [];

  // dependencies
  // cookie handling
  function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }
  function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

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
        if(getCookie('clearCart') === "undefined"){
          document.cookie = "cart=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          setCookie('clearCart','1',1);
        }

        dataLayer.push({'products':''});
        var item = getItemFromCart(data.id, data.cart);
        var eventData = {
          'products': [{
            'variant'  : item.variant_id,
            'id'       : item.product_id,
            'quantity' : data.quantity,
            'price'    : item.local.price.base.amount, 
            'name'     : item.title,
            'sku'      : item.sku,
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
        // reset dataLayer products
        dataLayer.push({'products':''});
        // clear any existing shopify cart items to prevent generic DL cart from being fired
        if(getCookie('clearCart') === "undefined"){
          document.cookie = "cart=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          setCookie('clearCart','1',1);
        }

        var getdata = data;
        var item = getdata.cart.items;
        var eventData = [];
        for (var i = item.length - 1; i >= 0; i--) {
          eventData.push({
            'variant'  : item[i].variant_id,
            'id'       : item[i].product_id,
            'quantity' : item[i].quantity,
            'price'    : item[i].local.price.base.amount, 
            'name'     : item[i].title,
            'sku'      : item[i].sku
          });
        }

        // push to dataLayer
        dataLayer.push({'products': eventData },{
          'pageType' : 'Cart',
          'event'    : 'Cart'
        });
        if(__bva__.debug){
          console.log("Cart"+" :"+JSON.stringify(eventData, null, " "));
        }
      });

      // using global shopify elements to detect dynamic cart data
      // see more information here https://github.com/TechnicalWebAnalytics/dataLayer-shopify
      $(document).on('click', __bva__.viewCart, function (event) {
        flowViewcartfire = 0;
        if(flowViewcartfire !== 1){ 
          flowViewcartfire = 1;
          if (__bva__.dynamicCart) {
            flowCartCheck = setInterval(function () {
              if ($(__bva__.cartVisableSelector).length > 0) {
                clearInterval(flowCartCheck);
                Flow.cart.getCart({ 
                  success: function (status, data) {
                    // reset dataLayer products
                    dataLayer.push({'products':''});
                    // clear any existing shopify cart items to prevent generic DL cart from being fired
                    if(getCookie('clearCart') === "undefined"){
                      document.cookie = "cart=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                      setCookie('clearCart','1',1);
                    }

                    var getdata = data;
                    var item = getdata.items;
                    var eventData = [];
                    for (var i = item.length - 1; i >= 0; i--) {
                      eventData.push({
                        'variant'  : item[i].variant_id,
                        'id'       : item[i].product_id,
                        'quantity' : item[i].quantity,
                        'price'    : item[i].local.price.base.amount, 
                        'name'     : item[i].title,
                        'sku'      : item[i].sku
                      });
                    }

                    // push to dataLayer
                    dataLayer.push(eventData,{
                      'pageType' : 'Cart',
                      'event'    : 'Cart'
                    });
                    if(__bva__.debug){
                      console.log("Cart"+" :"+JSON.stringify(eventData, null, " "));
                    }
                  }
                });
              }
            }, 500);
          }       
        }  
      }); 
    }

    function getFlowTransactionData(order){
      data = order;
      getorder = data.order;
      // data = order.order;
      var orderPricing = getOrderPricing(getorder);

      flow_items = [];
      for (var i = getorder.lines.length - 1; i >= 0; i--) {
        var prods = getorder.lines[i].shopify;
        var description = prods.product_description.replace(/\<(meta charset\=\"utf\-8\"|span|\/span)\>/g,"");

        flow_items.push({
          'id'          : prods.product_id,
          'sku'         : prods.sku,
          'variantId'   : prods.variant_id,
          'name'        : prods.title,
          'price'       : getorder.lines[i].price.base.amount,
          'quantity'    : prods.quantity,
          'productType' : prods.product_type,
          'description' : description,
          'productURL'  : prods.url,
          'imageURL'    : prods.image
        });
      }

      flow_transaction = {
        'transactionNumber'      : getorder.number,
        'transactionId'          : getorder.id,
        'transactionAffiliation' : window.flowSettings.flow.organization,
        'transactionTotal'       : getorder.total.base.amount,
        'transactionTax'         : orderPricing.tax || 0,
        'transactionShipping'    : getOrderPricing.shipping || 0,
        'transactionSubtotal'    : getorder.total.base.amount - ( orderPricing.tax || 0 + getOrderPricing.shipping || 0 ),
        // 'promoCode'              : '',
        // 'discount'               : '',
        'products'               : flow_items
      }

      return flow_transaction;
    }

    function setupCheckoutStep1() {
      Flow.set('on', 'pageview.checkout_step_1', function (data) {
       dataLayer.push(getFlowTransactionData(data),{
        'event'    :'Customer Information',
        'pageType' :'Customer Information'});
       dataLayer.push({'event': 'DataLayer Loaded'});
       if(__bva__.debug){
         console.log("Customer Information - Transaction Data"+" :"+JSON.stringify(getFlowTransactionData(data), null
          , " "));
       }
     });
    }

    function setupCheckoutStep2() {
      Flow.set('on', 'pageview.checkout_step_2', function (data) {
        dataLayer.push(getFlowTransactionData(data),{
          'event'    :'Shipping Information',
          'pageType' :'Shipping Information'});
        dataLayer.push({'event': 'DataLayer Loaded'});
        if(__bva__.debug){
          console.log("Shipping - Transaction Data"+" :"+JSON.stringify(getFlowTransactionData(data), null, " "));
        }
      });
    }

    function setupCheckoutStep3() {
      Flow.set('on', 'pageview.checkout_step_3', function (data) {
       dataLayer.push(getFlowTransactionData(data),{
        'event'    :'Add Payment Info',
        'pageType' :'Add Payment Info'});
       dataLayer.push({'event': 'DataLayer Loaded'});
       if(__bva__.debug){
         console.log("Payment - Transaction Data"+" :"+JSON.stringify(getFlowTransactionData(data), null, " "));
       }
     });
    }

    function setupCheckoutThankYou() {
      Flow.set('on', 'pageview.checkout_thank_you', function (data) {
        getorder = data.order;
        dataLayer.push({
          'billingInfo': {
            'fullName'  : getorder.destination.contact.name.first+" "+getorder.destination.contact.name.last,
            'firstName' : getorder.destination.contact.name.first,
            'lastName'  : getorder.destination.contact.name.last,
            'address1'  : getorder.destination.streets[0],
            'address2'  : getorder.destination.streets[1],
            'street'    : getorder.destination.streets[0],
            'city'      : getorder.destination.city,
            'province'  : getorder.destination.province,
            'zip'       : getorder.destination.postal,
            'country'   : getorder.destination.country,
            'phone'     : getorder.destination.contact.phone,
          },
          'checkoutEmail': getorder.destination.contact.email,
        });
        dataLayer.push(getFlowTransactionData(data),{
          'pageType' :'Transaction',
          'event'    :'Transaction'
        });  
        dataLayer.push({'event': 'DataLayer Loaded'});
        if(__bva__.debug){     
          console.log("Transaction Data"+" :"+JSON.stringify(getFlowTransactionData(data), null, " "));
        }
      });
    }

    function setup() {
      console.log('[flow_dl] Setup!');

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