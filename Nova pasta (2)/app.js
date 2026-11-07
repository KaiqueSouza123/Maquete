/* Vértice Residence — interface da maquete (site) */
(function () {
'use strict';
var CFG = window.MAQUETE_CONFIG || {};
var Q = new URLSearchParams(location.search);
var AJUSTE = Q.get('ajuste') === '1';
var $ = function (id) { return document.getElementById(id); };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>';

/* calibração salva neste navegador (modo de ajuste) */
var saved = null; try { saved = JSON.parse(localStorage.getItem('maquete-calib') || 'null'); } catch (e) { saved = null; }
var SITE = Object.assign({}, CFG.site || {}, saved && saved.site ? saved.site : {});
var BRIDGE = Object.assign({}, CFG.bridge || {}, saved && saved.bridge ? saved.bridge : {});
if (Q.get('lat') && Q.get('lon')) { SITE.lat = parseFloat(Q.get('lat')); SITE.lon = parseFloat(Q.get('lon')); }
if (Q.get('heading')) SITE.heading = parseFloat(Q.get('heading'));

var AV = ['A-1502', 'A-1401', 'A-1202', 'A-1101', 'A-902', 'A-801', 'A-602', 'A-401', 'A-202', 'B-1501', 'B-1302', 'B-1202', 'B-1002', 'B-801', 'B-701', 'B-502', 'B-301'];
var RES = ['A-1302', 'A-702', 'B-1402', 'B-902'];
var SEASONS = { verao: { label: 'Verão', m: 12, d: 21 }, outono: { label: 'Outono', m: 3, d: 20 }, inverno: { label: 'Inverno', m: 6, d: 21 }, primavera: { label: 'Primavera', m: 9, d: 22 } };
/* ambientes do apartamento decorado (coordenadas do modelo) */
var DECO = {
  views: {
    overview: { t: [3.5, 0, 5.3], d: 17, yaw: 0.5, pitch: 1.0 },
    sala: { E: [0.8, 1.6, 10.1], T: [5.2, 1.0, 6.4] },
    jantar: { E: [6.2, 1.6, 9.9], T: [1.3, 1.0, 6.8] },
    suite: { E: [6.3, 1.6, 5.2], T: [3.6, 0.6, 3.2] },
    quarto2: { E: [4.5, 1.6, 2.0], T: [6.4, 0.5, 0.6] },
    banheiro: { E: [2.35, 1.6, 4.6], T: [0.6, 0.9, 3.4] },
    corredor: { E: [2.4, 1.6, 6.6], T: [2.4, 1.0, 1.0] },
    vista: { E: [5.3, 1.6, 8.0], T: [5.3, -1.5, 45] }
  },
  anchors: { sala: [1.9, 1.4, 8.6], jantar: [5.4, 1.5, 8.0], suite: [4.6, 1.4, 4.0], quarto2: [5.5, 1.4, 1.1], banheiro: [0.9, 1.6, 4.6], corredor: [2.4, 1.6, 3.2], vista: [5.3, 1.7, 9.1] }
};

var S = { ready: false, mode: 'explorar', scene: 'site', sel: null, hover: null, sunOpen: false, hour: 16.5, season: 'primavera', anim: false, filter: 'todas', iUnit: null, room: 'overview', prop: null, toast: null, tour: false, sun: null, focus: null, decoOK: null, tilesErr: null, calib: null, gcopy: '' };
var engine = null, tourT = null, animT = null, toastT = null, pins = [], pinEls = [];

function status(id) { return AV.indexOf(id) >= 0 ? 'disp' : RES.indexOf(id) >= 0 ? 'res' : 'vend'; }
function brl(v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); }
function hhmm(h) { h = ((h % 24) + 24) % 24; var H = Math.floor(h), M = Math.round((h - H) * 60); if (M === 60) { H = (H + 1) % 24; M = 0; } return String(H).padStart(2, '0') + ':' + String(M).padStart(2, '0'); }
function cardinal(az) { return ['Norte', 'Nordeste', 'Leste', 'Sudeste', 'Sul', 'Sudoeste', 'Oeste', 'Noroeste'][Math.round(az / 45) % 8]; }
function unitInfo(id) {
  var m = /^([AB])-(\d+)(0[12])$/.exec(id || ''); if (!m) return null;
  var f = parseInt(m[2], 10), fin = m[3], t1 = fin === '01', price = t1 ? 489000 + f * 7400 : 742000 + f * 10600;
  return { id: id, tower: 'Torre ' + m[1], f: f, floorLabel: f + 'º pavimento', fin: fin, t1: t1, priceNum: price, price: brl(price), area: t1 ? '52,4' : '74,8', dorms: t1 ? '1 dormitório' : '2 (1 suíte)', baths: t1 ? '1' : '2', vagas: t1 ? '1' : '2', pos: 'Frente para o mar e a ponte' };
}
function viewFrom(E, T) { var dx = E[0] - T[0], dy = E[1] - T[1], dz = E[2] - T[2], d = Math.hypot(dx, dy, dz); return { t: T.slice(), d: d, yaw: Math.atan2(dx, dz), pitch: Math.asin(dy / d) }; }
function bridgeCenter() { var b = engine && engine.bridgeInfo; if (!b) return null; return [(b.t1[0] + b.t2[0]) / 2, b.sea + 40, (b.t1[2] + b.t2[2]) / 2]; }

/* ---------------- motor ---------------- */
function boot() {
  var opts = {
    available: AV,
    onPick: function (id) { if (S.calib) return; if (id) selectUnit(id); else if (S.sel && S.scene === 'site') closeUnit(); },
    onHover: function (id) { if (S.calib) return; S.hover = id; renderHover(); },
    onFrame: positionPins,
    onStatus: function (st, msg) { if (st === 'erro') { S.tilesErr = msg; renderStatus(); } },
    onAttribution: function (t) { S.gcopy = t; renderAttr(); },
    onDeco: function (ok) { S.decoOK = ok; render(); },
    aptUrl: CFG.aptUrl, aptViews: DECO
  };
  if (CFG.googleKey && Q.get('google') !== '0') {
    opts.google = { url: CFG.tilesUrl, key: CFG.googleKey, lat: SITE.lat, lon: SITE.lon, h: SITE.h || 3, heading: SITE.heading || 0, sse: innerWidth < 760 ? 22 : 16, memoryMB: innerWidth < 760 ? 350 : 700 };
    opts.bridge = BRIDGE;
  }
  try {
    engine = new window.VistaEngine($('gl'), opts);
    S.sun = engine.setTime(SEASONS[S.season].m, SEASONS[S.season].d, S.hour);
    S.ready = true; $('loading').style.display = 'none';
    window.MAQUETE = engine;
    if (opts.google && SITE.autoGround !== false && !(saved && saved.site && saved.site.grounded)) autoGround();
  } catch (e) {
    if (window.__maqueteErro) window.__maqueteErro('Não foi possível abrir o 3D: ' + (e && e.message || e)); else $('loadmsg').textContent = 'Não foi possível abrir o 3D: ' + (e && e.message || e);
    return;
  }
  render();
}
/* encaixa o terreno na altura real do chão quando o entorno termina de carregar */
function autoGround() {
  var tries = 0, done = 0;
  var t = setInterval(function () {
    tries++; if (!engine || !engine.tiles || engine.tiles.status === 'erro' || tries > 40 || done >= 2) { clearInterval(t); return; }
    if (engine.scene !== 'site' || !engine.tiles.idle() || engine.tiles.drawn.length < 3) return;
    var y = engine.probeGround();
    if (y != null && Math.abs(y) > 0.25 && Math.abs(y) < 60) { SITE.h = (SITE.h || 0) + y; engine.setSite(SITE.lat, SITE.lon, SITE.h, SITE.heading); }
    done++;
  }, 2500);
}

/* ---------------- pinos ---------------- */
function currentPins() {
  if (!S.ready) return [];
  var sc = S.scene, list = [];
  if (sc === 'site' && S.mode === 'lazer') list = [['piscina', 'Piscina'], ['sombra', 'Pergolado e sombra'], ['kids', 'Espaço kids'], ['jogos', 'Salão de jogos'], ['gourmet', 'Espaço gourmet'], ['palmeiras', 'Palmeiras']].map(function (p) { return { scene: 'site', key: p[0], label: p[1], act: 'space', arg: p[0] }; });
  else if (sc === 'site' && !S.sel && !S.tour && !S.calib) {
    list = [['torreA', 'Torre A', 'mode', 'unidades'], ['torreB', 'Torre B', 'mode', 'unidades'], ['lazer', 'Lazer', 'mode', 'lazer']].map(function (p) { return { scene: 'site', key: p[0], label: p[1], act: p[2], arg: p[3] }; });
    if (engine && engine.bridgeInfo) list.push({ scene: 'site', pos: function () { var c = bridgeCenter(); return c && [c[0], c[1] + 40, c[2]]; }, label: 'Ponte Hercílio Luz', act: 'bridgeview', arg: '' });
  }
  else if (sc === 'apt1') list = [['sala', 'Sala'], ['cozinha', 'Cozinha'], ['quarto', 'Quarto'], ['banheiro', 'Banheiro'], ['sacada', 'Sacada']].map(function (p) { return { scene: sc, key: p[0], label: p[1], act: 'room', arg: p[0] }; });
  else if (sc === 'apt2') list = [['sala', 'Sala'], ['cozinha', 'Cozinha'], ['suite', 'Suíte'], ['quarto2', 'Quarto 2'], ['banheiro', 'Banheiro'], ['banhoSuite', 'Banho suíte'], ['sacada', 'Sacada gourmet']].map(function (p) { return { scene: sc, key: p[0], label: p[1], act: 'room', arg: p[0] }; });
  else if (sc === 'deco') list = [['sala', 'Sala de estar'], ['jantar', 'Jantar e cozinha'], ['suite', 'Quarto casal'], ['quarto2', 'Quarto 2'], ['banheiro', 'Banheiros'], ['vista', 'Vista da janela']].map(function (p) { return { scene: sc, key: p[0], label: p[1], act: 'room', arg: p[0] }; });
  return list;
}
function renderPins() {
  pins = currentPins();
  var html = pins.map(function (p, i) { return '<button class="pin" data-pin="' + i + '" data-act="' + p.act + '" data-arg="' + esc(p.arg) + '" aria-label="' + esc(p.label) + '"><span class="pin-in"><span class="pin-l"><i></i>' + esc(p.label) + '</span><span class="pin-s"></span><i></i></span></button>'; }).join('');
  setHTML('pins', html); pinEls = Array.prototype.slice.call($('pins').querySelectorAll('.pin'));
}
function positionPins() {
  if (!engine) return;
  for (var i = 0; i < pins.length; i++) {
    var p = pins[i], el = pinEls[i]; if (!el) continue;
    var a = engine.scene === p.scene ? (p.pos ? p.pos() : engine.anchor(p.scene, p.key)) : null, s = a && engine.project(a);
    if (!s || engine.fade < 0.6) { if (el.style.opacity !== '0') { el.style.opacity = '0'; el.style.pointerEvents = 'none'; } continue; }
    el.style.opacity = '1'; el.style.pointerEvents = 'auto'; el.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px)';
  }
}

/* ---------------- ações ---------------- */
function stopTour() { if (tourT) { clearInterval(tourT); tourT = null; } S.tour = false; }
function setMode(mode) {
  if (!engine) return; stopTour();
  if (S.scene !== 'site') S.scene = 'site';
  engine.setLayer('site', 'roofs', mode !== 'lazer');
  if (mode === 'explorar') { engine.go('site', 'overview'); S.sel = null; engine.select(null); }
  if (mode === 'unidades') { engine.go('site', S.sel ? engine.unitView(S.sel) : 'front'); if (S.sel) engine.select(S.sel); }
  if (mode === 'lazer' || mode === 'interiores') { engine.go('site', mode === 'lazer' ? 'lazer' : 'overview'); S.sel = null; engine.select(null); }
  S.mode = mode; render();
}
function selectUnit(id) {
  if (!engine || status(id) !== 'disp') return; stopTour();
  engine.setLayer('site', 'roofs', true); engine.select(id); engine.go('site', engine.unitView(id));
  S.sel = id; S.mode = 'unidades'; S.scene = 'site'; render();
}
function closeUnit() { if (engine) engine.select(null); S.sel = null; render(); }
function interiorType(id) { return /01$/.test(id) ? 'apt1' : (S.decoOK ? 'deco' : 'apt2'); }
function enterInterior(id, view) {
  if (!engine) return; stopTour();
  var type = interiorType(id); engine.placeInterior(type, id);
  var v = view || 'overview'; if (v === 'janela') v = type === 'deco' ? 'vista' : 'sacada';
  engine.go(type, v); S.scene = type; S.iUnit = id; S.mode = 'interiores'; S.room = v; render();
}
function goRoom(k) { if (!engine) return; engine.go(S.scene, k, 1300); S.room = k; render(); }
function backToSite() {
  if (!engine) return; engine.setLayer('site', 'roofs', true);
  engine.go('site', S.sel ? engine.unitView(S.sel) : 'overview'); if (S.sel) engine.select(S.sel);
  S.scene = 'site'; S.mode = S.sel ? 'unidades' : 'explorar'; render();
}
function bridgeView() {
  var c = bridgeCenter(); if (!c) return; stopTour();
  var E = [0, 70, 40]; engine.go('site', viewFrom(E, c), 1800); S.sel = null; engine.select(null); render();
}
function applySun(h, season) {
  S.hour = h; S.season = season || S.season; var s = SEASONS[S.season];
  S.sun = engine ? engine.setTime(s.m, s.d, h) : null; updateSunTexts();
}
function isNight() { var s = S.sun; return s ? (S.hour < s.rise || S.hour > s.set) : false; }
function toast(msg, ms) { clearTimeout(toastT); S.toast = msg; renderToast(); if (ms !== 0) toastT = setTimeout(function () { S.toast = null; renderToast(); }, ms || 5200); }
function startTour() {
  if (!engine) return;
  if (S.tour) { stopTour(); render(); return; }
  if (S.scene !== 'site') backToSite();
  var seq = [['overview', true], ['bridge', true], ['lazer', false], ['piscina', false], ['gourmet', false], ['front', true], ['aerial', true]], i = 0;
  var step = function () { var v = seq[i % seq.length]; engine.setLayer('site', 'roofs', v[1]); if (v[0] === 'bridge') { var c = bridgeCenter(); if (c) engine.go('site', viewFrom([10, 85, 60], c), 2600); } else engine.go('site', v[0], 2600); i++; };
  step(); tourT = setInterval(step, 5400);
  S.tour = true; S.sel = null; S.mode = 'explorar'; engine.select(null); render();
}
function propCalc(p) {
  var P = p.priceNum, ent = P * p.entrada / 100, mens = P * 0.2, ref = p.reforcos ? P * 0.1 : 0, fin = P - ent - mens - ref, nRef = Math.max(1, Math.floor(p.parcelas / 12));
  return { ent: brl(ent), parc: brl(mens / p.parcelas) + '/mês', ref: p.reforcos ? nRef + 'x ' + brl(ref / nRef) : 'Sem reforços', fin: brl(Math.max(0, fin)) };
}
function waLink(p) {
  var c = propCalc(p), isC = p.role === 'corretor';
  var msg = 'Olá! Proposta para o Vértice Residence\n\nUnidade: ' + p.id + ' (' + p.price + ')\nEntrada: ' + c.ent + ' (' + p.entrada + '%)\nMensais: ' + p.parcelas + 'x ' + c.parc + '\nReforços: ' + c.ref + '\nSaldo nas chaves: ' + c.fin + '\n\n' + (isC ? 'Corretor(a): ' + (p.nome || '-') + ' · CRECI ' + (p.creci || '-') : 'Comprador(a): ' + (p.nome || '-') + (p.creci ? ' · Corretor: ' + p.creci : '')) + '\nWhatsApp: ' + (p.fone || '-');
  return 'https://wa.me/' + (CFG.whatsapp || '') + '?text=' + encodeURIComponent(msg);
}

/* ---------------- render ---------------- */
var cache = {};
function setHTML(id, html) { if (cache[id] === html) return; cache[id] = html; $(id).innerHTML = html; }
function render() {
  renderNav(); renderPanel(); renderCard(); renderSun(); renderBar(); renderModal(); renderPins(); renderHover(); renderToast(); renderStatus(); renderAttr(); renderAjuste();
  $('hint').textContent = S.scene === 'site' ? 'Arraste para girar · role para aproximar · botão direito ou Shift para mover' : 'Arraste para olhar em volta · role para aproximar · clique nos ambientes';
}
function renderNav() {
  setHTML('nav', [['explorar', 'Explorar'], ['unidades', 'Unidades'], ['lazer', 'Lazer'], ['interiores', 'Interiores']].map(function (n) { return '<button class="pill' + (S.mode === n[0] ? ' on' : '') + '" data-act="mode" data-arg="' + n[0] + '">' + n[1] + '</button>'; }).join(''));
}
function item(act, arg, label, desc, on) { return '<button class="item' + (on ? ' on' : '') + '" data-act="' + act + '" data-arg="' + esc(arg) + '"><span class="dot"></span><span><b>' + esc(label) + '</b><small>' + esc(desc) + '</small></span></button>'; }
function renderPanel() {
  var el = $('panel'), inSite = S.scene === 'site', unit = S.sel && inSite;
  var show = S.ready && !S.tour && !S.sunOpen && !S.calib && !(unit && S.mode !== 'unidades');
  if (!show) { el.className = ''; setHTML('panel', ''); return; }
  el.className = 'panel glass' + (unit ? ' hide-m' : '');
  var h = '';
  if (inSite && S.mode === 'explorar') {
    h = '<div class="eyebrow">Beira-Mar Continental · Estreito</div><h1 class="h">Duas torres de frente para o mar e a Ponte Hercílio Luz</h1>' +
      '<p class="p">Gire a maquete, acenda a noite para ver a ponte iluminada e clique nas janelas acesas: cada luz é uma unidade disponível.</p>' +
      '<div class="stats"><div class="stat"><b>15</b><span>pavimentos</span></div><div class="stat"><b>60</b><span>unidades</span></div><div class="stat"><b>' + AV.length + '</b><span>disponíveis</span></div></div>' +
      '<div class="stack"><button class="cta" data-act="mode" data-arg="unidades">Ver unidades disponíveis</button><button class="ghost" data-act="bridgeview">Olhar para a ponte</button><button class="ghost" data-act="mode" data-arg="lazer">Explorar a área de lazer</button><button class="ghost" data-act="mode" data-arg="interiores">Entrar no decorado</button></div>';
  } else if (inSite && S.mode === 'unidades') {
    var rows = '';
    for (var f = 15; f >= 1; f--) {
      rows += '<span class="fl">' + f + 'º</span>';
      [['A', '01'], ['A', '02'], ['B', '01'], ['B', '02']].forEach(function (c) {
        var id = c[0] + '-' + f + c[1], st = status(id), dim = (S.filter === 't1' && c[1] !== '01') || (S.filter === 't2' && c[1] !== '02');
        rows += '<button class="cell ' + (S.sel === id ? 'sel' : st) + (dim ? ' dim' : '') + '"' + (st !== 'disp' ? ' disabled' : '') + ' data-act="unit" data-arg="' + id + '" aria-label="' + id + (st === 'disp' ? ', disponível' : st === 'res' ? ', reservada' : ', vendida') + '">' + c[1] + '</button>';
      });
    }
    h = '<div class="eyebrow">Espelho de vendas</div><h2 class="h">Escolha sua unidade</h2><div class="chips" role="group" aria-label="Filtro">' +
      [['todas', 'Todas'], ['t1', '1 dormitório'], ['t2', '2 dormitórios']].map(function (x) { return '<button class="chip' + (S.filter === x[0] ? ' on' : '') + '" data-act="filter" data-arg="' + x[0] + '">' + x[1] + '</button>'; }).join('') +
      '</div><div class="mirror"><span></span><span class="mh">A · 01</span><span class="mh">A · 02</span><span class="mh">B · 01</span><span class="mh">B · 02</span>' + rows + '</div>' +
      '<div class="legend"><span><i style="background:#d7f25b"></i>Disponível</span><span><i style="background:#f5a623"></i>Reservada</span><span><i style="background:#3a3d3a"></i>Vendida</span></div><p class="note">Final 01: 1 dormitório, 52 m². Final 02: 2 dormitórios com suíte, 74 m² (apartamento decorado).</p>';
  } else if (inSite && S.mode === 'lazer') {
    h = '<div class="eyebrow">Lazer entre as torres</div><h2 class="h">Clique e entre em cada espaço</h2><p class="p">As coberturas do salão de jogos e do espaço gourmet ficam abertas para você ver por dentro.</p><div class="list">' +
      [['piscina', 'Piscina com deck', 'Espreguiçadeiras e guarda-sóis'], ['sombra', 'Pergolado e sombra', 'Poltronas sob o pergolado'], ['palmeiras', 'Jardim de palmeiras', 'Paisagismo tropical'], ['kids', 'Espaço kids', 'Escorregador, balanço e areia'], ['jogos', 'Salão de jogos', 'Sinuca, pebolim, sofá e TV'], ['gourmet', 'Espaço gourmet', 'Churrasqueira, mesa para 8 e TV']].map(function (p) { return item('space', p[0], p[1], p[2], S.focus === p[0]); }).join('') + '</div>';
  } else if (inSite && S.mode === 'interiores') {
    h = '<div class="eyebrow">Interiores</div><h2 class="h">Entre em um apartamento</h2><p class="p">O apartamento aparece no andar real da unidade: pela janela você vê o mar e a Ponte Hercílio Luz daquela altura.</p><div class="list">' +
      item('enter', 'B-1202', 'Final 02 · decorado', (S.decoOK === false ? 'Modelo realista indisponível, abre a versão simples' : '2 dormitórios · modelo realista') , false) +
      item('enter', 'A-1101', 'Final 01 · 1 dormitório', '52 m² · sala e cozinha integradas · sacada', false) + '</div>';
  } else if (!inSite) {
    var t = S.scene, rooms;
    if (t === 'deco') rooms = [['overview', 'Planta 3D', 'Vista de cima'], ['sala', 'Sala de estar', 'Sofá, painel de TV e sanca'], ['jantar', 'Jantar e cozinha', 'Mesa para 6 e cozinha planejada'], ['suite', 'Quarto casal', 'Cama de casal e armários'], ['quarto2', 'Quarto 2', 'Ideal para filhos ou escritório'], ['banheiro', 'Banheiros', 'Social e da suíte'], ['corredor', 'Circulação', 'Corredor para os quartos'], ['vista', 'Vista da janela', 'O mar e a ponte desta altura']];
    else if (t === 'apt1') rooms = [['overview', 'Planta 3D', 'Vista de cima'], ['sala', 'Sala de estar', 'Integrada à cozinha'], ['cozinha', 'Cozinha', 'Bancada com banquetas'], ['quarto', 'Quarto', 'Cama de casal e armário'], ['banheiro', 'Banheiro', 'Box, vaso e bancada'], ['sacada', 'Sacada', 'A vista real desta unidade']];
    else rooms = [['overview', 'Planta 3D', 'Vista de cima'], ['sala', 'Sala de estar', 'Ligada à cozinha'], ['cozinha', 'Cozinha', 'Bancada para 4'], ['suite', 'Suíte', 'Cama de casal'], ['quarto2', 'Quarto 2', 'Home office'], ['banheiro', 'Banheiro social', 'Box e bancada'], ['sacada', 'Sacada gourmet', 'Churrasqueira e vista']];
    h = '<div class="eyebrow">Por dentro · unidade ' + esc(S.iUnit) + '</div><h2 class="h">' + (t === 'deco' ? 'Decorado · 2 dormitórios' : t === 'apt1' ? '1 dormitório · 52 m²' : '2 dormitórios · 74 m²') + '</h2>' +
      '<p class="p">Clique nos ambientes ou nos marcadores. Use "Noite" para ver a ponte acesa pela janela.</p><div class="list">' + rooms.map(function (r) { return item('room', r[0], r[1], r[2], S.room === r[0]); }).join('') + '</div>' +
      '<div class="stack" style="margin-top:12px"><button class="ghost" data-act="back">Voltar para a maquete</button></div>';
  }
  setHTML('panel', h);
}
function planSvg(t1) {
  return t1 ? '<svg viewBox="0 0 320 300" role="img" aria-label="Planta ilustrativa, final 01"><rect x="10" y="10" width="300" height="230" fill="#fff" stroke="#2a2b2e" stroke-width="5"/><rect x="10" y="10" width="172" height="100" fill="#e8e5dd"/><rect x="10" y="110" width="172" height="130" fill="#e4c9a5"/><rect x="182" y="115" width="128" height="125" fill="#e4c9a5"/><rect x="231" y="10" width="79" height="105" fill="#dfe6ea"/><rect x="10" y="240" width="300" height="50" fill="#c7a988"/><text x="96" y="62" font-size="13" text-anchor="middle" fill="#3b3d38">Cozinha</text><text x="70" y="182" font-size="13" text-anchor="middle" fill="#3b3d38">Sala</text><text x="250" y="180" font-size="13" text-anchor="middle" fill="#3b3d38">Quarto</text><text x="270" y="66" font-size="12" text-anchor="middle" fill="#3b3d38">Banho</text><text x="160" y="270" font-size="13" text-anchor="middle" fill="#3b3d38">Sacada</text></svg>'
    : '<svg viewBox="0 0 320 300" role="img" aria-label="Planta ilustrativa, final 02"><rect x="10" y="10" width="300" height="280" fill="#fff" stroke="#2a2b2e" stroke-width="5"/><rect x="10" y="190" width="300" height="100" fill="#e4c9a5"/><rect x="10" y="10" width="90" height="180" fill="#dfe6ea"/><rect x="100" y="10" width="40" height="180" fill="#efe9df"/><rect x="140" y="80" width="170" height="110" fill="#e8dccb"/><rect x="170" y="10" width="140" height="70" fill="#e8dccb"/><text x="110" y="248" font-size="13" text-anchor="middle" fill="#3b3d38">Sala</text><text x="240" y="248" font-size="13" text-anchor="middle" fill="#3b3d38">Jantar e cozinha</text><text x="225" y="140" font-size="13" text-anchor="middle" fill="#3b3d38">Casal</text><text x="240" y="50" font-size="12" text-anchor="middle" fill="#3b3d38">Quarto 2</text><text x="55" y="100" font-size="12" text-anchor="middle" fill="#3b3d38">Banhos</text></svg>';
}
function renderCard() {
  var el = $('card'), u = S.sel && S.scene === 'site' && !S.calib ? unitInfo(S.sel) : null;
  if (!u) { el.className = ''; setHTML('card', ''); return; }
  el.className = 'card glass';
  setHTML('card', '<div class="unit-h"><div style="flex:1"><div class="eyebrow">' + u.tower + ' · ' + u.floorLabel + '</div><div class="unit-id">' + u.id + '</div><div class="muted" style="font-size:13px;margin-top:4px">Final ' + u.fin + ' · ' + u.area + ' m²</div></div><button class="close" data-act="closeunit" aria-label="Fechar unidade">' + ICON_X + '</button></div>' +
    '<div class="between" style="margin-top:12px"><span class="badge">Disponível</span><span class="price">' + u.price + '</span></div>' +
    '<div class="eyebrow" style="margin-top:14px;color:#c3c8bf">Condição de pagamento</div><div class="chips" style="margin-top:8px"><span class="chip static">Entrada a partir de 10%</span><span class="chip static">Parcelas até as chaves</span></div>' +
    '<div class="plan">' + planSvg(u.t1) + '<small><span>Planta</span><span>Ilustrativa</span></small></div>' +
    [['Pavimento', u.floorLabel], ['Área privativa', u.area + ' m²'], ['Dormitórios', u.dorms], ['Banheiros', u.baths], ['Vagas', u.vagas], ['Posição', u.pos]].map(function (r) { return '<div class="spec"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>'; }).join('') +
    '<div class="btns"><button class="cta" data-act="inside">Ver por dentro</button><button class="ghost" data-act="window">Ver a vista desta unidade</button><button class="ghost" data-act="proposal">Simular proposta</button></div>');
}
function renderSun() {
  var el = $('sun');
  if (!S.sunOpen) { el.className = ''; setHTML('sun', ''); return; }
  el.className = 'sun glass';
  setHTML('sun', '<div class="between"><span class="eyebrow">Estudo solar</span><button class="close" data-act="sun" aria-label="Fechar estudo solar">' + ICON_X + '</button></div>' +
    '<div class="between" style="align-items:flex-end"><div class="time" id="sun-time"></div><span class="muted" style="font-size:13px;padding-bottom:6px" id="sun-part"></span></div>' +
    '<label for="vx-hour" class="muted" style="font-size:12px">Hora do dia</label><input id="vx-hour" class="range" type="range" min="0" max="24" step="0.25" data-input="hour">' +
    '<div class="ticks"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span></div>' +
    '<div class="chips" style="margin-top:12px" role="group" aria-label="Estação do ano">' + Object.keys(SEASONS).map(function (k) { return '<button class="chip' + (S.season === k ? ' on' : '') + '" data-act="season" data-arg="' + k + '">' + SEASONS[k].label + '</button>'; }).join('') + '</div>' +
    '<div class="row" style="margin-top:12px"><button class="ghost' + (S.anim ? ' on' : '') + '" data-act="anim">' + (S.anim ? 'Pausar animação' : 'Animar o dia') + '</button></div>' +
    '<div class="kv"><div><span>Nascer do sol</span><b id="sun-rise"></b></div><div><span>Pôr do sol</span><b id="sun-set"></b></div><div><span>Altura do sol</span><b id="sun-el"></b></div><div><span>Direção</span><b id="sun-az"></b></div></div>' +
    '<p class="note">Simulação astronômica para Florianópolis (27,6° S), com as sombras calculadas sobre a maquete e o entorno.</p>');
  updateSunTexts();
}
function updateSunTexts() {
  if (!S.sunOpen) { renderBar(); return; }
  var s = S.sun || { elev: 0, az: 0, rise: 6, set: 18 }, r = $('vx-hour');
  if (r && document.activeElement !== r) r.value = S.hour;
  var set = function (id, t) { var e = $(id); if (e) e.textContent = t; };
  set('sun-time', hhmm(S.hour)); set('sun-part', s.elev > 0 ? (S.hour < 12 ? 'Manhã' : 'Tarde') : 'Noite');
  set('sun-rise', hhmm(s.rise)); set('sun-set', hhmm(s.set)); set('sun-el', s.elev > 0 ? Math.round(s.elev) + '° acima do horizonte' : 'Abaixo do horizonte'); set('sun-az', s.elev > 0 ? cardinal(s.az) + ' (' + Math.round(s.az) + '°)' : '—');
  renderBar();
}
function renderBar() {
  var inSite = S.scene === 'site', b = [];
  if (inSite) { b.push(['Visão geral', 'view', 'overview']); b.push(['Aérea', 'view', 'aerial']); b.push(['Fachada', 'view', 'front']); b.push(['Ponte', 'bridgeview', '']); }
  else { b.push(['Planta 3D', 'room', 'overview']); b.push(['Vista', 'room', S.scene === 'deco' ? 'vista' : 'sacada']); }
  b.push(['Sol', 'sun', '', S.sunOpen]); b.push([isNight() ? 'Dia' : 'Noite', 'night', '']);
  if (inSite) b.push([S.tour ? 'Parar tour' : 'Tour', 'tour', '', S.tour]); else b.push(['Voltar', 'back', '']);
  setHTML('bar', b.map(function (x) { return '<button class="pill' + (x[3] ? ' on' : '') + '" data-act="' + x[1] + '" data-arg="' + x[2] + '">' + x[0] + '</button>'; }).join(''));
}
function renderModal() {
  var p = S.prop; if (!p) { setHTML('modal', ''); return; }
  var c = propCalc(p), isC = p.role === 'corretor', body = '';
  if (p.step === 1) body = '<p class="p" style="margin-top:10px">Antes de simular, conte quem está enviando a proposta:</p><button class="opt" data-act="role" data-arg="corretor"><b>Sou corretor(a) de imóveis</b><span>Envio a proposta do meu cliente com os meus dados e o meu CRECI.</span></button><button class="opt" data-act="role" data-arg="comprador"><b>Sou comprador(a)</b><span>Envio a minha proposta. Se tenho corretor, informo o nome dele.</span></button>';
  else if (p.step === 2) body = '<div class="between" style="margin-top:12px"><span class="muted" style="font-size:13px">Valor da unidade</span><span class="price" style="font-size:26px">' + p.price + '</span></div>' +
    '<div class="field"><label for="vx-ent">Entrada: <span id="pp-entpct">' + p.entrada + '</span>%</label><input id="vx-ent" class="sim-range" type="range" min="10" max="50" step="1" value="' + p.entrada + '" data-input="entrada"></div>' +
    '<div class="field"><label for="vx-par">Parcelas mensais até as chaves: <span id="pp-par">' + p.parcelas + '</span>x</label><input id="vx-par" class="sim-range" type="range" min="12" max="60" step="6" value="' + p.parcelas + '" data-input="parcelas"></div>' +
    '<label class="toggle"><input type="checkbox" data-input="reforcos"' + (p.reforcos ? ' checked' : '') + '>Incluir reforços anuais (10% do valor)</label>' +
    '<div class="sum"><div class="spec"><span>Entrada</span><span id="pp-ent">' + c.ent + '</span></div><div class="spec"><span>Parcelas mensais</span><span id="pp-parc">' + c.parc + '</span></div><div class="spec"><span>Reforços anuais</span><span id="pp-ref">' + c.ref + '</span></div><div class="spec" style="border-bottom:0"><span>Saldo nas chaves</span><span id="pp-fin">' + c.fin + '</span></div></div>' +
    '<p class="note">Condição ilustrativa para demonstração.</p><div class="row" style="margin-top:14px"><button class="ghost" data-act="propback">Voltar</button><button class="cta" style="flex:1;justify-content:center" data-act="propnext">Continuar</button></div>';
  else body = '<div class="field"><label for="vx-nome">' + (isC ? 'Seu nome (corretor)' : 'Seu nome') + '</label><input id="vx-nome" type="text" data-input="nome" value="' + esc(p.nome) + '" placeholder="Nome completo"></div>' +
    '<div class="field"><label for="vx-fone">WhatsApp</label><input id="vx-fone" type="tel" data-input="fone" value="' + esc(p.fone) + '" placeholder="(48) 9 0000-0000"></div>' +
    '<div class="field"><label for="vx-creci">' + (isC ? 'CRECI' : 'Seu corretor (opcional)') + '</label><input id="vx-creci" type="text" data-input="creci" value="' + esc(p.creci) + '"></div>' +
    '<div class="row" style="margin-top:14px"><button class="ghost" data-act="propback">Voltar</button><a class="cta" id="pp-wa" style="flex:1;justify-content:center" href="' + esc(waLink(p)) + '" target="_blank" rel="noopener">Enviar no WhatsApp</a></div><p class="note">A proposta vai para o WhatsApp do corretor responsável e do gerente comercial.</p>';
  setHTML('modal', '<div class="modal-bg"><section class="modal glass" role="dialog" aria-label="Simular proposta"><div class="between"><div><div class="eyebrow">Proposta · unidade ' + p.id + '</div><div class="h" style="margin-bottom:0">' + (p.step === 1 ? 'Quem está enviando?' : p.step === 2 ? 'Monte a condição' : 'Seus dados') + '</div></div><button class="close" data-act="closeprop" aria-label="Fechar">' + ICON_X + '</button></div><div class="steps"><i class="on"></i><i class="' + (p.step >= 2 ? 'on' : '') + '"></i><i class="' + (p.step >= 3 ? 'on' : '') + '"></i></div>' + body + '</section></div>');
}
function updatePropTexts() {
  var p = S.prop; if (!p) return; var c = propCalc(p), set = function (id, t) { var e = $(id); if (e) e.textContent = t; };
  set('pp-entpct', p.entrada); set('pp-par', p.parcelas); set('pp-ent', c.ent); set('pp-parc', c.parc); set('pp-ref', c.ref); set('pp-fin', c.fin);
  var a = $('pp-wa'); if (a) a.href = waLink(p);
}
function renderHover() { setHTML('hover', S.hover && S.hover !== S.sel && S.scene === 'site' ? '<div class="hover-tag glass"><b>' + esc(S.hover) + '</b> · luz acesa = disponível · clique para abrir</div>' : ''); }
function renderToast() { setHTML('toast', S.toast ? '<div class="toast glass" role="status"><span>' + esc(S.toast) + '</span><button class="close" data-act="closetoast" aria-label="Fechar aviso">' + ICON_X + '</button></div>' : ''); }
function renderStatus() { setHTML('status', S.tilesErr ? '<div class="status glass" role="alert">Não foi possível carregar o entorno real do Google, então a maquete mostra uma cidade ilustrativa. Detalhe: ' + esc(S.tilesErr.slice(0, 180)) + '</div>' : ''); }
function renderAttr() { setHTML('gattr', engine && engine.tiles && engine.tiles.status === 'ok' ? '<b>Google</b>' + esc(S.gcopy || '') : ''); }

/* ---------------- modo de ajuste (?ajuste=1) ---------------- */
function renderAjuste() {
  if (!AJUSTE || !engine) { setHTML('ajuste', ''); return; }
  var F = engine.frame, b = BRIDGE;
  var tip = S.calib === 'site' ? 'Clique no ponto do mapa onde fica o centro do terreno' : S.calib === 't1' ? 'Clique no topo da torre da ponte do lado do continente' : S.calib === 't2' ? 'Clique no topo da torre da ponte do lado da ilha' : '';
  setHTML('calibtip', tip ? '<div class="calib-tip">' + tip + '</div>' : '');
  if (!F) { setHTML('ajuste', '<section class="aj glass"><h3>Ajuste</h3><p class="p">Sem chave do Google: nada para ajustar.</p></section>'); return; }
  var json = JSON.stringify({ site: { lat: +SITE.lat.toFixed(7), lon: +SITE.lon.toFixed(7), h: +(SITE.h || 0).toFixed(2), heading: +(SITE.heading || 0).toFixed(1), grounded: true }, bridge: b.t1 && b.t2 ? { t1: b.t1, t2: b.t2 } : b }, null, 1);
  setHTML('ajuste', '<section class="aj glass" aria-label="Ajuste do entorno"><h3>Ajuste do entorno</h3>' +
    '<div class="kvs"><span>Latitude</span><b>' + SITE.lat.toFixed(6) + '</b><span>Longitude</span><b>' + SITE.lon.toFixed(6) + '</b><span>Altura</span><b>' + (SITE.h || 0).toFixed(1) + ' m</b><span>Fachada</span><b>' + Math.round(SITE.heading || 0) + '°</b><span>Ponte</span><b>' + (b.t1 && b.t2 ? 'torres marcadas' : 'posição estimada') + '</b></div>' +
    '<button class="ghost' + (S.calib === 'site' ? ' on' : '') + '" data-act="calib" data-arg="site">1. Mover o terreno (clique no mapa)</button>' +
    '<label class="muted" for="aj-head" style="display:block;margin-top:10px">2. Girar a fachada: <span id="aj-hv">' + Math.round(SITE.heading || 0) + '°</span></label><input id="aj-head" class="sim-range" type="range" min="0" max="360" step="1" value="' + Math.round(SITE.heading || 0) + '" data-input="heading">' +
    '<button class="ghost" data-act="ground">3. Encaixar na altura do chão</button>' +
    '<button class="ghost' + (S.calib === 't1' ? ' on' : '') + '" data-act="calib" data-arg="t1">4. Marcar torre da ponte (continente)</button>' +
    '<button class="ghost' + (S.calib === 't2' ? ' on' : '') + '" data-act="calib" data-arg="t2">5. Marcar torre da ponte (ilha)</button>' +
    '<button class="cta" data-act="calibsave">Salvar neste navegador</button><button class="ghost" data-act="calibreset">Voltar ao padrão</button>' +
    '<p class="note">Copie o texto abaixo e mande para quem configurou a maquete, para fixar no site.</p><textarea readonly aria-label="Configuração">' + esc(json) + '</textarea></section>');
}
function calibClick(e) {
  if (!S.calib || !engine) return;
  var hit = engine.pickTiles(e.clientX, e.clientY);
  if (!hit) { toast('Não encontrei o mapa nesse ponto. Aproxime a câmera e clique de novo.'); return; }
  var g = engine.frame.toGeo(hit);
  if (S.calib === 'site') { SITE.lat = g.lat; SITE.lon = g.lon; engine.setSite(SITE.lat, SITE.lon, SITE.h || 0, SITE.heading || 0); engine.go('site', 'overview', 0); setTimeout(function () { var y = engine.probeGround(); if (y != null && Math.abs(y) < 80) { SITE.h = (SITE.h || 0) + y; engine.setSite(SITE.lat, SITE.lon, SITE.h, SITE.heading); render(); } }, 4000); }
  else { BRIDGE[S.calib] = { lat: g.lat, lon: g.lon, h: g.h }; if (BRIDGE.t1 && BRIDGE.t2) engine.setBridge(BRIDGE); }
  S.calib = null; render();
}

/* ---------------- eventos ---------------- */
var ACT = {
  mode: function (a) { if (a === 'interiores' && S.scene !== 'site') { backToSite(); } setMode(a); },
  unit: function (a) { selectUnit(a); },
  filter: function (a) { S.filter = a; renderPanel(); },
  space: function (a) { stopTour(); engine.setLayer('site', 'roofs', false); engine.go('site', a, 1500); S.focus = a; if (S.mode !== 'lazer') { S.mode = 'lazer'; } render(); },
  enter: function (a) { enterInterior(a, 'overview'); },
  room: function (a) { goRoom(a); },
  back: function () { backToSite(); },
  closeunit: function () { closeUnit(); },
  inside: function () { enterInterior(S.sel, 'overview'); },
  window: function () { enterInterior(S.sel, 'janela'); },
  proposal: function () { var u = unitInfo(S.sel); S.prop = { id: u.id, price: u.price, priceNum: u.priceNum, step: 1, role: null, entrada: 20, parcelas: 36, reforcos: true, nome: '', fone: '', creci: '' }; renderModal(); },
  closeprop: function () { S.prop = null; renderModal(); },
  role: function (a) { S.prop.role = a; S.prop.step = 2; renderModal(); },
  propback: function () { S.prop.step = Math.max(1, S.prop.step - 1); renderModal(); },
  propnext: function () { S.prop.step = 3; renderModal(); },
  material: function () { toast('Aqui entram o book digital, a tabela de preços e as plantas em PDF do lançamento.'); },
  closetoast: function () { S.toast = null; renderToast(); },
  sun: function () { S.sunOpen = !S.sunOpen; render(); },
  season: function (a) { applySun(S.hour, a); renderSun(); },
  anim: function () { if (S.anim) { clearInterval(animT); S.anim = false; } else { animT = setInterval(function () { var h = S.hour + 0.05; if (h > 24) h -= 24; applySun(h); }, 50); S.anim = true; } renderSun(); },
  night: function () { applySun(isNight() ? 16.5 : 20.5); },
  view: function (a) { stopTour(); engine.setLayer('site', 'roofs', true); engine.go('site', a); render(); },
  bridgeview: function () { bridgeView(); },
  tour: function () { startTour(); },
  calib: function (a) { S.calib = S.calib === a ? null : a; if (S.calib && S.scene !== 'site') backToSite(); render(); },
  ground: function () { var y = engine.probeGround(); if (y == null) { toast('Ainda carregando o entorno em volta do terreno. Espere uns segundos e tente de novo.'); return; } SITE.h = (SITE.h || 0) + y; engine.setSite(SITE.lat, SITE.lon, SITE.h, SITE.heading); toast('Terreno encaixado (' + (y >= 0 ? '+' : '') + y.toFixed(1) + ' m).'); render(); },
  calibsave: function () { SITE.grounded = true; try { localStorage.setItem('maquete-calib', JSON.stringify({ site: SITE, bridge: BRIDGE })); toast('Ajuste salvo neste navegador.'); } catch (e) { toast('Não consegui salvar neste navegador.'); } },
  calibreset: function () { try { localStorage.removeItem('maquete-calib'); } catch (e) { } location.reload(); }
};
document.addEventListener('click', function (e) {
  var t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
  var f = ACT[t.getAttribute('data-act')]; if (!f) return;
  if (t.tagName === 'A') return;
  e.preventDefault(); f(t.getAttribute('data-arg'));
});
document.addEventListener('input', function (e) {
  var t = e.target, k = t.getAttribute && t.getAttribute('data-input'); if (!k) return;
  if (k === 'hour') { applySun(parseFloat(t.value)); return; }
  if (k === 'heading') { SITE.heading = parseFloat(t.value); var hv = $('aj-hv'); if (hv) hv.textContent = Math.round(SITE.heading) + '°'; engine.setSite(SITE.lat, SITE.lon, SITE.h || 0, SITE.heading); return; }
  if (!S.prop) return;
  if (k === 'entrada' || k === 'parcelas') S.prop[k] = parseInt(t.value, 10);
  else if (k === 'reforcos') S.prop.reforcos = !!t.checked;
  else S.prop[k] = t.value;
  updatePropTexts();
});
document.addEventListener('change', function (e) { if (e.target && e.target.getAttribute && e.target.getAttribute('data-input') === 'heading') renderAjuste(); });
$('gl').addEventListener('click', calibClick);
window.__maqueteApp = true;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
