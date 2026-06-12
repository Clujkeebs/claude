// Art Attack theme demo — simulated cart (localStorage), no backend
(function () {
  'use strict';

  // ---- Mobile nav ----
  var menuToggle = document.querySelector('.menu-toggle');
  var mobileNav = document.querySelector('.mobile-nav');
  var mobileNavClose = document.querySelector('.mobile-nav-close button');
  var mobileNavOverlay = document.querySelector('.mobile-nav-overlay');

  function openMobileNav() {
    if (mobileNav) mobileNav.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileNav() {
    if (mobileNav) mobileNav.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (menuToggle) menuToggle.addEventListener('click', openMobileNav);
  if (mobileNavClose) mobileNavClose.addEventListener('click', closeMobileNav);
  if (mobileNavOverlay) mobileNavOverlay.addEventListener('click', closeMobileNav);

  // ---- Demo cart ----
  function getCart() {
    try { return JSON.parse(localStorage.getItem('demo-cart') || '[]'); }
    catch (e) { return []; }
  }
  function setCart(items) {
    localStorage.setItem('demo-cart', JSON.stringify(items));
    refreshCartCount();
  }
  function refreshCartCount() {
    var count = getCart().reduce(function (n, i) { return n + i.qty; }, 0);
    document.querySelectorAll('.cart-count').forEach(function (el) {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }
  refreshCartCount();

  // ---- Product gallery thumbnails ----
  var thumbs = document.querySelectorAll('.product-gallery__thumb');
  var mainImg = document.querySelector('.product-gallery__main img');
  thumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      thumbs.forEach(function (t) { t.classList.remove('active'); });
      thumb.classList.add('active');
      if (mainImg) mainImg.src = thumb.dataset.src;
    });
  });

  // ---- Quantity selector ----
  document.querySelectorAll('.qty-selector').forEach(function (sel) {
    var input = sel.querySelector('.qty-input');
    var dec = sel.querySelector('.qty-dec');
    var inc = sel.querySelector('.qty-inc');
    if (dec) dec.addEventListener('click', function () {
      var v = parseInt(input.value, 10);
      if (v > 1) input.value = v - 1;
    });
    if (inc) inc.addEventListener('click', function () {
      input.value = parseInt(input.value, 10) + 1;
    });
  });

  // ---- Add to cart (demo) ----
  var addForm = document.querySelector('[data-add-to-cart-form]');
  if (addForm) {
    addForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = addForm.querySelector('[data-add-to-cart]');
      var orig = btn.textContent;
      var qty = parseInt(addForm.querySelector('.qty-input').value, 10) || 1;
      var item = {
        title: addForm.dataset.title,
        price: parseFloat(addForm.dataset.price),
        img: addForm.dataset.img,
        variant: (addForm.querySelector('[data-variant-select]') || {}).value || '',
        qty: qty
      };
      var cart = getCart();
      var existing = cart.find(function (i) { return i.title === item.title && i.variant === item.variant; });
      if (existing) existing.qty += qty; else cart.push(item);
      setCart(cart);

      btn.disabled = true;
      btn.textContent = 'Added!';
      setTimeout(function () { btn.disabled = false; btn.textContent = orig; }, 1800);
    });
  }

  // ---- Cart page render ----
  var cartItemsEl = document.querySelector('[data-demo-cart-items]');
  if (cartItemsEl) {
    var cart = getCart();
    var summaryEl = document.querySelector('[data-demo-cart-summary]');

    function money(n) { return '$' + n.toFixed(2); }

    function render() {
      cart = getCart();
      if (cart.length === 0) {
        cartItemsEl.innerHTML = '<p style="padding:3rem 0;color:var(--text-muted);">Your cart is empty. <a href="collection.html" style="color:var(--accent);text-decoration:underline;">Continue shopping</a></p>';
        if (summaryEl) summaryEl.style.display = 'none';
        return;
      }
      if (summaryEl) summaryEl.style.display = '';
      var total = 0;
      cartItemsEl.innerHTML = cart.map(function (item, idx) {
        total += item.price * item.qty;
        return '<div class="cart-item">' +
          '<a href="product.html" class="cart-item__image"><img src="' + item.img + '" alt="" width="90"></a>' +
          '<div class="cart-item__details">' +
            '<p class="cart-item__title">' + item.title + '</p>' +
            (item.variant ? '<p class="cart-item__variant">' + item.variant + '</p>' : '') +
            '<p style="font-family:var(--font-ui);font-size:0.78rem;margin-bottom:0.4rem;">Qty: ' + item.qty + ' &times; ' + money(item.price) + '</p>' +
            '<button class="cart-item__remove" data-idx="' + idx + '">Remove</button>' +
          '</div>' +
          '<p style="font-family:var(--font-ui);font-size:0.85rem;font-weight:700;white-space:nowrap;">' + money(item.price * item.qty) + '</p>' +
        '</div>';
      }).join('');

      var count = cart.reduce(function (n, i) { return n + i.qty; }, 0);
      document.querySelectorAll('[data-demo-subtotal]').forEach(function (el) { el.textContent = money(total); });
      document.querySelectorAll('[data-demo-count]').forEach(function (el) { el.textContent = count; });

      cartItemsEl.querySelectorAll('.cart-item__remove').forEach(function (btn) {
        btn.addEventListener('click', function () {
          cart.splice(parseInt(btn.dataset.idx, 10), 1);
          setCart(cart);
          render();
        });
      });
    }
    render();
  }
})();
