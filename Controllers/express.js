// const functions = require('firebase-functions');

// const logger = require("firebase-functions/logger");

require('dotenv').config();;
// const serverless = require('serverless-http');
const express = require('express');

// Express
const
	app = express()
,	port = process.env.port || 5001
,   path = require('path')
,	routes_dir = path.join(require.main.path, "Controllers/routes")
;

var bodyParser = require('body-parser')
const
	sessions = require('./middlewares/session')
,	i18next_mdw = require('./middlewares/i18next')
,   i18next = require('i18next')
,   middleware = require('i18next-http-middleware')
,   LocalStorageBackend = require('i18next-localstorage-backend')
,   Backend = require('i18next-fs-backend')
,	cors = require('cors')
;

i18next
	.use(LocalStorageBackend)
	.use(Backend)
	.use(middleware.LanguageDetector)
	.init({
		// debug: true,
		saveMissing: true,
		lng: 'pt-BR', // idioma padrão
		preload: ['dev', 'en', 'pt-BR', 'jp'],
		ns: ['common', 'login'],
		defaultNS: 'common',
		backend: {
			loadPath: path.join(require.main.path, 'Models', 'locales', '{{lng}}', '{{ns}}.json')
		}
	})

app
	.use(cors())
	.use(bodyParser.json())
	.use(express.json())
	.use(express.urlencoded({ extended: true }))
	.use(middleware.handle(i18next, { ignoreRoutes: ['/foo'], removeLngFromUrl: true }))
	.use(sessions)
	.use(i18next_mdw)
	.enable("trust proxy")
;

const routes = require('fs').readdirSync(routes_dir);
for(const route of routes) {
	app.use(require(`${routes_dir}/${route}`).router)
};

app.listen(port, async () => {
	try {
		console.log(`Listening on port ${port}`);
	} catch (error) {
		console.error("Erro ao conectar-se no banco de dados ao iniciar o servidor: " + error.message)
	}
})