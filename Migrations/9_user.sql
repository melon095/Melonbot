-- Log users

create type user_role as enum
(
    'user',
    'moderator',
    'admin'
);

create table users
(
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    twitch_uid  VARCHAR(25) NOT NULL,
    first_seen  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role        user_role
);
