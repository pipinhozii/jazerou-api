SELECT 'Screenshots' category, count(0) `count` FROM igdb.screenshots AS s
UNION ALL
SELECT 'Covers' category, count(0) `count` FROM igdb.covers c
UNION ALL
SELECT 'Franchises' category, count(0) `count` FROM igdb.franchises f 
UNION ALL
SELECT 'Games' category, count(0) `count` FROM igdb.games g 
UNION ALL
SELECT 'Platforms' category, count(0) `count` FROM igdb.platforms p
UNION ALL
SELECT 'Genres' category, count(0) `count` FROM igdb.genres g 