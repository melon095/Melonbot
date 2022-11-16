Run on database

```postgres
SET search_path TO bot;
CREATE EXTENSION "uuid-ossp" SCHEMA bot;
```

### OWNER USER ID EXAMPLE CURL

```bash
curl https://api.ivr.fi/twitch/resolve/YOUR_ACCOUNT_USERNAME -H "accept: application/json"
```

### Generate EventSub secret

```bash
node Scripts/Secret.EventSubKey.mjs
```
