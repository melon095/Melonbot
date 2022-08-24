-- had no idea bigints are casted to strings. Easiest is to just set them to ints

alter table channels
    alter column bot_permission type int using bot_permission::int;

alter table channels
    alter column bot_permission set default 1::int;

