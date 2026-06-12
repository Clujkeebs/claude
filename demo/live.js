// Art Attack live demo — pulls real catalog, logo, and colors from the
// store at runtime (browser-side), with CORS-proxy fallbacks.
(function () {
  'use strict';

  var STORE = 'https://robbieconal.myshopify.com';
  var banner = document.getElementById('status-banner');

  // ---------- fetch with CORS-proxy fallbacks ----------
  var PROXIES = [
    function (u) { return u; },
    function (u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); },
    function (u) { return 'https://corsproxy.io/?url=' + encodeURIComponent(u); },
    function (u) { return 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u); }
  ];

  function fetchStore(path, asJson) {
    var url = STORE + path;
    var attempt = function (i) {
      if (i >= PROXIES.length) return Promise.reject(new Error('All fetch routes failed for ' + path));
      return fetch(PROXIES[i](url))
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return asJson ? r.json() : r.text();
        })
        .then(function (body) {
          if (asJson && typeof body !== 'object') throw new Error('Bad JSON');
          return body;
        })
        .catch(function () { return attempt(i + 1); });
    };
    return attempt(0);
  }

  // ---------- tiny color utils ----------
  function parseColor(str) {
    if (!str) return null;
    str = str.trim();
    var m = str.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      var h = m[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    m = str.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return [+m[1], +m[2], +m[3]];
    return null;
  }
  function hex(rgb) {
    return '#' + rgb.map(function (c) {
      c = Math.max(0, Math.min(255, Math.round(c)));
      return ('0' + c.toString(16)).slice(-2);
    }).join('');
  }
  function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function setVars(bg, text, accent) {
    var r = document.documentElement.style;
    if (bg && text) {
      r.setProperty('--bg', hex(bg));
      r.setProperty('--text', hex(text));
      r.setProperty('--bg-2', hex(mix(bg, text, 0.045)));
      r.setProperty('--bg-3', hex(mix(bg, text, 0.09)));
      r.setProperty('--border', hex(mix(bg, text, 0.16)));
      r.setProperty('--text-muted', hex(mix(text, bg, 0.42)));
    }
    if (accent) {
      r.setProperty('--accent', hex(accent));
      r.setProperty('--accent-hover', hex(mix(accent, [255, 255, 255], 0.12)));
    }
  }

  // ---------- branding: logo + colors from the live storefront ----------
  function applyBranding() {
    return fetchStore('/', false).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');

      // Logo: prefer an image inside the header / linked to home, or any "logo" image
      var logo =
        doc.querySelector('header a[href="/"] img, .site-header img, .header img') ||
        doc.querySelector('img[src*="logo" i]') ||
        doc.querySelector('.logo img, #logo img');
      if (logo) {
        var src = logo.getAttribute('src') || '';
        if (src.indexOf('//') === 0) src = 'https:' + src;
        else if (src.indexOf('/') === 0) src = STORE + src;
        if (src) {
          var slot = document.getElementById('logo-slot');
          slot.innerHTML = '';
          var img = document.createElement('img');
          img.src = src;
          img.alt = "Robbie Conal's Art Attack";
          slot.appendChild(img);
        }
      }

      // Colors: meta theme-color, inline styles, then first theme stylesheet
      var metaColor = doc.querySelector('meta[name="theme-color"]');
      var inlineCss = Array.prototype.map.call(doc.querySelectorAll('style'), function (s) {
        return s.textContent;
      }).join('\n');

      var cssLink = doc.querySelector('link[rel="stylesheet"][href*="cdn.shopify"], link[rel="stylesheet"][href*="/assets/"]');
      var cssPromise = Promise.resolve('');
      if (cssLink) {
        var href = cssLink.getAttribute('href');
        if (href.indexOf('//') === 0) href = 'https:' + href;
        // Theme CSS lives on cdn.shopify.com — fetch through the same fallback chain
        cssPromise = fetch(href).then(function (r) { return r.text(); })
          .catch(function () {
            return fetch(PROXIES[1](href)).then(function (r) { return r.text(); }).catch(function () { return ''; });
          });
      }

      return cssPromise.then(function (extCss) {
        var css = inlineCss + '\n' + extCss;
        var bg = null, text = null, accent = null;

        // body { background:…; color:… }
        var bodyRules = css.match(/(?:^|[\s,}])body[^{]*\{[^}]*\}/g) || [];
        bodyRules.forEach(function (rule) {
          var b = rule.match(/background(?:-color)?\s*:\s*([^;}]+)/i);
          var c = rule.match(/(?:^|[;{])\s*color\s*:\s*([^;}]+)/i);
          if (!bg && b) bg = parseColor(b[1]);
          if (!text && c) text = parseColor(c[1]);
        });

        // Common accent variables / link colors
        var accentVar = css.match(/--(?:color-)?(?:accent|primary|button|link)[^:]*:\s*([^;}]+)/i);
        if (accentVar) accent = parseColor(accentVar[1]);
        if (!accent) {
          var aRule = css.match(/(?:^|[\s,}])a(?::link)?\s*\{[^}]*color\s*:\s*([^;}]+)/i);
          if (aRule) accent = parseColor(aRule[1]);
        }
        if (!bg && metaColor) bg = parseColor(metaColor.getAttribute('content'));

        // Only apply when we got a coherent pair; otherwise keep our palette
        if (bg && text) setVars(bg, text, accent);
        else if (accent) setVars(null, null, accent);
      });
    });
  }

  // ---------- catalog ----------
  var products = [];
  var collections = [];
  var byHandle = {};
  var collectionCache = {};

  function money(v) { return '$' + parseFloat(v).toFixed(2); }
  function img(p, w) {
    var src = (p.images && p.images[0] && p.images[0].src) || '';
    return src ? src.replace(/(\.[a-z]+)(\?|$)/i, '_' + w + 'x$1$2') : '';
  }

  function cardHTML(p) {
    var price = p.variants && p.variants[0] ? p.variants[0].price : null;
    var compare = p.variants && p.variants[0] && p.variants[0].compare_at_price;
    var onSale = compare && parseFloat(compare) > parseFloat(price);
    var imgSrc = img(p, 600);
    return '<article class="product-card">' +
      '<a href="#product/' + p.handle + '" class="product-card__image">' +
        (imgSrc ? '<img src="' + imgSrc + '" alt="' + esc(p.title) + '" loading="lazy">' : '') +
        (onSale ? '<span class="product-card__badge">Sale</span>' : '') +
      '</a>' +
      '<div class="product-card__info">' +
        '<p class="product-card__collection">' + esc(p.product_type || 'Artwork') + '</p>' +
        '<h3 class="product-card__title"><a href="#product/' + p.handle + '">' + esc(p.title) + '</a></h3>' +
        '<p class="product-card__price">' + (onSale ? '<s>' + money(compare) + '</s> ' : '') + (price ? money(price) : '') + '</p>' +
        '<a href="#product/' + p.handle + '" class="product-card__cta">View Work</a>' +
      '</div>' +
    '</article>';
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderHome() {
    var grid = document.getElementById('featured-grid');
    grid.innerHTML = products.slice(0, 8).map(cardHTML).join('');

    var latest = products.slice().sort(function (a, b) {
      return new Date(b.published_at || 0) - new Date(a.published_at || 0);
    }).slice(0, 4);
    document.getElementById('latest-grid').innerHTML = latest.map(cardHTML).join('');

    // Hero background from the first product photo
    var heroSrc = img(products[0], 1600);
    if (heroSrc) {
      var hm = document.getElementById('hero-media');
      hm.querySelector('img').src = heroSrc;
      hm.style.display = '';
    }

    // Collection cards + nav + footer links
    var cards = '', nav = '<li><a href="#shop">All Products</a></li>', foot = '<li><a href="#shop">All Products</a></li>';
    collections.forEach(function (c) {
      if (!c.products_count) return;
      var ci = c.image && c.image.src ? c.image.src : '';
      cards += '<a href="#shop/' + c.handle + '" class="collection-card">' +
        '<div class="collection-card__image">' + (ci ? '<img src="' + ci + '" alt="" loading="lazy">' : '') + '</div>' +
        '<div class="collection-card__overlay"></div>' +
        '<div class="collection-card__content">' +
          '<h3 class="collection-card__title">' + esc(c.title) + '</h3>' +
          '<p class="collection-card__count">' + c.products_count + ' works</p>' +
        '</div></a>';
      nav += '<li><a href="#shop/' + c.handle + '">' + esc(c.title) + '</a></li>';
      foot += '<li><a href="#shop/' + c.handle + '">' + esc(c.title) + '</a></li>';
    });
    document.getElementById('collection-cards').innerHTML = cards;
    document.getElementById('nav-collections').innerHTML = nav;
    document.getElementById('footer-collections').innerHTML = foot;

    // Fill collection card images missing one with that collection's first product
    collections.forEach(function (c) {
      if (!c.products_count || (c.image && c.image.src)) return;
      loadCollection(c.handle).then(function (list) {
        if (!list.length) return;
        var el = document.querySelector('a[href="#shop/' + c.handle + '"] .collection-card__image');
        if (el && !el.querySelector('img')) {
          el.innerHTML = '<img src="' + img(list[0], 600) + '" alt="" loading="lazy">';
        }
      });
    });
  }

  function loadCollection(handle) {
    if (collectionCache[handle]) return Promise.resolve(collectionCache[handle]);
    return fetchStore('/collections/' + handle + '/products.json?limit=250', true).then(function (d) {
      collectionCache[handle] = d.products || [];
      return collectionCache[handle];
    }).catch(function () { return []; });
  }

  var currentShopList = [];
  function renderShop(handle) {
    var titleEl = document.getElementById('shop-title');
    var bar = document.getElementById('filter-bar');
    bar.innerHTML = '<button class="filter-btn' + (!handle ? ' active' : '') + '" data-h="">All</button>' +
      collections.filter(function (c) { return c.products_count; }).map(function (c) {
        return '<button class="filter-btn' + (handle === c.handle ? ' active' : '') + '" data-h="' + c.handle + '">' + esc(c.title) + '</button>';
      }).join('');
    bar.querySelectorAll('.filter-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        location.hash = b.dataset.h ? '#shop/' + b.dataset.h : '#shop';
      });
    });

    var listPromise;
    if (handle) {
      var col = collections.find(function (c) { return c.handle === handle; });
      titleEl.textContent = col ? col.title : 'Collection';
      document.getElementById('shop-desc').textContent = '';
      listPromise = loadCollection(handle);
    } else {
      titleEl.textContent = 'All Products';
      document.getElementById('shop-desc').textContent = '';
      listPromise = Promise.resolve(products);
    }

    listPromise.then(function (list) {
      currentShopList = list;
      applySort();
    });
  }

  function applySort() {
    var mode = document.getElementById('sort-select').value;
    var list = currentShopList.slice();
    var p = function (x) { return parseFloat(x.variants && x.variants[0] ? x.variants[0].price : 0); };
    if (mode === 'price-asc') list.sort(function (a, b) { return p(a) - p(b); });
    if (mode === 'price-desc') list.sort(function (a, b) { return p(b) - p(a); });
    if (mode === 'title') list.sort(function (a, b) { return a.title.localeCompare(b.title); });
    if (mode === 'newest') list.sort(function (a, b) { return new Date(b.published_at || 0) - new Date(a.published_at || 0); });
    document.getElementById('shop-count').textContent = list.length + ' works';
    document.getElementById('shop-grid').innerHTML = list.map(cardHTML).join('');
  }
  document.getElementById('sort-select').addEventListener('change', applySort);

  function renderProduct(handle) {
    var p = byHandle[handle];
    var el = document.getElementById('product-detail');
    if (!p) { el.innerHTML = '<p style="color:var(--text-muted);padding:2rem 0;">Product not found.</p>'; return; }

    var v0 = p.variants && p.variants[0];
    var price = v0 ? v0.price : '0';
    var thumbs = (p.images || []).map(function (im, i) {
      var t = im.src.replace(/(\.[a-z]+)(\?|$)/i, '_140x$1$2');
      var full = im.src.replace(/(\.[a-z]+)(\?|$)/i, '_900x$1$2');
      return '<button class="product-gallery__thumb' + (i === 0 ? ' active' : '') + '" data-src="' + full + '"><img src="' + t + '" alt="" width="70" height="70" loading="lazy"></button>';
    }).join('');

    var variantSel = '';
    if (p.variants && p.variants.length > 1) {
      variantSel = '<div class="product-variants"><label class="variant-label">Option</label>' +
        '<select class="variant-select" id="pd-variant">' +
        p.variants.map(function (v) {
          return '<option value="' + v.id + '" data-price="' + v.price + '"' + (v.available === false ? ' disabled' : '') + '>' +
            esc(v.title) + ' — ' + money(v.price) + (v.available === false ? ' (Sold out)' : '') + '</option>';
        }).join('') + '</select></div>';
    }

    el.innerHTML =
      '<div class="product-gallery">' +
        '<div class="product-gallery__main"><img id="pd-main" src="' + img(p, 900) + '" alt="' + esc(p.title) + '"></div>' +
        (thumbs ? '<div class="product-gallery__thumbs">' + thumbs + '</div>' : '') +
      '</div>' +
      '<div class="product-info">' +
        '<p class="product-info__collection">' + esc(p.product_type || 'Artwork') + '</p>' +
        '<h1 class="product-info__title">' + esc(p.title) + '</h1>' +
        '<p class="product-info__price" id="pd-price">' + money(price) + '</p>' +
        variantSel +
        '<div class="product-add-form">' +
          '<div class="qty-selector">' +
            '<button type="button" class="qty-btn" id="pd-dec">&#8722;</button>' +
            '<input type="number" class="qty-input" id="pd-qty" value="1" min="1">' +
            '<button type="button" class="qty-btn" id="pd-inc">&#43;</button>' +
          '</div>' +
          '<button type="button" class="btn btn--solid btn--full" id="pd-add">Add to Cart</button>' +
          '<a href="' + STORE + '/products/' + p.handle + '" target="_blank" rel="noopener" class="btn btn--full" style="margin-top:0.75rem;">Buy on Live Store</a>' +
        '</div>' +
        '<div class="product-description">' + (p.body_html || '') + '</div>' +
      '</div>';

    el.querySelectorAll('.product-gallery__thumb').forEach(function (t) {
      t.addEventListener('click', function () {
        el.querySelectorAll('.product-gallery__thumb').forEach(function (x) { x.classList.remove('active'); });
        t.classList.add('active');
        document.getElementById('pd-main').src = t.dataset.src;
      });
    });
    var qty = document.getElementById('pd-qty');
    document.getElementById('pd-dec').addEventListener('click', function () { if (+qty.value > 1) qty.value = +qty.value - 1; });
    document.getElementById('pd-inc').addEventListener('click', function () { qty.value = +qty.value + 1; });
    var sel = document.getElementById('pd-variant');
    if (sel) sel.addEventListener('change', function () {
      document.getElementById('pd-price').textContent = money(sel.selectedOptions[0].dataset.price);
    });
    document.getElementById('pd-add').addEventListener('click', function () {
      var btn = this;
      addToCart({
        title: p.title,
        price: parseFloat(sel ? sel.selectedOptions[0].dataset.price : price),
        img: img(p, 200),
        variant: sel ? sel.selectedOptions[0].textContent.split(' — ')[0] : '',
        qty: parseInt(qty.value, 10) || 1
      });
      btn.textContent = 'Added!';
      setTimeout(function () { btn.textContent = 'Add to Cart'; }, 1800);
    });
  }

  // ---------- cart (simulated) ----------
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem('demo-cart') || '[]'); } catch (e) {}
  function persist() {
    try { localStorage.setItem('demo-cart', JSON.stringify(cart)); } catch (e) {}
    refreshCount();
  }
  function refreshCount() {
    var n = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    document.querySelectorAll('.cart-count').forEach(function (el) {
      el.textContent = n;
      el.style.display = n > 0 ? 'flex' : 'none';
    });
  }
  function addToCart(item) {
    var ex = cart.find(function (i) { return i.title === item.title && i.variant === item.variant; });
    if (ex) ex.qty += item.qty; else cart.push(item);
    persist();
  }
  function renderCart() {
    var wrap = document.getElementById('cart-items');
    var summary = document.getElementById('cart-summary');
    if (!cart.length) {
      wrap.innerHTML = '<p style="padding:3rem 0;color:var(--text-muted);">Your cart is empty. <a href="#shop" style="color:var(--accent);text-decoration:underline;">Continue shopping</a></p>';
      summary.style.display = 'none';
      return;
    }
    summary.style.display = '';
    var total = 0;
    wrap.innerHTML = cart.map(function (item, idx) {
      total += item.price * item.qty;
      return '<div class="cart-item">' +
        '<span class="cart-item__image">' + (item.img ? '<img src="' + item.img + '" alt="" width="90">' : '') + '</span>' +
        '<div class="cart-item__details">' +
          '<p class="cart-item__title">' + esc(item.title) + '</p>' +
          (item.variant ? '<p class="cart-item__variant">' + esc(item.variant) + '</p>' : '') +
          '<p style="font-family:var(--font-ui);font-size:0.78rem;margin-bottom:0.4rem;">Qty: ' + item.qty + ' &times; ' + money(item.price) + '</p>' +
          '<button class="cart-item__remove" data-idx="' + idx + '">Remove</button>' +
        '</div>' +
        '<p style="font-family:var(--font-ui);font-size:0.85rem;font-weight:700;">' + money(item.price * item.qty) + '</p>' +
      '</div>';
    }).join('');
    var n = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    document.getElementById('cart-n').textContent = n;
    document.getElementById('cart-subtotal').textContent = money(total);
    document.getElementById('cart-total').textContent = money(total);
    wrap.querySelectorAll('.cart-item__remove').forEach(function (b) {
      b.addEventListener('click', function () {
        cart.splice(+b.dataset.idx, 1);
        persist();
        renderCart();
      });
    });
  }
  refreshCount();

  // ---------- mobile nav ----------
  var mobileNav = document.querySelector('.mobile-nav');
  function closeMobileNav() { mobileNav.classList.remove('open'); document.body.style.overflow = ''; }
  document.querySelector('.menu-toggle').addEventListener('click', function () {
    mobileNav.classList.add('open'); document.body.style.overflow = 'hidden';
  });
  document.querySelector('.mobile-nav-close button').addEventListener('click', closeMobileNav);
  document.querySelector('.mobile-nav-overlay').addEventListener('click', closeMobileNav);
  mobileNav.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeMobileNav(); });

  // ---------- router ----------
  function route() {
    var h = (location.hash || '#home').slice(1);
    var parts = h.split('/');
    var page = parts[0] || 'home';
    var arg = parts[1];
    var known = { home: 1, shop: 1, product: 1, cart: 1, about: 1 };
    if (!known[page]) { page = 'home'; arg = null; }
    document.querySelectorAll('[data-page]').forEach(function (el) {
      el.style.display = el.dataset.page === page ? '' : 'none';
    });
    window.scrollTo(0, 0);
    if (page === 'shop') renderShop(arg || null);
    if (page === 'product' && arg) renderProduct(arg);
    if (page === 'cart') renderCart();
  }
  window.addEventListener('hashchange', route);

  // ---------- boot ----------
  Promise.all([
    fetchStore('/products.json?limit=250', true),
    fetchStore('/collections.json?limit=50', true).catch(function () { return { collections: [] }; })
  ]).then(function (res) {
    products = res[0].products || [];
    collections = (res[1].collections || []).filter(function (c) { return c.handle !== 'frontpage' || c.products_count; });
    products.forEach(function (p) { byHandle[p.handle] = p; });
    banner.textContent = 'Live data loaded — ' + products.length + ' works from robbieconal.myshopify.com';
    setTimeout(function () { banner.style.display = 'none'; }, 3500);
    renderHome();
    route();
  }).catch(function (err) {
    banner.classList.add('error');
    banner.textContent = 'Could not reach the live store (' + err.message + '). Check your connection and reload.';
    route();
  });

  // Branding is independent of catalog load
  applyBranding().catch(function () { /* keep default branding */ });
})();
