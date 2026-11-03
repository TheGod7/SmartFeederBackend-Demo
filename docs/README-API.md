# Referencia técnica de la API

Documento de integración para frontend, backend y firmware. Describe lo que
realmente expone el código actual.

## 1. Datos generales

Base URL:

```text
http://HOST:3000/api/v1
```

Ejemplo:

```text
http://192.168.1.50:3000/api/v1
```

Métodos usados:

```text
GET, POST, PATCH, DELETE
```

Content-Type para cuerpos:

```http
Content-Type: application/json
```

No se requiere `Authorization` en el modo actual. El módulo JWT existe en
`src/auth`, pero no se importa desde `AppModule`.

## 2. Formato de respuestas

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

### Errores

NestJS devuelve el error HTTP estándar:

```json
{
  "statusCode": 400,
  "message": "Código de prueba inválido",
  "error": "Bad Request"
}
```

Los errores comunes son:

```text
400  Validación o regla de negocio.
404  Recurso no encontrado.
500  Error no controlado del servidor.
```

## 3. Tipos compartidos

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
  hopperFoodGrams: number | null;
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
  hopperFoodGrams: number | null;
  hopperCapacityGrams: number | null;
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

## 4. Mascotas

### `GET /pets`

Devuelve las mascotas del usuario demo.

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

Validaciones:

```text
name: texto.
species: cat | dog | other.
weightGrams: entero mayor que 0.
```

### `GET /pets/:petId`

### `PATCH /pets/:petId`

Acepta los campos modificables de creación.

### `DELETE /pets/:petId`

Elimina la mascota si pertenece al usuario demo.

## 5. Comederos

### `GET /feeders`

Devuelve todos los comederos del usuario demo.

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

`deviceCode` es único en la base de datos.

Este endpoint se usa para registrar el comedero antes de conectar el ESP32.
No lo llama el firmware. Para el comedero demo, la capacidad máxima del
depósito es de 5000 gramos; esa configuración no representa comida cargada.
El registro se crea sin mascota, alimento seleccionado, horarios ni lecturas.

### `GET /feeders/:feederId`

### `GET /feeders/:feederId/status`

Devuelve el último `FeederStatus`. `lastDispensedGrams` y `lastDispensedAt`
se completan con el último evento de alimentación que tenga gramos
dispensados. Si todavía no hay telemetría, devuelve
valores iniciales:

```json
{
  "data": {
    "feederId": "feeder-uuid",
    "plateFoodGrams": null,
    "hopperFoodGrams": null,
    "hopperCapacityGrams": null,
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

Devuelve:

```text
feeder
status
schedules
alerts
selectedFood
recentConsumption
```

Actualmente `alerts`, `selectedFood` y `recentConsumption` son placeholders
vacíos o `null`; sus endpoints especializados sí están implementados.

Cuando no existe telemetría del ESP32, las cantidades de plato, depósito y
capacidad son `null`, salvo que la capacidad máxima haya sido configurada por
el backend. Para el comedero demo, `hopperCapacityGrams` puede ser `5000`,
mientras `plateFoodGrams` y `hopperFoodGrams` permanecen en `null`. La
capacidad no representa comida disponible y no debe confundirse con
`hopperFoodGrams`.

### `POST /feeders/:feederId/actions/dispense`

Request:

```json
{
  "grams": 25
}
```

`grams` debe ser un entero entre 1 y 1000. El backend guarda un comando
`dispense` con estado `queued`.

## 6. Horarios

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

El formato de `time` debe ser `HH:mm`. No se permiten dos horarios activos a
la misma hora para el mismo comedero.

### `GET /schedules/:scheduleId`

### `PATCH /schedules/:scheduleId`

Acepta cualquier subconjunto de:

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

### Ejecución automática

El backend revisa los horarios activos cada 15 segundos. Cuando la hora local
coincide con `time` y el día está incluido en `daysOfWeek`, crea dentro de una
transacción:

```text
FeedingEvent: scheduled
DeviceCommand: queued
```

El comando queda asociado al evento mediante `feedingEventId`. La clave
`scheduleId:fecha-localThora` evita duplicar una ejecución aunque el ciclo se
repita o la aplicación se reinicie dentro del mismo minuto. El scheduler usa
el `timezone` del horario y, si no existe, el del comedero.

No hay un proceso que ejecute el motor desde NestJS. El ESP32 recoge el
`DeviceCommand` mediante polling.

## 7. Handshake del dispositivo

Estos cuatro endpoints son los que usa directamente el ESP32. El registro del
comedero y la configuración de capacidad ocurren antes, desde el frontend o
el backend.

### `POST /device/connect`

Request:

```json
{
  "deviceCode": "SF-ESP32-MILO-001",
  "testCode": "SMART-FEEDER-TEST"
}
```

Respuesta:

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

Reglas:

```text
deviceCode inexistente -> 404
testCode incorrecto     -> 400
datos válidos           -> 200
```

El test code esperado se configura con `DEVICE_TEST_CODE`; si no existe, se
usa `SMART-FEEDER-TEST`.

## 8. Telemetría del dispositivo

### `POST /device/:feederId/telemetry`

Request:

```json
{
  "reportedAt": "2026-11-02T20:01:00.000Z",
  "plateFoodGrams": 18,
  "hopperFoodGrams": 420,
  "motorStatus": "ready",
  "sensorStatus": "ready",
  "wifiSignal": -58,
  "firmwareVersion": "0.1.0"
}
```

El DTO valida `reportedAt` como fecha ISO, gramos no negativos y RSSI entre
`-120` y `0`.

`plateFoodGrams` y `hopperFoodGrams` son lecturas reales, no capacidades. Son
opcionales y pueden omitirse si el sensor no está disponible. El ESP32 no
debe enviar `0` para representar una lectura desconocida. La capacidad máxima
del depósito no se modifica con este endpoint.

La escritura produce dos registros:

```text
DeviceTelemetry: historial de lecturas.
FeederStatus: snapshot usado por el dashboard.
```

## 9. Comandos del dispositivo

### `GET /device/:feederId/commands/pending`

Devuelve comandos con estado:

```text
queued | sent | processing
```

### `PATCH /device/commands/:commandId`

Request:

```json
{
  "status": "completed",
  "failureReason": "opcional si falló"
}
```

Si `status` es `sent`, se guarda `sentAt`. Si es `completed`, `failed` o
`expired`, se guarda `completedAt`.

El ESP32 debe llamar este endpoint tres veces como máximo durante una
dispensación: `sent` al recibir el comando, `processing` al activar el motor y
`completed` o `failed` al terminar. Si se desconecta antes de confirmar,
debe consultar nuevamente los comandos pendientes antes de iniciar otra
dispensación.

### Estados del comando

```text
queued      Creado y esperando al ESP32.
sent        El ESP32 lo recibió.
processing  El motor está ejecutándose.
completed   Terminó correctamente o entregó una ración parcial.
failed      El ESP32 reportó un error físico.
expired     El backend agotó el tiempo de espera.
```

Timeouts por defecto:

```text
queued      2 minutos sin ser recogido -> expired
sent        1 minuto sin iniciar -> expired
processing  5 minutos sin terminar -> failed
```

Se pueden cambiar con variables de entorno en milisegundos:

```env
COMMAND_QUEUED_TIMEOUT_MS=120000
COMMAND_SENT_TIMEOUT_MS=60000
COMMAND_PROCESSING_TIMEOUT_MS=300000
DEVICE_OFFLINE_TIMEOUT_MS=300000
```

### `POST /device/:feederId/dispense-result`

Este es el flujo recomendado para reportar el resultado completo de una
dispensación. Es atómico e idempotente.

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

Request con error físico:

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

Campos de `status`:

```text
completed  Completó la ración.
partial    Entregó menos gramos de los solicitados.
failed     Falló el motor, sensor u otro componente.
skipped    No se ejecutó la ración.
```

El endpoint valida que el comando pertenezca al comedero, actualiza el
comando, actualiza o crea el evento, guarda gramos y tiempos, toma un snapshot
de `FeederStatus` y crea una alerta para `failed`, `partial` o `skipped`.
Repetir exactamente el mismo resultado devuelve el registro existente y no
crea una segunda dispensación.

Errores comunes:

```text
400  status, fechas o gramos inválidos.
404  commandId inexistente o perteneciente a otro comedero.
```

## 10. Eventos de alimentación

### `GET /feeders/:feederId/feeding-events`

Filtros opcionales:

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

Devuelve agregados por fecha:

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

## 11. Alertas

### `GET /feeders/:feederId/alerts`

Filtro opcional:

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
    "hopperFoodGrams": 100
  }
}
```

### `GET /feeders/:feederId/alerts/unread-count`

Respuesta:

```json
{
  "data": {
    "count": 1
  }
}
```

### `PATCH /feeders/:feederId/alerts/read-all`

### `PATCH /alerts/:alertId/read`

## 12. Alimentos

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
  "description": "Alimento seco para gatos adultos",
  "species": "cat",
  "proteinPercent": 27,
  "fatPercent": 13,
  "fiberPercent": 4,
  "moisturePercent": 8,
  "energyKcalPerKg": 3750,
  "imageUrl": "https://example.com/food.png",
  "imageAlt": "Gato adulto junto a su alimento",
  "sourceUrl": "https://www.royalcanin.com/mx/...",
  "nutritionBasis": "as_fed"
}
```

El catálogo inicial se carga automáticamente al iniciar el backend. Incluye
fórmulas concretas de Royal Canin, NUPEC, Hill's Science Diet, Purina Cat Chow,
Purina Dog Chow y PEDIGREE. Los valores corresponden a la presentación
específica indicada, no a toda la marca.

`nutritionBasis` puede ser:

```text
as_fed       Porcentaje tal como se declara en el producto.
dry_matter   Porcentaje convertido o publicado sobre materia seca.
```

Los productos iniciales incluyen `sourceUrl` para consultar la ficha de
referencia. `imageUrl` apunta a una imagen genérica representativa de perro o
gato; no se presenta como fotografía oficial del empaque. En una aplicación
comercial conviene reemplazarla por imágenes con licencia propia.

`energyKcalPerKg` solo se llena cuando se encontró una cifra publicada para
esa fórmula y presentación. Si la marca no publica energía metabolizable en la
ficha consultada, el valor es `null`; nunca se usa `0` como sustituto de un
dato desconocido. En el catálogo actual hay energía publicada para Royal
Canin Indoor Adult, Hill's Adult Salmon, Purina Cat Chow húmedo, Royal Canin
Medium Adult y Hill's Adult Chicken and Barley. NUPEC Felino Senior, Purina
Dog Chow, PEDIGREE Adulto y NUPEC Adulto quedan sin kcal/kg verificable en la
fuente consultada.

### `GET /foods/:foodId`

### `GET /feeders/:feederId/food`

Devuelve el alimento seleccionado o `null`.

### `PATCH /feeders/:feederId/food`

Request:

```json
{
  "foodId": "food-uuid"
}
```

La selección anterior del comedero se reemplaza.

## 13. Cámara

### `GET /feeders/:feederId/camera`

Devuelve la configuración guardada. Si no existe configuración, devuelve `404`.

### `PATCH /feeders/:feederId/camera`

Request:

```json
{
  "available": true,
  "streamType": "hls",
  "streamUrl": "https://stream.example.com/feeders/milo.m3u8"
}
```

Tipos usuales:

```text
hls | webrtc | mjpeg
```

La API guarda la URL; no retransmite video desde NestJS.

## 14. Orden recomendado de integración

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
1. El frontend crea el comedero con POST /feeders
2. POST /device/connect al iniciar o reconectar
3. POST /device/:feederId/telemetry inmediatamente después de conectar
4. GET /device/:feederId/commands/pending cada 3 s
5. PATCH /device/commands/:commandId con sent, processing y resultado
6. POST /feeders/:feederId/feeding-events al concluir una dispensación
7. POST /device/:feederId/telemetry después de la dispensación
```

El ESP32 no llama `POST /feeders`, porque ese endpoint requiere definir el
registro del comedero y su `deviceCode` antes de que el dispositivo pueda
conectarse. Tampoco administra alimentos, mascotas, horarios o cámara.

### Flujo completo

```text
Frontend crea/edita horario
  -> Scheduler NestJS crea FeedingEvent scheduled + DeviceCommand queued
  -> ESP32 hace polling y confirma sent
  -> ESP32 activa motor y confirma processing
  -> ESP32 reporta dispense-result completed/partial/failed
  -> Backend actualiza comando, evento, estado y alertas
```

## 15. Limitaciones conocidas

- El modo actual no autentica usuarios ni dispositivos.
- El usuario demo se crea automáticamente.
- El `testCode` es compartido.
- No hay HTTPS obligatorio.
- Un dispositivo se considera offline si no existe telemetría en los últimos
  5 minutos. El estado se calcula al consultar el dashboard o el endpoint de
  estado; no se necesita un proceso en segundo plano.
- El dashboard todavía devuelve placeholders para alertas, alimento y
  consumo reciente.
- La ejecución automática de horarios todavía requiere un scheduler; guardar
  un horario no hace que NestJS dispare un comando por sí solo.
- El polling de comandos es responsabilidad del ESP32.
- El scheduler expira comandos no confirmados y marca el evento como skipped o
  failed.
- La cámara solo guarda metadata y URL.
