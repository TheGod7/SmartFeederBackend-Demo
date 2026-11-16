# ESP32 manual

Practical guide for programming the ESP32 against Smart Feeder Backend in the
current demo mode. The ESP32 communicates over Wi-Fi using HTTP and JSON; it
does not use MQTT, WebSocket, JWT, or certificates.

## 1. What the ESP32 must do

The firmware must follow this cycle:

```text
Power on
  -> connect to Wi-Fi
  -> identifies itself with deviceCode + testCode
  -> store feederId
  -> send periodic telemetry
  -> poll for commands
  -> execute the command
  -> confirm its result
  -> send updated telemetry
```

The backend does not directly control the pins, motor, scale, or sensors. The
ESP32 is responsible for:

- Connecting to and reconnecting to Wi-Fi.
- Activating the motor.
- Stopping the motor when it reaches the desired grams.
- Reading or estimating grams on the plate and in the hopper.
- Reporting motor and sensor statuses.
- Executing commands only once.
- Reporting whether a command finished successfully.

## 1.1 Endpoints used by the ESP32

The ESP32 should communicate only with these endpoints:

```text
POST  /api/v1/device/connect
POST  /api/v1/device/:feederId/telemetry
GET   /api/v1/device/:feederId/commands/pending
PATCH /api/v1/device/commands/:commandId
POST  /api/v1/feeders/:feederId/feeding-events
```

Each endpoint is used at a different time:

| Endpoint | When it is used | Frequency |
|---|---|---|
| `POST /device/connect` | On startup and after reconnecting to Wi-Fi | Once per connection |
| `POST /device/:feederId/telemetry` | To report sensors and status | Every minute, after events, and for one-off requests |
| `GET /device/:feederId/commands/pending` | To receive pending dispensing commands | Every 1 minute |
| `PATCH /device/commands/:commandId` | When receiving, starting, and finishing a command | Per command |
| `POST /feeders/:feederId/feeding-events` | When dispensing finishes | Per dispensing operation |

The ESP32 must not create feeders, pets, food, schedules, or alerts.
Those resources are managed by the frontend or backend.

The backend automatically creates a command when a schedule matches. The ESP32
does not calculate or trigger schedules; it only retrieves and executes commands.

## 2. Data to configure in the firmware

```cpp
const char* WIFI_SSID = "MI_WIFI";
const char* WIFI_PASSWORD = "MI_PASSWORD";
const char* API_BASE = "http://192.168.1.50:3000/api/v1";
const char* DEVICE_CODE = "SF-ESP32-MILO-001";
const char* TEST_CODE = "SMART-FEEDER-TEST";
```

### `API_BASE`

It must be an address reachable by the ESP32. Do not use `localhost`.

Correct on a local network:

```text
http://192.168.1.50:3000/api/v1
```

Incorrect:

```text
http://localhost:3000/api/v1
```

NestJS must listen on `0.0.0.0`, and the firewall must allow port 3000.

### `DEVICE_CODE`

This is the feeder's unique code, created by the frontend or by an
administrative call:

```http
POST /api/v1/feeders
```

```json
{
  "name": "Comedero Milo",
  "deviceCode": "SF-ESP32-MILO-001",
  "timezone": "America/Mexico_City"
}
```

The code must match exactly, including capitalization and hyphens.

### `TEST_CODE`

This is the demo's shared code. By default:

```text
SMART-FEEDER-TEST
```

It can be changed in the backend:

```env
DEVICE_TEST_CODE=MI-CODIGO-DE-DEMO
```

### Infrared hopper measurement

The ESP32 must report the estimated container level as a percentage in
`hopperFoodPercent`. The infrared sensor must convert its level reading to a
value between `0` and `100`:

```text
100 = depósito lleno
50  = mitad de la capacidad
0   = depósito vacío
```

If the sensor does not yet have a valid reading, omit the field. Do not send
`0` to represent "no reading"; `0` means that the container was measured as
empty.

## 3. Startup and connection

### 3.1 Connect Wi-Fi

The ESP32 attempts to connect at startup. If it loses the connection, it must
call `WiFi.reconnect()` and make no HTTP requests until it restores
`WL_CONNECTED`.

Recommendation:

- Wait up to 20 seconds at startup.
- Retry every 5 seconds.
- Do not block the program indefinitely.

### 3.2 Handshake

When Wi-Fi is connected, send one request:

```http
POST /api/v1/device/connect
Content-Type: application/json
```

```json
{
  "deviceCode": "SF-ESP32-MILO-001",
  "testCode": "SMART-FEEDER-TEST"
}
```

Response `200`:

```json
{
  "data": {
    "connected": true,
    "feederId": "bbcfa746-71f5-44bd-b3d2-f44ed3b1b862",
    "deviceCode": "SF-ESP32-MILO-001",
    "serverTime": "2026-11-02T20:00:00.000Z"
  }
}
```

The ESP32 must extract and store:

```text
data.feederId
```

That value is used in all subsequent requests. You can store it in
`Preferences` to avoid relying on manual configuration after each restart.

The handshake marks the feeder as connected and updates `lastSeenAt`, but it
does not replace periodic telemetry.

## 4. Telemetry: what to send and how often

Sending every **1 minute** is the recommended value for the demo. Also send
immediately after:

- Powering on the ESP32.
- Reconnecting to Wi-Fi.
- Finishing a dispensing operation.
- Detecting a motor error.
- Detecting a sensor error.

Request:

```http
POST /api/v1/device/:feederId/telemetry
Content-Type: application/json
```

Example:

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

### Fields

| Field | Type | Required | Use |
|---|---|---:|---|
| `reportedAt` | string ISO 8601 | Yes | Reading time in UTC |
| `plateFoodGrams` | integer `>= 0` | No | Food currently on the plate |
| `hopperFoodPercent` | integer `0..100` | No | Measured container percentage |
| `motorStatus` | string | No | `ready`, `dispensing`, `blocked`, or `error` |
| `sensorStatus` | string | No | `ready`, `error`, or `not_calibrated` |
| `wifiSignal` | integer between `-120` and `0` | No | RSSI in dBm |
| `firmwareVersion` | string | No | Installed version |

The backend responds with the saved record:

```json
{
  "data": {
    "id": "telemetry-uuid",
    "feederId": "feeder-uuid",
    "reportedAt": "2026-11-02T20:01:00.000Z",
    "plateFoodGrams": 18,
    "hopperFoodPercent": 84,
    "motorStatus": "ready",
    "sensorStatus": "ready",
    "wifiSignal": -58,
    "firmwareVersion": "0.1.0"
  }
}
```

When telemetry is received, the backend:

1. Stores a record in `DeviceTelemetry`.
2. Updates `Feeder.isOnline = true`.
3. Updates `Feeder.lastSeenAt`.
4. Creates a historical snapshot in `FeederStatus`.

Presence is confirmed in the firmware with two consecutive valid ultrasonic
readings. Invalid readings do not close a session; `petEvent: "left"` is sent
after 20 seconds without valid detection, five absence readings, and an HX711
stabilization wait. The wait does not block the ESP32's main loop.

The frontend can request a one-off reading through
`POST /device/:feederId/telemetry-request`. The backend creates a
`telemetry_request` command; the ESP32 consumes it during its next command
poll, sends telemetry, and marks the command as completed.

The backend considers a feeder offline when its latest telemetry is more than
5 minutes old. The frontend must apply the same rule when displaying status so
that a stored or stale response is not shown as available.

Before the first telemetry, the backend returns `null` for plate and container
readings. `plateFoodGrams` remains in grams and `hopperFoodPercent` is a
percentage. The ESP32 must omit either field if its sensor is unavailable; it
must not send `0` to represent an unknown reading.

## 5. Commands: how the ESP32 receives instructions

The user requests dispensing through:

```http
POST /api/v1/feeders/:feederId/actions/dispense
Content-Type: application/json
```

```json
{
  "grams": 25
}
```

The backend stores a `DeviceCommand`:

```json
{
  "data": {
    "id": "command-uuid",
    "feederId": "feeder-uuid",
    "type": "dispense",
    "requestedGrams": 25,
    "status": "queued"
  }
}
```

The ESP32 does not receive the command automatically. It must poll:

```http
GET /api/v1/device/:feederId/commands/pending
```

Polling every **1 minute** is recommended to reduce the number of requests to
the backend.

Response:

```json
{
  "data": [
    {
      "id": "command-uuid",
      "feederId": "feeder-uuid",
      "type": "dispense",
      "requestedGrams": 25,
      "status": "queued",
      "createdAt": "2026-11-02T20:02:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "hasNextPage": false
  }
}
```

### Required command execution

When a command is found:

1. Temporarily store the `commandId`.
2. Change it to `processing`.
3. Activate the motor.
4. Stop it when the target grams are reached.
5. Send the atomic result to `dispense-result`.
6. Send new telemetry.

To mark it as processing:

```http
PATCH /api/v1/device/commands/:commandId
Content-Type: application/json
```

```json
{
  "status": "processing"
}
```

To finish, the firmware should prefer the atomic result:

```http
POST /api/v1/device/:feederId/dispense-result
```

To report a failure:

```json
{
  "status": "failed",
  "failureReason": "Motor bloqueado"
}
```

Estados usados:

```text
queued       The backend is waiting for the ESP32 to pick it up.
sent         The ESP32 reports that it received it.
processing   The motor is running.
completed    The operation finished successfully.
failed       The operation failed.
expired      The device did not execute it in time.
```

Commands in `processing` are not delivered to the ESP32 again. This prevents a
restart during dispensing from repeating the movement; the backend scheduler
marks a `processing` command that exceeds its timeout as failed.

## 6. Atomic dispensing result

After running the motor, the recommended endpoint is:

```http
POST /api/v1/device/:feederId/dispense-result
Content-Type: application/json
```

Successful result:

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

Result with a physical error:

```json
{
  "commandId": "command-uuid",
  "feedingEventId": "event-uuid",
  "status": "failed",
  "startedAt": "2026-11-03T14:00:00.000Z",
  "completedAt": "2026-11-03T14:00:03.000Z",
  "dispensedGrams": 4,
  "failureReason": "Motor bloqueado",
  "hardwareErrorCode": "MOTOR_BLOCKED"
}
```

The ESP32 should report the following when available:

| Field | Use |
|---|---|
| `commandId` | Identifies the retrieved command |
| `feedingEventId` | Links the result to the schedule |
| `startedAt` | Time when the motor started |
| `dispensedAt` | Time when food delivery finished |
| `completedAt` | Time when the operation finished |
| `dispensedGrams` | Grams actually delivered |
| `status` | `completed`, `partial`, `failed`, or `skipped` |
| `failureReason` | Readable explanation of the failure |
| `hardwareErrorCode` | Stable firmware code, for example `MOTOR_BLOCKED` |

The backend transforms `partial` into a successfully finished command, while
the event remains `partial`. For `failed`, the command remains `failed`. The
result can be resent if the HTTP response is lost: the backend recognizes the
already completed command and does not duplicate the event.

Recommended codes are:

```text
MOTOR_BLOCKED
MOTOR_TIMEOUT
HOPPER_EMPTY
SENSOR_ERROR
LOW_POWER
UNKNOWN
```

## 7. Feeding event

The event records what happened, while telemetry records the device status.

After dispensing, the ESP32 can report:

```http
POST /api/v1/feeders/:feederId/feeding-events
Content-Type: application/json
```

```json
{
  "startedAt": "2026-11-02T20:02:00.000Z",
  "dispensedAt": "2026-11-02T20:02:08.000Z",
  "completedAt": "2026-11-02T20:02:08.000Z",
  "dispensedGrams": 25,
  "consumedGrams": 0,
  "remainingGrams": 25,
  "status": "completed"
}
```

Recommended statuses:

```text
scheduled, dispensing, completed, partial, skipped, failed, cancelled
```

The ESP32 does not need to calculate `consumedGrams` during dispensing. This
value represents how much food disappeared from the plate and should be omitted
if a later reading is not yet available. It must not send `0` to represent an
unknown value.

When the ESP32 sends `petEvent: "detected"`, the backend stores the previous
weight in `PetPresenceSession`. When it receives `petEvent: "left"`, it stores
the later weight, calculates `foodBeforeGrams - foodAfterGrams`, and copies the
result into `FeedingEvent.consumedGrams` and `remainingGrams`. This is why
consumption appears in history and daily summaries, including partial
consumption.

## 8. Recommended hardware statuses

### Motor

```text
ready       Puede ejecutar una orden.
dispensing  Está girando.
blocked     Detectó atasco.
error       Tiene un error eléctrico o de control.
```

### Sensor

```text
ready           Lecturas confiables.
error           Lectura inválida o sensor desconectado.
not_calibrated  Aún no está calibrado.
```

## 9. Retries and disconnections

For any HTTP request:

- Recommended timeout: 5 seconds.
- Retry 1: after 2 seconds.
- Retry 2: after 5 seconds.
- Then return to the normal cycle.

Do not automatically repeat a dispensing operation if you do not know whether
the server received the confirmation. First query pending commands and check
the status.

If Wi-Fi goes down:

1. Stop new requests.
2. If the motor is active, bring it to a safe state.
3. Reconnect to Wi-Fi.
4. Perform the handshake again.
5. Send telemetry.
6. Resume polling.

## 10. Recovery after restart

After restarting, the ESP32 must:

1. Connect to Wi-Fi.
2. Perform the handshake again.
3. Send telemetry.
4. Query `/device/:feederId/commands/pending`.
5. For each pending command, confirm `sent` and check whether the hardware has
   already executed a locally stored command.
6. Resend the result using the same `commandId`.

Do not create another command when a pending command is found. If the backend
already marked it `completed`, `failed`, or `expired`, the repeated response is
idempotent and must not activate the motor again.

## 11. Minimal Arduino implementation

Libraries:

```text
WiFi
HTTPClient
ArduinoJson
Preferences
```

The firmware must have, at minimum, these functions:

```cpp
bool connectWifi();
bool connectDevice();
bool sendTelemetry();
bool pollCommands();
bool updateCommand(String commandId, String status, String reason);
bool sendDispenseResult(/* portion data */);
void runDispense(int grams);
```

The complete HTTP and JSON example is in the equivalent section of the
previous guide; for a real implementation, add motor, scale, and sensor
control, as well as JSON extraction with ArduinoJson.

## 12. Pre-test checklist

- [ ] The backend is running.
- [ ] The backend listens on `0.0.0.0`.
- [ ] The ESP32 and computer are on the same network.
- [ ] The firewall allows port 3000.
- [ ] A feeder with `deviceCode` exists.
- [ ] Hopper capacity is configured as 5000 grams if required by the
      hardware.
- [ ] Maximum capacity is not confused with available food.
- [ ] `TEST_CODE` matches `DEVICE_TEST_CODE`.
- [ ] The ESP32 obtains `feederId`.
- [ ] The ESP32 sends telemetry every minute.
- [ ] The ESP32 polls commands every 1 minute.
- [ ] The motor stops when an error occurs.
- [ ] Every command ends through `dispense-result` or `expired`.
- [ ] The firmware preserves `commandId` across a restart or retry.
- [ ] The result uses `/device/:feederId/dispense-result`.
- [ ] Physical errors include `failureReason` and `hardwareErrorCode`.

## 13. Backend timeouts

The backend automatically expires:

```text
queued      after 2 minutes without being picked up.
sent        after 1 minute without starting.
processing  after 5 minutes without finishing.
```

When a command expires, the event becomes `skipped` for `queued`/`sent` or
`failed` for `processing`, and an alert is created. The ESP32 must treat an
expired command as non-executable.

## 14. Demo mode limitations

This flow does not verify real identity. Anyone who knows `deviceCode` and
`testCode` can operate the feeder. It is appropriate for a local-network demo,
not for the Internet or production.
