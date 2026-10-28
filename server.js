const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// CHANGE THIS LINE in your server.js
const db = mysql.createConnection({
   host: 'localhost',
   user: 'root',      
   password: '',      
   database: 'weather_some_db' // Change 'weather_some_db' to 'weather_db'
});

db.connect(err => {
   if (err) {
       console.error('❌ Database connection failed. Is XAMPP running? Error:', err.message);
       return;
   }
   console.log('✅ Connected to MySQL Database: weather_some_db');
});

// 2. COMMUNITY VOTES
app.post('/api/vote', (req, res) => {
   const { city, vote } = req.body;
   if (!city || !vote) return res.status(400).send({ error: 'Data required' });

   const sql = 'INSERT INTO votes (city, vote_type) VALUES (?, ?)';
   db.query(sql, [city, vote], (err, result) => {
       if (err) return res.status(500).send(err);
       res.send({ message: 'Vote saved!', id: result.insertId });
   });
});

app.get('/api/votes/:city', (req, res) => {
   const city = req.params.city;
   const sql = 'SELECT vote_type, COUNT(*) as count FROM votes WHERE city = ? GROUP BY vote_type';
   db.query(sql, [city], (err, results) => {
       if (err) return res.status(500).send(err);
       res.send(results);
   });
});

// 3. SEARCH HISTORY
app.post('/api/history', (req, res) => {
   const { city } = req.body;
   if (!city) return res.status(400).send({ error: 'City required' });

   const sql = 'INSERT INTO history (city_name) VALUES (?)';
   db.query(sql, [city], (err, result) => {
       if (err) return res.status(500).send(err);
       res.send({ message: 'Logged', id: result.insertId });
   });
});

app.get('/api/history', (req, res) => {
   const sql = 'SELECT * FROM history ORDER BY searched_at DESC LIMIT 10';
   db.query(sql, (err, results) => {
       if (err) return res.status(500).send(err);
       res.send(results);
   });
});

// 4. CONTACT MESSAGES
app.post('/api/contact', (req, res) => {
   const { name, email, message } = req.body;
   if (!name || !email || !message) return res.status(400).send({ error: 'Fields missing' });

   const sql = 'INSERT INTO contact (user_name, user_email, message) VALUES (?, ?, ?)';
   db.query(sql, [name, email, message], (err, result) => {
       if (err) return res.status(500).send(err);
       res.send({ message: 'Sent!', id: result.insertId });
   });
});

app.get('/api/contact', (req, res) => {
   const sql = 'SELECT * FROM contact ORDER BY sent_at DESC';
   db.query(sql, (err, results) => {
       if (err) return res.status(500).send(err);
       res.send(results);
   });
});

app.listen(PORT, () => {
   console.log(`🚀 Backend is LIVE at http://localhost:${PORT}`);
});