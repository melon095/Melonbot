### Setting up locally.

Run `npm ci`

Copy `config.example.json` as `config.json` and fill in all the data.

Create a postgres database called melonbot.

```sql
CREATE SCHEMA IF NOT EXISTS bot;
CREATE SCHEMA IF NOT EXISTS web;
CREATE SCHEMA IF NOT EXISTS logs;

ALTER DATABASE melonbot RESET search_path;
ALTER DATABASE melonbot SET search_path TO 'bot';

CREATE EXTENSION "uuid-ossp" SCHEMA bot;
```

Run `npm run build`

Main bot can be started with `npm run start:bot`
Website can be started with `npm run start:web`

Using [PM2](https://pm2.keymetrics.io/) is recommended

### Eventsub broker

[Eventsub](./../Golang/cmd/EventSub/main.go) broker is a small web server that receives eventsub notifications from twitch and forwards them to the main bot.

### Firehose

[Firehose](./../Golang/cmd/Firehose/main.go) is a MITM TMI proxy.

Port can be changed in config.json -> Services -> Firehose -> Port
The `MELONBOT_FIREHOSE` environment variable is used if firehose is ran on a seperate machine (local development) otherwise it's defaulted to `127.0.0.1`

All docker programs should be ran with `docker compose`

### Generate EventSub secret

```bash
node Scripts/Secret.EventSubKey.mjs
```

### Generating a User Token for the bot.

Goto https://twitchtokengenerator.com/

Select all scopes

Use your Client-Secret and Client-ID to generate a token.

Open `redis-cli`

Set the access token to -> `Melonbot:UserToken:Access`

Set the refresh token to -> `Melonbot:UserToken:Refresh`

**Note**. If the bot account changes password or 2FA the token would have to be manually generated again.
