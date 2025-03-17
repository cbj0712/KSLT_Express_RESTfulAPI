const express = require('express');
const app = express();
const env = require('dotenv');
const fs = require('fs');
const http = require('http');
const https = require('https');
const cors = require('cors');

const privateKey = fs.readFileSync('./environments/privkey.pem', 'utf8');
const certificate = fs.readFileSync('./environments/cert.pem', 'utf8');
const ca = fs.readFileSync('./environments/chain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

env.config({path: './environments/config.env'});

const translator = require('./src/routes/translator.js');

app.use(cors());
app.use(express.json());
app.use('*', (req, res, next) => {
	if(!req.secure && process.env.NODE_ENV!='development') {
		return res.redirect('https://'+req.headers.host+req.path);
	}
	next();
});

app.use(express.static('client'));

app.use('/api', translator);

const path = require('path');

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'index.html'));
});

const http_port = process.env.HTTP_PORT || 80;
const https_port = process.env.HTTPS_PORT || 443;

http.createServer(app).listen(http_port, () => console.log('HTTP OK'));
https.createServer(credentials, app).listen(https_port, () => console.log('HTTPS OK'));