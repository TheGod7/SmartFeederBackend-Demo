# Smart Feeder Backend

Base de API NestJS para un sistema de alimentación inteligente. La aplicación
expone JSON bajo el prefijo `/api/v1` y usa Prisma con SQLite local.

## Desarrollo

```bash
pnpm install
Copy-Item .env.example .env
pnpm run prisma:migrate -- --name init
pnpm run start:dev
```

## Base de datos

La opción elegida es SQLite porque permite trabajar localmente sin instalar un
servidor y Prisma mantiene una ruta sencilla hacia PostgreSQL en producción.
La base se crea en `prisma/dev.db` al ejecutar la migración inicial. Para
entornos desplegados usa `pnpm exec prisma migrate deploy`.

El esquema incluye usuarios demo, mascotas, comederos, horarios, eventos de
alimentación, estados, alertas, alimentos, comandos, telemetría y cámara.

## Modo demo sin autenticación

La autenticación queda fuera del arranque actual para acelerar la integración
con el frontend. Todos los recursos usan un usuario demo interno y los
endpoints no requieren headers ni tokens. El código de JWT se conserva aislado
en `src/auth/` para activarlo más adelante sin rediseñar los modelos.

## Documentación de integración

- [Guía para programar el ESP32](./docs/README-ESP32.md)
- [Referencia completa de la API](./docs/README-API.md)

## Endpoints implementados

### Mascotas

```text
GET    /api/v1/pets
POST   /api/v1/pets
GET    /api/v1/pets/:petId
PATCH  /api/v1/pets/:petId
DELETE /api/v1/pets/:petId
```

### Comederos y dashboard

```text
GET  /api/v1/feeders
POST /api/v1/feeders
GET  /api/v1/feeders/:feederId
GET  /api/v1/feeders/:feederId/dashboard
GET  /api/v1/feeders/:feederId/status
POST /api/v1/feeders/:feederId/actions/dispense
```

### Horarios

```text
GET    /api/v1/feeders/:feederId/schedules
POST   /api/v1/feeders/:feederId/schedules
PATCH  /api/v1/schedules/:scheduleId
DELETE /api/v1/schedules/:scheduleId
```

### Historial y consumo

```text
GET   /api/v1/feeders/:feederId/feeding-events
POST  /api/v1/feeders/:feederId/feeding-events
GET   /api/v1/feeders/:feederId/feeding-events/:eventId
PATCH /api/v1/feeders/:feederId/feeding-events/:eventId
GET   /api/v1/feeders/:feederId/consumption/summary
```

### Alertas

```text
GET   /api/v1/feeders/:feederId/alerts
POST  /api/v1/feeders/:feederId/alerts
GET   /api/v1/feeders/:feederId/alerts/unread-count
PATCH /api/v1/feeders/:feederId/alerts/read-all
PATCH /api/v1/alerts/:alertId/read
```

### Alimentos

```text
GET   /api/v1/foods
GET   /api/v1/foods?species=cat
GET   /api/v1/foods?species=dog
POST  /api/v1/foods
GET   /api/v1/foods/:foodId
GET   /api/v1/feeders/:feederId/food
PATCH /api/v1/feeders/:feederId/food
```

El backend carga un catálogo inicial con productos concretos de Purina, Royal
Canin, NUPEC, PEDIGREE y Hill's, incluyendo proteína, grasa, fibra, humedad,
etapa de vida, tipo de alimento, fuente nutricional e imagen representativa.
La energía se guarda solo cuando está publicada para la fórmula concreta;
cuando no hay un dato verificable se devuelve `null`, no `0`.

La base inicial no contiene mascotas, comederos ni lecturas de prueba. Hasta
que el ESP32 envíe su primera telemetría, las cantidades de plato y depósito
se devuelven como `null` para representar “sin lectura”.

### Dispositivo

```text
POST  /api/v1/device/:feederId/telemetry
GET   /api/v1/device/:feederId/commands/pending
PATCH /api/v1/device/commands/:commandId
```

### Cámara

```text
GET   /api/v1/feeders/:feederId/camera
PATCH /api/v1/feeders/:feederId/camera
```

Las respuestas siguen `{ data }`; las listas incluyen `{ data, meta }`.
Los gramos son enteros y las fechas deben enviarse como ISO 8601 UTC.

## Próximas capas

La estructura está preparada para añadir módulos independientes de
`feeding-events`, `alerts`, `foods`, `camera`, `devices` y `realtime`.
Para producción, cambia `provider = "sqlite"` por PostgreSQL y configura
secretos JWT largos y aleatorios; los secretos de desarrollo del fallback no
deben usarse en producción.

```bash
pnpm run build
pnpm run test
pnpm run test:e2e
```
