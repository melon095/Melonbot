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

Bot also has a eventsub broker [here](./../Golang//EventSub/go.mod)
Build with `make build` and can be ran with `make run` or by using the [docker-compose.yml](../docker-compose.yml) file

### Generate EventSub secret

```bash
node Scripts/Secret.EventSubKey.mjs
```
