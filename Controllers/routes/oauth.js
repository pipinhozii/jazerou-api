const
	router = require('express').Router()
,   db = require('../db')
,	{ getUserBySession } = require('../_session')
,	fs = require('fs')
,	jwt = require('jsonwebtoken')
;

router
	.post(/\/oauth\/token/, async(req,res) => {
		try {
			const
				clients = JSON.parse(fs.readFileSync("./Models/clients.json"))
			,	client_id = req.body.client_id
			,	client_secret = req.body.client_secret
			,	client = clients.find(({id, secret}) => id == client_id && secret == client_secret)
			;

			if(!client) {
				res.status(400).send({
					type: "error",
					message: "Invalid client id or client secret."
				})
				return;
			}

			// Get user id from session
			const user_id = await getUserBySession(req.body.code);

			switch (req.body.grant_type) {
				case "authorization_code":
					const
						token = jwt.sign({user_id}, client_secret, { expiresIn: '6h', noTimestamp: false })
					,	jwt_ = jwt.verify(token, client_secret)
					,	current_timestamp = Number.parseInt(new Date().getTime() / 1000)
					,	expires_in = jwt_.exp - current_timestamp
					;

					res.status(200).send({ user_id: jwt_.user_id, token, expires_in, token_type: "bearer" });
					break;
				// case "refresh_token":
				// 	break;
				default:
					res.status(400).send({
						type: "error",
						message: "grant_type not available."
					})
					break;
			}
		} catch (error) {
			res.status(500).send()
		}
	})
;

module.exports = { router }