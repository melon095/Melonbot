CREATE TYPE bot.config_id AS ENUM (
    '1'
);

CREATE FUNCTION bot.on_update_current_timestamp_error_logs() RETURNS trigger
    LANGUAGE plpgsql
        AS $$
    BEGIN
        NEW.timestamp = now();
        RETURN NEW;
    END;
    $$;

CREATE TABLE bot.banphrases (
    channel character varying(255) NOT NULL,
    phrase text NOT NULL
);

CREATE TABLE bot.channels (
    name character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    live boolean DEFAULT false NOT NULL,
    bot_permission bigint DEFAULT '1'::bigint NOT NULL,
    viewers text,
    disabled_commands text NOT NULL,
    seventv_emote_set text
);

CREATE TABLE bot.commands (
    id bigint NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    perm bigint NOT NULL
);
COMMENT ON TABLE bot.commands IS 'Essentially all commands';

CREATE SEQUENCE bot.commands_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE bot.commands_id_seq OWNED BY bot.commands.id;

CREATE TABLE bot.config (
    id bot.config_id NOT NULL,
    twitchclientid character varying(45) NOT NULL,
    twitchclientsecret character varying(45) NOT NULL,
    twitchoauth character varying(45) NOT NULL,
    twitchapptoken character varying(45) NOT NULL,
    weburl character varying(45) DEFAULT 'http://localhost:3000'::character varying NOT NULL,
    botusername character varying(45) DEFAULT 'foobar'::character varying NOT NULL,
    owneruserid character varying(11) DEFAULT '0'::character varying NOT NULL,
    botuserid character varying(11) NOT NULL,
    twitchapptokenexpiredate date
);

CREATE TABLE bot.error_logs (
    error_id bigint NOT NULL,
    error_message text NOT NULL,
    "timestamp" timestamp with time zone
);

CREATE SEQUENCE bot.error_logs_error_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE bot.error_logs_error_id_seq OWNED BY bot.error_logs.error_id;

CREATE TABLE bot.stats (
    name character varying(255) NOT NULL,
    commands_handled bigint DEFAULT '0'::bigint NOT NULL
);

COMMENT ON TABLE bot.stats IS 'Statistics tied to a channel';
COMMENT ON COLUMN bot.stats.name IS 'The name of the channel';
COMMENT ON COLUMN bot.stats.commands_handled IS 'How many commands has been run by the bot in this channel';

CREATE TABLE bot.suggestions (
    suggestion_id bigint NOT NULL,
    suggestion text NOT NULL,
    request_username text NOT NULL
);

CREATE SEQUENCE bot.suggestions_suggestion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE bot.suggestions_suggestion_id_seq OWNED BY bot.suggestions.suggestion_id;

CREATE TABLE bot.tokens (
    id character varying(11) NOT NULL,
    access_token text,
    name character varying(255) DEFAULT NULL::character varying,
    refresh_token text,
    scope text,
    expires_in bigint NOT NULL
);

CREATE TABLE bot.trivia (
    channel character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    cooldown bigint NOT NULL,
    filter text NOT NULL,
    leaderboard text NOT NULL
);
COMMENT ON COLUMN bot.trivia.cooldown IS 'Formatted as Milliseconds';
COMMENT ON COLUMN bot.trivia.filter IS 'filter: {
    exclude: string[],
    include: string[]
}';

ALTER TABLE ONLY bot.commands ALTER COLUMN id SET DEFAULT nextval('bot.commands_id_seq'::regclass);

ALTER TABLE ONLY bot.error_logs ALTER COLUMN error_id SET DEFAULT nextval('bot.error_logs_error_id_seq'::regclass);

ALTER TABLE ONLY bot.suggestions ALTER COLUMN suggestion_id SET DEFAULT nextval('bot.suggestions_suggestion_id_seq'::regclass);

ALTER TABLE ONLY bot.banphrases
    ADD CONSTRAINT idx_1745889_primary PRIMARY KEY (channel);

ALTER TABLE ONLY bot.channels
    ADD CONSTRAINT idx_1745895_primary PRIMARY KEY (name);

ALTER TABLE ONLY bot.commands
    ADD CONSTRAINT idx_1745905_primary PRIMARY KEY (id);

ALTER TABLE ONLY bot.config
    ADD CONSTRAINT idx_1745912_primary PRIMARY KEY (id);

ALTER TABLE ONLY bot.error_logs
    ADD CONSTRAINT idx_1745920_primary PRIMARY KEY (error_id);

ALTER TABLE ONLY bot.suggestions
    ADD CONSTRAINT idx_1745936_primary PRIMARY KEY (suggestion_id);

ALTER TABLE ONLY bot.tokens
    ADD CONSTRAINT idx_1745943_primary PRIMARY KEY (id);

ALTER TABLE ONLY bot.trivia
    ADD CONSTRAINT idx_1745950_primary PRIMARY KEY (user_id);

CREATE INDEX idx_1745889_fk_banphrases_channels_idx ON bot.banphrases USING btree (channel);

CREATE UNIQUE INDEX idx_1745895_name_unique ON bot.channels USING btree (name);

CREATE UNIQUE INDEX idx_1745895_user_id_unique ON bot.channels USING btree (user_id);

CREATE UNIQUE INDEX idx_1745930_channel_unique ON bot.stats USING btree (name);

CREATE UNIQUE INDEX idx_1745930_fk_stats_channels_idx ON bot.stats USING btree (name);

CREATE INDEX idx_1745943_fk_tokens_channels1_idx ON bot.tokens USING btree (name);

CREATE UNIQUE INDEX idx_1745943_id ON bot.tokens USING btree (id);

CREATE INDEX idx_1745950_fk_trivia_channels1_idx ON bot.trivia USING btree (user_id);

CREATE TRIGGER on_update_current_timestamp BEFORE UPDATE ON bot.error_logs FOR EACH ROW EXECUTE FUNCTION bot.on_update_current_timestamp_error_logs();

ALTER TABLE ONLY bot.trivia
    ADD CONSTRAINT const_foreign_trivia FOREIGN KEY (user_id) REFERENCES bot.channels(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY bot.tokens
    ADD CONSTRAINT fk_tokens_channels1 FOREIGN KEY (name) REFERENCES bot.channels(name) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY bot.tokens
    ADD CONSTRAINT fk_tokens_channels2 FOREIGN KEY (id) REFERENCES bot.channels(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

