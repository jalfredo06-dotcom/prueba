# Libreta de campo

PWA (web instalable, funciona sin conexión) para registro en campo:

- **Fotos** con etiquetas rápidas (se recuerdan y ordenan por uso), nota y **sello impreso** en la imagen con etiquetas, coordenadas y fecha.
- **Pizarra / hoja en blanco** (pizarra verde, hoja blanca o cuadrícula) con 6 colores, grosores, borrador y deshacer; encabezado automático con fecha y coordenadas.
- **Coordenadas automáticas** por GPS en cada hoja, o **manuales** (decimales, coma decimal o grados-minutos-segundos) en cualquiera de estos sistemas:
  EPSG 4326/4686 (geográficas), **9377** (Origen Nacional) y **3114, 3115, 3116, 3117, 3118** (MAGNA-SIRGAS 5 orígenes).
  Cada hoja muestra la equivalencia en todos los sistemas (toque para copiar). MAGNA-SIRGAS se trata como WGS84 (diferencia centimétrica).
- **Exportar**: PDF, KMZ (Google Earth, con fotos), KML y respaldo ZIP (importable).
- **Tracks GPS**: grabación de un punto cada 5 s con límite de duración (4 h por defecto, editable), pantalla encendida durante la grabación, recuperación si la app se recarga y segmentos si el GPS se corta. Exporta cada track por separado a **GPX**, **KML** y **CSV** (fecha, hora hh:mm:ss, lat/lon, altitud, precisión y Este/Norte); el GPX puede incluir las fotos/pizarras tomadas durante el recorrido como waypoints.
- Todo se guarda en el dispositivo (IndexedDB).

## Uso

Servir la carpeta por **HTTPS** (GitHub Pages, Netlify…) o `localhost`; el GPS y la cámara lo exigen.

```
npx http-server -p 8123 .   # http://localhost:8123
node tests/geo.test.js      # pruebas de conversión de coordenadas
node tests/trackfmt.test.js # pruebas de CSV/GPX/KML de tracks
```

En el celular: abrir la URL → menú del navegador → *Instalar aplicación / Añadir a pantalla de inicio*.
