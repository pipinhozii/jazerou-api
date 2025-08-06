INSERT INTO `ja-zerou`.user_game_status
(
    user_id,
    game_id,
    `status`
)
VALUES(:user_id, :game_id, :status)
    ON DUPLICATE KEY UPDATE
        `status` = VALUES(`status`)
; 