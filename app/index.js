// Carga variables de entorno
require('dotenv').config();

console.log('🔍 Iniciando servidor...');
console.log('🔍 Verificando variables de entorno:');
console.log('PORT:', process.env.PORT || 3000);
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Definida' : 'No definida');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Definido' : 'No definido');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'Definido' : 'No definido');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? 'Definido' : 'No definido');
console.log("🧪 Versión de Node en Railway:", process.version);

const express = require('express');
const axios = require('axios');

console.log('🔍 Dependencias cargadas correctamente');

// Inicializar Express
const app = express();

// Definir variables desde el entorno
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('🔍 Middleware configurado');

// Configurar cliente de Twilio
let twilio;
try {
  twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  console.log('🔍 Cliente de Twilio configurado correctamente');
} catch (error) {
  console.error('❌ Error al configurar Twilio:', error.message);
  twilio = null;
}

// Enviar mensajes de WhatsApp
const sendWhatsAppMessage = async (to, message) => {
  if (!twilio) {
    console.error('❌ Twilio no inicializado');
    return;
  }
  try {
    await twilio.messages.create({
      body: message,
      from: `whatsapp:${TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${to}`
    });
    console.log(`📤 Mensaje enviado a ${to}`);
  } catch (error) {
    console.error('❌ Error al enviar mensaje de WhatsApp:', error.message);
  }
};

// Función para interactuar con el asistente
const callAssistant = async (userMessage) => {
  try {
    const threadRes = await axios.post('https://api.openai.com/v1/threads', {}, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const threadId = threadRes.data.id;

    await axios.post(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      role: 'user',
      content: userMessage
    }, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const runRes = await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID
    }, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const runId = runRes.data.id;
    let status = 'in_progress';

    while (status !== 'completed' && status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const runStatus = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
      );
      status = runStatus.data.status;
    }

    if (status === 'completed') {
      const messagesRes = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/messages`,
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
      );
      const lastMessage = messagesRes.data.data.find(msg => msg.role === 'assistant');
      return lastMessage?.content[0]?.text?.value || 'Respuesta no disponible.';
    } else {
      return 'El asistente no pudo generar una respuesta.';
    }
  } catch (error) {
    console.error('❌ Error en callAssistant:', error.response?.data || error.message);
    return 'Ha ocurrido un error con el asistente.';
  }
};

// Webhook de Twilio
app.post('/webhook', async (req, res) => {
  try {
    const from = req.body.From?.replace('whatsapp:', '') || '';
    const message = req.body.Body || '';
    console.log(`📥 Mensaje recibido de ${from}: ${message}`);

    if (message) {
      const aiResponse = await callAssistant(message);
      await sendWhatsAppMessage(from, aiResponse);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error en webhook:', error.message);
    res.status(200).send('Error procesado');
  }
});

// Ruta principal
app.get('/', (req, res) => {
  res.send('🟢 Servidor WhatsApp + OpenAI operativo.');
});

// Diagnóstico
app.get('/test', (req, res) => {
  res.json({
    status: 'ok',
    envVars: {
      hasOpenAIKey: !!OPENAI_API_KEY,
      hasAssistantId: !!process.env.OPENAI_ASSISTANT_ID,
      hasTwilioSID: !!TWILIO_ACCOUNT_SID,
      hasTwilioToken: !!TWILIO_AUTH_TOKEN,
      hasTwilioPhone: !!TWILIO_PHONE_NUMBER
    }
  });
});

// Error middleware
app.use((err, req, res, next) => {
  console.error('❌ Error en Express:', err.message);
  res.status(500).send('Error interno en el servidor');
});

// Manejo de errores globales
process.on('unhandledRejection', reason => {
  console.error('❌ Promesa no manejada:', reason);
});
process.on('uncaughtException', err => {
  console.error('❌ Excepción no capturada:', err.message);
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor activo en el puerto ${PORT}`);
  console.log('RAILWAY_PUBLIC_DOMAIN:', process.env.RAILWAY_PUBLIC_DOMAIN);
}).on('error', err => {
  console.error('❌ Error al iniciar el servidor:', err.message);
});

// Confirmación periódica
setInterval(() => {
  console.log('🔍 Servidor sigue activo...');
}, 5000);

// Cierre ordenado
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente.');
    process.exit(0);
  });
});
