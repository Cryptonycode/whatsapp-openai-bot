// Carga variables de entorno
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

// Inicializar Express
const app = express();

// Definir variables desde el entorno
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Configurar middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar cliente de Twilio
const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Función para enviar mensajes de WhatsApp usando Twilio
const sendWhatsAppMessage = async (to, message) => {
  try {
    await twilio.messages.create({
      body: message,
      from: `whatsapp:${TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${to}`
    });
    console.log(`📤 Mensaje enviado a ${to}`);
  } catch (error) {
    console.error('❌ Error enviando mensaje de WhatsApp:', error);
  }
};

// Función para obtener la respuesta de OpenAI
const getOpenAIResponse = async (message) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('❌ Error desde OpenAI:', error.response?.data || error.message);
    return 'Lo siento, ha ocurrido un error al procesar tu mensaje.';
  }
};

// Ruta del webhook para recibir mensajes de Twilio
app.post('/webhook', async (req, res) => {
  try {
    console.log("Webhook recibido:", req.body);
    
    const from = req.body.From?.replace('whatsapp:', '') || '';
    const message = req.body.Body || '';

    console.log(`📥 Mensaje recibido de ${from}: ${message}`);

    if (message) {
      const aiResponse = await getOpenAIResponse(message);
      await sendWhatsAppMessage(from, aiResponse);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(200).send('Error procesado');  // Seguimos enviando 200 para que Twilio no reintente
  }
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('🟢 Servidor WhatsApp + OpenAI operativo.');
});

// Ruta de diagnóstico
app.get('/test', (req, res) => {
  res.json({
    status: 'ok',
    envVars: {
      hasOpenAIKey: !!OPENAI_API_KEY,
      hasOpenAIModel: !!OPENAI_MODEL,
      hasTwilioSID: !!TWILIO_ACCOUNT_SID,
      hasTwilioToken: !!TWILIO_AUTH_TOKEN,
      hasTwilioPhone: !!TWILIO_PHONE_NUMBER
    }
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error en Express:', err);
  res.status(500).send('Error interno en el servidor');
});

// Manejo de promesas no controladas
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
});

// Manejo de excepciones no capturadas
process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
  // No terminamos el proceso para que Railway no reinicie constantemente
});

// Inicia servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor activo en puerto: ${PORT}`);
  console.log("RAILWAY_PUBLIC_DOMAIN:", process.env.RAILWAY_PUBLIC_DOMAIN);
}).on('error', (err) => {
  console.error('Error al iniciar el servidor:', err);
});