# WhatsApp + OpenAI Chatbot (Node.js + Assistants API)

Este repositorio contiene un chatbot que conecta **WhatsApp (vía Twilio)** con **OpenAI Assistants API** usando **Node.js y Express**, desplegado en **Railway**.  

El sistema combina la flexibilidad de WhatsApp con la potencia de OpenAI, incluyendo:
- Uso de **Assistants API** con **memoria y documentos**.
- Manejo de **threads** para mantener el contexto de la conversación.
- Integración con **Twilio API** para recibir y responder mensajes de WhatsApp.
- Despliegue sin servidor en **Railway** con variables de entorno seguras.

---

## 🚀 ¿Qué hace?
- Recibe mensajes desde WhatsApp vía Twilio.
- Crea un **thread** en la Assistants API para cada conversación.
- Envía los mensajes del usuario a OpenAI (puede usar un **modelo fine-tuned**).
- Recupera la respuesta del asistente y la devuelve al usuario por WhatsApp.
- Mantiene el **contexto conversacional** gracias a los threads de Assistants API.
- Soporta carga de documentos para enriquecer las respuestas del bot.

---

## 🛠 Requisitos
- **Node.js** instalado.
- **Cuenta de Twilio** con número de WhatsApp configurado en **Meta Business**.
- **API Key de OpenAI**.
- **Assistant ID de OpenAI** (definido previamente con modelo + instrucciones + documentos).
- **Railway** para despliegue en producción.

---

## 📦 Instalación
```bash
git clone [REPO_URL]
cd whatsapp-openai-bot
cp .env.example .env
npm install

**Edita el archivo .env con tus claves:**
OPENAI_API_KEY=sk-xxxx
OPENAI_ASSISTANT_ID=asst_xxxx
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+34xxxx

**Ejecutar localmente**
node index.js

**Endpoint de prueba:**
curl http://localhost:3000/test

**Devuelve algo como:**
{
  "status": "ok",
  "envVars": {
    "hasOpenAIKey": true,
    "hasAssistantId": true,
    "hasTwilioSID": true,
    "hasTwilioToken": true,
    "hasTwilioPhone": true
  }
}


🌐 Despliegue en Railway

Ve a https://railway.app
 y crea un nuevo proyecto.

Conecta tu repositorio de GitHub.

Configura las variables de entorno en el panel de Railway.

Railway hará el build y desplegará el servicio automáticamente.

🔁 Conectar con Twilio

En la consola de Twilio:

Ve a Messaging > Webhooks.

Pega tu URL pública (ej: https://miapp.up.railway.app/webhook).

Asegúrate de que el método sea POST.

Ahora los mensajes de WhatsApp llegarán a tu backend en Railway.

⚙️ Flujo interno del chatbot

El usuario envía un mensaje a tu número de WhatsApp.

Twilio reenvía el mensaje a tu backend (endpoint /webhook).

El backend:

Crea un thread en OpenAI (/v1/threads).

Añade el mensaje del usuario al thread (/v1/threads/{id}/messages).

Inicia un run con tu asistente configurado (/v1/threads/{id}/runs).

Recupera la respuesta de OpenAI.

El backend responde al usuario por WhatsApp usando la API de Twilio.

🔍 Diagnóstico rápido

Si quieres comprobar que el bot está configurado correctamente:

Verifica que el código usa endpoints de Assistants API (/v1/threads, /v1/runs) y no chat.completions.

Comprueba que se está usando tu OPENAI_ASSISTANT_ID en los runs.

Testea el endpoint /test para confirmar que todas las variables de entorno están cargadas.

📂 Componentes principales

index.js → servidor Express que recibe mensajes y responde.

/webhook → endpoint donde Twilio envía mensajes entrantes.

Assistants API → maneja contexto, memoria y documentos.

Twilio API → gestiona los mensajes de WhatsApp.

Railway → despliegue en producción con variables seguras.

✅ Mantenimiento

Si el bot pierde contexto: revisa si el thread se está reutilizando o se crea uno nuevo en cada mensaje.

Si el bot responde de forma genérica: revisa que tu asistente tenga los documentos e instrucciones cargadas en OpenAI.

Si no se reciben mensajes: comprueba los webhooks en Twilio y Railway logs.

