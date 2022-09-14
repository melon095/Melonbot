-- Lucky i caught that..
-- Would result in an error if someone were to change their name

alter table users
    drop constraint users_twitch_uid_key CASCADE;

