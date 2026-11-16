/*
  intercambios.js - Intercambios globales entre usuarios.
  Sistema de "depósito": al publicar u ofrecer, el objeto sale de tu colección
  y queda guardado en la oferta/propuesta. Al cerrar el trato, cada uno recibe
  el objeto del otro. Así cada persona solo modifica SU propia ficha.
  Colecciones: "intercambios" (ofertas) y "propuestasIntercambio".
*/
const firebaseConfig = {
  apiKey: "AIzaSyBUUZT4-wjqDs5OyDL-AgHo8ZIU5hCVL3Q",
  authDomain: "coleccionalos-69.firebaseapp.com",
  projectId: "coleccionalos-69",
  storageBucket: "coleccionalos-69.firebasestorage.app",
  messagingSenderId: "212183768104",
  appId: "1:212183768104:web:14470274e9affe6fdc291d"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const FV = firebase.firestore.FieldValue;
const $ = (id) => document.getElementById(id);
const estado = $("estado-intercambios");
let yo = null, misObjetos = [], ofertas = [], recibidas = [], enviadas = [];
let catalogo = [], buscoElegido = null, ofrezcoElegido = null;
let misMonedas = 0, ventas = [], misVentas = [], vendoElegido = null;

const refU = (uid) => db.collection("usuarios").doc(uid);
const refO = (id) => db.collection("intercambios").doc(id);
const refP = (id) => db.collection("propuestasIntercambio").doc(id);
const refV = (id) => db.collection("ventas").doc(id);
const nombreItem = (x) => (typeof x === "string" ? x : (x && (x.nombre || x.id)) || "Objeto");
const canon = (v) => Array.isArray(v) ? v.map(canon) : (v && typeof v === "object" ? Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {}) : v);
const mismo = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const nombreYo = () => yo.displayName || "Usuario";

function el(tag, clase, texto) {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function imagenItem(x) {
  if (x && x.imagen && x.imagen !== "tazo-generado") return x.imagen;
  const num = String((x && x.numero) || "").replace(/[<>&"]/g, "");
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><circle cx="80" cy="80" r="72" fill="#F6C744" stroke="#3B2E20" stroke-width="6"/><circle cx="80" cy="80" r="54" fill="#FFFDF7" stroke="#C6402E" stroke-width="4"/><text x="80" y="94" text-anchor="middle" font-family="Arial" font-size="38" font-weight="900" fill="#C6402E">' + (num ? "#" + num : "?") + "</text></svg>";
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function sinItem(lista, item) {
  let i = lista.findIndex((x) => mismo(x, item));
  if (i < 0 && item && item.compraId) i = lista.findIndex((x) => x && x.compraId === item.compraId);
  if (i < 0) return null;
  const copia = lista.slice();
  copia.splice(i, 1);
  return copia;
}
const coleccion = (snap) => (snap.data() || {}).coleccionables || [];
const refPP = (uid) => db.collection("perfilesPublicos").doc(uid);
// Guarda la colección en la ficha privada Y en el perfil público (son espejo).
function guardarColeccion(t, lista, extra) {
  t.update(refU(yo.uid), Object.assign({ coleccionables: lista }, extra || {}));
  t.set(refPP(yo.uid), { coleccionables: lista, nombre: nombreYo(), actualizadoEn: FV.serverTimestamp() }, { merge: true });
}

// ---------- Acciones (todas con transacción) ----------
async function publicar(item, busca, buscaObj) {
  const ref = db.collection("intercambios").doc();
  await db.runTransaction(async (t) => {
    const lista = sinItem(coleccion(await t.get(refU(yo.uid))), item);
    if (!lista) throw new Error("Ya no tienes ese objeto.");
    guardarColeccion(t, lista);
    t.set(ref, { ownerUid: yo.uid, ownerNombre: nombreYo(), item, busca, buscaItem: buscaObj ? { nombre: nombreItem(buscaObj), imagen: buscaObj.imagen || "", ...(buscaObj.numero ? { numero: buscaObj.numero } : {}) } : null, estado: "abierta", creadoEn: FV.serverTimestamp() });
  });
}

async function proponer(oferta, item) {
  const ref = db.collection("propuestasIntercambio").doc();
  await db.runTransaction(async (t) => {
    const o = await t.get(refO(oferta.id));
    if (!o.exists || o.data().estado !== "abierta") throw new Error("Esta oferta ya no está disponible.");
    const lista = sinItem(coleccion(await t.get(refU(yo.uid))), item);
    if (!lista) throw new Error("Ya no tienes ese objeto.");
    guardarColeccion(t, lista);
    t.set(ref, { ofertaId: oferta.id, ownerUid: oferta.ownerUid, fromUid: yo.uid, fromNombre: nombreYo(), item, estado: "pendiente", creadoEn: FV.serverTimestamp() });
  });
}

async function rechazarPendientes(ofertaId, exceptoId) {
  const lote = db.batch();
  const lista = recibidas.filter((p) => p.ofertaId === ofertaId && p.id !== exceptoId && p.estado === "pendiente");
  lista.forEach((p) => lote.update(refP(p.id), { estado: "rechazada" }));
  if (lista.length) await lote.commit();
}

async function aceptar(p) {
  await db.runTransaction(async (t) => {
    const [o, pp, u] = await Promise.all([t.get(refO(p.ofertaId)), t.get(refP(p.id)), t.get(refU(yo.uid))]);
    if (o.data().estado !== "abierta" || pp.data().estado !== "pendiente") throw new Error("Esta propuesta ya no está vigente.");
    guardarColeccion(t, coleccion(u).concat([pp.data().item]));
    t.update(refO(p.ofertaId), { estado: "cerrada", propuestaGanadora: p.id });
    t.update(refP(p.id), { estado: "aceptada" });
  });
  await rechazarPendientes(p.ofertaId, p.id);
}

async function rechazar(p) { await refP(p.id).update({ estado: "rechazada" }); }

async function cancelarOferta(o) {
  await db.runTransaction(async (t) => {
    const [s, u] = await Promise.all([t.get(refO(o.id)), t.get(refU(yo.uid))]);
    if (s.data().estado !== "abierta") throw new Error("Esta oferta ya no está abierta.");
    guardarColeccion(t, coleccion(u).concat([s.data().item]));
    t.update(refO(o.id), { estado: "cancelada" });
  });
  await rechazarPendientes(o.id, null);
}

// Retirar (pendiente), recuperar (rechazada) o reclamar (aceptada): el objeto vuelve a quien corresponde.
async function cobrar(p, modo) {
  await db.runTransaction(async (t) => {
    const [pp, u] = await Promise.all([t.get(refP(p.id)), t.get(refU(yo.uid))]);
    const d = pp.data();
    let item, cambios;
    if (modo === "retirar" && d.estado === "pendiente") { item = d.item; cambios = { estado: "retirada", recuperado: true }; }
    else if (modo === "recuperar" && d.estado === "rechazada" && !d.recuperado) { item = d.item; cambios = { recuperado: true }; }
    else if (modo === "reclamar" && d.estado === "aceptada" && !d.reclamado) { item = (await t.get(refO(d.ofertaId))).data().item; cambios = { reclamado: true }; }
    else throw new Error("Esta propuesta ya cambió. Actualizando...");
    guardarColeccion(t, coleccion(u).concat([item]));
    t.update(refP(p.id), cambios);
  });
}

// ---------- Compra y venta (con monedas) ----------
// Igual que los intercambios: al vender, el objeto sale de tu colección y queda en la venta.
// Quien compra paga desde SU ficha; el vendedor "cobra" después desde la suya.
async function ponerEnVenta(item, precio) {
  const ref = db.collection("ventas").doc();
  await db.runTransaction(async (t) => {
    const lista = sinItem(coleccion(await t.get(refU(yo.uid))), item);
    if (!lista) throw new Error("Ya no tienes ese objeto.");
    guardarColeccion(t, lista);
    t.set(ref, { ownerUid: yo.uid, ownerNombre: nombreYo(), item, precio, estado: "abierta", cobrado: false, creadoEn: FV.serverTimestamp() });
  });
}

async function comprarVenta(v) {
  await db.runTransaction(async (t) => {
    const [vs, u] = await Promise.all([t.get(refV(v.id)), t.get(refU(yo.uid))]);
    if (!vs.exists || vs.data().estado !== "abierta") throw new Error("Esta venta ya no está disponible.");
    const d = vs.data();
    if (d.ownerUid === yo.uid) throw new Error("No puedes comprar tu propio coleccionable.");
    if (((u.data() || {}).monedas || 0) < d.precio) throw new Error("No tienes monedas suficientes.");
    guardarColeccion(t, coleccion(u).concat([d.item]), { monedas: FV.increment(-d.precio) });
    t.update(refV(v.id), { estado: "vendida", compradorUid: yo.uid, compradorNombre: nombreYo(), vendidaEn: FV.serverTimestamp() });
  });
}

async function cancelarVenta(v) {
  await db.runTransaction(async (t) => {
    const [vs, u] = await Promise.all([t.get(refV(v.id)), t.get(refU(yo.uid))]);
    if (vs.data().estado !== "abierta") throw new Error("Esta venta ya no está abierta.");
    guardarColeccion(t, coleccion(u).concat([vs.data().item]));
    t.update(refV(v.id), { estado: "cancelada" });
  });
}

async function cobrarVenta(v) {
  await db.runTransaction(async (t) => {
    const vs = await t.get(refV(v.id));
    const d = vs.data();
    if (d.estado !== "vendida" || d.cobrado) throw new Error("Esta venta ya fue cobrada.");
    t.update(refU(yo.uid), { monedas: FV.increment(d.precio) });
    t.update(refV(v.id), { cobrado: true });
  });
}

async function ejecutar(boton, fn) {
  boton.disabled = true;
  try { await fn(); estado.textContent = ""; }
  catch (e) { console.error(e); estado.textContent = e.message || "No se pudo completar la acción."; }
  await recargar();
}

function boton(texto, clase, fn) {
  const b = el("button", clase, texto);
  b.type = "button";
  b.addEventListener("click", () => ejecutar(b, fn));
  return b;
}

// ---------- Pantalla ----------
function tarjeta(item, titulo, detalles) {
  const li = el("li", "tarjeta-intercambio");
  const img = el("img");
  img.src = imagenItem(item); img.alt = nombreItem(item);
  const cuerpo = el("div");
  cuerpo.appendChild(el("strong", "", titulo));
  detalles.forEach((d) => cuerpo.appendChild(typeof d === "string" ? el("span", "detalle", d) : d));
  li.append(img, cuerpo);
  return { li, cuerpo };
}

function selectorObjetos() {
  const s = el("select");
  s.setAttribute("aria-label", "Tu coleccionable a ofrecer");
  misObjetos.forEach((x, i) => { const o = el("option", "", nombreItem(x)); o.value = i; s.appendChild(o); });
  return s;
}

// Cada moneda equivale a 100 pesos chilenos.
const PESOS_POR_MONEDA = 100;
const textoPrecio = (m) => m + (m === 1 ? " moneda" : " monedas") + " (" + (m * PESOS_POR_MONEDA).toLocaleString("es-CL") + " pesos)";

function pintarMercado() {
  $("mis-monedas").textContent = "Tus monedas: " + misMonedas;
  const puede = misObjetos.length > 0;
  if (vendoElegido && !misObjetos.some((x) => mismo(x, vendoElegido))) { elegirVendo(null); $("input-vendo").value = ""; }
  $("input-vendo").disabled = !puede;
  $("input-vendo").placeholder = puede ? "¿Qué vendes? Elige uno de tus coleccionables" : "No tienes coleccionables todavía";
  $("input-precio").disabled = !puede;
  $("btn-vender").disabled = !puede;

  const lm = $("lista-mercado");
  lm.innerHTML = "";
  const ajenas = ventas.filter((v) => v.ownerUid !== yo.uid);
  if (!ajenas.length) lm.appendChild(el("li", "texto-ayuda", "Todavía no hay coleccionables en venta de otros usuarios."));
  ajenas.forEach((v) => {
    const { li, cuerpo } = tarjeta(v.item, nombreItem(v.item), ["Vende: " + v.ownerNombre, "Precio: " + textoPrecio(v.precio)]);
    const acc = el("div", "acciones-intercambio");
    if (misMonedas >= v.precio) acc.appendChild(boton("Comprar", "boton-comprar", () => comprarVenta(v)));
    else acc.appendChild(el("span", "detalle", "Te faltan " + (v.precio - misMonedas) + " monedas."));
    cuerpo.appendChild(acc);
    lm.appendChild(li);
  });

  const lv = $("lista-mis-ventas");
  lv.innerHTML = "";
  const mias = misVentas.filter((v) => v.estado === "abierta" || (v.estado === "vendida" && !v.cobrado));
  if (!mias.length) lv.appendChild(el("li", "texto-ayuda", "No tienes ventas activas."));
  mias.forEach((v) => {
    const vendida = v.estado === "vendida";
    const { li, cuerpo } = tarjeta(v.item, nombreItem(v.item), ["Precio: " + textoPrecio(v.precio), vendida ? "¡Vendido a " + (v.compradorNombre || "otro usuario") + "!" : "En venta"]);
    const acc = el("div", "acciones-intercambio");
    if (vendida) acc.appendChild(boton("Cobrar " + v.precio + " monedas", "boton-comprar", () => cobrarVenta(v)));
    else acc.appendChild(boton("Quitar de la venta", "boton-secundario", () => cancelarVenta(v)));
    cuerpo.appendChild(acc);
    lv.appendChild(li);
  });
}

function pintar() {
  // Si el objeto elegido ya no está en mi colección (p. ej. tras publicar), se limpia.
  if (ofrezcoElegido && !misObjetos.some((x) => mismo(x, ofrezcoElegido))) { elegirOfrezco(null); $("input-ofrezco").value = ""; }
  $("input-ofrezco").disabled = !misObjetos.length;
  $("input-ofrezco").placeholder = misObjetos.length ? "¿Qué ofreces? Ej: Tazo de Pikachu" : "No tienes coleccionables todavía";
  $("btn-publicar").disabled = !misObjetos.length;

  pintarMercado();

  const lo = $("lista-ofertas");
  lo.innerHTML = "";
  if (!ofertas.length) lo.appendChild(el("li", "texto-ayuda", "Todavía no hay ofertas abiertas. ¡Publica la primera!"));
  ofertas.forEach((o) => {
    const mia = o.ownerUid === yo.uid;
    const busca = el("span", "detalle linea-busca");
    if (o.buscaItem) { const m = el("img", "mini-busca"); m.src = imagenItem(o.buscaItem); m.alt = ""; busca.appendChild(m); }
    busca.appendChild(document.createTextNode("Busca: " + (o.busca || "ofertas abiertas")));
    const { li, cuerpo } = tarjeta(o.item, nombreItem(o.item), ["Ofrece: " + (mia ? "tú" : o.ownerNombre), busca]);
    const acc = el("div", "acciones-intercambio");
    if (mia) {
      recibidas.filter((p) => p.ofertaId === o.id && p.estado === "pendiente").forEach((p) => {
        const fila = el("div", "propuesta-recibida");
        fila.appendChild(el("span", "detalle", p.fromNombre + " te ofrece: " + nombreItem(p.item)));
        const a = el("div", "acciones-intercambio");
        a.append(boton("Aceptar", "boton-comprar", () => aceptar(p)), boton("Rechazar", "boton-secundario", () => rechazar(p)));
        fila.appendChild(a);
        cuerpo.appendChild(fila);
      });
      acc.appendChild(boton("Cancelar mi oferta", "boton-secundario", () => cancelarOferta(o)));
    } else if (misObjetos.length) {
      const s = selectorObjetos();
      acc.append(s, boton("Proponer cambio", "boton-comprar", () => proponer(o, misObjetos[Number(s.value)])));
    } else {
      acc.appendChild(el("span", "detalle", "Necesitas un coleccionable para proponer."));
    }
    cuerpo.appendChild(acc);
    lo.appendChild(li);
  });

  const lp = $("lista-propuestas");
  lp.innerHTML = "";
  if (!enviadas.length) lp.appendChild(el("li", "texto-ayuda", "Aún no has enviado propuestas."));
  const textos = { pendiente: "Esperando respuesta", aceptada: "¡Aceptada!", rechazada: "Rechazada", retirada: "Retirada" };
  enviadas.forEach((p) => {
    const { li, cuerpo } = tarjeta(p.item, "Ofreciste: " + nombreItem(p.item), []);
    cuerpo.appendChild(el("span", "etiqueta-estado", textos[p.estado] || p.estado));
    const acc = el("div", "acciones-intercambio");
    if (p.estado === "pendiente") acc.appendChild(boton("Retirar propuesta", "boton-secundario", () => cobrar(p, "retirar")));
    else if (p.estado === "aceptada") acc.appendChild(p.reclamado ? el("span", "detalle", "Objeto ya reclamado.") : boton("Reclamar mi objeto", "boton-comprar", () => cobrar(p, "reclamar")));
    else if (p.estado === "rechazada") acc.appendChild(p.recuperado ? el("span", "detalle", "Tu objeto ya volvió a tu colección.") : boton("Recuperar mi objeto", "boton-secundario", () => cobrar(p, "recuperar")));
    cuerpo.appendChild(acc);
    lp.appendChild(li);
  });
}

const porFecha = (a, b) => ((b.creadoEn && b.creadoEn.seconds) || 0) - ((a.creadoEn && a.creadoEn.seconds) || 0);
const docs = (q) => q.docs.map((d) => Object.assign({ id: d.id }, d.data()));

async function recargar() {
  try {
    const ficha = await refU(yo.uid).get();
    misObjetos = coleccion(ficha);
    misMonedas = (ficha.data() || {}).monedas || 0;
  } catch (e) {
    console.error(e);
    estado.textContent = "No se pudo leer tu colección.";
  }
  try {
    const [ab, rec, env] = await Promise.all([
      db.collection("intercambios").where("estado", "==", "abierta").get(),
      db.collection("propuestasIntercambio").where("ownerUid", "==", yo.uid).get(),
      db.collection("propuestasIntercambio").where("fromUid", "==", yo.uid).get()
    ]);
    ofertas = docs(ab).sort(porFecha);
    recibidas = docs(rec);
    enviadas = docs(env).sort(porFecha);
    if (!estado.textContent || estado.textContent.startsWith("Cargando")) estado.textContent = "";
  } catch (e) {
    console.error(e);
    estado.textContent = "No se pudieron cargar los intercambios. Revisa las reglas de Firestore.";
  }
  try {
    const [vab, vmias] = await Promise.all([
      db.collection("ventas").where("estado", "==", "abierta").get(),
      db.collection("ventas").where("ownerUid", "==", yo.uid).get()
    ]);
    ventas = docs(vab).sort(porFecha);
    misVentas = docs(vmias).sort(porFecha);
  } catch (e) {
    console.error(e);
    estado.textContent = "No se pudo cargar compra y venta. Revisa las reglas de Firestore.";
  }
  pintar();
}

$("btn-publicar").addEventListener("click", () => {
  if (!ofrezcoElegido) { estado.textContent = "Elige qué coleccionable ofreces."; return; }
  const item = ofrezcoElegido;
  ejecutar($("btn-publicar"), async () => {
    await publicar(item, $("input-busco").value.trim(), buscoElegido);
    $("input-busco").value = "";
    elegirBusco(null);
    elegirOfrezco(null);
    $("input-ofrezco").value = "";
    mostrarPanel(null);
  });
});

// ---------- "¿Qué ofreces?": elegir entre MIS coleccionables ----------
function elegirOfrezco(obj) {
  ofrezcoElegido = obj;
  const caja = $("ofrezco-elegido");
  caja.innerHTML = "";
  caja.classList.toggle("oculto", !obj);
  if (!obj) return;
  const img = el("img"); img.src = imagenItem(obj); img.alt = "";
  caja.append(img, el("span", "", "Ofreces: " + nombreItem(obj)));
}

function pintarOfrezco() {
  const panel = $("panel-ofrezco");
  const q = $("input-ofrezco").value.trim().toLowerCase();
  panel.innerHTML = "";
  const lista = misObjetos.filter((x) => !q || nombreItem(x).toLowerCase().includes(q) || String((x && x.numero) || "") === q.replace("#", ""));
  if (!lista.length) {
    panel.appendChild(el("p", "texto-ayuda", misObjetos.length ? "Ninguno de tus coleccionables coincide." : "No tienes coleccionables todavía."));
    return;
  }
  lista.forEach((x) => {
    const b = el("button", "opcion-catalogo");
    b.type = "button";
    const img = el("img"); img.src = imagenItem(x); img.alt = ""; img.loading = "lazy";
    b.append(img, el("span", "", nombreItem(x) + (x && x.numero ? " #" + x.numero : "")));
    b.addEventListener("click", () => {
      $("input-ofrezco").value = nombreItem(x);
      elegirOfrezco(x);
      panel.classList.add("oculto");
    });
    panel.appendChild(b);
  });
}

$("input-ofrezco").addEventListener("focus", () => { pintarOfrezco(); $("panel-ofrezco").classList.remove("oculto"); });
$("input-ofrezco").addEventListener("input", () => {
  if (ofrezcoElegido && $("input-ofrezco").value.trim() !== nombreItem(ofrezcoElegido)) elegirOfrezco(null);
  pintarOfrezco();
  $("panel-ofrezco").classList.remove("oculto");
});

// ---------- Catálogo: objetos que existen hasta ahora (para el campo "¿Qué buscas?") ----------
async function cargarCatalogo() {
  try {
    const snap = await db.collection("productos").get();
    const vistos = new Set();
    snap.forEach((d) => {
      (d.data().opciones || []).forEach((op) => {
        (Array.isArray(op.premios) ? op.premios : []).forEach((p) => {
          if (!p || !p.nombre) return;
          const clave = p.nombre + "|" + (p.numero || "");
          if (vistos.has(clave)) return;
          vistos.add(clave);
          catalogo.push(p);
        });
      });
    });
    catalogo.sort((a, b) => nombreItem(a).localeCompare(nombreItem(b), "es", { numeric: true }));
  } catch (e) { console.error("No se pudo cargar el catálogo:", e); }
}

function elegirBusco(obj) {
  buscoElegido = obj;
  const caja = $("busco-elegido");
  caja.innerHTML = "";
  caja.classList.toggle("oculto", !obj);
  if (!obj) return;
  const img = el("img"); img.src = imagenItem(obj); img.alt = "";
  caja.append(img, el("span", "", "Buscas: " + nombreItem(obj)));
}

function pintarCatalogo() {
  const panel = $("panel-catalogo");
  const q = $("input-busco").value.trim().toLowerCase();
  panel.innerHTML = "";
  const lista = catalogo.filter((x) => !q || nombreItem(x).toLowerCase().includes(q) || String(x.numero || "") === q.replace("#", ""));
  if (!lista.length) {
    panel.appendChild(el("p", "texto-ayuda", catalogo.length ? "Sin coincidencias: se publicará tu texto tal cual." : "Aún no hay objetos en el catálogo."));
    return;
  }
  lista.forEach((x) => {
    const b = el("button", "opcion-catalogo");
    b.type = "button";
    const img = el("img"); img.src = imagenItem(x); img.alt = ""; img.loading = "lazy";
    b.append(img, el("span", "", nombreItem(x) + (x.numero ? " #" + x.numero : "")));
    b.addEventListener("click", () => {
      $("input-busco").value = nombreItem(x);
      elegirBusco(x);
      panel.classList.add("oculto");
    });
    panel.appendChild(b);
  });
}

$("input-busco").addEventListener("focus", () => { pintarCatalogo(); $("panel-catalogo").classList.remove("oculto"); });
$("input-busco").addEventListener("input", () => {
  if (buscoElegido && $("input-busco").value.trim() !== nombreItem(buscoElegido)) elegirBusco(null);
  pintarCatalogo();
  $("panel-catalogo").classList.remove("oculto");
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("#campo-ofrezco")) $("panel-ofrezco").classList.add("oculto");
  if (!e.target.closest("#campo-busco")) $("panel-catalogo").classList.add("oculto");
});

// ---------- Botón "Ver historial": muestra/oculta mis propuestas enviadas ----------
$("btn-historial").addEventListener("click", () => {
  const panel = $("panel-historial");
  const abrir = panel.classList.contains("oculto");
  panel.classList.toggle("oculto", !abrir);
  $("btn-historial").textContent = abrir ? "Ocultar historial" : "Ver historial";
  $("btn-historial").setAttribute("aria-expanded", String(abrir));
});

// ---------- "¿Qué vendes?": elegir entre MIS coleccionables ----------
function elegirVendo(obj) {
  vendoElegido = obj;
  const caja = $("vendo-elegido");
  caja.innerHTML = "";
  caja.classList.toggle("oculto", !obj);
  if (!obj) return;
  const img = el("img"); img.src = imagenItem(obj); img.alt = "";
  caja.append(img, el("span", "", "Vendes: " + nombreItem(obj)));
}

function pintarVendo() {
  const panel = $("panel-vendo");
  const q = $("input-vendo").value.trim().toLowerCase();
  panel.innerHTML = "";
  const lista = misObjetos.filter((x) => !q || nombreItem(x).toLowerCase().includes(q) || String((x && x.numero) || "") === q.replace("#", ""));
  if (!lista.length) {
    panel.appendChild(el("p", "texto-ayuda", misObjetos.length ? "Ninguno de tus coleccionables coincide." : "No tienes coleccionables todavía."));
    return;
  }
  lista.forEach((x) => {
    const b = el("button", "opcion-catalogo");
    b.type = "button";
    const img = el("img"); img.src = imagenItem(x); img.alt = ""; img.loading = "lazy";
    b.append(img, el("span", "", nombreItem(x) + (x && x.numero ? " #" + x.numero : "")));
    b.addEventListener("click", () => {
      $("input-vendo").value = nombreItem(x);
      elegirVendo(x);
      panel.classList.add("oculto");
    });
    panel.appendChild(b);
  });
}

$("input-vendo").addEventListener("focus", () => { pintarVendo(); $("panel-vendo").classList.remove("oculto"); });
$("input-vendo").addEventListener("input", () => {
  if (vendoElegido && $("input-vendo").value.trim() !== nombreItem(vendoElegido)) elegirVendo(null);
  pintarVendo();
  $("panel-vendo").classList.remove("oculto");
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("#campo-vendo")) $("panel-vendo").classList.add("oculto");
});

$("btn-vender").addEventListener("click", () => {
  if (!vendoElegido) { estado.textContent = "Elige qué coleccionable vendes."; return; }
  const precio = Math.floor(Number($("input-precio").value));
  if (!(precio >= 1 && precio <= 1000000)) { estado.textContent = "Pon un precio válido en monedas (mínimo 1)."; return; }
  const item = vendoElegido;
  ejecutar($("btn-vender"), async () => {
    await ponerEnVenta(item, precio);
    elegirVendo(null);
    $("input-vendo").value = "";
    $("input-precio").value = "";
  });
});

// ---------- Botones circulares: "Intercambio" y "Compra y venta" ----------
function mostrarPanel(cual) {
  [["intercambio", "form-intercambio", "btn-abrir-intercambio"], ["mercado", "panel-mercado", "btn-abrir-mercado"]].forEach(([nombre, panel, boton]) => {
    const abrir = nombre === cual;
    $(panel).classList.toggle("oculto", !abrir);
    $(boton).setAttribute("aria-expanded", String(abrir));
  });
  ["panel-ofrezco", "panel-catalogo", "panel-vendo"].forEach((id) => $(id).classList.add("oculto"));
}
$("btn-abrir-intercambio").addEventListener("click", () => {
  mostrarPanel($("form-intercambio").classList.contains("oculto") ? "intercambio" : null);
});
$("btn-abrir-mercado").addEventListener("click", () => {
  mostrarPanel($("panel-mercado").classList.contains("oculto") ? "mercado" : null);
});

auth.onAuthStateChanged((usuario) => {
  if (!usuario) { window.location.href = "index.html"; return; }
  yo = usuario;
  cargarCatalogo();
  recargar();
});