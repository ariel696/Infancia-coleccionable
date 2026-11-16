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
const botonAjustes = document.getElementById("btn-ajustes");
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
  let urlFrontal = imagenFrontal;
  let urlTrasera = articulo.imagenTrasera;
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "boton-reverso";
  boton.textContent = "Ver reverso";

  function aplicarCara() {
    imagen.src = mostrandoReverso ? urlTrasera : urlFrontal;
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

  // Permite cambiar las imágenes (por ejemplo, por versiones sin fondo).
  boton.cambiarImagenes = (frontal, trasera) => {
    if (frontal) urlFrontal = frontal;
    if (trasera) urlTrasera = trasera;
    aplicarCara();
  };

  return boton;
}

// Quita el fondo liso (blanco, crema, etc.) que rodea a un coleccionable para
// que "flote" solo la figura. Parte desde los bordes de la imagen y borra los
// píxeles parecidos al color del fondo hasta toparse con la figura.
// Si la imagen ya es transparente, no tiene un fondo liso o el navegador no
// deja leerla, devuelve la imagen original sin tocarla.
function quitarFondoImagen(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(url); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve(url);
    img.onload = () => {
      try {
        const MAX = 640;
        const escala = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * escala));
        const h = Math.max(1, Math.round(img.naturalHeight * escala));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const imagenData = ctx.getImageData(0, 0, w, h);
        const d = imagenData.data;

        // Color del fondo: las 4 esquinas deben ser opacas y casi iguales.
        const esquinas = [0, (w - 1), (h - 1) * w, (h - 1) * w + (w - 1)].map((p) => p * 4);
        if (esquinas.some((i) => d[i + 3] < 200)) { resolve(url); return; }
        const fondo = [0, 1, 2].map((c) => Math.round(esquinas.reduce((s, i) => s + d[i + c], 0) / 4));
        const distancia = (i) => Math.max(Math.abs(d[i] - fondo[0]), Math.abs(d[i + 1] - fondo[1]), Math.abs(d[i + 2] - fondo[2]));
        if (esquinas.some((i) => distancia(i) > 24)) { resolve(url); return; }

        const TOLERANCIA = 38;
        const SUAVIZADO = 90;
        const borrado = new Uint8Array(w * h);
        const cola = new Int32Array(w * h);
        let ini = 0, fin = 0;
        const meter = (p) => {
          if (borrado[p] || distancia(p * 4) > TOLERANCIA) return;
          borrado[p] = 1;
          cola[fin++] = p;
        };
        for (let x = 0; x < w; x++) { meter(x); meter((h - 1) * w + x); }
        for (let y = 0; y < h; y++) { meter(y * w); meter(y * w + w - 1); }
        while (ini < fin) {
          const p = cola[ini++];
          const x = p % w;
          if (x > 0) meter(p - 1);
          if (x < w - 1) meter(p + 1);
          if (p >= w) meter(p - w);
          if (p < w * (h - 1)) meter(p + w);
        }
        if (fin < w * h * 0.02) { resolve(url); return; } // casi no había fondo

        // Borde suave: los píxeles junto al fondo borrado se vuelven semitransparentes
        // según qué tan parecidos al fondo sean (evita el "halo" blanco).
        for (let p = 0; p < w * h; p++) {
          if (!borrado[p]) continue;
          const x = p % w;
          const vecinos = [];
          if (x > 0) vecinos.push(p - 1);
          if (x < w - 1) vecinos.push(p + 1);
          if (p >= w) vecinos.push(p - w);
          if (p < w * (h - 1)) vecinos.push(p + w);
          vecinos.forEach((v) => {
            if (borrado[v]) return;
            const dist = distancia(v * 4);
            if (dist < SUAVIZADO) {
              const alfa = Math.round(255 * (dist - TOLERANCIA) / (SUAVIZADO - TOLERANCIA));
              if (alfa < d[v * 4 + 3]) d[v * 4 + 3] = Math.max(0, alfa);
            }
          });
        }
        for (let p = 0; p < w * h; p++) if (borrado[p]) d[p * 4 + 3] = 0;

        ctx.putImageData(imagenData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        resolve(url);
      }
    };
    img.src = url;
  });
}

// Efecto 3D: envuelve la imagen en una "tarjeta" que se inclina siguiendo
// el dedo o el cursor (sin brillos ni colores añadidos: la imagen se ve tal cual es).
// Devuelve el contenedor que hay que poner en lugar de la imagen.
function crearVisor3D(imagen) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return imagen;

  const MAX_INCLINACION = 16; // grados
  const escena = document.createElement("div");
  escena.className = "escena-3d";
  const tarjeta = document.createElement("div");
  tarjeta.className = "tarjeta-3d tarjeta-3d-reposo";
  tarjeta.appendChild(imagen);
  escena.appendChild(tarjeta);

  let encima = false;
  let temporizador = null;

  function inclinar(evento) {
    const caja = escena.getBoundingClientRect();
    const x = Math.min(Math.max((evento.clientX - caja.left) / caja.width, 0), 1);
    const y = Math.min(Math.max((evento.clientY - caja.top) / caja.height, 0), 1);
    const rotX = (0.5 - y) * 2 * MAX_INCLINACION;
    const rotY = (x - 0.5) * 2 * MAX_INCLINACION;

    encima = true;
    clearTimeout(temporizador);
    tarjeta.classList.remove("tarjeta-3d-reposo");
    tarjeta.style.transition = "transform 80ms linear, filter 80ms linear";
    tarjeta.style.transform = "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg) scale(1.05)";
    tarjeta.style.setProperty("--sombra-x", (-rotY * 1.4) + "px");
    tarjeta.style.setProperty("--sombra-y", (rotX * 1.4 + 14) + "px");
  }

  function soltar() {
    encima = false;
    tarjeta.style.transition = "transform 500ms ease-out, filter 500ms ease-out";
    tarjeta.style.transform = "";
    tarjeta.style.setProperty("--sombra-x", "0px");
    tarjeta.style.setProperty("--sombra-y", "14px");
    // Pasado un momento sin tocar, vuelve a mecerse suavemente.
    temporizador = setTimeout(() => {
      if (!encima) {
        tarjeta.style.transition = "";
        tarjeta.classList.add("tarjeta-3d-reposo");
      }
    }, 600);
  }

  escena.addEventListener("pointermove", inclinar);
  escena.addEventListener("pointerdown", inclinar);
  escena.addEventListener("pointerleave", soltar);
  escena.addEventListener("pointerup", (evento) => {
    if (evento.pointerType !== "mouse") soltar();
  });
  escena.addEventListener("pointercancel", soltar);

  return escena;
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
  contenido.append(crearVisor3D(imagen), tipo, nombre, origen);
  if (botonReverso) contenido.appendChild(botonReverso);
  contenido.appendChild(cerrar);
  modal.appendChild(contenido);
  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
  cerrar.focus();

  // Mientras se quita el fondo, la imagen espera oculta para que no se vea el cuadro.
  imagen.style.opacity = "0";
  imagen.style.transition = "opacity 200ms ease-out";
  const revelar = () => { imagen.style.opacity = "1"; };
  setTimeout(revelar, 3000);
  Promise.all([
    quitarFondoImagen(obtenerImagenArticulo(articulo)),
    quitarFondoImagen(articulo.imagenTrasera)
  ]).then(([frontal, trasera]) => {
    if (document.body.contains(modal)) {
      if (botonReverso) botonReverso.cambiarImagenes(frontal, trasera);
      else imagen.src = frontal;
    }
    revelar();
  });
}

// ---------------------------------------------------------------
// Ajustes de la cuenta (engranaje). Solo lo ve el dueño del perfil.
// Los datos salen de la sesión de Firebase Auth del propio usuario
// y NO se guardan en el perfil público, así nadie más los ve.
// ---------------------------------------------------------------
const NOMBRES_PROVEEDOR = {
  "google.com": "Google",
  "password": "Correo y contraseña",
  "phone": "Número de teléfono",
  "facebook.com": "Facebook",
  "apple.com": "Apple",
  "twitter.com": "X (Twitter)",
  "github.com": "GitHub"
};

function formatearFechaCuenta(texto) {
  if (!texto) return "No disponible";
  const fecha = new Date(texto);
  if (isNaN(fecha.getTime())) return "No disponible";
  return fecha.toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" });
}

function filaAjuste(titulo, valor) {
  const fila = document.createElement("div");
  fila.className = "fila-ajuste";
  const dt = document.createElement("dt");
  dt.textContent = titulo;
  const dd = document.createElement("dd");
  dd.textContent = valor;
  fila.append(dt, dd);
  return fila;
}

function mostrarAjustes(usuario) {
  const modalAnterior = document.querySelector(".modal-detalle-articulo");
  if (modalAnterior) modalAnterior.remove();

  const proveedores = usuario.providerData || [];
  const telefono = usuario.phoneNumber
    || (proveedores.find((p) => p && p.phoneNumber) || {}).phoneNumber
    || "No registrado";
  const correo = usuario.email
    || (proveedores.find((p) => p && p.email) || {}).email
    || "No registrado";
  const metodos = proveedores
    .map((p) => NOMBRES_PROVEEDOR[p.providerId] || p.providerId)
    .join(", ") || "No disponible";
  const metadatos = usuario.metadata || {};

  const modal = document.createElement("div");
  modal.className = "modal-detalle-articulo";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "titulo-ajustes");

  const contenido = document.createElement("article");
  contenido.className = "detalle-articulo detalle-ajustes";

  const etiqueta = document.createElement("p");
  etiqueta.className = "etiqueta-detalle-articulo";
  etiqueta.textContent = "Solo tú ves esto";

  const titulo = document.createElement("h2");
  titulo.id = "titulo-ajustes";
  titulo.textContent = "Mi cuenta";

  const lista = document.createElement("dl");
  lista.className = "lista-ajustes";
  lista.append(
    filaAjuste("Nombre", usuario.displayName || "No registrado"),
    filaAjuste("Correo (Gmail)", correo + (usuario.email ? (usuario.emailVerified ? " ✓ verificado" : " (sin verificar)") : "")),
    filaAjuste("Teléfono asociado", telefono),
    filaAjuste("Se registró con", metodos),
    filaAjuste("Cuenta creada", formatearFechaCuenta(metadatos.creationTime)),
    filaAjuste("Último ingreso", formatearFechaCuenta(metadatos.lastSignInTime)),
    filaAjuste("ID de usuario", usuario.uid)
  );

  const nota = document.createElement("p");
  nota.className = "texto-ayuda";
  nota.textContent = "Estos datos son privados y no aparecen en tu perfil público.";

  const cerrar = document.createElement("button");
  cerrar.className = "boton-comprar";
  cerrar.type = "button";
  cerrar.textContent = "Cerrar";
  cerrar.addEventListener("click", () => modal.remove());

  contenido.append(etiqueta, titulo, lista, nota, cerrar);
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
      botonAjustes.classList.remove("oculto");
      botonAjustes.onclick = () => mostrarAjustes(usuarioActual);
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