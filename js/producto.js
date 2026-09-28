/*
  ===========================================
  producto.js - Lógica de la página de opciones (genérica)
  ===========================================
  Reemplaza a lo que antes era "tienda-cheetos.js". La diferencia
  clave: en vez de tener el producto y sus opciones escritos a mano
  en este archivo, ahora los busca en Firestore según el "id" que
  viene en la URL (?id=...). Así sirve para CUALQUIER producto que
  cargues desde el panel de admin, sin escribir código nuevo cada vez.
*/

// -----------------------------------------------------------------
// 1) CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
// -----------------------------------------------------------------
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
// 2) LEER EL "id" DEL PRODUCTO DESDE LA URL
// -----------------------------------------------------------------
// "URLSearchParams" es una herramienta del navegador que entiende el
// "?id=algo&otro=valor" que puede venir al final de una URL.
// "window.location.search" nos da esa parte de la URL actual, algo
// como "?id=cheetos-tazos".
const parametrosURL = new URLSearchParams(window.location.search);
const idProducto = parametrosURL.get("id");
// Si la URL fuera "producto.html?id=cheetos-tazos", entonces
// idProducto ahora vale el texto "cheetos-tazos".

// -----------------------------------------------------------------
// 3) REFERENCIAS A LOS ELEMENTOS DEL HTML
// -----------------------------------------------------------------
const tituloProducto = document.getElementById("titulo-producto");
const parrafoMonedasDisponibles = document.getElementById("monedas-disponibles");
const grillaOpciones = document.getElementById("grilla-opciones");
const linkEditarLugar = document.getElementById("link-editar-lugar");
const EMAIL_ADMIN = "arielriquelme08@gmail.com";
const TAZOS_POKEMON_51 = [
  "Tazo Pokemon #001 Bulbasaur",
  "Tazo Pokemon #002 Ivysaur",
  "Tazo Pokemon #003 Venusaur",
  "Tazo Pokemon #004 Charmander",
  "Tazo Pokemon #005 Charmeleon",
  "Tazo Pokemon #006 Charizard",
  "Tazo Pokemon #007 Squirtle",
  "Tazo Pokemon #008 Wartortle",
  "Tazo Pokemon #009 Blastoise",
  "Tazo Pokemon #010 Caterpie",
  "Tazo Pokemon #011 Metapod",
  "Tazo Pokemon #012 Butterfree",
  "Tazo Pokemon #013 Weedle",
  "Tazo Pokemon #014 Kakuna",
  "Tazo Pokemon #015 Beedrill",
  "Tazo Pokemon #016 Pidgey",
  "Tazo Pokemon #017 Pidgeotto",
  "Tazo Pokemon #018 Pidgeot",
  "Tazo Pokemon #019 Rattata",
  "Tazo Pokemon #020 Raticate",
  "Tazo Pokemon #021 Spearow",
  "Tazo Pokemon #022 Fearow",
  "Tazo Pokemon #023 Ekans",
  "Tazo Pokemon #024 Arbok",
  "Tazo Pokemon #025 Pikachu",
  "Tazo Pokemon #026 Raichu",
  "Tazo Pokemon #027 Sandshrew",
  "Tazo Pokemon #028 Sandslash",
  "Tazo Pokemon #029 Nidoran F",
  "Tazo Pokemon #030 Nidorina",
  "Tazo Pokemon #031 Nidoqueen",
  "Tazo Pokemon #032 Nidoran M",
  "Tazo Pokemon #033 Nidorino",
  "Tazo Pokemon #034 Nidoking",
  "Tazo Pokemon #035 Clefairy",
  "Tazo Pokemon #036 Clefable",
  "Tazo Pokemon #037 Vulpix",
  "Tazo Pokemon #038 Ninetales",
  "Tazo Pokemon #039 Jigglypuff",
  "Tazo Pokemon #040 Wigglytuff",
  "Tazo Pokemon #041 Zubat",
  "Tazo Pokemon #042 Golbat",
  "Tazo Pokemon #043 Oddish",
  "Tazo Pokemon #044 Gloom",
  "Tazo Pokemon #045 Vileplume",
  "Tazo Pokemon #046 Paras",
  "Tazo Pokemon #047 Parasect",
  "Tazo Pokemon #048 Venonat",
  "Tazo Pokemon #049 Venomoth",
  "Tazo Pokemon #050 Diglett",
  "Tazo Pokemon #051 Dugtrio"
];

const COLORES_TAZOS = [
  "#F6C744",
  "#E65A3A",
  "#4FA382",
  "#3B82C4",
  "#8B5FBF",
  "#F08A24"
];

function colorParaTazo(indice) {
  return COLORES_TAZOS[indice % COLORES_TAZOS.length];
}

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

function elegirColeccionableAleatorio(opcion) {
  const premiosPersonalizados = Array.isArray(opcion.premios)
    ? opcion.premios.filter((premio) => premio && premio.nombre)
    : [];

  if (premiosPersonalizados.length === 0) return null;

  const indicePremio = Math.floor(Math.random() * premiosPersonalizados.length);
  const premio = premiosPersonalizados[indicePremio];
  const idPremio = premio.id || premio.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return {
    id: idPremio,
    nombre: premio.nombre,
    tipo: premio.tipo || "Coleccionable",
    imagen: premio.imagen || "",
    ...(premio.numero ? { numero: premio.numero } : {}),
    ...(premio.imagenTrasera ? { imagenTrasera: premio.imagenTrasera } : {}),
    origenTiendaId: idProducto,
    origenProductoId: opcion.id,
    origenProductoNombre: opcion.nombre,
    obtenidoEn: new Date().toISOString(),
    compraId: idProducto + "__" + opcion.id + "__" + Date.now() + "__" + Math.floor(Math.random() * 100000)
  };
}

function elegirColeccionablesGanados(opcion) {
  if (obtenerTipoArticulo(opcion) !== "Coleccionable") return [];

  const tienePremios = Array.isArray(opcion.premios) && opcion.premios.some((premio) => premio && premio.nombre);
  if (!tienePremios) return [];

  const ganaPremioDoble = Math.random() < 0.03;
  const cantidad = ganaPremioDoble ? 2 : 1;
  const ganados = [];

  for (let i = 0; i < cantidad; i++) {
    ganados.push(elegirColeccionableAleatorio(opcion));
  }

  return ganados;
}

function obtenerTipoArticulo(opcion) {
  if (opcion.tipo === "Coleccionable") return "Coleccionable";
  if (opcion.tipo === "Objeto") return "Objeto";

  const tienePremios = Array.isArray(opcion.premios) && opcion.premios.some((premio) => premio && premio.nombre);
  return tienePremios ? "Coleccionable" : "Objeto";
}

function crearArticuloComprado(opcion, tipo) {
  return {
    id: opcion.id,
    nombre: opcion.nombre,
    tipo: tipo,
    imagen: opcion.imagen || "",
    origenTiendaId: idProducto,
    origenProductoId: opcion.id,
    origenProductoNombre: opcion.nombre,
    obtenidoEn: new Date().toISOString(),
    compraId: idProducto + "__" + opcion.id + "__" + Date.now() + "__" + Math.floor(Math.random() * 100000)
  };
}

// Crea el botón "Ver reverso" para alternar entre la imagen frontal y la
// trasera de un artículo. Devuelve null si el artículo no tiene trasera.
function crearBotonReverso(imagen, articulo, imagenFrontal) {
  if (!articulo.imagenTrasera) return null;

  // Precarga la trasera para que el giro no parpadee.
  new Image().src = articulo.imagenTrasera;

  let mostrandoReverso = false;
  let girando = false;
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "boton-reverso";
  boton.textContent = "Ver reverso";

  function aplicarCara() {
    imagen.src = mostrandoReverso ? articulo.imagenTrasera : imagenFrontal;
    boton.textContent = mostrandoReverso ? "Ver frente" : "Ver reverso";
  }

  imagen.addEventListener("error", () => {
    if (mostrandoReverso) {
      mostrandoReverso = false;
      aplicarCara();
    }
  });

  function alternarCara() {
    if (girando) return;
    mostrandoReverso = !mostrandoReverso;

    const sinAnimacion = !imagen.animate
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (sinAnimacion) {
      aplicarCara();
      return;
    }

    // Giro en 3D: la imagen gira hasta quedar de canto (90°),
    // cambia de cara y termina de girar hasta quedar de frente.
    girando = true;
    const ida = imagen.animate(
      [
        { transform: "perspective(700px) rotateY(0deg)" },
        { transform: "perspective(700px) rotateY(90deg)" }
      ],
      { duration: 180, easing: "ease-in", fill: "forwards" }
    );
    ida.onfinish = () => {
      aplicarCara();
      const vuelta = imagen.animate(
        [
          { transform: "perspective(700px) rotateY(-90deg)" },
          { transform: "perspective(700px) rotateY(0deg)" }
        ],
        { duration: 220, easing: "ease-out" }
      );
      ida.cancel();
      vuelta.onfinish = () => { girando = false; };
    };
  }

  boton.addEventListener("click", (evento) => {
    evento.stopPropagation();
    alternarCara();
  });

  // Tocar la imagen también la voltea (con teclado: Enter o Espacio).
  imagen.classList.add("imagen-girable");
  imagen.setAttribute("role", "button");
  imagen.setAttribute("tabindex", "0");
  imagen.title = "Toca para voltear";
  imagen.addEventListener("click", (evento) => {
    evento.stopPropagation();
    alternarCara();
  });
  imagen.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      alternarCara();
    }
  });

  return boton;
}

function mostrarCompraConfirmada(articuloComprado, coleccionablesGanados, tipoArticulo) {
  const modalExistente = document.querySelector(".modal-premio");
  if (modalExistente) {
    modalExistente.remove();
  }

  const modal = document.createElement("div");
  modal.className = "modal-premio";

  const contenido = document.createElement("div");
  contenido.className = "modal-premio-contenido";

  const titulo = document.createElement("h2");
  titulo.textContent = "Compraste " + articuloComprado.nombre;

  const bajada = document.createElement("p");
  bajada.textContent = tipoArticulo === "Objeto"
    ? "El objeto se agregó a tu inventario."
    : "El coleccionable se agregó a tu colección.";

  const articulosMostrados = [articuloComprado, ...coleccionablesGanados];

  const grilla = document.createElement("div");
  grilla.className = "modal-premio-tazos";

  articulosMostrados.forEach((coleccionable) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-tazo-premio";

    const imagen = document.createElement("img");
    imagen.className = "imagen-tazo-premio";
    imagen.src = obtenerImagenColeccionable(coleccionable);
    imagen.alt = coleccionable.nombre;

    const nombre = document.createElement("strong");
    nombre.textContent = coleccionable.nombre;

    tarjeta.appendChild(imagen);
    tarjeta.appendChild(nombre);

    const botonReverso = crearBotonReverso(imagen, coleccionable, imagen.src);
    if (botonReverso) tarjeta.appendChild(botonReverso);

    // Si el premio tiene número de colección, se muestra bajo el nombre.
    if (coleccionable.numero) {
      const numero = document.createElement("span");
      numero.className = "numero-tazo-premio";
      numero.textContent = "#" + coleccionable.numero;
      tarjeta.appendChild(numero);
    }

    grilla.appendChild(tarjeta);
  });

  const botonCerrar = document.createElement("button");
  botonCerrar.className = "boton-comprar";
  botonCerrar.textContent = "Aceptar";
  botonCerrar.addEventListener("click", () => modal.remove());

  contenido.appendChild(titulo);
  contenido.appendChild(bajada);
  contenido.appendChild(grilla);
  contenido.appendChild(botonCerrar);
  modal.appendChild(contenido);
  document.body.appendChild(modal);
}

// -----------------------------------------------------------------
// 4) FUNCIÓN: dibujar la grilla de opciones en pantalla
// -----------------------------------------------------------------
// Recibe la lista de opciones (ahora viene de Firestore, ya no de
// una lista escrita a mano) y la referencia al usuario.
function dibujarOpciones(opciones, referenciaUsuario) {
  grillaOpciones.innerHTML = "";

  opciones.forEach((opcion) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-opcion";

    const vistaProducto = document.createElement("button");
    vistaProducto.className = "vista-producto-comprable";
    vistaProducto.type = "button";
    vistaProducto.setAttribute("aria-label", opcion.nombre);
    vistaProducto.addEventListener("click", () => {
      comprarOpcion(referenciaUsuario, opcion);
    });

    const descripcionElemento = document.createElement("div");
    descripcionElemento.className = "descripcion-opcion";

    const nombreElemento = document.createElement("strong");
    nombreElemento.className = "nombre-opcion";
    nombreElemento.textContent = opcion.nombre;

    const textoDescripcion = document.createElement("span");
    const tipoArticulo = obtenerTipoArticulo(opcion);
    const tienePremios = tipoArticulo === "Coleccionable"
      && Array.isArray(opcion.premios) && opcion.premios.some((premio) => premio && premio.nombre);
    textoDescripcion.textContent = opcion.descripcion || (tienePremios
      ? "Abre este artículo y gana un coleccionable al azar."
      : tipoArticulo === "Objeto"
        ? "Compra este objeto para tu inventario."
        : "Compra este coleccionable para tu colección.");

    descripcionElemento.appendChild(nombreElemento);
    descripcionElemento.appendChild(textoDescripcion);

    const tieneImagen = typeof opcion.imagen === "string" && opcion.imagen.trim() !== "";

    if (tieneImagen) {
      const imagenElemento = document.createElement("img");
      imagenElemento.className = "imagen-opcion";
      imagenElemento.src = opcion.imagen;
      imagenElemento.alt = opcion.nombre;
      imagenElemento.onerror = () => {
        imagenElemento.remove();
        vistaProducto.classList.add("sin-imagen");
      };
      vistaProducto.appendChild(imagenElemento);
    } else {
      vistaProducto.classList.add("sin-imagen");
    }

    vistaProducto.appendChild(descripcionElemento);

    const compraProducto = document.createElement("div");
    compraProducto.className = "compra-producto";

    const precioElemento = document.createElement("p");
    precioElemento.className = "precio-opcion";
    precioElemento.textContent = opcion.precio + " monedas";

    const botonComprar = document.createElement("button");
    botonComprar.className = "boton-comprar";
    botonComprar.textContent = "Comprar";
    botonComprar.addEventListener("click", () => {
      comprarOpcion(referenciaUsuario, opcion);
    });

    compraProducto.appendChild(precioElemento);
    compraProducto.appendChild(botonComprar);
    tarjeta.appendChild(vistaProducto);
    tarjeta.appendChild(compraProducto);
    grillaOpciones.appendChild(tarjeta);
  });
}

// -----------------------------------------------------------------
// 5) FUNCIÓN: comprar una opción
// -----------------------------------------------------------------
function comprarOpcion(referenciaUsuario, opcion) {
  referenciaUsuario.get().then((ficha) => {
    const datos = ficha.data();
    const monedasActuales = datos.monedas;

    if (monedasActuales < opcion.precio) {
      alert("Todavía no tienes monedas suficientes para esta opción.");
      return;
    }

    const coleccionablesGanados = elegirColeccionablesGanados(opcion);
    const tipoArticulo = obtenerTipoArticulo(opcion);
    const articuloComprado = crearArticuloComprado(opcion, tipoArticulo);

    const cambiosCompra = {
      monedas: firebase.firestore.FieldValue.increment(-opcion.precio)
    };

    if (tipoArticulo === "Objeto") {
      cambiosCompra.inventario = firebase.firestore.FieldValue.arrayUnion(articuloComprado);
    } else {
      cambiosCompra.coleccionables = firebase.firestore.FieldValue.arrayUnion(articuloComprado, ...coleccionablesGanados);
    }

    const cambiosPerfilPublico = {
      nombre: auth.currentUser.displayName || "Usuario",
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (tipoArticulo === "Objeto") {
      cambiosPerfilPublico.inventario = firebase.firestore.FieldValue.arrayUnion(articuloComprado);
    } else {
      cambiosPerfilPublico.coleccionables = firebase.firestore.FieldValue.arrayUnion(articuloComprado, ...coleccionablesGanados);
    }

    const loteCompra = db.batch();
    loteCompra.update(referenciaUsuario, cambiosCompra);
    loteCompra.set(db.collection("perfilesPublicos").doc(auth.currentUser.uid), cambiosPerfilPublico, { merge: true });

    loteCompra.commit().then(() => {
      mostrarCompraConfirmada(articuloComprado, coleccionablesGanados, tipoArticulo);
      mostrarMonedasDisponibles(monedasActuales - opcion.precio);
    }).catch((error) => {
      console.error("Error al comprar:", error.message);
      alert("Ocurrió un error al procesar la compra. Intenta de nuevo.");
    });
  }).catch((error) => {
    console.error("Error al leer las monedas antes de comprar:", error.message);
  });
}

// -----------------------------------------------------------------
// 6) FUNCIÓN: mostrar el texto de monedas disponibles
// -----------------------------------------------------------------
function mostrarMonedasDisponibles(cantidad) {
  parrafoMonedasDisponibles.textContent = "Tienes " + cantidad + " monedas disponibles.";
}

// -----------------------------------------------------------------
// 7) EL "CEREBRO" DE ESTA PÁGINA
// -----------------------------------------------------------------
// Acá encadenamos DOS revisiones antes de mostrar nada:
//   1) ¿Vino un "id" válido en la URL? Si alguien entra a
//      "producto.html" a secas, sin "?id=...", no tenemos qué
//      mostrar.
//   2) ¿Hay una sesión activa? (igual que en coleccion.js).
if (!idProducto) {
  tituloProducto.textContent = "Producto no encontrado";
  parrafoMonedasDisponibles.textContent = "";
  grillaOpciones.innerHTML = "<p>Vuelve a la tienda y elige un producto de la lista.</p>";
} else {
  auth.onAuthStateChanged((usuario) => {
    if (usuario) {
      if (usuario.email === EMAIL_ADMIN) {
        linkEditarLugar.href = "admin.html?editar=" + encodeURIComponent(idProducto);
        linkEditarLugar.classList.remove("oculto");
      } else {
        linkEditarLugar.classList.add("oculto");
      }

      const referenciaUsuario = db.collection("usuarios").doc(usuario.uid);

      // Buscamos el producto en Firestore usando el id de la URL.
      db.collection("productos").doc(idProducto).get().then((documentoProducto) => {
        if (!documentoProducto.exists) {
          tituloProducto.textContent = "Producto no encontrado";
          grillaOpciones.innerHTML = "<p>Ese producto ya no está disponible.</p>";
          return;
        }

        const datosProducto = documentoProducto.data();
        tituloProducto.textContent = datosProducto.nombre;

        // Ahora sí, buscamos las monedas del usuario y dibujamos las
        // opciones de este producto en particular.
        referenciaUsuario.get().then((fichaUsuario) => {
          const datosUsuario = fichaUsuario.data();
          mostrarMonedasDisponibles(datosUsuario.monedas);
          dibujarOpciones(datosProducto.opciones, referenciaUsuario);
        });
      }).catch((error) => {
        console.error("Error al cargar el producto:", error.message);
        grillaOpciones.innerHTML = "<p>Ocurrió un error al cargar este producto.</p>";
      });
    } else {
      window.location.href = "index.html";
    }
  });
}
