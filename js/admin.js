/*
  ===========================================
  admin.js - Lógica del panel de administración
  ===========================================
  Esta página deja agregar productos nuevos (paquetes con sus
  opciones/tazos) a la colección "productos" de Firestore, sin tener
  que tocar código. Solo funciona para la cuenta admin.
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

// La misma cuenta admin que definimos en script.js. Como explicamos
// ahí, cada archivo .js es independiente, así que la repetimos acá.
const EMAIL_ADMIN = "arielriquelme08@gmail.com";

// -----------------------------------------------------------------
// 1.1) CONFIGURACIÓN DE CLOUDINARY (subida de imágenes de productos)
// -----------------------------------------------------------------
// "Cloud name": el identificador de TU cuenta de Cloudinary (lo
// sacamos del Dashboard de la consola). "Upload preset": el nombre
// de la "receta" de subida que configuraste en modo "Unsigned" (o
// sea, que cualquiera puede usar para subir SIN necesitar tu clave
// secreta, algo imprescindible acá porque este código corre en el
// navegador de quien sea que abra la página, a la vista de todos).
const CLOUDINARY_CLOUD_NAME = "os889md5";
const CLOUDINARY_UPLOAD_PRESET = "nostalgiacolecciones_productos";

// -----------------------------------------------------------------
// 2) REFERENCIAS A LOS ELEMENTOS DEL HTML
// -----------------------------------------------------------------
const mensajeSinPermiso = document.getElementById("mensaje-sin-permiso");
const panelAdmin = document.getElementById("panel-admin");
const infoAdminRoot = document.getElementById("info-admin-root");
const formNuevoProducto = document.getElementById("form-nuevo-producto");
const tituloFormLugar = document.getElementById("titulo-form-lugar");
const inputNombreProducto = document.getElementById("input-nombre-producto");
const inputImagenProducto = document.getElementById("input-imagen-producto");
const inputArchivoImagen = document.getElementById("input-archivo-imagen"); // NUEVO
const previewImagenProducto = document.getElementById("preview-imagen-producto"); // NUEVO
const textoEstadoSubida = document.getElementById("texto-estado-subida"); // NUEVO
const contenedorOpciones = document.getElementById("contenedor-opciones");
const botonAgregarOpcion = document.getElementById("boton-agregar-opcion");
const listaProductosAdmin = document.getElementById("lista-productos-admin");
const botonGuardarProducto = formNuevoProducto.querySelector(".boton-comprar"); // NUEVO
const botonCancelarEdicion = document.getElementById("boton-cancelar-edicion");
const parametrosAdmin = new URLSearchParams(window.location.search);
const idEditarInicial = parametrosAdmin.get("editar");

// Esta variable es una "bandera": true mientras hay una subida a
// Cloudinary en curso, false el resto del tiempo. La usamos para
// evitar que el formulario se guarde a medio subir la imagen.
let subiendoImagen = false; // NUEVO
let idLugarEditando = null;

// -----------------------------------------------------------------
// 2.1) FUNCIÓN: comprimir la imagen ANTES de subirla (NUEVO)
// -----------------------------------------------------------------
// Recibe el archivo original (tal como lo eligió el usuario, que
// puede pesar varios MB si es una foto de celular) y devuelve una
// versión más chica y liviana, lista para subir a Cloudinary.
//
// La técnica es: dibujar la imagen dentro de un <canvas> (un
// "lienzo" invisible que vive solo en la memoria del navegador,
// nunca se ve en pantalla) a un tamaño más chico, y después pedirle
// a ese canvas que la exporte como un archivo JPEG con una calidad
// reducida. Esto pasa TODO en la computadora de quien sube la foto,
// antes de que un solo byte viaje a internet, así que además de
// ahorrar espacio en Cloudinary, la subida es más rápida.
//
// Como leer un archivo y dibujar una imagen son cosas asincrónicas
// (tardan un instante), envolvemos todo en una "Promise": un objeto
// que representa "una respuesta que todavía no llegó, pero va a
// llegar". Quien use esta función espera el resultado con ".then()",
// igual que ya veníamos haciendo con fetch() y con Firestore.
function comprimirImagen(archivoOriginal) {
  const ANCHO_MAXIMO = 1000; // en píxeles: ninguna foto sale más ancha que esto
  const CALIDAD_JPEG = 0.7; // de 0 (peor calidad, menos peso) a 1 (mejor calidad, más peso)

  return new Promise((resolve, reject) => {
    // FileReader lee el contenido del archivo elegido. Se lo
    // pedimos en formato "Data URL" (un texto largo que representa
    // la imagen), porque es el formato que un <img> puede usar
    // directamente como fuente.
    const lector = new FileReader();

    lector.onload = (eventoLectura) => {
      const imagenOriginal = new Image();

      imagenOriginal.onload = () => {
        // Calculamos el nuevo ancho/alto, manteniendo la proporción
        // original (para que la foto no salga "estirada"). Si la
        // imagen ya es más chica que el máximo, la dejamos como
        // está (no tiene sentido agrandarla).
        let anchoFinal = imagenOriginal.width;
        let altoFinal = imagenOriginal.height;

        if (anchoFinal > ANCHO_MAXIMO) {
          const proporcion = ANCHO_MAXIMO / anchoFinal;
          anchoFinal = ANCHO_MAXIMO;
          altoFinal = Math.round(altoFinal * proporcion);
        }

        const canvas = document.createElement("canvas");
        canvas.width = anchoFinal;
        canvas.height = altoFinal;

        // "2d" le pide al canvas su "pincel" para dibujar formas e
        // imágenes comunes (existe también un modo "3d" para
        // gráficos más avanzados, que acá no necesitamos).
        const contexto = canvas.getContext("2d");
        contexto.drawImage(imagenOriginal, 0, 0, anchoFinal, altoFinal);

        // "toBlob" exporta el dibujo del canvas como un archivo de
        // verdad (un "Blob": un paquete de datos binarios, la misma
        // naturaleza que tiene cualquier archivo). Le pedimos
        // formato JPEG con la calidad reducida que definimos arriba.
        canvas.toBlob(
          (blobComprimido) => {
            if (blobComprimido) {
              resolve(blobComprimido);
            } else {
              reject(new Error("El canvas no pudo generar la imagen comprimida."));
            }
          },
          "image/jpeg",
          CALIDAD_JPEG
        );
      };

      imagenOriginal.onerror = () => reject(new Error("No se pudo leer la imagen elegida."));
      imagenOriginal.src = eventoLectura.target.result;
    };

    lector.onerror = () => reject(new Error("No se pudo leer el archivo elegido."));
    lector.readAsDataURL(archivoOriginal);
  });
}

// -----------------------------------------------------------------
// 2.2) FUNCIÓN: pedirle a Cloudinary el mejor formato/calidad (NUEVO)
// -----------------------------------------------------------------
// Cloudinary permite pedir "transformaciones" agregando texto
// especial adentro de la URL, justo después de "/upload/". Acá
// insertamos "f_auto,q_auto/":
//   - f_auto ("format auto"): en vez de servir siempre el mismo
//     archivo que se subió, Cloudinary detecta CON QUÉ NAVEGADOR
//     estás mirando la página y entrega el formato que mejor le
//     funcione a ESE navegador (por ejemplo WebP en Chrome, que pesa
//     bastante menos que un JPEG con la misma calidad visual).
//     Esto también nos salva de un problema común: si alguien sube
//     una foto en formato .heic (el que usan los iPhone por
//     defecto), la mayoría de los navegadores de escritorio NO
//     pueden mostrar ese formato directo — con f_auto, Cloudinary la
//     entrega ya convertida a algo que cualquier navegador entiende.
//   - q_auto ("quality auto"): además de la compresión que ya
//     hicimos en el navegador antes de subir, Cloudinary aplica su
//     propio ajuste inteligente de calidad al momento de entregarla.
//
// Ejemplo de cómo queda la URL:
//   antes:    .../upload/v1234/nostalgiacoleccion/foto.jpg
//   después:  .../upload/f_auto,q_auto/v1234/nostalgiacoleccion/foto.jpg
function optimizarUrlCloudinary(urlOriginal) {
  return urlOriginal.replace("/upload/", "/upload/f_auto,q_auto/");
}

// -----------------------------------------------------------------
// 2.3) FUNCIÓN: subir el archivo elegido a Cloudinary (NUEVO)
// -----------------------------------------------------------------
// Recibe el archivo de imagen YA comprimido (viene de
// comprimirImagen) y lo manda a la API de Cloudinary.
function subirImagenACloudinary(archivo) {
  subiendoImagen = true;
  botonGuardarProducto.disabled = true; // evita guardar a mitad de subida
  textoEstadoSubida.textContent = "Subiendo imagen...";
  previewImagenProducto.classList.add("oculto");

  // "FormData" es la forma estándar en JavaScript de armar un
  // paquete de datos que incluye un ARCHIVO adentro (algo que un
  // objeto común de JavaScript no puede llevar). Cloudinary espera
  // recibir el archivo bajo la clave "file", y el nombre de nuestro
  // preset bajo la clave "upload_preset".
  //
  // El tercer argumento de "append" (el nombre "producto.jpg") hace
  // falta porque un Blob comprimido, a diferencia del archivo
  // original, no trae un nombre propio: se lo damos nosotros.
  const datosFormulario = new FormData();
  datosFormulario.append("file", archivo, "producto.jpg");
  datosFormulario.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  // Esta es la URL fija de la API de subida de Cloudinary: siempre
  // tiene esta forma, cambiando solo tu cloud name en el medio.
  const urlDeSubida = "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload";

  // "fetch" es la forma moderna en JavaScript de hacer pedidos a
  // internet (parecido a lo que hace el navegador cuando entrás a
  // una página, pero controlado por nuestro código). "method: POST"
  // significa "estoy mandando datos", no solo pidiéndolos.
  fetch(urlDeSubida, {
    method: "POST",
    body: datosFormulario
  })
    .then((respuesta) => respuesta.json())
    .then((datos) => {
      // Si todo salió bien, Cloudinary nos devuelve (entre otras
      // cosas) "secure_url": la dirección https:// pública y
      // definitiva de la imagen ya subida.
      if (datos.secure_url) {
        const urlOptimizada = optimizarUrlCloudinary(datos.secure_url);
        inputImagenProducto.value = urlOptimizada;
        previewImagenProducto.src = urlOptimizada;
        previewImagenProducto.classList.remove("oculto");
        textoEstadoSubida.textContent = "Imagen subida correctamente.";
      } else {
        console.error("Cloudinary no devolvió una URL:", datos);
        textoEstadoSubida.textContent = "No se pudo subir la imagen. Intenta de nuevo.";
      }
    })
    .catch((error) => {
      console.error("Error al subir la imagen a Cloudinary:", error.message);
      textoEstadoSubida.textContent = "Error al subir la imagen. Intenta de nuevo.";
    })
    .finally(() => {
      // ".finally()" corre siempre, haya salido bien o mal el
      // pedido. Perfecto para "apagar" el estado de carga en
      // cualquiera de los dos casos, sin repetir código.
      subiendoImagen = false;
      botonGuardarProducto.disabled = false;
    });
}

// Apenas el usuario elige un archivo en el selector, primero lo
// comprimimos y RECIÉN DESPUÉS arrancamos la subida, sin que tenga
// que apretar ningún botón aparte para ninguno de los dos pasos.
inputArchivoImagen.addEventListener("change", () => {
  const archivoElegido = inputArchivoImagen.files[0];
  if (!archivoElegido) return;

  subiendoImagen = true;
  botonGuardarProducto.disabled = true;
  textoEstadoSubida.textContent = "Comprimiendo imagen...";

  comprimirImagen(archivoElegido)
    .then((archivoComprimido) => {
      subirImagenACloudinary(archivoComprimido);
    })
    .catch((error) => {
      // Si algo sale mal comprimiendo (muy raro, pero puede pasar
      // con algunos formatos poco comunes), preferimos subir la
      // imagen ORIGINAL antes que dejar al usuario sin poder cargar
      // ningún producto.
      console.error("No se pudo comprimir, subo la imagen original:", error.message);
      subirImagenACloudinary(archivoElegido);
    });
});

function subirArchivoACloudinary(archivo, nombreArchivo) {
  return comprimirImagen(archivo)
    .catch(() => archivo)
    .then((archivoListo) => {
      const datosFormulario = new FormData();
      datosFormulario.append("file", archivoListo, nombreArchivo || "imagen.jpg");
      datosFormulario.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const urlDeSubida = "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload";

      return fetch(urlDeSubida, {
        method: "POST",
        body: datosFormulario
      })
        .then((respuesta) => respuesta.json())
        .then((datos) => {
          if (!datos.secure_url) {
            throw new Error("Cloudinary no devolvio una URL.");
          }

          return optimizarUrlCloudinary(datos.secure_url);
        });
    });
}
// -----------------------------------------------------------------
// 3) FUNCIÓN: convertir un nombre en un id de documento válido
// -----------------------------------------------------------------
// Firestore permite casi cualquier texto como id de documento, pero
// para que nuestras URLs (producto.html?id=...) queden prolijas y
// sin problemas de espacios/tildes, generamos un "slug": todo en
// minúscula, sin tildes, con guiones en vez de espacios.
//
// Ejemplo: "Dragon Ball Z - Cartas" -> "dragon-ball-z-cartas"
function generarId(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD") // separa las letras de sus tildes (á -> a + ´)
    .replace(/[\u0300-\u036f]/g, "") // elimina esas tildes ya separadas
    .replace(/[^a-z0-9]+/g, "-") // cualquier cosa que no sea letra/número -> guion
    .replace(/(^-|-$)/g, ""); // saca guiones sueltos al principio/final
}

// -----------------------------------------------------------------
// 4) FUNCIÓN: agregar una fila de "opción" al formulario
// -----------------------------------------------------------------
function agregarFilaPremio(contenedorPremios, premioExistente = {}) {
  const filaPremio = document.createElement("div");
  filaPremio.className = "fila-premio";

  const inputNombrePremio = document.createElement("input");
  inputNombrePremio.type = "text";
  inputNombrePremio.placeholder = "Nombre del premio (ej: Tazo Pikachu)";
  inputNombrePremio.className = "input-nombre-premio";
  inputNombrePremio.value = premioExistente.nombre || "";

  const inputImagenPremio = document.createElement("input");
  inputImagenPremio.type = "hidden";
  inputImagenPremio.className = "input-imagen-premio";
  inputImagenPremio.value = premioExistente.imagen || "";

  const inputArchivoPremio = document.createElement("input");
  inputArchivoPremio.type = "file";
  inputArchivoPremio.accept = "image/*";
  inputArchivoPremio.className = "input-archivo-premio";

  const previewPremio = document.createElement("img");
  previewPremio.className = "preview-opcion oculto";
  previewPremio.alt = "Vista previa del premio";
  if (premioExistente.imagen) {
    previewPremio.src = premioExistente.imagen;
    previewPremio.classList.remove("oculto");
  }

  const estadoPremio = document.createElement("p");
  estadoPremio.className = "estado-subida-opcion texto-ayuda";
  estadoPremio.textContent = premioExistente.imagen
    ? "Imagen actual del premio. Puedes reemplazarla si lo deseas."
    : "Imagen opcional del coleccionable que el usuario puede ganar.";

  inputArchivoPremio.addEventListener("change", () => {
    const archivoElegido = inputArchivoPremio.files[0];
    if (!archivoElegido) return;

    subiendoImagen = true;
    botonGuardarProducto.disabled = true;
    estadoPremio.textContent = "Subiendo imagen del premio...";

    subirArchivoACloudinary(archivoElegido, "premio-coleccionable.jpg")
      .then((urlImagen) => {
        inputImagenPremio.value = urlImagen;
        previewPremio.src = urlImagen;
        previewPremio.classList.remove("oculto");
        estadoPremio.textContent = "Imagen del premio subida.";
      })
      .catch((error) => {
        console.error("Error al subir imagen del premio:", error.message);
        inputImagenPremio.value = "";
        previewPremio.classList.add("oculto");
        estadoPremio.textContent = "No se pudo subir esta imagen. Intenta de nuevo.";
      })
      .finally(() => {
        subiendoImagen = false;
        botonGuardarProducto.disabled = false;
      });
  });

  const botonEliminarPremio = document.createElement("button");
  botonEliminarPremio.type = "button";
  botonEliminarPremio.textContent = "Quitar premio";
  botonEliminarPremio.className = "boton-quitar-fila";
  botonEliminarPremio.addEventListener("click", () => {
    filaPremio.remove();
  });

  filaPremio.appendChild(inputNombrePremio);
  filaPremio.appendChild(inputArchivoPremio);
  filaPremio.appendChild(inputImagenPremio);
  filaPremio.appendChild(previewPremio);
  filaPremio.appendChild(estadoPremio);
  filaPremio.appendChild(botonEliminarPremio);
  contenedorPremios.appendChild(filaPremio);
}

function agregarFilaOpcion(opcionExistente = {}) {
  const fila = document.createElement("div");
  fila.className = "fila-opcion";

  const inputNombre = document.createElement("input");
  inputNombre.type = "text";
  inputNombre.placeholder = "Nombre del producto (ej: Carta Goku)";
  inputNombre.className = "input-nombre-opcion";
  inputNombre.value = opcionExistente.nombre || "";

  const inputPrecio = document.createElement("input");
  inputPrecio.type = "number";
  inputPrecio.placeholder = "Precio en monedas";
  inputPrecio.min = "1";
  inputPrecio.className = "input-precio-opcion";
  inputPrecio.value = opcionExistente.precio || "";

  const selectorTipo = document.createElement("select");
  selectorTipo.className = "select-tipo-opcion";
  selectorTipo.setAttribute("aria-label", "Tipo de artículo");

  ["Coleccionable", "Objeto"].forEach((tipo) => {
    const opcionTipo = document.createElement("option");
    opcionTipo.value = tipo;
    opcionTipo.textContent = tipo;
    selectorTipo.appendChild(opcionTipo);
  });

  const tienePremiosExistentes = Array.isArray(opcionExistente.premios)
    && opcionExistente.premios.some((premio) => premio && premio.nombre);
  selectorTipo.value = opcionExistente.tipo || (tienePremiosExistentes ? "Coleccionable" : "Objeto");

  const inputImagen = document.createElement("input");
  inputImagen.type = "hidden";
  inputImagen.className = "input-imagen-opcion";
  inputImagen.value = opcionExistente.imagen || "";

  const inputArchivo = document.createElement("input");
  inputArchivo.type = "file";
  inputArchivo.accept = "image/*";
  inputArchivo.className = "input-archivo-opcion";

  const preview = document.createElement("img");
  preview.className = "preview-opcion oculto";
  preview.alt = "Vista previa del producto";
  if (opcionExistente.imagen) {
    preview.src = opcionExistente.imagen;
    preview.classList.remove("oculto");
  }

  const estado = document.createElement("p");
  estado.className = "estado-subida-opcion texto-ayuda";
  estado.textContent = opcionExistente.imagen
    ? "Imagen actual del producto. Puedes reemplazarla si lo deseas."
    : "Imagen opcional del producto que el usuario va a comprar.";

  inputArchivo.addEventListener("change", () => {
    const archivoElegido = inputArchivo.files[0];
    if (!archivoElegido) return;

    subiendoImagen = true;
    botonGuardarProducto.disabled = true;
    estado.textContent = "Subiendo imagen del producto...";

    subirArchivoACloudinary(archivoElegido, "producto-opcion.jpg")
      .then((urlImagen) => {
        inputImagen.value = urlImagen;
        preview.src = urlImagen;
        preview.classList.remove("oculto");
        estado.textContent = "Imagen del producto subida.";
      })
      .catch((error) => {
        console.error("Error al subir imagen del producto:", error.message);
        inputImagen.value = "";
        preview.classList.add("oculto");
        estado.textContent = "No se pudo subir esta imagen. Intenta de nuevo.";
      })
      .finally(() => {
        subiendoImagen = false;
        botonGuardarProducto.disabled = false;
      });
  });

  const botonEliminar = document.createElement("button");
  botonEliminar.type = "button";
  botonEliminar.textContent = "Quitar";
  botonEliminar.className = "boton-quitar-fila";
  botonEliminar.addEventListener("click", () => {
    fila.remove();
  });

  const filaPrincipal = document.createElement("div");
  filaPrincipal.className = "fila-opcion-principal";
  filaPrincipal.appendChild(inputNombre);
  filaPrincipal.appendChild(inputPrecio);
  filaPrincipal.appendChild(selectorTipo);
  filaPrincipal.appendChild(inputArchivo);
  filaPrincipal.appendChild(inputImagen);
  filaPrincipal.appendChild(preview);
  filaPrincipal.appendChild(estado);
  filaPrincipal.appendChild(botonEliminar);

  const panelPremios = document.createElement("div");
  panelPremios.className = "panel-premios-opcion";

  const tituloPremios = document.createElement("h4");
  tituloPremios.textContent = "Premios opcionales del producto";

  const textoPremios = document.createElement("p");
  textoPremios.className = "texto-ayuda";
  textoPremios.textContent = "Agrega premios solo si este producto debe entregar un coleccionable al comprarlo.";

  const contenedorPremios = document.createElement("div");
  contenedorPremios.className = "contenedor-premios-opcion";

  const premiosExistentes = Array.isArray(opcionExistente.premios) ? opcionExistente.premios : [];
  premiosExistentes.forEach((premio) => agregarFilaPremio(contenedorPremios, premio));

  const botonAgregarPremio = document.createElement("button");
  botonAgregarPremio.type = "button";
  botonAgregarPremio.textContent = "+ Agregar premio";
  botonAgregarPremio.className = "boton-secundario";
  botonAgregarPremio.addEventListener("click", () => {
    agregarFilaPremio(contenedorPremios);
  });

  function actualizarPanelPremios() {
    panelPremios.classList.toggle("oculto", selectorTipo.value === "Objeto");
  }

  selectorTipo.addEventListener("change", actualizarPanelPremios);
  actualizarPanelPremios();

  panelPremios.appendChild(tituloPremios);
  panelPremios.appendChild(textoPremios);
  panelPremios.appendChild(contenedorPremios);
  panelPremios.appendChild(botonAgregarPremio);

  fila.appendChild(filaPrincipal);
  fila.appendChild(panelPremios);
  contenedorOpciones.appendChild(fila);
}
// Conectamos el botón "+ Agregar opción" con la función de arriba.
botonAgregarOpcion.addEventListener("click", agregarFilaOpcion);

// Arrancamos el formulario con 1 fila lista, para no obligar a
// tocar "+ Agregar opción" antes de poder cargar algo.
agregarFilaOpcion();

// -----------------------------------------------------------------
// 5) FUNCIÓN: leer todas las filas de opciones y armar el array
// -----------------------------------------------------------------
function leerOpcionesDelFormulario() {
  const filas = contenedorOpciones.querySelectorAll(".fila-opcion");
  const opciones = [];
  let filaIncompleta = false;

  filas.forEach((fila) => {
    const nombre = fila.querySelector(".input-nombre-opcion").value.trim();
    const precioTexto = fila.querySelector(".input-precio-opcion").value;
    const precio = Number(precioTexto);
    const tipo = fila.querySelector(".select-tipo-opcion").value;
    const imagen = fila.querySelector(".input-imagen-opcion").value.trim();
    const filasPremio = fila.querySelectorAll(".fila-premio");
    const premios = [];

    // Si el usuario dejó una fila vacía (sin nombre), la ignoramos
    // en vez de guardar una opción rota.
    if (nombre === "" || !precioTexto || precio <= 0) {
      if (nombre !== "" || precioTexto || imagen !== "") {
        filaIncompleta = true;
      }
      return;
    }

    if (tipo === "Coleccionable") filasPremio.forEach((filaPremio) => {
      const nombrePremio = filaPremio.querySelector(".input-nombre-premio").value.trim();
      const imagenPremio = filaPremio.querySelector(".input-imagen-premio").value.trim();

      if (nombrePremio === "") {
        if (imagenPremio !== "") {
          filaIncompleta = true;
        }
        return;
      }

      premios.push({
        id: generarId(nombrePremio),
        nombre: nombrePremio,
        tipo: "Coleccionable",
        imagen: imagenPremio
      });
    });

    opciones.push({
      id: generarId(nombre),
      nombre: nombre,
      precio: precio,
      imagen: imagen,
      tipo: tipo,
      premios: premios
    });
  });

  if (filaIncompleta) {
    return null;
  }

  return opciones;
}

// -----------------------------------------------------------------
// 6) FUNCIÓN: guardar el producto nuevo en Firestore
// -----------------------------------------------------------------
formNuevoProducto.addEventListener("submit", (evento) => {
  // "preventDefault" evita que el navegador haga lo que hace por
  // defecto al enviar un form: recargar la página entera. Nosotros
  // queremos manejar el envío nosotros mismos, con JavaScript.
  evento.preventDefault();

  // NUEVO: si la imagen todavía se está subiendo a Cloudinary,
  // frenamos acá. Sin este chequeo, alguien que guarde muy rápido
  // podría terminar creando el producto con el campo de imagen
  // todavía vacío.
  if (subiendoImagen) {
    alert("Esperá a que termine de subirse la imagen antes de guardar.");
    return;
  }

  const nombreProducto = inputNombreProducto.value.trim();
  const imagenProducto = inputImagenProducto.value.trim();
  const opciones = leerOpcionesDelFormulario();

  if (opciones === null) {
    alert("Completá cada producto con nombre y precio antes de guardar.");
    return;
  }

  const idProducto = generarId(nombreProducto);
  const idDestino = idLugarEditando || idProducto;

  db.collection("productos").doc(idDestino).set({
    nombre: nombreProducto,
    imagen: imagenProducto,
    opciones: opciones
  }).then(() => {
    alert(idLugarEditando ? "¡Lugar actualizado!" : "¡Lugar guardado! Ya debería verse en el modal de A comprar.");
    limpiarFormularioLugar();
    cargarProductosExistentes(); // refrescamos la lista de abajo
  }).catch((error) => {
    console.error("Error al guardar la tienda:", error.message);
    // Si esto falla con un error de "permisos" (permission-denied),
    // probablemente sea porque todavía no pegaste las reglas de
    // Firestore que te pasamos, o porque el email no coincide.
    alert("No se pudo guardar. Revisá la consola del navegador para más detalle.");
  });
});

function limpiarFormularioLugar() {
  idLugarEditando = null;
  formNuevoProducto.reset();
  inputImagenProducto.value = "";
  previewImagenProducto.classList.add("oculto");
  previewImagenProducto.src = "";
  textoEstadoSubida.textContent = "Elige una foto desde tu computadora o celular. Se comprime y se sube automáticamente a Cloudinary al seleccionarla; no hace falta ningún paso más.";
  contenedorOpciones.innerHTML = "";
  agregarFilaOpcion();
  tituloFormLugar.textContent = "Agregar nuevo lugar de compra";
  botonGuardarProducto.textContent = "Guardar lugar";
  botonCancelarEdicion.classList.add("oculto");
  inputNombreProducto.focus();
}

function cargarLugarEnFormulario(documento) {
  const datos = documento.data();

  idLugarEditando = documento.id;
  tituloFormLugar.textContent = "Editar lugar de compra";
  botonGuardarProducto.textContent = "Guardar cambios";
  botonCancelarEdicion.classList.remove("oculto");

  inputNombreProducto.value = datos.nombre || "";
  inputImagenProducto.value = datos.imagen || "";

  if (datos.imagen) {
    previewImagenProducto.src = datos.imagen;
    previewImagenProducto.classList.remove("oculto");
    textoEstadoSubida.textContent = "Imagen actual del lugar. Puedes reemplazarla si lo deseas.";
  } else {
    previewImagenProducto.classList.add("oculto");
    previewImagenProducto.src = "";
    textoEstadoSubida.textContent = "Este lugar no tiene imagen. Puedes subir una si deseas reemplazarla.";
  }

  contenedorOpciones.innerHTML = "";
  const opciones = Array.isArray(datos.opciones) ? datos.opciones : [];

  if (opciones.length === 0) {
    agregarFilaOpcion();
  } else {
    opciones.forEach((opcion) => agregarFilaOpcion(opcion));
  }

  formNuevoProducto.scrollIntoView({ behavior: "smooth", block: "start" });
  inputNombreProducto.focus();
}

function cargarLugarInicialParaEditar() {
  if (!idEditarInicial) {
    return;
  }

  db.collection("productos").doc(idEditarInicial).get().then((documento) => {
    if (!documento.exists) {
    alert("No se encontró el lugar que quieres editar.");
      return;
    }

    cargarLugarEnFormulario(documento);
  }).catch((error) => {
    console.error("Error al cargar el lugar para editar:", error.message);
    alert("No se pudo cargar el lugar para editar.");
  });
}

function crearAccionAgregarImagen() {
  const accion = document.createElement("span");
  accion.className = "miniatura-agregar-imagen-admin";
  accion.textContent = "Agregar imagen";
  return accion;
}

// -----------------------------------------------------------------
// 7) FUNCIÓN: mostrar los productos ya cargados, con botón de borrar
// -----------------------------------------------------------------
function cargarProductosExistentes() {
  db.collection("productos").get().then((coleccion) => {
    listaProductosAdmin.innerHTML = "";

    if (coleccion.empty) {
      listaProductosAdmin.innerHTML = "<p>Todavía no hay lugares cargados.</p>";
      return;
    }

    coleccion.forEach((documento) => {
      const datos = documento.data();

      const fila = document.createElement("div");
      fila.className = "tarjeta-producto-admin";

      const resumen = document.createElement("div");
      resumen.className = "resumen-producto-admin";

      const tieneImagen = typeof datos.imagen === "string" && datos.imagen.trim() !== "";
      let vistaImagen;

      if (tieneImagen) {
        vistaImagen = document.createElement("img");
        vistaImagen.className = "miniatura-producto-admin";
        vistaImagen.src = datos.imagen;
        vistaImagen.alt = datos.nombre;
        vistaImagen.onerror = () => {
          vistaImagen.replaceWith(crearAccionAgregarImagen());
        };
      } else {
        vistaImagen = crearAccionAgregarImagen();
      }

      const nombre = document.createElement("span");
      nombre.textContent = datos.nombre + " (" + datos.opciones.length + " productos)";

      resumen.appendChild(vistaImagen);
      resumen.appendChild(nombre);

      const botonEliminar = document.createElement("button");
      botonEliminar.type = "button";
      botonEliminar.textContent = "Eliminar";
      botonEliminar.className = "boton-quitar-fila";
      botonEliminar.addEventListener("click", () => {
        const confirmar = confirm("¿Seguro que quieres eliminar la tienda \"" + datos.nombre + "\"?");
        if (!confirmar) return;

        documento.ref.delete().then(() => {
          cargarProductosExistentes(); // refrescamos la lista
        });
      });

      const botonEditar = document.createElement("button");
      botonEditar.type = "button";
      botonEditar.textContent = "Editar";
      botonEditar.className = "boton-editar-fila";
      botonEditar.addEventListener("click", () => {
        cargarLugarEnFormulario(documento);
      });

      fila.appendChild(resumen);
      fila.appendChild(botonEditar);
      fila.appendChild(botonEliminar);
      listaProductosAdmin.appendChild(fila);
    });
  });
}

botonCancelarEdicion.addEventListener("click", limpiarFormularioLugar);

// -----------------------------------------------------------------
// 8) EL "CEREBRO" DE ESTA PÁGINA: revisa sesión Y email al cargar
// -----------------------------------------------------------------
auth.onAuthStateChanged((usuario) => {
  if (usuario && usuario.email === EMAIL_ADMIN) {
    // Es la cuenta admin: mostramos el panel de verdad.
    mensajeSinPermiso.classList.add("oculto");
    panelAdmin.classList.remove("oculto");
    infoAdminRoot.classList.remove("oculto");
    cargarProductosExistentes();
    cargarLugarInicialParaEditar();
  } else {
    // Cualquier otro caso (nadie logeado, o logeado con OTRA cuenta):
    // mostramos el mensaje y ocultamos el panel entero.
    mensajeSinPermiso.classList.remove("oculto");
    panelAdmin.classList.add("oculto");
    infoAdminRoot.classList.add("oculto");
  }
});
