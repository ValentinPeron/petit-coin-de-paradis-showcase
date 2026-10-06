/* Le Petit Coin de Paradis · comportement de démonstration (panier, recherche, tri, coffret à composer).
   Sans dépendance. Tout reste dans le navigateur (localStorage) : aucune commande n'est envoyée. */
(function () {
  'use strict';
  var ROOT = document.body.getAttribute('data-root') || '';
  var CATALOGUE = window.LPCDP_CATALOGUE || [];
  var BY = {};
  CATALOGUE.forEach(function (p) { BY[p.id] = p; });

  /* ---------- utilitaires ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function eur(c) { return (c / 100).toFixed(2).replace('.', ',') + ' €'; }
  function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* stockage indisponible */ } }
  function fetchStore(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function icon(id) { return '<svg class="picto" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function thumb(p, v, cls) {
    var u = p.v[v || 0].t;
    if (!u) { return '<span class="ph-empty" role="img" aria-label="Photo à venir">' + icon('icone-photo') + '<span>Photo à venir</span></span>'; }
    return '<img src="' + esc(ROOT + u) + '" alt="" width="300" height="300" loading="lazy"' + (cls ? ' class="' + cls + '"' : '') + '>';
  }

  /* ---------- panier ---------- */
  var KEY = 'lpcdp-demo-cart';
  var mem = null;
  function cart() {
    if (!mem) { var r = fetchStore(KEY); mem = Array.isArray(r) ? r : []; }
    return mem;
  }
  function saveCart(c) { mem = c; store(KEY, c); refreshCount(); }
  function lineQty(l) { return l.type === 'coffret' ? 1 : l.qty; }
  function count() { return cart().reduce(function (n, l) { return n + lineQty(l); }, 0); }
  function refreshCount() {
    var n = count();
    [].forEach.call(document.querySelectorAll('.cart-n'), function (el) {
      el.textContent = n;
      el.setAttribute('aria-label', n + ' article' + (n > 1 ? 's' : ''));
    });
    [].forEach.call(document.querySelectorAll('.cart'), function (el) {
      el.setAttribute('aria-label', 'Panier, ' + n + ' article' + (n > 1 ? 's' : ''));
    });
  }
  var toastTimer;
  function toast(html) {
    var t = document.getElementById('toast');
    if (!t) { return; }
    t.innerHTML = html;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 4500);
  }
  function addToCart(id, v, qty) {
    var p = BY[id];
    if (!p) { return; }
    var c = cart().slice();
    var line = c.filter(function (l) { return l.id === id && l.v === v; })[0];
    if (line) { line.qty += qty; } else { c.push({ id: id, v: v, qty: qty }); }
    saveCart(c);
    toast('<b>' + esc(p.n) + '</b> ajouté au panier. <a href="' + ROOT + 'panier/index.html">Voir le panier</a>');
  }
  function lineTotal(l) {
    if (l.type === 'coffret') { return l.total; }
    return BY[l.id] ? BY[l.id].v[l.v].p * l.qty : 0;
  }

  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) { addToCart(add.getAttribute('data-add'), 0, 1); }
  });

  var buy = document.querySelector('form.buy');
  var sel = document.getElementById('variant');
  if (buy) {
    var pid = buy.getAttribute('data-id');
    buy.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = parseInt(buy.querySelector('input[type=number]').value, 10);
      addToCart(pid, sel ? parseInt(sel.value, 10) : 0, q > 0 ? Math.min(q, 20) : 1);
    });
    if (sel && BY[pid]) {
      sel.addEventListener('change', function () {
        var v = BY[pid].v[parseInt(sel.value, 10)];
        var pr = document.querySelector('.price-lg');
        if (pr) { pr.textContent = eur(v.p); }
        var im = document.querySelector('.product-photo img');
        if (im && v.b) { im.src = ROOT + v.b; }
      });
    }
  }

  /* page panier */
  function renderCart() {
    var full = document.getElementById('cart-full');
    var empty = document.getElementById('cart-empty');
    if (!full || !empty) { return; }
    var c = cart();
    empty.hidden = c.length > 0;
    full.hidden = c.length === 0;
    if (!c.length) { return; }
    var total = 0;
    var rows = c.map(function (l, i) {
      var t = lineTotal(l);
      total += t;
      if (l.type === 'coffret') {
        var items = l.items.map(function (it) {
          var p = BY[it.id];
          return p ? '<li>' + it.qty + ' × ' + esc(p.n) + '</li>' : '';
        }).join('');
        return '<li class="cart-line cart-coffret"><div class="cl-img">' + icon(l.container === 'bourriche' ? 'picto-bourriche' : 'picto-barque') + '</div>' +
          '<div class="cl-main"><p class="cl-name">Coffret à garnir : ' + esc(l.container) + ' garnie</p>' +
          '<p class="cl-sub">' + l.items.reduce(function (n, it) { return n + it.qty; }, 0) + ' produits' + (l.msg ? ' · avec un petit mot' : '') + (l.noprice ? ' · sans prix' : '') + '</p>' +
          '<details><summary>Afficher le détail</summary><ul>' + items + (l.msg ? '<li class="cl-msg">Petit mot : « ' + esc(l.msg) + ' »</li>' : '') + '</ul></details></div>' +
          '<div class="cl-qty"><span class="cl-fixed">1 coffret</span></div>' +
          '<p class="cl-total">' + eur(t) + '</p>' +
          '<button class="cl-rm" type="button" data-act="rm" data-i="' + i + '" aria-label="Retirer ce coffret du panier">Retirer</button></li>';
      }
      var p = BY[l.id];
      if (!p) { return ''; }
      var vv = p.v[l.v];
      return '<li class="cart-line"><div class="cl-img"><a href="' + ROOT + p.u + '" tabindex="-1" aria-hidden="true">' + thumb(p, l.v) + '</a></div>' +
        '<div class="cl-main"><p class="cl-name"><a href="' + ROOT + p.u + '">' + esc(p.n) + '</a></p>' +
        '<p class="cl-sub">' + (p.v.length > 1 ? esc(vv.l) + ' · ' : '') + eur(vv.p) + '</p></div>' +
        '<div class="cl-qty" role="group" aria-label="Quantité de ' + esc(p.n) + '">' +
        '<button type="button" data-act="dec" data-i="' + i + '" aria-label="Retirer une unité">−</button>' +
        '<output>' + l.qty + '</output>' +
        '<button type="button" data-act="inc" data-i="' + i + '" aria-label="Ajouter une unité">+</button></div>' +
        '<p class="cl-total">' + eur(t) + '</p>' +
        '<button class="cl-rm" type="button" data-act="rm" data-i="' + i + '" aria-label="Retirer ' + esc(p.n) + ' du panier">Retirer</button></li>';
    }).join('');
    full.querySelector('.cart-lines').innerHTML = rows;
    full.querySelector('.cart-sub').textContent = eur(total);
  }
  var cartLines = document.querySelector('.cart-lines');
  if (cartLines) {
    cartLines.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) { return; }
      var i = parseInt(b.getAttribute('data-i'), 10);
      var c = cart().slice();
      var act = b.getAttribute('data-act');
      if (act === 'rm') { c.splice(i, 1); }
      if (act === 'inc' && c[i].qty < 20) { c[i].qty += 1; }
      if (act === 'dec') { c[i].qty -= 1; if (c[i].qty < 1) { c.splice(i, 1); } }
      saveCart(c);
      renderCart();
    });
    renderCart();
  }

  /* ---------- tri d'une liste ---------- */
  var sortSel = document.querySelector('.sort select');
  var grid = document.querySelector('.list-bar ~ .grid');
  if (sortSel && grid) {
    var cards = [].slice.call(grid.children);
    sortSel.addEventListener('change', function () {
      var m = sortSel.value;
      var out = cards.slice().sort(function (a, b) {
        if (m === 'asc') { return a.getAttribute('data-price') - b.getAttribute('data-price'); }
        if (m === 'desc') { return b.getAttribute('data-price') - a.getAttribute('data-price'); }
        if (m === 'az') { return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'), 'fr'); }
        return a.getAttribute('data-i') - b.getAttribute('data-i');
      });
      out.forEach(function (c) { grid.appendChild(c); });
    });
  }

  /* ---------- recherche ---------- */
  function cardHtml(p) {
    var low = p.v.reduce(function (m, x) { return Math.min(m, x.p); }, Infinity);
    var price = (p.v.length > 1 ? 'À partir de ' : '') + eur(low);
    var action = p.v.length > 1
      ? '<a class="btn btn-secondary btn-sm" href="' + ROOT + p.u + '">Choisir</a>'
      : '<button class="btn btn-primary btn-sm" type="button" data-add="' + esc(p.id) + '" aria-label="Ajouter ' + esc(p.n) + ' au panier">Ajouter</button>';
    return '<article class="card"><a class="card-link" href="' + ROOT + p.u + '"><span class="ph">' + thumb(p, 0) + '</span>' +
      '<span class="bd"><span class="cat">' + esc(p.c) + '</span><h2 class="name">' + esc(p.n) + '</h2></span></a>' +
      '<div class="row"><span class="price">' + price + '</span>' + action + '</div></article>';
  }
  var sr = document.getElementById('search-root');
  if (sr) {
    var q = (new URLSearchParams(location.search).get('q') || '').trim();
    var input = document.getElementById('q');
    if (input) { input.value = q; }
    var tokens = norm(q).split(/\s+/).filter(Boolean);
    var found = tokens.length ? CATALOGUE.filter(function (p) {
      var hay = norm(p.n + ' ' + p.c);
      return tokens.every(function (t) { return hay.indexOf(t) !== -1; });
    }) : [];
    var title = document.getElementById('search-title');
    var info = document.getElementById('search-info');
    if (!tokens.length) {
      title.textContent = 'Recherche';
      info.textContent = 'Tapez un mot (miel, rillettes, thé…) dans la barre de recherche.';
    } else {
      title.textContent = 'Résultats pour « ' + q + ' »';
      info.textContent = found.length ? found.length + ' produit' + (found.length > 1 ? 's' : '') : 'Aucun produit ne correspond. Essayez un mot plus court, ou parcourez les rayons.';
    }
    sr.innerHTML = found.map(cardHtml).join('');
  }

  /* ---------- coffret à composer ---------- */
  var comp = document.getElementById('composer');
  if (comp) {
    var CAP = { barque: 6, bourriche: 10 };
    var BOX_PRICE = { barque: 500, bourriche: 900 }; // prix d'exemple, à confirmer
    var MIN_ITEMS = 3;
    var SKEY = 'lpcdp-demo-coffret';
    var PTS_LABEL = { 1: 'Petit', 2: 'Moyen', 3: 'Grand' };
    var st = fetchStore(SKEY) || {};
    st = { container: st.container || null, items: st.items || {}, msg: st.msg || '', noprice: st.noprice !== false, step: st.step || 1, filter: 'tout' };
    var pool = CATALOGUE.filter(function (p) { return p.pts; });
    var steps = [1, 2, 3].map(function (n) { return document.getElementById('step-' + n); });
    var dots = [].slice.call(document.querySelectorAll('.stepper li'));
    var pickGrid = document.getElementById('pick-grid');
    var msgEl = document.getElementById('pick-msg');

    var used = function () { return pool.reduce(function (n, p) { return n + (st.items[p.id] || 0) * p.pts; }, 0); };
    var nItems = function () { return pool.reduce(function (n, p) { return n + (st.items[p.id] || 0); }, 0); };
    var itemsTotal = function () { return pool.reduce(function (n, p) { return n + (st.items[p.id] || 0) * p.v[0].p; }, 0); };
    var minPts = function () { return Math.ceil(CAP[st.container] * 0.6); };
    var persist = function () { store(SKEY, st); };

    function validity() {
      if (!st.container) { return { ok: false, why: '' }; }
      var n = nItems(), u = used(), need = minPts();
      if (n < MIN_ITEMS) { return { ok: false, why: 'Ajoutez encore ' + (MIN_ITEMS - n) + ' produit' + (MIN_ITEMS - n > 1 ? 's' : '') + ' (' + MIN_ITEMS + ' minimum) pour continuer.' }; }
      if (u < need) { return { ok: false, why: 'Votre ' + st.container + ' a l’air un peu vide : ajoutez encore ' + (need - u) + ' point' + (need - u > 1 ? 's' : '') + ' pour continuer.' }; }
      return { ok: true, why: '' };
    }
    function gaugeText() {
      var c = st.container, u = used(), cap = CAP[c], n = nItems();
      if (n === 0) { return 'Votre ' + c + ' est vide. Ajoutez au moins ' + MIN_ITEMS + ' produits.'; }
      if (u >= cap) { return 'Votre ' + c + ' est pleine.'; }
      if (u < minPts() || n < MIN_ITEMS) { return n + ' produit' + (n > 1 ? 's' : '') + ' · encore un peu de place.'; }
      return 'Votre ' + c + ' est bien garnie. Vous pouvez encore ajouter ' + (cap - u) + ' point' + (cap - u > 1 ? 's' : '') + '.';
    }

    function goStep(n, quiet) {
      st.step = n;
      steps.forEach(function (s, i) { s.hidden = i !== n - 1; });
      dots.forEach(function (d, i) { if (i === n - 1) { d.setAttribute('aria-current', 'step'); } else { d.removeAttribute('aria-current'); } d.classList.toggle('done', i < n - 1); });
      if (!quiet) {
        var h = steps[n - 1].querySelector('h2');
        if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
        window.scrollTo({ top: comp.getBoundingClientRect().top + window.pageYOffset - 20, behavior: 'smooth' });
      }
      persist();
      render();
    }

    function renderPick() {
      var c = st.container, u = used(), cap = CAP[c];
      document.querySelectorAll('.c-name').forEach(function (el) { el.textContent = c || ''; });
      var list = pool.filter(function (p) { return st.filter === 'tout' || p.g === st.filter; });
      pickGrid.innerHTML = list.map(function (p) {
        var q = st.items[p.id] || 0;
        var fits = p.pts <= cap - u;
        var ctl;
        if (q > 0) {
          ctl = '<div class="stepper-qty" role="group" aria-label="Quantité de ' + esc(p.n) + '"><button type="button" data-pick="dec" data-id="' + esc(p.id) + '" aria-label="Retirer une unité">−</button><output>' + q + '</output>' +
            '<button type="button" data-pick="inc" data-id="' + esc(p.id) + '" aria-label="Ajouter une unité"' + (fits ? '' : ' disabled') + '>+</button></div>';
        } else if (fits) {
          ctl = '<button class="btn btn-primary btn-sm" type="button" data-pick="inc" data-id="' + esc(p.id) + '" aria-label="Ajouter ' + esc(p.n) + ' au coffret">Ajouter</button>';
        } else {
          ctl = '<span class="too-big">Ne rentre plus dans votre ' + esc(c) + '.</span>';
        }
        return '<article class="card pick' + (fits || q ? '' : ' dim') + '"><span class="ph">' + thumb(p, 0) + '</span><span class="bd"><span class="cat">' + PTS_LABEL[p.pts] + ' format</span><h3 class="name">' + esc(p.n) + '</h3></span>' +
          '<div class="row"><span class="price">' + eur(p.v[0].p) + '</span>' + ctl + '</div></article>';
      }).join('');
      var anyBig = pool.some(function (p) { return p.pts > cap - u; });
      document.getElementById('upgrade-wrap').innerHTML = (c === 'barque' && anyBig) ? 'Certains produits ne rentrent plus. <button class="linkish" type="button" data-pick="upgrade">Passer à la bourriche</button> (vos produits sont conservés)' : '';
      var pct = Math.min(100, Math.round(u / cap * 100));
      var g = document.getElementById('gauge');
      g.max = cap; g.value = u;
      g.setAttribute('aria-valuetext', u + ' points sur ' + cap);
      document.getElementById('gauge-text').textContent = gaugeText();
      document.getElementById('gauge-pts').textContent = u + ' / ' + cap + ' points (' + pct + ' %)';
      var lines = pool.filter(function (p) { return st.items[p.id]; }).map(function (p) {
        return '<li><span>' + st.items[p.id] + ' × ' + esc(p.n) + '</span><span>' + eur(p.v[0].p * st.items[p.id]) + '</span></li>';
      }).join('');
      document.getElementById('summary-list').innerHTML = lines || '<li class="empty-line">Aucun produit pour le moment.</li>';
      document.getElementById('sum-box').textContent = eur(BOX_PRICE[c]);
      document.getElementById('sum-total').textContent = eur(BOX_PRICE[c] + itemsTotal());
      var v = validity();
      var btn = document.getElementById('to-step3');
      btn.disabled = !v.ok;
      var why = document.getElementById('reason');
      why.textContent = v.ok ? '' : v.why;
      btn.setAttribute('aria-describedby', 'reason');
    }

    function renderFinal() {
      var c = st.container;
      document.getElementById('final-title').textContent = 'Votre ' + c + ' est prête';
      var lines = pool.filter(function (p) { return st.items[p.id]; }).map(function (p) {
        return '<li><span>' + st.items[p.id] + ' × ' + esc(p.n) + '</span><span>' + eur(p.v[0].p * st.items[p.id]) + '</span></li>';
      }).join('');
      document.getElementById('final-list').innerHTML = '<li><span>La ' + esc(c) + ' (prix d’exemple)</span><span>' + eur(BOX_PRICE[c]) + '</span></li>' + lines;
      document.getElementById('final-total').textContent = eur(BOX_PRICE[c] + itemsTotal());
      var ta = document.getElementById('msg');
      ta.value = st.msg;
      document.getElementById('nopr').checked = st.noprice;
      updateCard();
    }
    function updateCard() {
      var left = 200 - st.msg.length;
      var cnt = document.getElementById('msg-count');
      cnt.textContent = left + ' caractère' + (left > 1 ? 's' : '') + ' restant' + (left > 1 ? 's' : '') + ' (sur 200)';
      document.getElementById('card-text').textContent = st.msg || 'Joyeux anniversaire, un petit bout de Bretagne pour toi. Bises, Claire';
      document.getElementById('card-text').classList.toggle('placeholder', !st.msg);
    }

    function render() {
      if (st.step === 2) { renderPick(); }
      if (st.step === 3) { renderFinal(); }
    }

    comp.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) { return; }
      var cont = b.getAttribute('data-container');
      if (cont) {
        st.container = cont;
        goStep(2);
        return;
      }
      var f = b.getAttribute('data-filter');
      if (f) {
        st.filter = f;
        [].forEach.call(document.querySelectorAll('[data-filter]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        renderPick();
        return;
      }
      var pick = b.getAttribute('data-pick');
      if (pick) {
        var id = b.getAttribute('data-id');
        msgEl.textContent = '';
        if (pick === 'inc') {
          var p = BY[id];
          if (p.pts <= CAP[st.container] - used()) { st.items[id] = (st.items[id] || 0) + 1; }
        }
        if (pick === 'dec') {
          st.items[id] = (st.items[id] || 1) - 1;
          if (st.items[id] <= 0) { delete st.items[id]; }
        }
        if (pick === 'upgrade') { st.container = 'bourriche'; msgEl.textContent = 'Vous êtes passé à la bourriche, vos produits sont conservés.'; }
        persist();
        renderPick();
        return;
      }
      var go = b.getAttribute('data-go');
      if (go === 'back1') { goStep(1); }
      if (go === 'back2') { goStep(2); }
      if (go === 'to3' && validity().ok) { goStep(3); }
      if (go === 'reset') { st.items = {}; st.msg = ''; persist(); renderPick(); }
      if (go === 'addcart') {
        var items = pool.filter(function (p) { return st.items[p.id]; }).map(function (p) { return { id: p.id, v: 0, qty: st.items[p.id] }; });
        var c = cart().slice();
        c.push({ type: 'coffret', uid: Date.now(), container: st.container, items: items, msg: st.msg, noprice: st.noprice, total: BOX_PRICE[st.container] + itemsTotal() });
        saveCart(c);
        st.items = {}; st.msg = ''; st.step = 1; st.container = null; persist();
        window.location.href = ROOT + 'panier/index.html';
      }
    });
    document.getElementById('msg').addEventListener('input', function (e) {
      st.msg = e.target.value.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '').slice(0, 200);
      if (st.msg !== e.target.value) { e.target.value = st.msg; }
      updateCard(); persist();
    });
    document.getElementById('nopr').addEventListener('change', function (e) { st.noprice = e.target.checked; persist(); });

    // reprise du coffret en cours
    if (st.container && st.step > 1) { goStep(st.step === 3 && validity().ok ? 3 : 2, true); }
    else { goStep(1, true); }
  }

  refreshCount();
})();
