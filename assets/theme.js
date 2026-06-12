// Robbie Conal's Art Attack — Theme JS

(function () {
  'use strict';

  // ---- Mobile nav ----
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileNavClose = document.querySelector('.mobile-nav-close button');
  const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');

  function openMobileNav() {
    mobileNav && mobileNav.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    mobileNav && mobileNav.classList.remove('open');
    document.body.style.overflow = '';
  }

  menuToggle && menuToggle.addEventListener('click', openMobileNav);
  mobileNavClose && mobileNavClose.addEventListener('click', closeMobileNav);
  mobileNavOverlay && mobileNavOverlay.addEventListener('click', closeMobileNav);

  // ---- Product gallery thumbnails ----
  const thumbs = document.querySelectorAll('.product-gallery__thumb');
  const mainImg = document.querySelector('.product-gallery__main img');

  thumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      thumbs.forEach(function (t) { t.classList.remove('active'); });
      thumb.classList.add('active');
      if (mainImg) {
        mainImg.src = thumb.dataset.src || thumb.querySelector('img').src;
      }
    });
  });

  // ---- Quantity selector ----
  document.querySelectorAll('.qty-selector').forEach(function (sel) {
    var input = sel.querySelector('.qty-input');
    sel.querySelector('.qty-dec') && sel.querySelector('.qty-dec').addEventListener('click', function () {
      var v = parseInt(input.value, 10);
      if (v > 1) input.value = v - 1;
    });
    sel.querySelector('.qty-inc') && sel.querySelector('.qty-inc').addEventListener('click', function () {
      var v = parseInt(input.value, 10);
      input.value = v + 1;
    });
  });

  // ---- Cart drawer / update ----
  document.querySelectorAll('[data-cart-remove]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.dataset.cartRemove;
      fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity: 0 })
      }).then(function () { location.reload(); });
    });
  });

  // ---- Update cart count in header ----
  function refreshCartCount() {
    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        document.querySelectorAll('.cart-count').forEach(function (el) {
          el.textContent = cart.item_count;
          el.style.display = cart.item_count > 0 ? 'flex' : 'none';
        });
      });
  }

  refreshCartCount();

  // ---- Add to cart ----
  var addForm = document.querySelector('[data-add-to-cart-form]');
  if (addForm) {
    addForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = addForm.querySelector('[data-add-to-cart]');
      var origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Adding…';

      var formData = new FormData(addForm);
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.get('id'),
          quantity: parseInt(formData.get('quantity') || '1', 10)
        })
      })
        .then(function (r) { return r.json(); })
        .then(function () {
          btn.textContent = 'Added!';
          refreshCartCount();
          setTimeout(function () {
            btn.disabled = false;
            btn.textContent = origText;
          }, 2000);
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = origText;
        });
    });
  }

  // ---- Variant selector ----
  var variantSelect = document.querySelector('[data-variant-select]');
  var priceEl = document.querySelector('[data-product-price]');
  var addInput = document.querySelector('[data-variant-id]');
  var variantData = window.__variantData;

  if (variantSelect && variantData) {
    variantSelect.addEventListener('change', function () {
      var selected = variantData.find(function (v) {
        return String(v.id) === variantSelect.value;
      });
      if (selected) {
        if (priceEl) priceEl.textContent = formatMoney(selected.price);
        if (addInput) addInput.value = selected.id;
      }
    });
  }

  function formatMoney(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  // ---- Smooth scroll for anchor links ----
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
