Generate typescript definitions of a postgres database.

Types are only required to be built on a developer machine, which then will move it to [types](./../src/../../src/Typings/types.d.ts)

### Required Dotenv variables

```bash
$ cat .env
DATABASE_URL=postgresql://username:password@ip:5432/melonbot
```
