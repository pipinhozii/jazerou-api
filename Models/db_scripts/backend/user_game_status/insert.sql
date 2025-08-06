INSERT INTO `ja-zerou`.user_game_status
(
    user_id,
    game_id,
    platform_id,
    `status`,
    playing,
    backlog,
    wishlist,
    `like`,
    rating
)
VALUES(:user_id, :game_id, :platform_id, :status, :playing, :backlog, :wishlist, :like, :rating)
    ON DUPLICATE KEY UPDATE
        `status` = VALUES(`status`),
        playing = VALUES(playing),
        backlog = VALUES(backlog),
        wishlist = VALUES(wishlist),
        `like` = VALUES(`like`),
        rating = VALUES(rating)
; 