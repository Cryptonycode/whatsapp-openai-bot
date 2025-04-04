// Carga variables de entorno
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Variables de entorno
const PORT = process.env.PORT;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Validación de entorno
if (!OPENAI_API_KEY || !OPENAI_MODEL || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
  console.error('❌ ERROR: Falta alguna variable de entorno necesaria.');
  process.exit(1);
}

// Función para enviar mensajes por WhatsApp usando Twilio
const sendWhatsAppMessage = async (to, message) => {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const data = new URLSearchParams({
      From: `whatsapp:${TWILIO_PHONE_NUMBER}`,
      To: `whatsapp:${to}`,
      Body: message,
    });

    await axios.post(url, data, {
      auth: {
        username: TWILIO_ACCOUNT_SID,
        password: TWILIO_AUTH_TOKEN,
      },
    });
  } catch (error) {
    console.error('❌ Error enviando mensaje por WhatsApp:', error.response?.data || error.message);
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
  const from = req.body.From?.replace('whatsapp:', '') || '';
  const message = req.body.Body || '';

  console.log(`📥 Mensaje recibido de ${from}: ${message}`);

  const aiResponse = await getOpenAIResponse(message);
  await sendWhatsAppMessage(from, aiResponse);

  res.status(200).send('OK');
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('🟢 Servidor WhatsApp + OpenAI operativo.');
});

// Inicia servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor activo en http://0.0.0.0:${PORT}`);
});


