alter table channels
    alter column viewers set default '[]';

alter table channels
    alter column disabled_commands set default '[]';

alter table channels
    alter column seventv_emote_set set default NULL;

