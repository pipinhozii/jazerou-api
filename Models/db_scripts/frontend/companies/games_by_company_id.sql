WITH
	companie_games AS (
		SELECT id, jt.*
		FROM igdb.companies,
			JSON_TABLE(developed, "$[*]" COLUMNS (game_id BIGINT PATH "$")) as jt
	)
	select
		g.id, g.name, g.slug, c.image_id cover_id
	FROM companie_games cg
	INNER JOIN igdb.games g ON g.id = cg.game_id
	LEFT JOIN igdb.covers c ON c.game = g.id
	WHERE cg.id = :company_id
	ORDER BY g.id DESC
	LIMIT 100