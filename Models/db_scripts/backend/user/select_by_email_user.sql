SELECT
	(SELECT count(0) FROM `ja-zerou`.`user` where email = ":email") exist_email,
	(SELECT count(0) FROM `ja-zerou`.`user` where username = ":username") exist_user