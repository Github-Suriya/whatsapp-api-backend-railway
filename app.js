const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const mysql = require('mysql2');
const { executablePath } = require('puppeteer');
const chrome = require('chrome-aws-lambda');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: '148.113.35.111',
  user: 'suriyawe_suriya',
  password: 'Suriyapauline@143',
  database: 'suriyawe_whatsapp'
});

db.connect(err => {
  if (err) {
    console.error('❌ MySQL connection error:', err.message);
  } else {
    console.log('✅ MySQL connected');
  }
});

const client = new Client({
  puppeteer: {
    executablePath: async () => await chrome.executablePath || '/usr/bin/google-chrome-stable',
    args: chrome.args,
    headless: chrome.headless,
  }
});

let qrCodeImage = '';

client.on('qr', async qr => {
  qrCodeImage = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
  console.log('✅ WhatsApp connected');
});

client.on('message', msg => {
  db.query('INSERT INTO messages (session_id, direction, message) VALUES (?, ?, ?)', ['default', 'incoming', msg.body]);
});

client.initialize();

app.get('/qr', (req, res) => {
  res.send({ qr: qrCodeImage });
});

app.post('/send-message', (req, res) => {
  const { number, message } = req.body;
  client.sendMessage(`${number}@c.us`, message);
  db.query('INSERT INTO messages (session_id, direction, message) VALUES (?, ?, ?)', ['default', 'outgoing', message]);
  res.send({ success: true });
});

app.get('/messages', (req, res) => {
  db.query('SELECT * FROM messages ORDER BY timestamp DESC', (err, results) => {
    if (err) return res.status(500).send(err);
    res.send(results);
  });
});

app.get('/logout', async (req, res) => {
  try {
    await client.logout();
    res.send({ success: true, message: 'Logged out from WhatsApp' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).send({ success: false, message: 'Logout failed' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`✅ Backend running on port ${port}`);
});
