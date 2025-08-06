WITH
	collection_table AS (
		SELECT f.id, jt.* FROM
			collections f,
			JSON_TABLE(f.games, "$[*]" COLUMNS (game_id INT PATH "$") ) AS jt
	)
	, collection_games AS (
		SELECT ft.id collection_id, g.*
		FROM games gf
		LEFT JOIN collection_table ft ON ft.id = gf.collections -> "$[0]"
		LEFT JOIN games g ON g.id = ft.game_id
		WHERE gf.id = :game_id AND g.id <> :game_id
	)
SELECT fg.id game_id, fg.name game_name, fg.slug game_slug, c.image_id cover_id, fg.collection_id, f.name collection_name, f.slug collection_slug, f.url collection_url
FROM games g
LEFT JOIN collection_games fg ON fg.collection_id = g.collections -> "$[0]"
LEFT JOIN collections f ON f.id = g.collections -> "$[0]"
LEFT JOIN covers c ON c.game = fg.id
WHERE g.id = :game_id
LIMIT 10