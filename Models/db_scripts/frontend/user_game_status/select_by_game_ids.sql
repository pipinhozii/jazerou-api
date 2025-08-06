SELECT * FROM `ja-zerou`.user_game_status ugs
WHERE ugs.user_id = :user_id AND ugs.game_id IN(:game_ids)