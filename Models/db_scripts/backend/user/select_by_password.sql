SELECT *
FROM `ja-zerou`.`user` u
WHERE (u.email = ":email" OR u.username = ":username") AND u.`password` = ":password"