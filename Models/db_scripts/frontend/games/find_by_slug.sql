SELECT game.*, cover.image_id cover_id, GROUP_CONCAT(screenshot.url) screenshots
FROM igdb.games game
LEFT JOIN igdb.covers cover
ON cover.game = game.id
LEFT JOIN igdb.screenshots screenshot
ON screenshot.game = game.id
WHERE game.slug = ?
GROUP BY game.id