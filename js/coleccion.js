/*
  ===========================================
  coleccion.js - Lógica de la página "Mi colección"
  ===========================================
  Esta página muestra los objetos coleccionables del usuario logeado.
  Como todavía no existe la tienda de verdad (tienda.html es solo un
  esqueleto), por ahora casi siempre vas a ver el mensaje de "todavía
  no tenés coleccionables". Eso es válido y esperado: la estructura ya
  está lista para cuando conectemos las compras reales.
*/

// -----------------------------------------------------------------
// 1) CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
// -----------------------------------------------------------------
// Exactamente la misma configuración que en script.js. Es el mismo
// proyecto de Firebase, así que estos datos no cambian de una página
// a otra.
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

// -----------------------------------------------------------------
// 2) REFERENCIAS A LOS ELEMENTOS DEL HTML
// -----------------------------------------------------------------
const parrafoEstadoCarga = document.getElementById("estado-carga");
const listaColeccionables = document.getElementById("lista-coleccionables");
const listaInventario = document.getElementById("lista-inventario");
const tituloColeccion = document.querySelector("h1");
const parametrosURL = new URLSearchParams(window.location.search);
const uidColeccion = parametrosURL.get("uid");


function crearImagenTazoDataUri(coleccionable) {
  const numero = coleccionable.numero || (coleccionable.id || "").replace("tazo-pokemon-", "") || "???";
  const nombreCorto = (coleccionable.nombre || "Tazo Pokemon").replace(/^Tazo Pokemon #[0-9]+\s*/, "");
  const color = coleccionable.color || "#F6C744";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${coleccionable.nombre || "Tazo Pokemon"}">
      <rect width="320" height="320" fill="#FFF8E7"/>
      <circle cx="160" cy="160" r="140" fill="${color}" stroke="#3B2E20" stroke-width="10"/>
      <circle cx="160" cy="160" r="112" fill="#FFFDF7" stroke="#C6402E" stroke-width="7"/>
      <circle cx="160" cy="140" r="54" fill="${color}" opacity="0.85"/>
      <text x="160" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="#3B2E20">TAZO</text>
      <text x="160" y="153" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="900" fill="#C6402E">#${numero}</text>
      <text x="160" y="205" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="800" fill="#3B2E20">${nombreCorto}</text>
      <text x="160" y="244" text-anchor="middle" font-family="Arial, sans-serif" font-size="21" font-weight="700" fill="#7A6A54">Pokemon 51</text>
    </svg>`;

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function escaparTextoSvg(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function crearImagenColeccionableDataUri(coleccionable) {
  const nombre = escaparTextoSvg(coleccionable.nombre || "Coleccionable");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${nombre}">
      <rect width="320" height="320" rx="26" fill="#FFF8E7"/>
      <rect x="22" y="22" width="276" height="276" rx="22" fill="#FFFDF7" stroke="#E6A93B" stroke-width="8"/>
      <circle cx="160" cy="126" r="54" fill="#6FC6A3" opacity="0.82"/>
      <path d="M98 218c18-42 106-42 124 0" fill="none" stroke="#C6402E" stroke-width="16" stroke-linecap="round"/>
      <text x="160" y="254" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#3B2E20">COLECCIONABLE</text>
    </svg>`;

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function obtenerImagenColeccionable(coleccionable) {
  if (coleccionable.imagen && coleccionable.imagen !== "tazo-generado") {
    return coleccionable.imagen;
  }

  if (coleccionable.imagen === "tazo-generado" || coleccionable.tipo === "Tazo Pokemon") {
    return crearImagenTazoDataUri(coleccionable);
  }

  return crearImagenColeccionableDataUri(coleccionable);
}

// -----------------------------------------------------------------
// 3) FUNCIÓN: pintar la lista de coleccionables en pantalla
// -----------------------------------------------------------------
// Recibe un array (lista) de coleccionables y arma un <li> por cada
// uno dentro de nuestra lista <ul>. Si el array está vacío, muestra
// un mensaje invitando a ir a la tienda.
function mostrarArticulos(lista, articulos, detallePorDefecto) {
  lista.innerHTML = "";

  articulos.forEach((coleccionable) => {
    const elementoLista = document.createElement("li");

    if (typeof coleccionable === "string") {
      elementoLista.textContent = coleccionable;
    } else {
      const imagen = document.createElement("img");
      imagen.className = "imagen-coleccionable";
      imagen.src = obtenerImagenColeccionable(coleccionable);
      imagen.alt = coleccionable.nombre || coleccionable.id || "Coleccionable";

      const contenido = document.createElement("div");
      contenido.className = "contenido-coleccionable";

      const nombre = document.createElement("strong");
      nombre.textContent = coleccionable.nombre || coleccionable.id || "Coleccionable";

      const detalle = document.createElement("span");
      detalle.className = "detalle-coleccionable";
      detalle.textContent = coleccionable.origenProductoNombre
        ? detallePorDefecto + ": " + coleccionable.origenProductoNombre + "."
        : detallePorDefecto + ".";

      contenido.appendChild(nombre);
      contenido.appendChild(detalle);
      elementoLista.appendChild(imagen);
      elementoLista.appendChild(contenido);
    }

    lista.appendChild(elementoLista);
  });
}

function mostrarInventario(coleccionables, inventario) {
  mostrarArticulos(listaColeccionables, coleccionables, "Añadido a tu colección");
  mostrarArticulos(listaInventario, inventario, "Añadido a tu inventario");

  if (coleccionables.length === 0 && inventario.length === 0) {
    parrafoEstadoCarga.textContent = "Todavía no tienes coleccionables ni objetos. ¡Ve a la tienda para conseguir el primero!";
    return;
  }

  parrafoEstadoCarga.textContent = "";
}
// -----------------------------------------------------------------
// 4) EL "CEREBRO" DE ESTA PÁGINA: revisa la sesión al cargar
// -----------------------------------------------------------------
// Esta es la parte que hace que la página sea "privada". La lógica
// es simple: apenas Firebase nos confirma si hay o no una sesión
// activa, decidimos qué hacer.
auth.onAuthStateChanged((usuario) => {
  if (usuario) {
    const uidObjetivo = uidColeccion || usuario.uid;

    if (!uidColeccion) {
      const urlPerfil = new URL(window.location.href);
      urlPerfil.searchParams.set("uid", usuario.uid);
      window.history.replaceState({}, "", urlPerfil.toString());
    }

    if (uidObjetivo !== usuario.uid) {
      tituloColeccion.textContent = "Colección privada";
      parrafoEstadoCarga.textContent = "Esta colección pertenece a otro usuario.";
      listaColeccionables.innerHTML = "";
      listaInventario.innerHTML = "";
      return;
    }

    tituloColeccion.textContent = "Mi inventario";

    // Caso: SÍ hay alguien logeado. Buscamos la ficha indicada por la
    // URL para leer su lista de coleccionables.
    db.collection("usuarios").doc(uidObjetivo).get().then((ficha) => {
      if (!ficha.exists) {
        parrafoEstadoCarga.textContent = "Todavía no existe una colección para este usuario.";
        return;
      }

      const datos = ficha.data();

      // Aclaración: si esta persona inició sesión por primera vez
      // ANTES de que agregáramos el campo "coleccionables" (en este
      // mismo paso de hoy), su ficha vieja no lo va a tener guardado,
      // y "datos.coleccionables" daría "undefined" en vez de una
      // lista. El operador "||" acá significa "si lo de la izquierda
      // no existe, usá lo de la derecha en su lugar" — así nos
      // aseguramos de siempre trabajar con una lista válida, aunque
      // sea una vacía.
      const coleccionables = datos.coleccionables || [];
      const inventario = datos.inventario || [];

      mostrarInventario(coleccionables, inventario);
    }).catch((error) => {
      console.error("Error al leer la colección:", error.message);
      parrafoEstadoCarga.textContent = "Ocurrió un error al cargar tu colección.";
    });
  } else {
    // Caso: NO hay nadie logeado. Esta página no tiene sentido sin
    // sesión (¿"mi" colección de quién?), así que lo mandamos de
    // vuelta al inicio para que inicie sesión primero.
    window.location.href = "index.html";
  }
});
