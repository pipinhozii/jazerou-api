SELECT
        game.*
    ,   cover.image_id cover_id, GROUP_CONCAT(screenshot.url) screenshots
    ,   ugs.platform_id, ugs.`status`, ugs.playing, ugs.backlog, ugs.wishlist, ugs.`like`, ugs.rating
    ,   ugs.status_color, ugs.status_name, ugs.status_alias
FROM igdb.games game
LEFT JOIN igdb.covers cover
ON cover.game = game.id
LEFT JOIN igdb.screenshots screenshot
ON screenshot.game = game.id
LEFT JOIN (
    SELECT
            ugs.*
        ,   bs.color status_color, bs.name status_name, bs.alias status_alias
    FROM `ja-zerou`.user_game_status ugs
    LEFT JOIN `ja-zerou`.backlog_status bs
    ON ugs.status = bs.id
    WHERE user_id = :user_id
) ugs
ON game.id = ugs.game_id
WHERE game.slug = ?
GROUP BY game.id