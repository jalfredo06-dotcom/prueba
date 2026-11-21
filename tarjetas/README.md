# Tarjetas Animadas

App web (HTML + JS, sin compilación) para crear **tarjetas virtuales en video**: cumpleaños, invitaciones, bodas, grados, felicitaciones, aniversarios, baby shower, XV años, Navidad, Año Nuevo y más.

- 17 ocasiones con título, estilo y **mensajes sugeridos** propios.
- 20 fondos degradados animados, colores personalizados o imagen propia; texturas (bokeh, rayos, ondas…) y elementos animados (confeti, globos, corazones, nieve, pétalos, fuegos artificiales, birretes…).
- Hasta 12 **fotos animadas** (polaroid, deslizar, zoom, giro, revelado, acercamiento) con distintos marcos, y un collage final.
- **Vertical u horizontal** con las relaciones más usadas: 16:9 / 9:16, 4:3 / 3:4, 3:2 / 2:3, 5:4 / 4:5, 1:1 y 21:9 / 9:21, en 720p o 1080p.
- Detalles del evento (fecha, hora, lugar, nota), varias tipografías y música opcional.
- Exporta **video** (MP4 en Chrome/Edge/Safari recientes; WebM en Firefox) o **imagen PNG**, y permite compartir desde el celular.

Todo se procesa en el navegador: las fotos no se suben a ningún servidor.

## Publicar en Netlify

**Opción rápida:** entra a <https://app.netlify.com/drop> y arrastra la carpeta `tarjetas`.

**Desde GitHub:** *Add new site → Import an existing project*, elige este repositorio y configura
**Base directory: `tarjetas`** (el resto lo toma de `tarjetas/netlify.toml`: sin comando de compilación y publica la carpeta tal cual).

## Probar localmente

```
cd tarjetas
npx http-server -p 8080 .   # http://localhost:8080
```
(Se necesita un servidor porque usa módulos JS; abrir `index.html` con doble clic no funciona.)
