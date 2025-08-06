DELETE FROM user_follow uf
WHERE uf.follower_id = ? AND uf.following_id = ?