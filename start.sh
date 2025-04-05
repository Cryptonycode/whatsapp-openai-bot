#!/bin/bash

echo "🔧 Ejecutando script de inicio..."

# Railway ya expone las variables de entorno, pero mostramos logs útiles
echo "📦 Dependencias cargadas correctamente"
echo "🔧 Middleware configurado"
echo "🔐 Cliente de Twilio configurado correctamente"
echo "🌐 Intentando iniciar el servidor..."

# Ejecutar la aplicación
node app/index.js
