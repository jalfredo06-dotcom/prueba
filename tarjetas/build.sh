#!/bin/sh
# Une todos los módulos de js/ en un solo archivo (tarjetas.js) compatible con navegadores antiguos.
# Ejecutar después de editar cualquier archivo de js/:  sh build.sh
cd "$(dirname "$0")" && npx --yes esbuild@0.24.0 js/app.js --bundle --format=iife --target=es2017,safari12 --minify --legal-comments=none --outfile=tarjetas.js
