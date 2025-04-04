require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

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
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
  }
};

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
    console.error('Error from OpenAI:', error.response?.data || error.message);
    return 'Lo siento, ha ocurrido un error al procesar tu mensaje.';
  }
};

app.post('/webhook', async (req, res) => {
  const from = req.body.From?.replace('whatsapp:', '') || '';
  const message = req.body.Body || '';

  console.log(`Mensaje recibido de ${from}: ${message}`);

  const aiResponse = await getOpenAIResponse(message);
  await sendWhatsAppMessage(from, aiResponse);

  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.send('Servidor WhatsApp + OpenAI operativo.');
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});