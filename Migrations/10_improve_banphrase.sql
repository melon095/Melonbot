CREATE TYPE banphrase_type AS enum ('pb1', 'regex');

DROP TABLE IF EXISTS banphrases;

CREATE TABLE banphrases (
    channel VARCHAR(255) NOT NULL PRIMARY KEY,
    type banphrase_type NOT NULL,
    pb1_url TEXT DEFAULT NULL,
    regex TEXT DEFAULT NULL,
    CONSTRAINT "FOREIGN_BANPHRASE_CHANNEL" FOREIGN KEY (channel) REFERENCES channels (user_id)
        ON UPDATE cascade ON DELETE CASCADE
);

COMMENT ON COLUMN banphrases.pb1_url IS 'Enabled if type = pb1';
COMMENT ON COLUMN banphrases.regex IS 'Enabled if type = regex';
