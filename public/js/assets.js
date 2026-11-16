/*
  ===========================================
  assets.js - Administrador de assets (solo admin)
  ===========================================
  Sección "Mis assets" de root.html (botón "Usuario root" del encabezado): un lugar ordenado para subir y
  organizar las imágenes del sitio (billetes y monedas de pesos
  chilenos, fondos, íconos, etc.).

  - Las imágenes se suben a Cloudinary (mismo preset que admin.js).
  - Cada imagen queda registrada en la colección "assets" de Firestore
    con: nombre, categoria, url, creadoEn y actualizadoEn.
  - Para usar una imagen en otra página, se copia su enlace.
  - Borrar un asset quita solo el registro: la imagen sigue en Cloudinary.

  Para agregar o cambiar categorías, edita la lista CATEGORIAS de abajo.
  Esta sección solo aparece para la cuenta EMAIL_ADMIN. La protección
  real está en las reglas de Firestore (colección "assets").

  Se usa solo en root.html.
*/
(function () {
  const EMAIL_ADMIN = "arielriquelme08@gmail.com";
  const CLOUDINARY_CLOUD_NAME = "os889md5";
  const CLOUDINARY_UPLOAD_PRESET = "nostalgiacolecciones_productos";
  const CATEGORIAS = [
    "Billetes y monedas",
    "Fondos y decoración",
    "Íconos y botones",
    "Coleccionables",
    "Tienda y lugares",
    "Otros"
  ];
  const TODAS = "Todas";

  const seccion = document.getElementById("info-assets");
  if (!seccion) return;

  // En root.html no existe script.js, así que Firebase se inicializa acá
  // (si otra página ya lo hizo, no se repite).
  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey: "AIzaSyBUUZT4-wjqDs5OyDL-AgHo8ZIU5hCVL3Q",
      authDomain: "coleccionalos-69.firebaseapp.com",
      projectId: "coleccionalos-69",
      storageBucket: "coleccionalos-69.firebasestorage.app",
      messagingSenderId: "212183768104",
      appId: "1:212183768104:web:14470274e9affe6fdc291d"
    });
  }
  const auth = firebase.auth();
  const db = firebase.firestore();
  const coleccionAssets = db.collection("assets");
  const $ = (id) => document.getElementById(id);

  const inputArchivo = $("assets-archivo");
  const inputNombre = $("assets-nombre");
  const selectCategoria = $("assets-categoria");
  const botonSubir = $("assets-subir");
  const textoEstado = $("assets-estado");
  const contador = $("assets-contador");
  const selectFiltro = $("assets-filtro");
  const inputBuscar = $("assets-buscar");
  const contenedorLista = $("assets-lista");

  // Imágenes que ya viven en la carpeta img/ del proyecto (no se pueden
  // listar desde el navegador, por eso se anotan acá).
  const ESTATICAS = [
    { nombre: "Moneda de 100 pesos (cien)", archivo: "img/moneda-100-cien.png", categoria: "Billetes y monedas" },
    { nombre: "Moneda de 100 pesos (escudo)", archivo: "img/moneda-100-escudo.png", categoria: "Billetes y monedas" },
    { nombre: "Escena del regalo: mamá entrega monedas", archivo: "img/escena-recompensa-1-mama.png", categoria: "Fondos y decoración" },
    { nombre: "Escena del regalo: pensando", archivo: "img/escena-recompensa-2-pensando.png", categoria: "Fondos y decoración" },
    { nombre: "Imagen de respaldo de productos (Cheetos tazos)", archivo: "img/cheetos-tazos.png", categoria: "Tienda y lugares" }
  ];
  const contenedorEnUso = $("assets-en-uso");

  let assets = [];
  let gruposEnUso = [];
  let cargado = false;
  let ocupado = false;

  // ---------- Utilidades ----------
  function el(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function mostrarEstado(texto) {
    textoEstado.textContent = texto || "";
  }

  function llenarSelect(select, opciones) {
    select.innerHTML = "";
    opciones.forEach((o) => {
      const op = el("option", "", o);
      op.value = o;
      select.appendChild(op);
    });
  }

  function nombreDesdeArchivo(archivo) {
    return archivo.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 60);
  }

  // ---------- Imagen: reducir (si es muy pesada) y subir a Cloudinary ----------
  // Las imágenes livianas se suben tal cual. Si pesan mucho o son enormes,
  // se reducen a un máximo de 1600px (los PNG siguen siendo PNG para no
  // perder la transparencia).
  function prepararImagen(archivo) {
    const MAX_LADO = 1600;
    if (archivo.size < 800 * 1024 || !archivo.type.startsWith("image/")) return Promise.resolve(archivo);
    return new Promise((resolve) => {
      const url = URL.createObjectURL(archivo);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        const tipo = archivo.type === "image/png" ? "image/png" : "image/jpeg";
        canvas.toBlob((blob) => resolve(blob && blob.size < archivo.size ? blob : archivo), tipo, 0.88);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(archivo); };
      img.src = url;
    });
  }

  async function subirACloudinary(archivo) {
    const listo = await prepararImagen(archivo);
    const datos = new FormData();
    datos.append("file", listo, archivo.name || "asset");
    datos.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const resp = await fetch("https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload", {
      method: "POST",
      body: datos
    });
    const json = await resp.json();
    if (!json.secure_url) throw new Error("Cloudinary no devolvió una URL.");
    return json.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
  }

  // ---------- Firestore ----------
  async function cargarAssets() {
    try {
      const snap = await coleccionAssets.get();
      assets = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      cargado = true;
      pintar();
    } catch (e) {
      console.error("No se pudieron cargar los assets:", e);
      mostrarEstado("No se pudieron cargar los assets. Revisa las reglas de Firestore (colección assets).");
    }
  }

  // ---------- Imágenes que ya usa el sitio (solo lectura) ----------
  // Se leen solas desde la colección "productos" (lugares, productos y
  // premios) más las imágenes fijas de la carpeta img/. No hay que subirlas
  // de nuevo: se pueden copiar o "guardar en mis assets" con un clic.
  function sinRepetidas(items) {
    const vistas = new Set();
    return items.filter((i) => (vistas.has(i.url) ? false : vistas.add(i.url)));
  }

  async function cargarEnUso() {
    const grupos = [{
      titulo: "Imágenes del proyecto (carpeta img)",
      items: ESTATICAS.map((e) => ({ nombre: e.nombre, detalle: e.archivo, url: new URL(e.archivo, window.location.href).href, categoria: e.categoria }))
    }];
    try {
      const snap = await db.collection("productos").get();
      const lugares = [], productos = [], premios = [];
      snap.forEach((d) => {
        const lugar = d.data();
        const nombreLugar = lugar.nombre || d.id;
        if (lugar.imagen) lugares.push({ nombre: nombreLugar, detalle: "Imagen del lugar", url: lugar.imagen, categoria: "Tienda y lugares" });
        (lugar.opciones || []).forEach((op) => {
          const nombreOp = op.nombre || op.id || "Producto";
          if (op.imagen) productos.push({ nombre: nombreOp, detalle: "Producto de " + nombreLugar, url: op.imagen, categoria: "Tienda y lugares" });
          (Array.isArray(op.premios) ? op.premios : []).forEach((p) => {
            if (!p) return;
            const nombre = (p.nombre || "Premio") + (p.numero ? " #" + p.numero : "");
            const detalle = "Premio de " + nombreOp + " (" + nombreLugar + ")";
            if (p.imagen && p.imagen !== "tazo-generado") premios.push({ nombre, detalle, url: p.imagen, categoria: "Coleccionables" });
            if (p.imagenTrasera) premios.push({ nombre: nombre + " (reverso)", detalle, url: p.imagenTrasera, categoria: "Coleccionables" });
          });
        });
      });
      grupos.push({ titulo: "Tiendas y lugares", items: sinRepetidas(lugares) });
      grupos.push({ titulo: "Productos de cada tienda", items: sinRepetidas(productos) });
      grupos.push({ titulo: "Coleccionables y premios", items: sinRepetidas(premios) });
    } catch (e) {
      console.error("No se pudieron leer las imágenes en uso:", e);
    }
    gruposEnUso = grupos;
    pintarEnUso();
  }

  async function guardarEnMisAssets(item) {
    try {
      await coleccionAssets.add({
        nombre: item.nombre,
        categoria: item.categoria,
        url: item.url,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });
      await cargarAssets();
      pintarEnUso();
    } catch (e) {
      console.error(e);
      mostrarEstado("No se pudo guardar en tus assets.");
    }
  }

  function pintarEnUso() {
    contenedorEnUso.innerHTML = "";
    const guardadas = new Set(assets.map((a) => a.url));
    gruposEnUso.forEach((grupo) => {
      const detalles = el("details", "assets-detalles");
      detalles.appendChild(el("summary", "", grupo.titulo + " (" + grupo.items.length + ")"));
      const grid = el("div", "assets-grid");
      if (!grupo.items.length) grid.appendChild(el("p", "texto-ayuda", "Todavía no hay imágenes en esta parte."));
      grupo.items.forEach((item) => {
        const card = el("div", "asset-card");
        const img = el("img");
        img.src = item.url; img.alt = item.nombre; img.loading = "lazy";
        const acciones = el("div", "asset-acciones");
        const copiar = el("button", "boton-secundario", "Copiar enlace");
        copiar.type = "button";
        copiar.addEventListener("click", () => copiarEnlace(item, copiar));
        acciones.appendChild(copiar);
        if (guardadas.has(item.url)) {
          acciones.appendChild(el("span", "texto-ayuda", "✓ En mis assets"));
        } else {
          const guardar = el("button", "boton-secundario", "Guardar en mis assets");
          guardar.type = "button";
          guardar.addEventListener("click", () => { guardar.disabled = true; guardarEnMisAssets(item); });
          acciones.appendChild(guardar);
        }
        card.append(img, el("strong", "", item.nombre), el("span", "texto-ayuda", item.detalle), acciones);
        grid.appendChild(card);
      });
      detalles.appendChild(grid);
      contenedorEnUso.appendChild(detalles);
    });
  }

  async function subirNuevo() {
    if (ocupado) return;
    const archivo = inputArchivo.files && inputArchivo.files[0];
    if (!archivo) { mostrarEstado("Elige primero una imagen."); return; }
    const nombre = inputNombre.value.trim() || nombreDesdeArchivo(archivo) || "Sin nombre";
    ocupado = true;
    botonSubir.disabled = true;
    mostrarEstado("Subiendo imagen...");
    try {
      const url = await subirACloudinary(archivo);
      await coleccionAssets.add({
        nombre,
        categoria: selectCategoria.value,
        url,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });
      inputArchivo.value = "";
      inputNombre.value = "";
      mostrarEstado("¡Listo! Imagen guardada en «" + selectCategoria.value + "».");
      await cargarAssets();
    } catch (e) {
      console.error(e);
      mostrarEstado("No se pudo subir la imagen. Intenta de nuevo.");
    }
    ocupado = false;
    botonSubir.disabled = false;
  }

  async function guardarCambios(asset, cambios) {
    await coleccionAssets.doc(asset.id).update(Object.assign({}, cambios, {
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    }));
    Object.assign(asset, cambios);
  }

  async function borrar(asset) {
    if (!window.confirm("¿Quitar «" + asset.nombre + "» de tus assets?\n\n(La imagen seguirá existiendo en Cloudinary; solo se quita de esta lista.)")) return;
    try {
      await coleccionAssets.doc(asset.id).delete();
      assets = assets.filter((a) => a.id !== asset.id);
      pintar();
    } catch (e) {
      console.error(e);
      mostrarEstado("No se pudo quitar el asset.");
    }
  }

  async function copiarEnlace(asset, boton) {
    try {
      await navigator.clipboard.writeText(asset.url);
    } catch (e) {
      window.prompt("Copia el enlace (Ctrl+C):", asset.url);
      return;
    }
    const antes = boton.textContent;
    boton.textContent = "¡Copiado!";
    setTimeout(() => { boton.textContent = antes; }, 1500);
  }

  // ---------- Pantalla ----------
  function tarjetaEdicion(asset) {
    const card = el("div", "asset-card");
    const img = el("img");
    img.src = asset.url; img.alt = asset.nombre; img.loading = "lazy";

    const nombre = el("input");
    nombre.type = "text"; nombre.maxLength = 60; nombre.value = asset.nombre;
    nombre.setAttribute("aria-label", "Nombre");

    const cat = el("select");
    cat.setAttribute("aria-label", "Categoría");
    const cats = CATEGORIAS.includes(asset.categoria) ? CATEGORIAS : CATEGORIAS.concat([asset.categoria]);
    llenarSelect(cat, cats);
    cat.value = asset.categoria;

    const estado = el("span", "texto-ayuda", "");
    const archivoNuevo = el("input");
    archivoNuevo.type = "file"; archivoNuevo.accept = "image/*";
    archivoNuevo.setAttribute("aria-label", "Reemplazar imagen");

    const acciones = el("div", "asset-acciones");
    const guardar = el("button", "boton-comprar", "Guardar");
    guardar.type = "button";
    guardar.addEventListener("click", async () => {
      guardar.disabled = true;
      estado.textContent = "Guardando...";
      try {
        const cambios = { nombre: nombre.value.trim() || asset.nombre, categoria: cat.value };
        if (archivoNuevo.files && archivoNuevo.files[0]) cambios.url = await subirACloudinary(archivoNuevo.files[0]);
        await guardarCambios(asset, cambios);
        pintar();
      } catch (e) {
        console.error(e);
        estado.textContent = "No se pudo guardar.";
        guardar.disabled = false;
      }
    });
    const cancelar = el("button", "boton-secundario", "Cancelar");
    cancelar.type = "button";
    cancelar.addEventListener("click", pintar);
    acciones.append(guardar, cancelar);

    card.append(img, nombre, cat, archivoNuevo, estado, acciones);
    return card;
  }

  function tarjeta(asset) {
    const card = el("div", "asset-card");
    const img = el("img");
    img.src = asset.url; img.alt = asset.nombre; img.loading = "lazy";
    const acciones = el("div", "asset-acciones");

    const copiar = el("button", "boton-secundario", "Copiar enlace");
    copiar.type = "button";
    copiar.addEventListener("click", () => copiarEnlace(asset, copiar));

    const editar = el("button", "boton-secundario", "Editar");
    editar.type = "button";
    editar.addEventListener("click", () => card.replaceWith(tarjetaEdicion(asset)));

    const quitar = el("button", "boton-secundario", "Quitar");
    quitar.type = "button";
    quitar.addEventListener("click", () => borrar(asset));

    acciones.append(copiar, editar, quitar);
    card.append(img, el("strong", "", asset.nombre), acciones);
    return card;
  }

  function pintar() {
    const filtro = selectFiltro.value || TODAS;
    const q = inputBuscar.value.trim().toLowerCase();
    const visibles = assets
      .filter((a) => (filtro === TODAS || a.categoria === filtro) && (!q || (a.nombre || "").toLowerCase().includes(q)))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { numeric: true }));

    if (gruposEnUso.length) pintarEnUso();
    contador.textContent = assets.length ? "(" + visibles.length + " de " + assets.length + ")" : "";
    contenedorLista.innerHTML = "";

    if (!assets.length) {
      contenedorLista.appendChild(el("p", "texto-ayuda", "Todavía no has subido ninguna imagen."));
      return;
    }
    if (!visibles.length) {
      contenedorLista.appendChild(el("p", "texto-ayuda", "Ninguna imagen coincide con el filtro."));
      return;
    }

    // Agrupadas por categoría, en el orden de la lista CATEGORIAS.
    const usadas = Array.from(new Set(visibles.map((a) => a.categoria)));
    const orden = CATEGORIAS.filter((c) => usadas.includes(c)).concat(usadas.filter((c) => !CATEGORIAS.includes(c)));
    orden.forEach((categoria) => {
      const grupo = el("div", "assets-grupo");
      grupo.appendChild(el("h4", "", categoria));
      const grid = el("div", "assets-grid");
      visibles.filter((a) => a.categoria === categoria).forEach((a) => grid.appendChild(tarjeta(a)));
      grupo.appendChild(grid);
      contenedorLista.appendChild(grupo);
    });
  }

  // ---------- Arranque ----------
  llenarSelect(selectCategoria, CATEGORIAS);
  llenarSelect(selectFiltro, [TODAS].concat(CATEGORIAS));
  botonSubir.addEventListener("click", subirNuevo);
  selectFiltro.addEventListener("change", pintar);
  inputBuscar.addEventListener("input", pintar);

  auth.onAuthStateChanged((usuario) => {
    const esAdmin = !!usuario && usuario.email === EMAIL_ADMIN;
    seccion.classList.toggle("oculto", !esAdmin);
    // Página root.html: muestra el panel solo al admin; al resto, un aviso.
    const panelRoot = $("panel-root");
    const sinPermiso = $("root-sin-permiso");
    if (panelRoot) panelRoot.classList.toggle("oculto", !esAdmin);
    if (sinPermiso) sinPermiso.classList.toggle("oculto", esAdmin);
    if (esAdmin && !cargado) { cargarAssets(); cargarEnUso(); }
  });
})();