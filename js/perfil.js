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
const CLOUDINARY_CLOUD_NAME = "os889md5";
const CLOUDINARY_UPLOAD_PRESET = "nostalgiacolecciones_productos";

const estadoPerfil = document.getElementById("estado-perfil");
const cabeceraPerfil = document.getElementById("cabecera-perfil");
const fotoPerfil = document.getElementById("foto-perfil");
const nombrePerfil = document.getElementById("nombre-perfil");
const tituloPerfil = document.getElementById("titulo-perfil");
const muroColeccionables = document.getElementById("muro-coleccionables");
const muroInventario = document.getElementById("muro-inventario");
const controlesPerfil = document.getElementById("controles-perfil");
const inputFotoPerfil = document.getElementById("input-foto-perfil");
const estadoFotoPerfil = document.getElementById("estado-foto-perfil");
const botonCopiarPerfil = document.getElementById("btn-copiar-perfil");
const linkInventarioPrivado = document.getElementById("link-inventario-privado");
const uidPerfil = new URLSearchParams(window.location.search).get("u");

function avatarPredeterminado(nombre) {
  const inicial = (nombre || "?").trim().charAt(0).toUpperCase() || "?";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="#6FC6A3"/><circle cx="80" cy="80" r="67" fill="#FFF8E7" stroke="#E6A93B" stroke-width="8"/><text x="80" y="103" text-anchor="middle" font-family="Arial" font-size="74" font-weight="700" fill="#3B2E20">${inicial}</text></svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function obtenerImagenArticulo(articulo) {
  if (articulo.imagen && articulo.imagen !== "tazo-generado") return articulo.imagen;

  if (articulo.imagen === "tazo-generado" || articulo.tipo === "Tazo Pokemon") {
    const nombre = articulo.nombre || "Tazo Pokemon";
    const numero = articulo.numero || (articulo.id || "").replace("tazo-pokemon-", "") || "001";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320"><rect width="320" height="320" fill="#FFF8E7"/><circle cx="160" cy="160" r="138" fill="#F6C744" stroke="#3B2E20" stroke-width="10"/><circle cx="160" cy="160" r="108" fill="#FFFDF7" stroke="#C6402E" stroke-width="7"/><text x="160" y="103" text-anchor="middle" font-family="Arial" font-size="28" font-weight="700" fill="#3B2E20">TAZO</text><text x="160" y="160" text-anchor="middle" font-family="Arial" font-size="44" font-weight="900" fill="#C6402E">#${numero}</text><text x="160" y="211" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="#3B2E20">${nombre.replace(/Tazo Pokemon #[0-9]+\s*/, "")}</text></svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  return avatarPredeterminado(articulo.nombre);
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

function mostrarDetalleArticulo(articulo, categoria) {
  const modalAnterior = document.querySelector(".modal-detalle-articulo");
  if (modalAnterior) modalAnterior.remove();

  const modal = document.createElement("div");
  modal.className = "modal-detalle-articulo";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  const contenido = document.createElement("article");
  contenido.className = "detalle-articulo";
  const imagen = document.createElement("img");
  imagen.src = obtenerImagenArticulo(articulo);
  imagen.alt = articulo.nombre || "Artículo";
  const tipo = document.createElement("p");
  tipo.className = "etiqueta-detalle-articulo";
  tipo.textContent = categoria;
  const nombre = document.createElement("h2");
  nombre.textContent = articulo.nombre || "Artículo";
  const origen = document.createElement("p");
  origen.className = "texto-ayuda";
  origen.textContent = articulo.origenProductoNombre
    ? "Obtenido mediante: " + articulo.origenProductoNombre + "."
    : "Disponible en este muro.";
  const cerrar = document.createElement("button");
  cerrar.className = "boton-comprar";
  cerrar.type = "button";
  cerrar.textContent = "Cerrar";
  cerrar.addEventListener("click", () => modal.remove());

  const botonReverso = crearBotonReverso(imagen, articulo, imagen.src);
  contenido.append(imagen, tipo, nombre, origen);
  if (botonReverso) contenido.appendChild(botonReverso);
  contenido.appendChild(cerrar);
  modal.appendChild(contenido);
  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
  cerrar.focus();
}

function mostrarArticulos(lista, articulos, vacio, categoria) {
  lista.innerHTML = "";
  if (!articulos.length) {
    const mensaje = document.createElement("li");
    mensaje.className = "muro-vacio";
    mensaje.textContent = vacio;
    lista.appendChild(mensaje);
    return;
  }

  articulos.forEach((articulo) => {
    const elemento = document.createElement("li");
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-articulo-muro";
    boton.setAttribute("aria-label", "Ver " + (articulo.nombre || "artículo"));
    const imagen = document.createElement("img");
    imagen.src = obtenerImagenArticulo(articulo);
    imagen.alt = articulo.nombre || "Artículo";
    const nombre = document.createElement("strong");
    nombre.textContent = articulo.nombre || "Artículo";
    boton.append(imagen, nombre);
    boton.addEventListener("click", () => mostrarDetalleArticulo(articulo, categoria));
    elemento.appendChild(boton);
    lista.appendChild(elemento);
  });
}

function mostrarPerfil(perfil) {
  const nombre = perfil.nombre || "Usuario";
  tituloPerfil.textContent = nombre;
  nombrePerfil.textContent = nombre;
  fotoPerfil.src = perfil.fotoPerfil || avatarPredeterminado(nombre);
  fotoPerfil.alt = "Foto de perfil de " + nombre;
  fotoPerfil.onerror = () => { fotoPerfil.src = avatarPredeterminado(nombre); };
  mostrarArticulos(muroColeccionables, Array.isArray(perfil.coleccionables) ? perfil.coleccionables : [], "Aún no hay coleccionables públicos.", "Coleccionable");
  mostrarArticulos(muroInventario, Array.isArray(perfil.inventario) ? perfil.inventario : [], "Aún no hay objetos públicos.", "Objeto");
  estadoPerfil.textContent = "";
  cabeceraPerfil.classList.remove("oculto");
}

function subirFotoPerfil(archivo, usuario) {
  estadoFotoPerfil.textContent = "Subiendo foto...";
  const datos = new FormData();
  datos.append("file", archivo, "perfil.jpg");
  datos.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  fetch("https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload", { method: "POST", body: datos })
    .then((respuesta) => respuesta.json())
    .then((resultado) => {
      if (!resultado.secure_url) throw new Error("Cloudinary no devolvió una imagen.");
      const url = resultado.secure_url.replace("/upload/", "/upload/f_auto,q_auto,c_fill,g_face,w_320,h_320/");
      return Promise.all([
        db.collection("usuarios").doc(usuario.uid).set({ fotoPerfil: url }, { merge: true }),
        db.collection("perfilesPublicos").doc(usuario.uid).set({
          nombre: usuario.displayName || "Usuario",
          fotoPerfil: url,
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
      ]).then(() => url);
    })
    .then((url) => {
      fotoPerfil.src = url;
      estadoFotoPerfil.textContent = "Foto de perfil actualizada.";
    })
    .catch((error) => {
      console.error("Error al subir foto de perfil:", error.message);
      estadoFotoPerfil.textContent = "No se pudo actualizar la foto. Intenta de nuevo.";
    });
}

function cargarPerfil(uid, usuarioActual) {
  db.collection("perfilesPublicos").doc(uid).get().then((documento) => {
    if (!documento.exists) {
      estadoPerfil.textContent = "Este perfil todavía no está disponible.";
      return;
    }
    mostrarPerfil(documento.data());
    if (usuarioActual && usuarioActual.uid === uid) {
      controlesPerfil.classList.remove("oculto");
      linkInventarioPrivado.href = "coleccion.html?uid=" + encodeURIComponent(uid);
      linkInventarioPrivado.classList.remove("oculto");
    }
  }).catch((error) => {
    console.error("Error al cargar perfil:", error.message);
    estadoPerfil.textContent = "No se pudo cargar este perfil.";
  });
}

auth.onAuthStateChanged((usuario) => {
  const uidObjetivo = uidPerfil || (usuario && usuario.uid);
  if (!uidObjetivo) {
    estadoPerfil.textContent = "Inicia sesión para crear tu perfil.";
    return;
  }
  cargarPerfil(uidObjetivo, usuario);
  if (usuario && usuario.uid === uidObjetivo) {
    inputFotoPerfil.onchange = () => {
      const archivo = inputFotoPerfil.files[0];
      if (archivo) subirFotoPerfil(archivo, usuario);
    };
  }
});

botonCopiarPerfil.addEventListener("click", () => {
  navigator.clipboard.writeText(window.location.href).then(() => {
    estadoFotoPerfil.textContent = "Enlace copiado.";
  }).catch(() => {
    estadoFotoPerfil.textContent = "Copia la dirección de esta página desde el navegador.";
  });
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    const modal = document.querySelector(".modal-detalle-articulo");
    if (modal) modal.remove();
  }
});
