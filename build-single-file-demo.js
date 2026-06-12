#!/usr/bin/env node
// Builds a single self-contained HTML demo (CSS/JS/images inlined) for
// preview on devices without a local file server (e.g. iPad).
const fs = require('fs');
const path = require('path');

const DEMO = path.join(__dirname, 'demo');
const read = (f) => fs.readFileSync(path.join(DEMO, f), 'utf8');

const css = read('theme.css');

// Inline SVGs as data URIs
const imgDir = path.join(DEMO, 'img');
const dataUris = {};
for (const f of fs.readdirSync(imgDir)) {
  const svg = fs.readFileSync(path.join(imgDir, f), 'utf8');
  dataUris['img/' + f] = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

function inlineImages(html) {
  return html.replace(/(src|data-src)="(img\/[^"]+)"/g, (m, attr, src) =>
    dataUris[src] ? `${attr}="${dataUris[src]}"` : m
  );
}

function extractMain(html) {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  return m ? m[1] : '';
}

function rewriteLinks(html) {
  return html
    .replace(/href="index\.html"/g, 'href="#home"')
    .replace(/href="collection\.html"/g, 'href="#collection"')
    .replace(/href="product\.html"/g, 'href="#product"')
    .replace(/href="cart\.html"/g, 'href="#cart"')
    .replace(/href="about\.html(#contact)?"/g, 'href="#about"');
}

const pages = {
  home: extractMain(read('index.html')),
  collection: extractMain(read('collection.html')),
  product: extractMain(read('product.html')),
  cart: extractMain(read('cart.html')),
  about: extractMain(read('about.html')),
};

// Header/footer/mobile-nav from index page
const indexHtml = read('index.html');
const header = indexHtml.match(/<div class="announcement-bar">[\s\S]*?<\/header>/)[0];
const footer = indexHtml.match(/<footer[\s\S]*?<\/footer>/)[0];
const mobileNav = indexHtml.match(/<nav class="mobile-nav"[\s\S]*?<\/nav>\n*\s*<script/)[0].replace(/<script$/, '');

const js = `
(function () {
  'use strict';

  // ---- Hash router ----
  var pageEls = document.querySelectorAll('[data-page]');
  function show(page) {
    var found = false;
    pageEls.forEach(function (el) {
      var match = el.dataset.page === page;
      el.style.display = match ? '' : 'none';
      if (match) found = true;
    });
    if (!found) show('home');
    window.scrollTo(0, 0);
    closeMobileNav();
    if (page === 'cart') renderCart();
  }
  function route() { show((location.hash || '#home').slice(1)); }
  window.addEventListener('hashchange', route);

  // ---- Mobile nav ----
  var mobileNav = document.querySelector('.mobile-nav');
  function closeMobileNav() {
    if (mobileNav) mobileNav.classList.remove('open');
    document.body.style.overflow = '';
  }
  var mt = document.querySelector('.menu-toggle');
  if (mt) mt.addEventListener('click', function () {
    mobileNav.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
  var mc = document.querySelector('.mobile-nav-close button');
  if (mc) mc.addEventListener('click', closeMobileNav);
  var mo = document.querySelector('.mobile-nav-overlay');
  if (mo) mo.addEventListener('click', closeMobileNav);

  // ---- In-memory cart (localStorage unavailable under file://) ----
  var cart = [];
  try {
    cart = JSON.parse(localStorage.getItem('demo-cart') || '[]');
  } catch (e) { /* sandboxed */ }
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
  refreshCount();

  function money(n) { return '$' + n.toFixed(2); }

  function renderCart() {
    var wrap = document.querySelector('[data-demo-cart-items]');
    var summary = document.querySelector('[data-demo-cart-summary]');
    if (!wrap) return;
    if (cart.length === 0) {
      wrap.innerHTML = '<p style="padding:3rem 0;color:var(--text-muted);">Your cart is empty. <a href="#collection" style="color:var(--accent);text-decoration:underline;">Continue shopping</a></p>';
      if (summary) summary.style.display = 'none';
      return;
    }
    if (summary) summary.style.display = '';
    var total = 0;
    wrap.innerHTML = cart.map(function (item, idx) {
      total += item.price * item.qty;
      return '<div class="cart-item">' +
        '<a href="#product" class="cart-item__image"><img src="' + item.img + '" alt="" width="90"></a>' +
        '<div class="cart-item__details">' +
          '<p class="cart-item__title">' + item.title + '</p>' +
          (item.variant ? '<p class="cart-item__variant">' + item.variant + '</p>' : '') +
          '<p style="font-family:var(--font-ui);font-size:0.78rem;margin-bottom:0.4rem;">Qty: ' + item.qty + ' &times; ' + money(item.price) + '</p>' +
          '<button class="cart-item__remove" data-idx="' + idx + '">Remove</button>' +
        '</div>' +
        '<p style="font-family:var(--font-ui);font-size:0.85rem;font-weight:700;white-space:nowrap;">' + money(item.price * item.qty) + '</p>' +
      '</div>';
    }).join('');
    var n = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    document.querySelectorAll('[data-demo-subtotal]').forEach(function (el) { el.textContent = money(total); });
    document.querySelectorAll('[data-demo-count]').forEach(function (el) { el.textContent = n; });
    wrap.querySelectorAll('.cart-item__remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        cart.splice(parseInt(btn.dataset.idx, 10), 1);
        persist();
        renderCart();
      });
    });
  }

  // ---- Gallery thumbs ----
  var thumbs = document.querySelectorAll('.product-gallery__thumb');
  var mainImg = document.querySelector('.product-gallery__main img');
  thumbs.forEach(function (t) {
    t.addEventListener('click', function () {
      thumbs.forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
      if (mainImg) mainImg.src = t.dataset.src;
    });
  });

  // ---- Qty selectors ----
  document.querySelectorAll('.qty-selector').forEach(function (sel) {
    var input = sel.querySelector('.qty-input');
    var d = sel.querySelector('.qty-dec'), i = sel.querySelector('.qty-inc');
    if (d) d.addEventListener('click', function () { var v = parseInt(input.value, 10); if (v > 1) input.value = v - 1; });
    if (i) i.addEventListener('click', function () { input.value = parseInt(input.value, 10) + 1; });
  });

  // ---- Add to cart ----
  var form = document.querySelector('[data-add-to-cart-form]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('[data-add-to-cart]');
      var orig = btn.textContent;
      var qty = parseInt(form.querySelector('.qty-input').value, 10) || 1;
      var sel = form.querySelector('[data-variant-select]');
      var item = {
        title: form.dataset.title,
        price: parseFloat(form.dataset.price),
        img: form.dataset.img,
        variant: sel ? sel.value : '',
        qty: qty
      };
      var ex = cart.find(function (i) { return i.title === item.title && i.variant === item.variant; });
      if (ex) ex.qty += qty; else cart.push(item);
      persist();
      btn.disabled = true;
      btn.textContent = 'Added!';
      setTimeout(function () { btn.disabled = false; btn.textContent = orig; }, 1800);
    });
  }

  route();
})();
`;

let out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Robbie Conal's Art Attack — Theme Demo</title>
<style>
${css}
</style>
</head>
<body>
${header}
<main id="main-content">
<div data-page="home">${pages.home}</div>
<div data-page="collection" style="display:none">${pages.collection}</div>
<div data-page="product" style="display:none">${pages.product}</div>
<div data-page="cart" style="display:none">${pages.cart}</div>
<div data-page="about" style="display:none">${pages.about}</div>
</main>
${footer}
${mobileNav}
<script>
${js}
</script>
</body>
</html>`;

out = rewriteLinks(inlineImages(out));

// Product add-to-cart form references its image via data attribute
out = out.replace(/data-img="img\/(p\d\.svg)"/g, (m, f) => `data-img="${dataUris['img/' + f]}"`);

fs.writeFileSync(path.join(__dirname, 'art-attack-demo.html'), out);
console.log('Wrote art-attack-demo.html (' + Math.round(out.length / 1024) + ' KB)');
