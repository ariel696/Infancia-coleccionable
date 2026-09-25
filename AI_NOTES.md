# Colecciones de ayer y hoy - Notas para IA y mantenimiento

Este archivo resume como esta armada la pagina para que una IA o una persona pueda seguir trabajando sin tener que redescubrir todo desde cero.

## Objetivo del sitio

La pagina permite que usuarios inicien sesion con Google, reciban monedas, entren a tiendas, compren productos coleccionables con monedas y vean su coleccion personal.

El nombre publico actual del sitio es: **Colecciones de ayer y hoy**.

## Estructura principal

- `index.html` + `js/script.js`: portada, login con Google, monedas, regalo diario, acceso a tienda, coleccion y admin.
- `tienda.html` + `js/tienda.js`: lista las tiendas disponibles.
- `producto.html` + `js/producto.js`: abre una tienda especifica y muestra los productos internos para comprar.
- `coleccion.html` + `js/coleccion.js`: muestra los coleccionables comprados por el usuario.
- `admin.html` + `js/admin.js`: panel root/admin para crear y eliminar tiendas, subir imagenes y cargar productos internos.
- `css/style.css`: estilos compartidos.
- `img/`: imagenes locales de respaldo y escenas.

## Cuenta root/admin

La cuenta admin/root esta definida en varios archivos JS como:

```js
const EMAIL_ADMIN = "arielriquelme08@gmail.com";
```

Si cambia la cuenta root, actualizarla en todos los archivos donde aparezca, especialmente:

- `js/script.js`
- `js/admin.js`

Importante: ocultar botones o paginas en el frontend no es seguridad real. La seguridad real debe estar en las reglas de Firebase/Firestore.

## Firebase

Proyecto Firebase actual:

- `projectId`: `nostalgiacolecciones`
- Hosting publico: `https://nostalgiacolecciones.web.app`

La app usa Firebase Auth y Firestore desde SDK compat cargado por `<script>` en cada HTML.

## Firestore: modelo de datos actual

### Coleccion `usuarios`

Documento por `uid` de Firebase Auth.

Campos usados:

- `monedas`: numero de monedas del usuario.
- `ultimoReclamo`: timestamp del ultimo regalo diario.
- `coleccionables`: array de coleccionables ganados. Puede contener strings antiguos o nuevos objetos con datos del premio.

Cuando se compra un producto interno, la compra funciona como apertura de paquete: se descuenta el precio del producto/articulo comprado, pero lo que se agrega a `coleccionables` es un objeto coleccionable aleatorio.

Actualmente `js/producto.js` tiene un pool inicial `TAZOS_POKEMON_51`. Al comprar un producto interno, se elige un tazo al azar. Hay un 3% de posibilidad de premio doble, en cuyo caso se guardan 2 tazos distintos en la misma compra y se muestran ambos en un modal visual.

- `id`: id del coleccionable ganado, por ejemplo `tazo-pokemon-025`.
- `nombre`: nombre visible, por ejemplo `Tazo Pokemon #025 Pikachu`.
- `tipo`: tipo de coleccionable.
- `numero`: numero del tazo dentro del set de 51.
- `color`: color usado para generar su imagen SVG.
- `imagen`: marca `tazo-generado` para indicar que la imagen se genera desde JavaScript.
- `origenTiendaId`: tienda desde donde se compro.
- `origenProductoId`: producto/paquete comprado.
- `origenProductoNombre`: nombre del producto/paquete comprado.
- `obtenidoEn`: fecha ISO local generada en el navegador.
- `compraId`: id unico para permitir obtener repetidos.

Importante: puede haber usuarios con coleccionables antiguos guardados como strings `tiendaId__productoId`. `js/coleccion.js` debe seguir soportando ambos formatos.

### Coleccion `productos`

Aunque visualmente ahora el primer nivel se llama **tienda**, por compatibilidad tecnica la coleccion Firestore todavia se llama `productos`.

Cada documento de `productos` representa una tienda.

Campos del documento tienda:

- `nombre`: nombre visible de la tienda.
- `imagen`: URL de imagen de la tienda.
- `opciones`: array de productos internos de esa tienda.

Cada item dentro de `opciones` representa un producto interno y puede tener:

- `id`: slug interno del producto.
- `nombre`: nombre visible.
- `precio`: precio en monedas.
- `imagen`: URL de imagen del producto interno.

No renombrar `productos` a `tiendas` sin migrar tambien:

- `js/tienda.js`
- `js/producto.js`
- `js/coleccion.js`
- `js/admin.js`
- reglas de Firestore
- datos existentes en Firestore

## Cloudinary

El admin sube imagenes a Cloudinary usando un upload preset unsigned.

Constantes actuales en `js/admin.js`:

```js
const CLOUDINARY_CLOUD_NAME = "os889md5";
const CLOUDINARY_UPLOAD_PRESET = "nostalgiacolecciones_productos";
```

Las imagenes se comprimen en el navegador antes de subirse. Luego se guarda la URL optimizada con `f_auto,q_auto`.

Hay imagen de respaldo local:

```txt
img/cheetos-tazos.png
```

Se usa si una tienda o producto no tiene imagen o si la URL falla.

## Flujo de usuario

1. Usuario entra a `index.html`.
2. Inicia sesion con Google.
3. Se crea o lee su documento en `usuarios/{uid}`.
4. Ve monedas y puede entrar a tienda.
5. En `tienda.html` elige una tienda.
6. En `producto.html?id=...` compra productos internos con monedas. Esa compra abre un paquete y entrega un coleccionable aleatorio.
7. El coleccionable ganado se agrega a `coleccionables`.
8. En `coleccion.html` ve su coleccion.

## Flujo admin/root

1. Admin entra a `admin.html`.
2. `js/admin.js` revisa `usuario.email === EMAIL_ADMIN`.
3. Si coincide, muestra el panel.
4. Admin carga una tienda con imagen.
5. Dentro de esa tienda agrega productos internos con precio e imagen.
6. Al guardar, se crea/actualiza un documento en Firestore `productos/{slug}`.

## Reglas importantes para futuras IAs

- Mantener admin separado de index: `admin.html` y `js/admin.js`.
- No poner logica de administracion en `index.html` salvo links/visibilidad.
- No cambiar nombres tecnicos de Firebase sin migracion completa.
- Antes de desplegar, revisar sintaxis JS con `node --check`.
- Desplegar con `firebase deploy`.
- Si se agrega seguridad real, hacerlo en reglas Firestore, no solo en frontend.
- Si se cambia el modelo de datos, actualizar este archivo.

## Pendientes recomendados

- Revisar y endurecer reglas de Firestore para que solo root pueda escribir tiendas/productos.
- Revisar reglas de usuarios para que cada usuario solo pueda modificar sus propios datos permitidos.
- Considerar migrar el nombre tecnico `productos` a `tiendas` mas adelante, con migracion controlada.
- Considerar mover subidas de imagenes sensibles a backend/Firebase Functions si el proyecto crece.
## Recarga root de monedas

En `index.html` existe un panel visible solo para la cuenta root/admin que permite sumar monedas al usuario root para probar compras. La logica esta en `js/script.js`, funcion `recargarMonedasRoot()`, y actualiza `usuarios/{uid}.monedas` con `firebase.firestore.FieldValue.increment(cantidad)`.

Este control es solo para pruebas. La seguridad real debe reforzarse con reglas de Firestore para evitar que usuarios comunes modifiquen monedas desde consola.
## Tarjetas de compra visuales

En `producto.html`, los productos/articulos comprables se muestran desde `js/producto.js` como tarjetas donde la imagen es protagonista. El nombre y descripcion aparecen sobre la imagen con hover/focus (`.descripcion-opcion`), y el precio queda siempre visible debajo de la imagen en `.compra-producto`, centrado arriba del boton comprar. Mantener este patron para que en mobile y desktop el producto se vea primero como objeto visual.

## Recompensa visual al comprar

`js/producto.js` reemplaza el `alert()` de compra por un modal `.modal-premio` que muestra imagenes SVG generadas de los tazos ganados. La funcion `crearImagenTazoDataUri()` arma la imagen desde los datos del coleccionable, asi no hace falta tener 51 archivos de imagen por ahora.

`js/coleccion.js` usa la misma idea para mostrar miniaturas de tazos en `coleccion.html`. Mantener compatibilidad con coleccionables antiguos guardados como strings.
