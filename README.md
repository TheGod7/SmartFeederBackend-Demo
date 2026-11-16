# Smart Feeder Backend

NestJS API base for a smart feeding system. The application
exposes JSON under the prefix `/api/v1` and uses Prisma with local SQLite.

## Development

```bash
pnpm install
Copy-Item .env.example .env
pnpm run prisma:migrate -- --name init
pnpm run start:dev
```

## Database

SQLite was chosen because it allows local work without installing a
server, while Prisma provides a straightforward path to PostgreSQL in production.
The database is created in `prisma/dev.db` when the initial migration runs. For
deployed environments, use `pnpm exec prisma migrate deploy`.

The schema includes demo users, pets, feeders, schedules, feeding events,
statuses, alerts, food, commands, telemetry, and camera.

## Demo mode without authentication

Authentication is left out of the current startup to speed up integration
with the frontend. All resources use an internal demo user and the
endpoints require no headers or tokens. The JWT code remains isolated
in `src/auth/` so it can be enabled later without redesigning the models.

## Integration documentation

- [ESP32 programming guide](./docs/README-ESP32.md)
- [Complete API reference](./docs/README-API.md)

## Implemented endpoints

### Pets

```text
GET    /api/v1/pets
POST   /api/v1/pets
GET    /api/v1/pets/:petId
PATCH  /api/v1/pets/:petId
DELETE /api/v1/pets/:petId
```

### Feeders and dashboard

```text
GET  /api/v1/feeders
POST /api/v1/feeders
GET  /api/v1/feeders/:feederId
GET  /api/v1/feeders/:feederId/dashboard
GET  /api/v1/feeders/:feederId/status
POST /api/v1/feeders/:feederId/actions/dispense
```

### Schedules

```text
GET    /api/v1/feeders/:feederId/schedules
POST   /api/v1/feeders/:feederId/schedules
PATCH  /api/v1/schedules/:scheduleId
DELETE /api/v1/schedules/:scheduleId
```

### History and consumption

```text
GET   /api/v1/feeders/:feederId/feeding-events
POST  /api/v1/feeders/:feederId/feeding-events
GET   /api/v1/feeders/:feederId/feeding-events/:eventId
PATCH /api/v1/feeders/:feederId/feeding-events/:eventId
GET   /api/v1/feeders/:feederId/consumption/summary
```

### Alerts

```text
GET   /api/v1/feeders/:feederId/alerts
POST  /api/v1/feeders/:feederId/alerts
GET   /api/v1/feeders/:feederId/alerts/unread-count
PATCH /api/v1/feeders/:feederId/alerts/read-all
PATCH /api/v1/alerts/:alertId/read
```

### Food

```text
GET   /api/v1/foods
GET   /api/v1/foods?species=cat
GET   /api/v1/foods?species=dog
POST  /api/v1/foods
GET   /api/v1/foods/:foodId
GET   /api/v1/feeders/:feederId/food
PATCH /api/v1/feeders/:feederId/food
```

The backend loads an initial catalog with specific products from Purina, Royal
Canin, NUPEC, PEDIGREE and Hill's, including protein, fat, fiber, moisture,
life stage, food type, nutrition source, and representative image.
Energy is stored only when it is published for the specific formula;
when not verifiable value exists, it returns `null`, not `0`.

The initial database contains no pets, feeders, or test readings. Until
the ESP32 sends its first telemetry, plate and hopper quantities
are returned as `null` to represent "no reading".

### Device

```text
POST  /api/v1/device/:feederId/telemetry
GET   /api/v1/device/:feederId/commands/pending
PATCH /api/v1/device/commands/:commandId
```

### Camera

```text
GET   /api/v1/feeders/:feederId/camera
PATCH /api/v1/feeders/:feederId/camera
```

Responses follow `{ data }`; lists include `{ data, meta }`.
Grams are integers and dates must be sent as ISO 8601 UTC.

## Next layers

The structure is ready to add independent modules for
`feeding-events`, `alerts`, `foods`, `camera`, `devices`, and `realtime`.
For production, change `provider = "sqlite"` to PostgreSQL and configure
long, random JWT secrets; fallback development secrets must not be used
in production.

```bash
pnpm run build
pnpm run test
pnpm run test:e2e
```
