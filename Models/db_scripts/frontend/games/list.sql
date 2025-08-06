SELECT game.*, cover.image_id cover_id FROM igdb.games game
LEFT JOIN igdb.covers cover
ON cover.game = game.id
LIMIT ?