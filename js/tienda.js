/*
  ===========================================
  tienda.js - Lógica del catálogo de la tienda
  ===========================================
  Lee todos los productos guardados en la colección "productos" de
  Firestore (cargados desde el panel de admin) y dibuja una tarjeta
  por cada uno, cada una linkeando a su propia página de opciones
  (producto.html?id=...).
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
const EMAIL_ADMIN = "arielriquelme08@gmail.com";

// -----------------------------------------------------------------
// 2) REFERENCIAS A LOS ELEMENTOS DEL HTML
// -----------------------------------------------------------------
const grillaProductos = document.getElementById("grilla-productos");
const IMAGEN_PRODUCTO_RESPALDO = "img/cheetos-tazos.png";

let usuarioActual = null;

// -----------------------------------------------------------------
// 3) FUNCIÓN: dibujar una tarjeta por cada producto
// -----------------------------------------------------------------
function dibujarProductos(coleccion) {
  // Vaciamos la grilla (por ahora tiene el mensaje de "Cargando...").
  grillaProductos.innerHTML = "";

  if (coleccion.empty) {
    const mensaje = document.createElement("p");
    mensaje.textContent = "Todavía no hay productos cargados.";
    grillaProductos.appendChild(mensaje);

    if (usuarioActual && usuarioActual.email === EMAIL_ADMIN) {
      const linkAdmin = document.createElement("a");
      linkAdmin.href = "admin.html";
      linkAdmin.className = "tarjeta-producto tarjeta-admin-vacia";
      linkAdmin.textContent = "Agregar tiendas y productos con imágenes";
      grillaProductos.appendChild(linkAdmin);
    } else {
      const volver = document.createElement("p");
      volver.textContent = "¡Vuelve pronto!";
      grillaProductos.appendChild(volver);
    }
    return;
  }

  coleccion.forEach((documento) => {
    // "documento.id" es el id del documento en Firestore (el "slug"
    // que armamos en admin.js, ej: "dragon-ball-z-cartas").
    // "documento.data()" nos da el objeto con nombre/imagen/opciones.
    const datos = documento.data();

    const tarjeta = document.createElement("a");
    tarjeta.className = "tarjeta-producto";
    // Armamos la URL con el id como parámetro: producto.html?id=xxxx
    tarjeta.href = "producto.html?id=" + documento.id;

    const imagen = document.createElement("img");
    imagen.src = datos.imagen || IMAGEN_PRODUCTO_RESPALDO;
    imagen.alt = datos.nombre;
    imagen.className = "imagen-producto";
    imagen.onerror = () => {
      imagen.src = IMAGEN_PRODUCTO_RESPALDO;
    };

    const nombre = document.createElement("span");
    nombre.className = "nombre-producto";
    nombre.textContent = datos.nombre;

    tarjeta.appendChild(imagen);
    tarjeta.appendChild(nombre);
    grillaProductos.appendChild(tarjeta);
  });
}

function cargarProductos() {
  db.collection("productos").get().then((coleccion) => {
  dibujarProductos(coleccion);
  }).catch((error) => {
  console.error("Error al cargar los productos:", error.message);
  grillaProductos.innerHTML = "<p>Ocurrió un error al cargar los productos.</p>";
  });
}

// -----------------------------------------------------------------
// 4) TRAER LOS PRODUCTOS APENAS CARGA LA PÁGINA
// -----------------------------------------------------------------
auth.onAuthStateChanged((usuario) => {
  usuarioActual = usuario;
  cargarProductos();
});
