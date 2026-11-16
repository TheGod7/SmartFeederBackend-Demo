# API technical reference

Integration document for the frontend, backend, and firmware. It describes what
the current code actually exposes.

## 1. General information

Base URL:

```text
http://HOST:3000/api/v1
```

Example:

```text
http://192.168.1.50:3000/api/v1
```

Methods used:

```text
GET, POST, PATCH, DELETE
```

Content-Type for request bodies:

```http
Content-Type: application/json
```

`Authorization` is not required in the current mode. The JWT module exists in
`src/auth`, but it is not imported by `AppModule`.

## 2. Response format

### Objeto

```json
{
  "data": {}
}
```

### Lista

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "hasNextPage": false
  }
}
```

### Errors

NestJS returns the standard HTTP error:

```json
{
  "statusCode": 400,
  "message": "Código de prueba inválido",
  "error": "Bad Request"
}
```

Common errors are:

```text
400  Validación o regla de negocio.
404  Recurso no encontrado.
500  Error no controlado del servidor.
```

## 3. Shared types

### Feeder

```ts
type Feeder = {
  id: string;
  userId: string;
  name: string;
  deviceCode: string;
  petId: string | null;
  timezone: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt: string;
};
```

### Schedule

```ts
type Schedule = {
  id: string;
  feederId: string;
  time: string;          // HH:mm
  grams: number;         // 1..1000
  enabled: boolean;
  daysOfWeek: number[];  // 0 domingo, 1 lunes, ..., 6 sábado
  timezone: string;
  createdAt: string;
  updatedAt: string;
};
```

### FeedingEvent

```ts
type FeedingEvent = {
  id: string;
  feederId: string;
  scheduleId: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  dispensedAt: string | null;
  completedAt: string | null;
  dispensedGrams: number | null;
  consumedGrams: number | null;
  remainingGrams: number | null;
  status: string;
  failureReason: string | null;
  createdAt: string;
};
```

### DeviceCommand

```ts
type DeviceCommand = {
  id: string;
  feederId: string;
  feedingEventId: string | null;
  executionKey: string | null;
  type: string;
  payload: string | null;
  status: string;
  requestedGrams: number | null;
  failureReason: string | null;
  createdAt: string;
  sentAt: string | null;
  processingAt: string | null;
  completedAt: string | null;
};
```

### DeviceTelemetry

```ts
type DeviceTelemetry = {
  id: string;
  feederId: string;
  reportedAt: string;
  plateFoodGrams: number | null;
  hopperFoodPercent: number | null;
  motorStatus: string | null;
  sensorStatus: string | null;
  wifiSignal: number | null;
  firmwareVersion: string | null;
  createdAt: string;
};

type FeederStatus = {
  id?: string;
  feederId: string;
  plateFoodGrams: number | null;
  hopperFoodPercent: number | null;
  lastDispensedGrams: number | null;
  lastDispensedAt: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  firmwareVersion?: string | null;
  motorStatus: string;
  sensorStatus: string;
  createdAt?: string;
};
```

## 4. Pets

### `GET /pets`

Returns the demo user's pets.

### `POST /pets`

Request:

```json
{
  "name": "Milo",
  "species": "cat",
  "breed": "Gato doméstico",
  "weightGrams": 4200,
  "birthDate": "2021-05-10",
  "avatarUrl": null
}
```

Validation:

```text
name: texto.
species: cat | dog | other.
weightGrams: entero mayor que 0.
```

### `GET /pets/:petId`

### `PATCH /pets/:petId`

Accepts the editable fields from creation.

### `DELETE /pets/:petId`

Deletes the pet if it belongs to the demo user.

## 5. Feeders

### `GET /feeders`

Returns all feeders belonging to the demo user.

### `POST /feeders`

Request:

```json
{
  "name": "Comedero Milo",
  "deviceCode": "SF-ESP32-MILO-001",
  "petId": "pet-uuid",
  "timezone": "America/Mexico_City"
}
```

`deviceCode` is unique in the database.

This endpoint registers the feeder before the ESP32 connects. The firmware does
not call it. For the demo feeder, the hopper's maximum capacity is 5000 grams;
that setting does not represent loaded food. The record is created without a
pet, selected food, schedules, or readings.

### `GET /feeders/:feederId`

### `GET /feeders/:feederId/status`

Returns the latest `FeederStatus`. `lastDispensedGrams` and `lastDispensedAt`
are populated from the latest feeding event with dispensed grams. If no
telemetry exists yet, it returns these initial values:

```json
{
  "data": {
    "feederId": "feeder-uuid",
    "plateFoodGrams": null,
    "hopperFoodPercent": null,
    "lastDispensedGrams": null,
    "lastDispensedAt": null,
    "isOnline": false,
    "lastSeenAt": null,
    "motorStatus": "ready",
    "sensorStatus": "not_calibrated"
  }
}
```

### `GET /feeders/:feederId/dashboard`

Returns:

```text
feeder
status
schedules
alerts
selectedFood
recentConsumption
```

Currently, `alerts`, `selectedFood`, and `recentConsumption` are empty or `null`
placeholders; their specialized endpoints are implemented.

When no ESP32 telemetry exists, plate, hopper, and capacity amounts are `null`,
unless the backend has configured the maximum capacity. `plateFoodGrams`
remains in grams and `hopperFoodPercent` is reported from `0` to `100` using
the infrared sensor. Both remain `null` until a valid reading is received.
`0` in `hopperFoodPercent` means the container was measured as empty, not "no
reading." The percentage comes from the infrared sensor integrated into the hopper.

### `POST /feeders/:feederId/actions/dispense`

Request:

```json
{
  "grams": 25
}
```

`grams` must be an integer between 1 and 1000. The backend stores a `dispense`
command with `queued` status.

## 6. Schedules

### `GET /feeders/:feederId/schedules`

### `POST /feeders/:feederId/schedules`

Request:

```json
{
  "time": "08:00",
  "grams": 25,
  "enabled": true,
  "daysOfWeek": [0, 1, 2, 3, 4, 5, 6],
  "timezone": "America/Mexico_City"
}
```

The `time` format must be `HH:mm`. Two active schedules at the same time are
not allowed for the same feeder.

### `GET /schedules/:scheduleId`

### `PATCH /schedules/:scheduleId`

Accepts any subset of:

```json
{
  "time": "14:30",
  "grams": 30,
  "enabled": false,
  "daysOfWeek": [1, 3, 5],
  "timezone": "America/Mexico_City"
}
```

### `DELETE /schedules/:scheduleId`

### Automatic execution

The backend checks active schedules every 15 seconds. When the local time
matches `time` and the day is included in `daysOfWeek`, it creates the following
in a transaction:

```text
FeedingEvent: scheduled
DeviceCommand: queued
```

The command is associated with the event through `feedingEventId`. The
`scheduleId:local-dateThour` key prevents duplicate execution if the cycle
repeats or the application restarts within the same minute. The scheduler uses
the schedule's `timezone`, or the feeder's timezone if none is set.

NestJS does not run the motor. The ESP32 retrieves the `DeviceCommand` by polling.

## 7. Device handshake

These four endpoints are used directly by the ESP32. The feeder record and
capacity configuration are created beforehand by the frontend or backend.

### `POST /device/connect`

Request:

```json
{
  "deviceCode": "SF-ESP32-MILO-001",
  "testCode": "SMART-FEEDER-TEST"
}
```

Response:

```json
{
  "data": {
    "connected": true,
    "feederId": "feeder-uuid",
    "deviceCode": "SF-ESP32-MILO-001",
    "serverTime": "2026-11-02T20:00:00.000Z"
  }
}
```

Rules:

```text
deviceCode inexistente -> 404
testCode incorrecto     -> 400
datos válidos           -> 200
```

The expected test code is configured with `DEVICE_TEST_CODE`; if it is not set,
`SMART-FEEDER-TEST` is used.

## 8. Device telemetry

### `POST /device/:feederId/telemetry`

Request:

```json
{
  "reportedAt": "2026-11-02T20:01:00.000Z",
  "plateFoodGrams": 18,
  "hopperFoodPercent": 84,
  "motorStatus": "ready",
  "sensorStatus": "ready",
  "wifiSignal": -58,
  "firmwareVersion": "0.1.0"
}
```

The DTO validates `reportedAt` as an ISO date, non-negative grams, and RSSI
between `-120` and `0`.

`plateFoodGrams` and `hopperFoodPercent` are optional real readings.
`plateFoodGrams` is expressed in grams; `hopperFoodPercent` is expressed as an
integer from `0` to `100`. The ESP32 may omit them if the sensor is
unavailable. It must not send `0` to represent an unknown reading.

The write produces two records:

```text
DeviceTelemetry: historial de lecturas.
FeederStatus: snapshot usado por el dashboard.
```

### `POST /device/:feederId/telemetry-request`

Queues an immediate telemetry request for the ESP32 to process during its next
command poll. It is used when opening the frontend without changing the normal
telemetry frequency.

## 9. Device commands

### `GET /device/:feederId/commands/pending`

Returns commands with these statuses:

```text
queued | sent | processing
```

### `PATCH /device/commands/:commandId`

Request:

```json
{
  "status": "completed",
  "failureReason": "optional when it fails"
}
```

If `status` is `sent`, `sentAt` is stored. If it is `completed`, `failed`, or
`expired`, `completedAt` is stored.

The ESP32 should call this endpoint at most three times during dispensing:
`sent` when receiving the command, `processing` when activating the motor, and
`completed` or `failed` when finished. If it disconnects before confirming, it
must query pending commands again before starting another dispensing operation.

### Command states

```text
queued      Created and waiting for the ESP32.
sent        The ESP32 received it.
processing  The motor is running.
completed   Finished successfully or delivered a partial portion.
failed      The ESP32 reported a hardware error.
expired     The backend timeout was reached.
```

Default timeouts:

```text
queued      2 minutes without being picked up -> expired
sent        1 minute without starting -> expired
processing  5 minutes without finishing -> failed
```

These can be changed with environment variables in milliseconds:

```env
COMMAND_QUEUED_TIMEOUT_MS=120000
COMMAND_SENT_TIMEOUT_MS=60000
COMMAND_PROCESSING_TIMEOUT_MS=300000
DEVICE_OFFLINE_TIMEOUT_MS=300000
```

### `POST /device/:feederId/dispense-result`

This is the recommended flow for reporting the complete dispensing result. It
is atomic and idempotent.

Request exitoso:

```json
{
  "commandId": "command-uuid",
  "feedingEventId": "event-uuid",
  "status": "completed",
  "startedAt": "2026-11-03T14:00:00.000Z",
  "dispensedAt": "2026-11-03T14:00:08.000Z",
  "completedAt": "2026-11-03T14:00:08.000Z",
  "dispensedGrams": 25
}
```

Request with a physical error:

```json
{
  "commandId": "command-uuid",
  "feedingEventId": "event-uuid",
  "status": "failed",
  "startedAt": "2026-11-03T14:00:00.000Z",
  "completedAt": "2026-11-03T14:00:03.000Z",
  "failureReason": "Motor bloqueado",
  "hardwareErrorCode": "MOTOR_BLOCKED",
  "dispensedGrams": 4
}
```

`status` values:

```text
completed  Completó la ración.
partial    Entregó menos gramos de los solicitados.
failed     Falló el motor, sensor u otro componente.
skipped    No se ejecutó la ración.
```

The endpoint verifies that the command belongs to the feeder, updates the
command, updates or creates the event, stores grams and timestamps, takes a
`FeederStatus` snapshot, and creates an alert for `failed`, `partial`, or
`skipped`. Repeating exactly the same result returns the existing record and
does not create a second dispensing operation.

Common errors:

```text
400  status, fechas o gramos inválidos.
404  commandId inexistente o perteneciente a otro comedero.
```

## 10. Feeding events

### `GET /feeders/:feederId/feeding-events`

Optional filters:

```text
?from=2026-11-01T00:00:00.000Z
&to=2026-11-02T23:59:59.999Z
```

### `POST /feeders/:feederId/feeding-events`

Request:

```json
{
  "scheduleId": "schedule-uuid",
  "scheduledAt": "2026-11-02T20:00:00.000Z",
  "startedAt": "2026-11-02T20:00:01.000Z",
  "dispensedAt": "2026-11-02T20:00:08.000Z",
  "completedAt": "2026-11-02T20:00:08.000Z",
  "dispensedGrams": 25,
  "consumedGrams": 18,
  "remainingGrams": 7,
  "status": "partial",
  "failureReason": null
}
```

### `GET /feeders/:feederId/feeding-events/:eventId`

### `PATCH /feeders/:feederId/feeding-events/:eventId`

### `GET /feeders/:feederId/consumption/summary`

Returns aggregates by date:

```json
{
  "data": [
    {
      "date": "2026-11-02",
      "dispensedGrams": 75,
      "consumedGrams": 68,
      "feedingCount": 3,
      "completedCount": 2,
      "partialCount": 1,
      "skippedCount": 0
    }
  ]
}
```

## 11. Alerts

### `GET /feeders/:feederId/alerts`

Optional filter:

```text
?read=false
```

### `POST /feeders/:feederId/alerts`

Request:

```json
{
  "type": "hopper_low",
  "title": "Depósito bajo",
  "detail": "Quedan 100 g en el depósito.",
  "category": "hopper",
  "severity": "warning",
  "metadata": {
    "hopperFoodPercent": 30
  }
}
```

### `DELETE /feeders/:feederId/feeding-events/history`

Clears completed events, pet sessions, and commands to facilitate debugging
tests. It never deletes pending or currently running commands.

### `GET /feeders/:feederId/alerts/unread-count`

Response:

```json
{
  "data": {
    "count": 1
  }
}
```

### `PATCH /feeders/:feederId/alerts/read-all`

### `PATCH /alerts/:alertId/read`

## 12. Food

### `GET /foods`

Filtro opcional:

```text
GET /foods?species=cat
GET /foods?species=dog
```

### `POST /foods`

Request:

```json
{
  "brand": "Royal Canin",
  "name": "Indoor Adult",
  "description": "Dry food for adult cats",
  "species": "cat",
  "proteinPercent": 27,
  "fatPercent": 13,
  "fiberPercent": 4,
  "moisturePercent": 8,
  "energyKcalPerKg": 3750,
  "imageUrl": "https://example.com/food.png",
  "imageAlt": "Adult cat next to its food",
  "sourceUrl": "https://www.royalcanin.com/mx/...",
  "nutritionBasis": "as_fed"
}
```

The initial catalog loads automatically when the backend starts. It includes
specific formulas from Royal Canin, NUPEC, Hill's Science Diet, Purina Cat Chow,
Purina Dog Chow, and PEDIGREE. The values correspond to the specific package
listed, not to the entire brand.

`nutritionBasis` may be:

```text
as_fed       Porcentaje tal como se declara en el producto.
dry_matter   Porcentaje convertido o publicado sobre materia seca.
```

The initial products include `sourceUrl` for consulting the reference sheet.
`imageUrl` points to a generic representative image of a dog or cat; it is not
presented as an official package photograph. In a commercial application,
replace it with properly licensed images.

`energyKcalPerKg` is filled only when a published figure was found for that
formula and package. If the brand does not publish metabolizable energy in the
consulted sheet, the value is `null`; `0` is never used as a substitute for
unknown data. In the current catalog, published energy exists for Royal Canin
Indoor Adult, Hill's Adult Salmon, wet Purina Cat Chow, Royal Canin Medium
Adult, and Hill's Adult Chicken and Barley. NUPEC Felino Senior, Purina Dog
Chow, PEDIGREE Adulto, and NUPEC Adulto have no verifiable kcal/kg value in
the consulted source.

### `GET /foods/:foodId`

### `GET /feeders/:feederId/food`

Returns the selected food or `null`.

### `PATCH /feeders/:feederId/food`

Request:

```json
{
  "foodId": "food-uuid"
}
```

The feeder's previous selection is replaced.

## 13. Camera

### `GET /feeders/:feederId/camera`

Returns the saved configuration. If no configuration exists, returns `404`.

### `PATCH /feeders/:feederId/camera`

Request:

```json
{
  "available": true,
  "streamType": "hls",
  "streamUrl": "https://stream.example.com/feeders/milo.m3u8"
}
```

Common types:

```text
hls | webrtc | mjpeg
```

The API stores the URL; it does not relay video from NestJS.

## 14. Recommended integration order

### Frontend

```text
1. GET /feeders
2. GET /feeders/:id/dashboard
3. GET /feeders/:id/status
4. GET /feeders/:id/schedules
5. GET /feeders/:id/alerts
6. GET /feeders/:id/feeding-events
```

### ESP32

```text
1. The frontend creates the feeder with POST /feeders
2. POST /device/connect on startup or reconnection
3. POST /device/:feederId/telemetry immediately after connecting
4. GET /device/:feederId/commands/pending every 3 s
5. PATCH /device/commands/:commandId with sent, processing, and the result
6. POST /feeders/:feederId/feeding-events after dispensing completes
7. POST /device/:feederId/telemetry after dispensing
```

The ESP32 does not call `POST /feeders`, because that endpoint requires defining
the feeder record and its `deviceCode` before the device can connect. It also
does not manage food, pets, schedules, or the camera.

### Complete flow

```text
Frontend crea/edita horario
  -> Scheduler NestJS crea FeedingEvent scheduled + DeviceCommand queued
  -> ESP32 hace polling y confirma sent
  -> ESP32 activa motor y confirma processing
  -> ESP32 reporta dispense-result completed/partial/failed
  -> Backend actualiza comando, evento, estado y alertas
```

## 15. Known limitations

- The current mode does not authenticate users or devices.
- The demo user is created automatically.
- The `testCode` is shared.
- HTTPS is not required.
- A device is considered offline if no telemetry exists from the last
  5 minutes. The status is calculated when querying the dashboard or status
  endpoint; no background process is required.
- The dashboard still returns placeholders for alerts, food, and recent
  consumption.
- Automatic schedule execution still requires a scheduler; saving a schedule
  does not make NestJS issue a command by itself.
- Command polling is the ESP32's responsibility.
- The scheduler expires unconfirmed commands and marks the event as skipped or
  failed.
- The camera only stores metadata and a URL.
