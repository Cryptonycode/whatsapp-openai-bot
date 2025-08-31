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
const OPENAI_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// 🆕 CONFIGURACIÓN PARA HORARIOS Y PRECIOS
const TICKET_URL = 'https://entradas.cuevadenerja.es/';
const PRICE_SCHEDULE_KEYWORDS = [
  'horario', 'horarios', 'hora', 'horas', 'abierto', 'cerrado', 'abre', 'cierra',
  'precio', 'precios', 'tarifa', 'tarifas', 'cuesta', 'coste', 'costo', 'entrada', 'entradas',
  'cuánto', 'cuanto', 'vale', 'euros', '€', 'gratis', 'gratuito', 'descuento'
];

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

// 🆕 Función para detectar preguntas sobre horarios y precios
const isPriceOrScheduleQuery = (message) => {
  const lowerMessage = message.toLowerCase();
  return PRICE_SCHEDULE_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
};

// 🆕 Función para limpiar respuestas de referencias
const cleanResponse = (response) => {
  // Eliminar referencias como [4:0†source], [número:texto], etc.
  let cleaned = response.replace(/\[\d+:\d+[^\]]*\]/g, '');
  // Eliminar referencias adicionales como (4:0†source) o similares
  cleaned = cleaned.replace(/\(\d+:\d+[^\)]*\)/g, '');
  // Limpiar espacios extra y saltos de línea múltiples
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
};

// 🆕 Respuesta predefinida para horarios y precios
const getPriceScheduleResponse = () => {
  return `Para consultar los horarios actualizados y precios de las entradas, te recomiendo visitar nuestra página oficial de venta de entradas donde encontrarás toda la información actualizada:

${TICKET_URL}

Allí podrás ver los horarios disponibles, diferentes tipos de entrada y realizar tu compra directamente.

¿Hay algo más en lo que pueda ayudarte sobre la Cueva de Nerja?`;
};

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
  const headers = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2'
  };

  try {
    const threadRes = await axios.post('https://api.openai.com/v1/threads', {}, { headers });
    const threadId = threadRes.data.id;

    await axios.post(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      role: 'user',
      content: userMessage
    }, { headers });

    const runRes = await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      assistant_id: OPENAI_ASSISTANT_ID
    }, { headers });

    const runId = runRes.data.id;
    let status = 'in_progress';

    while (status !== 'completed' && status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const runStatus = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        { headers }
      );
      status = runStatus.data.status;
    }

    if (status === 'completed') {
      const messagesRes = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/messages`,
        { headers }
      );
      const lastMessage = messagesRes.data.data.find(msg => msg.role === 'assistant');

      // 🔧 Limpiar respuesta de referencias de fuente
      let rawResponse = lastMessage?.content[0]?.text?.value || 'Respuesta no disponible.';
      let cleanedResponse = cleanResponse(rawResponse);
      return cleanedResponse;
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
      // 🆕 VERIFICAR SI ES PREGUNTA SOBRE HORARIOS O PRECIOS
      if (isPriceOrScheduleQuery(message)) {
        console.log(`🎯 Detectada pregunta sobre horarios/precios de ${from}`);
        const priceScheduleResponse = getPriceScheduleResponse();
        await sendWhatsAppMessage(from, priceScheduleResponse);
      } else {
        // Usar el asistente para otras consultas
        const aiResponse = await callAssistant(message);
        await sendWhatsAppMessage(from, aiResponse);
      }
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
      hasAssistantId: !!OPENAI_ASSISTANT_ID,
      hasTwilioSID: !!TWILIO_ACCOUNT_SID,
      hasTwilioToken: !!TWILIO_AUTH_TOKEN,
      hasTwilioPhone: !!TWILIO_PHONE_NUMBER
    },
    features: {
      priceScheduleRedirect: true,
      responseCleanup: true,
      keywordsCount: PRICE_SCHEDULE_KEYWORDS.length
    }
  });
});

// 🆕 Ruta para probar la detección de keywords
app.get('/test-keywords/:message', (req, res) => {
  const testMessage = req.params.message;
  const isDetected = isPriceOrScheduleQuery(testMessage);
  res.json({
    message: testMessage,
    detected: isDetected,
    keywords: PRICE_SCHEDULE_KEYWORDS
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
  console.log(`🎯 Keywords configuradas: ${PRICE_SCHEDULE_KEYWORDS.length}`);
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