/*
  ===========================================
  moneda.js - Monedas y billetes de la página
  ===========================================
  Todo el dinero de la página es en PESOS CHILENOS y el campo "monedas"
  de cada usuario en Firestore guarda pesos (ej: 41997 = $41.997 pesos).

  Por ahora existen estas denominaciones:
    - Monedas de $50, $100 y $500
    - Billete de $1.000

  Por eso todos los precios y montos deben ser MÚLTIPLOS DE $50 (así se
  pueden pagar justo con esas monedas y billetes).

  Para agregar otra denominación en el futuro, súmala a DENOMINACIONES.
  Las fotos de cada moneda/billete se toman solas de la colección
  "assets" (los que tengan "Valor en pesos" elegido en root.html).

  Se carga con un <script> antes del archivo de cada página y se usa así:
    Moneda.formatearPesos(1500)   -> "$1.500 pesos"
    Moneda.esMontoValido(1500)    -> true
    Moneda.textoDesglose(1500)    -> "1 billete de $1.000 + 1 moneda de $500"
    Moneda.pintarDenominaciones(div, alElegir)
*/
(function (global) {
  const DENOMINACIONES = [
    { valor: 50, tipo: "Moneda" },
    { valor: 100, tipo: "Moneda", imagen: "img/moneda-100-cien.png" },
    { valor: 500, tipo: "Moneda" },
    { valor: 1000, tipo: "Billete" }
  ];
  const MONTO_MINIMO = 50;
  const MONTO_MAXIMO = 1000000;

  const num = (n) => (Number(n) || 0).toLocaleString("es-CL");
  const formatearPesos = (n) => "$" + num(n) + " pesos";
  const esMontoValido = (n) => Number.isInteger(n) && n >= MONTO_MINIMO && n <= MONTO_MAXIMO && n % MONTO_MINIMO === 0;
  const textoReglaMonto = () => "El monto debe ser múltiplo de $50, entre $50 y $" + num(MONTO_MAXIMO) + " (monedas de $50, $100 y $500 y billete de $1.000).";

  // Cuántas monedas/billetes hacen falta para un monto, usando las más grandes primero.
  function desglose(monto) {
    let resto = Math.max(0, Math.floor(monto));
    return DENOMINACIONES.slice().sort((a, b) => b.valor - a.valor).map((d) => {
      const cantidad = Math.floor(resto / d.valor);
      resto -= cantidad * d.valor;
      return { valor: d.valor, tipo: d.tipo, cantidad };
    }).filter((x) => x.cantidad > 0);
  }

  function textoDesglose(monto) {
    return desglose(monto).map((x) => {
      const palabra = x.tipo === "Billete" ? "billete" : "moneda";
      return x.cantidad + " " + palabra + (x.cantidad === 1 ? "" : "s") + " de $" + num(x.valor);
    }).join(" + ");
  }

  // Fotos: primero las fijas de DENOMINACIONES, y encima las de los assets
  // que tengan "valorPesos" (se cachean para no leer Firestore cada vez).
  let cache = null;
  async function cargarImagenes() {
    if (cache) return cache;
    const mapa = {};
    DENOMINACIONES.forEach((d) => { if (d.imagen) mapa[d.valor] = d.imagen; });
    try {
      if (global.firebase && firebase.apps.length) {
        const snap = await firebase.firestore().collection("assets").get();
        snap.forEach((doc) => {
          const a = doc.data();
          if (a && a.url && DENOMINACIONES.some((d) => d.valor === a.valorPesos)) mapa[a.valorPesos] = a.url;
        });
      }
    } catch (e) { console.warn("No se pudieron leer las fotos de monedas:", e.message); }
    cache = mapa;
    return mapa;
  }
  const limpiarCache = () => { cache = null; };

  // Dibuja las monedas y billetes. Si se pasa "alElegir", cada una es un
  // botón que llama a alElegir(valor); si no, es solo informativa.
  async function pintarDenominaciones(contenedor, alElegir) {
    const imagenes = await cargarImagenes();
    contenedor.innerHTML = "";
    contenedor.classList.add("denominaciones");
    DENOMINACIONES.forEach((d) => {
      const esBillete = d.tipo === "Billete";
      const caja = document.createElement(alElegir ? "button" : "div");
      caja.className = "denominacion " + (esBillete ? "denominacion-billete" : "denominacion-moneda");
      if (alElegir) {
        caja.type = "button";
        caja.setAttribute("aria-label", "Sumar $" + num(d.valor));
        caja.addEventListener("click", () => alElegir(d.valor));
      }
      if (imagenes[d.valor]) {
        const img = document.createElement("img");
        img.src = imagenes[d.valor]; img.alt = ""; img.loading = "lazy";
        caja.appendChild(img);
      } else {
        const f = document.createElement("span");
        f.className = "denominacion-sin-imagen";
        f.textContent = "$" + num(d.valor);
        caja.appendChild(f);
      }
      const t = document.createElement("strong");
      t.textContent = "$" + num(d.valor);
      const s = document.createElement("span");
      s.textContent = d.tipo;
      caja.append(t, s);
      contenedor.appendChild(caja);
    });
  }

  global.Moneda = {
    DENOMINACIONES, MONTO_MINIMO, MONTO_MAXIMO,
    formatearPesos, esMontoValido, textoReglaMonto, desglose, textoDesglose,
    cargarImagenes, limpiarCache, pintarDenominaciones
  };
})(window);