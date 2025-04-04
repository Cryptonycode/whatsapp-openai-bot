# WhatsApp + OpenAI Chatbot (Node.js)

Este repositorio contiene un chatbot funcional que conecta WhatsApp (vía Twilio) con OpenAI usando Node.js y Express.

## 🚀 ¿Qué hace?
- Recibe mensajes por WhatsApp.
- Los procesa con tu modelo fine-tuned de OpenAI.
- Devuelve automáticamente la respuesta al usuario por WhatsApp.

## 🛠 Requisitos
- Node.js instalado.
- Cuenta de Twilio con número verificado.
- API key de OpenAI y nombre de tu modelo fine-tuned.

## 📦 Instalación
```bash
git clone [REPO_URL]
cd whatsapp-openai-bot
cp .env.example .env
npm install
```

Edita el archivo `.env` con tus claves.

## ▶️ Ejecutar localmente
```bash
node index.js
```

## 🌐 Despliegue en Railway (recomendado)
1. Ve a [https://railway.app](https://railway.app) y crea un nuevo proyecto.
2. Conecta tu cuenta de GitHub y selecciona este repositorio.
3. Añade tus variables de entorno.
4. Railway lo desplegará automáticamente.

## 🔁 Conectar con Twilio
En la consola de Twilio:
- Ve a **Messaging > Webhooks**
- Pega tu URL pública (ej: https://miapp.up.railway.app/webhook)
- Asegúrate de que el método sea `POST`

¡Listo! Ya tienes un bot de WhatsApp + IA funcionando 🚀