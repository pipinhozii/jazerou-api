const
	router = require('express').Router()
,	db = require('../db')
;


router
	/*.get("/", async (req, res) => {
		const statistics = await db.run_model_script("igdb", "frontend/general/igdb_statistics.sql")
		res.render("home", {locale: req.locale, user: req.user_id, statistics});
	})
	.get("/about/terms-of-service", async (req, res) => {
		res.render('terms-of-service', { locale: req.locale, user: req.user_id });
	})
	.get("/about/privacy-policy", async (req, res) => {
		res.render('privacy-policy', { locale: req.locale, user: req.user_id });
	})
	.get("/game/:game_slug", async (req, res) => {
		const
			game = req.user_id
				?	await db.run_model_script("igdb", "frontend/games/find_by_slug_auth.sql", [req.params.game_slug], [[":user_id", req.user_id]]).then(rows => rows.length ? rows[0] : null)
				:	await db.run_model_script("igdb", "frontend/games/find_by_slug.sql", [req.params.game_slug]).then(rows => rows.length ? rows[0] : null)
		,	log_status = await db.run_model_script_cache("ja-zerou","frontend/backlog_status/select.sql")
		;

		game.screenshots = game.screenshots ? game.screenshots.split(",") : [];
		game.series = await db.run_model_script("igdb", "frontend/collections/find_by_game_id.sql", null, [[/:game_id/g, game.id]]).catch(error => {
			console.error(error);
			return [];
		})
		res.render('game', { locale: req.locale, user: req.user_id, game, log_status });
	})*/
	.get("/games", async (req, res) => {
		// TODO filters 
		// by year, month or day of release
		// by upcoming/released
		// by genre
		// by category
		// by platform
		// by rating
		const
			games = req.user_id
				?	await db.run_model_script("igdb", "frontend/games/list_auth.sql", [Number.parseInt(req.query.limit ?? 50)], [[":user_id",req.user_id]])
				:	await db.run_model_script("igdb", "frontend/games/list.sql", [Number.parseInt(req.query.limit ?? 50)])
		,	log_status = await db.run_model_script_cache("ja-zerou","frontend/backlog_status/select.sql")
		;
		res.status(200).send({ user: req.user_id, games, log_status });
	})
	.get("/company/:company_slug", async(req,res) => {
		const company = await db.run_model_script("igdb", "frontend/companies/find_by_slug.sql", undefined, [[":company_slug", req.params.company_slug]])
			.then(rows => rows.length ? rows[0] : null)
		const games = await db.run_model_script("igdb", "frontend/companies/games_by_company_id.sql", undefined, [[":company_id", company.id]])
		res.status(200).send({ user: req.user_id, company, games })
	})

function getMeta(path, id, logged) {
	const meta = JSON.parse(require('fs').readFileSync("./Models/pages_meta.json", "utf8"));
	return path ? meta.find(meta => meta.path == path && meta.logged == logged) : id ? meta.find(meta => meta.id == id) : undefined;
}

module.exports = { router }