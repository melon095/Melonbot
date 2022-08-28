-- Removing everything that is BigInt and should be numbers

alter table bot.commands
    alter column perm type int using perm::int;

alter table bot.stats
    alter column commands_handled type int using commands_handled::int;

alter table bot.suggestions
    alter column suggestion_id type int using suggestion_id::int;

alter table bot.trivia
    alter column cooldown type int using cooldown::int;

