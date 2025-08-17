const
	router = require('express').Router()
,   db = require('../db')
,   game_cache = new Map()
,   LIMIT_GAME_CACHE = Number.parseInt(process.env.LIMIT_GAME_CACHE || 0)
,   int_params = [ 'game_id', 'status_id', 'like_flag', 'playing_flag', 'wish_flag' ]
,	jwt = require('jsonwebtoken')
;

for(const param of int_params) {
	router.param(param, (req,res,next,id) => {
		req.params[param] = Number.parseInt(id)
		next();
	})
}

router
	.all(/\/log\/.*/, async(req, res, next) => {
		try {

		const
			authorization = req.headers['authorization']
		,	access_token = authorization.startsWith("Bearer") ? authorization.split(" ")[1] : undefined
		;

		let throw_error = (code = 400, message = "Invalid authorization") => { throw { code, message } }
		
			if(!access_token) {
				throw throw_error();
			} else {
				const secret = "bff556e6da8b1bde58e8e91f212cc1859f90d2fed88542ae8fbec0ed804aedc1";
				try {
					const jwt_result = jwt.verify(access_token, secret)
					if(jwt_result) {
						req.user_id = jwt_result.user_id;
						next()
					} else {
						throw_error()
					}
				} catch (error) {
					throw_error()
				}
			}
		} catch (error) {
			if(error.code) {
				res.status(error.code).send({type: "error", message: error.message})
			} else {
				res.status(500).send({});
			}
		}
	})

	.param('game_id', async(req, res, next, game_id) => {
		// TODO achar o jogo por id..
		try {
			const game = await (game_cache.get(game_id) ?? db.run_model_script("igdb","backend/igdb/select_game_by_id.sql", undefined, [[":game_id", game_id]])
				.then(rows => {
					const row = rows.length ? rows[0] : undefined;
					if(row) {
						game_cache.set(game_id, row);
						if(game_cache.size > LIMIT_GAME_CACHE) {
							game_cache.delete([...game_cache.keys()][0])
						}
					}
					return row;
				})
			);

			if(game) {
				req.game = game;
				next();
			} else {
				res.status(404).send("Game not found.");
			}
		} catch (error) {
			res.status(500).send("Error to get the game by game_id");
		}
	})

	.patch(/\/log\/status\/(?<game_id>[0-9]{1,10})\/(?<status_id>[0-9])/, (req,res) => {
		try {
			db.run_model_script("ja-zerou","backend/user_game_status/insert_status.sql",undefined,
				[
					[":user_id",req.user_id],
					[":game_id",req.params.game_id],
					[":status",req.params.status_id]
				]
			).then(result => {
				res.status(204).send()
			})
		} catch (error) {
			res.status(500).send()
		}
	})

	.delete(/\/log\/status\/(?<game_id>[0-9]{1,10})/, (req,res) => {
		try {
			db.run_model_script("ja-zerou","backend/user_game_status/insert_status.sql",undefined,
				[
					[":user_id",req.user_id],
					[":game_id",req.params.game_id],
					[":status",null]
				]
			).then(result => {
				res.status(204).send()
			})
		} catch (error) {
			res.status(500).send()
		}
	})
	.patch(/\/log\/like\/(?<game_id>[0-9]{1,10})\/(?<like_flag>[01])/, (req,res) => {
		try {
			db.run_model_script("ja-zerou","backend/user_game_status/insert.sql",undefined,
				[
					[":user_id",req.user_id],
					[":game_id",req.params.game_id],
					[":like",req.params.like_flag]
				]
			).then(result => {
				console.log(result);
				res.status(204).send()
			})
		} catch (error) {
			res.status(500).send()
		}
	})
	.patch(/\/log\/playing\/(?<game_id>[0-9]{1,10})\/(?<playing_flag>[01])/, (req,res) => {
		try {
			db.run_model_script("ja-zerou","backend/user_game_status/insert.sql",undefined,
				[
					[":user_id",req.user_id],
					[":game_id",req.params.game_id],
					[":playing",req.params.playing_flag]
				]
			).then(result => {
				console.log(result);
				res.status(204).send()
			})
		} catch (error) {
			res.status(500).send()
		}
	})
	.patch(/\/log\/wishlist\/(?<game_id>[0-9]{1,10})\/(?<wish_flag>[01])/, (req,res) => {
		try {
			db.run_model_script("ja-zerou","backend/user_game_status/insert.sql",undefined,
				[
					[":user_id",req.user_id],
					[":game_id",req.params.game_id],
					[":wishlist",req.params.wish_flag]
				]
			).then(result => {
				console.log(result);
				res.status(204).send()
			})
		} catch (error) {
			res.status(500).send()
		}
	})
	.post([/^\/log\/create\/(?<game_id>[0-9]{1,10})$/], (req,res) => {
		try {
			res.status(204).send();
		} catch (error) {
			res.status(500).send()
		}
	})
;

module.exports = { router }