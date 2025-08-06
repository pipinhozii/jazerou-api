WITH user_status AS (
	SELECT * FROM `ja-zerou`.user_game_status
	WHERE user_id = :user_id
)
SELECT
		(SELECT count(0) FROM user_status WHERE status = 0) only_played
	,	(SELECT count(0) FROM user_status WHERE status IN(0,1,2,3,4)) played
	,	(SELECT count(0) FROM user_status WHERE status = 1) completed
	,	(SELECT count(0) FROM user_status WHERE status = 2) retired
	,	(SELECT count(0) FROM user_status WHERE status = 3) shelved
	,	(SELECT count(0) FROM user_status WHERE status = 4) abandoned
	,	(SELECT count(0) FROM user_status WHERE backlog = 1) backlog
	,	(SELECT count(0) FROM user_status WHERE wishlist = 1) wishlist
	,	(SELECT count(0) FROM user_status WHERE `like` = 1) liked
	,	(SELECT count(0) FROM user_status WHERE playing = 1) playing