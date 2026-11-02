# Manual del ESP32

Guía práctica para programar el ESP32 contra Smart Feeder Backend en el modo
demo actual. El ESP32 se comunica por Wi-Fi usando HTTP y JSON; no usa MQTT,
WebSocket, JWT ni certificados.

## 1. Qué debe hacer el ESP32

El firmware debe cumplir este ciclo:

```text
Encender
  -> conectar a Wi-Fi
  -> identificarse con deviceCode + testCode
  -> guardar feederId
  -> enviar telemetría periódica
  -> preguntar por comandos
  -> ejecutar el comando
  -> confirmar su resultado
  -> enviar telemetría actualizada
```

El backend no controla directamente los pines, el motor, la báscula ni los
sensores. El ESP32 es responsable de:

- Conectarse y reconectarse al Wi-Fi.
- Activar el motor.
- Detener el motor cuando alcance los gramos deseados.
- Leer o estimar gramos en plato y depósito.
- Reportar estados del motor y sensores.
- Ejecutar comandos una sola vez.
- Informar si un comando terminó correctamente.

## 2. Datos que debes configurar en el firmware

```cpp
const char* WIFI_SSID = "MI_WIFI";
const char* WIFI_PASSWORD = "MI_PASSWORD";
const char* API_BASE = "http://192.168.1.50:3000/api/v1";
const char* DEVICE_CODE = "SF-ESP32-MILO-001";
const char* TEST_CODE = "SMART-FEEDER-TEST";
```

### `API_BASE`

Debe ser una dirección que el ESP32 pueda alcanzar. No uses `localhost`.

Correcto dentro de una red local:

```text
http://192.168.1.50:3000/api/v1
```

Incorrecto:

```text
http://localhost:3000/api/v1
```

NestJS debe escuchar en `0.0.0.0` y el firewall debe permitir el puerto 3000.

### `DEVICE_CODE`

Es el código único del comedero creado por el frontend o por una llamada
administrativa:

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

El código debe coincidir exactamente, incluyendo mayúsculas y guiones.

### `TEST_CODE`

Es el código compartido de la demo. Por defecto:

```text
SMART-FEEDER-TEST
```

Puede cambiarse en el backend:

```env
DEVICE_TEST_CODE=MI-CODIGO-DE-DEMO
```

## 3. Arranque y conexión

### 3.1 Conectar Wi-Fi

El ESP32 intenta conectar al iniciar. Si pierde la conexión, debe llamar a
`WiFi.reconnect()` y no hacer peticiones HTTP hasta recuperar
`WL_CONNECTED`.

Recomendación:

- Esperar hasta 20 segundos al inicio.
- Reintentar cada 5 segundos.
- No bloquear indefinidamente el programa.

### 3.2 Handshake

Cuando el Wi-Fi ya está conectado, enviar una sola petición:

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

Respuesta `200`:

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

El ESP32 debe extraer y guardar:

```text
data.feederId
```

Ese valor se usa en todas las peticiones posteriores. Puedes guardarlo en
`Preferences` para no depender de una configuración manual cada vez que
reinicia.

El handshake marca el comedero como conectado y actualiza `lastSeenAt`, pero
no sustituye la telemetría periódica.

## 4. Telemetría: qué debe enviar y cada cuánto

Enviar cada **30 segundos** es el valor recomendado para la demo. También
enviar inmediatamente después de:

- Encender el ESP32.
- Reconectar el Wi-Fi.
- Terminar una dispensación.
- Detectar un error de motor.
- Detectar un error de sensor.

Petición:

```http
POST /api/v1/device/:feederId/telemetry
Content-Type: application/json
```

Ejemplo:

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

### Campos

| Campo | Tipo | Obligatorio | Uso |
|---|---|---:|---|
| `reportedAt` | string ISO 8601 | Sí | Momento de la lectura en UTC |
| `plateFoodGrams` | entero `>= 0` | No | Comida actualmente en el plato |
| `hopperFoodGrams` | entero `>= 0` | No | Comida restante en el depósito |
| `motorStatus` | string | No | `ready`, `dispensing`, `blocked` o `error` |
| `sensorStatus` | string | No | `ready`, `error` o `not_calibrated` |
| `wifiSignal` | entero entre `-120` y `0` | No | RSSI en dBm |
| `firmwareVersion` | string | No | Versión instalada |

El backend responde con el registro guardado:

```json
{
  "data": {
    "id": "telemetry-uuid",
    "feederId": "feeder-uuid",
    "reportedAt": "2026-11-02T20:01:00.000Z",
    "plateFoodGrams": 18,
    "hopperFoodGrams": 420,
    "motorStatus": "ready",
    "sensorStatus": "ready",
    "wifiSignal": -58,
    "firmwareVersion": "0.1.0"
  }
}
```

Al recibir telemetría, el backend:

1. Guarda un registro en `DeviceTelemetry`.
2. Actualiza `Feeder.isOnline = true`.
3. Actualiza `Feeder.lastSeenAt`.
4. Crea una fotografía histórica en `FeederStatus`.

El backend todavía no marca automáticamente offline al dispositivo. El
frontend debe considerar offline un comedero cuyo `lastSeenAt` tenga más de 90
segundos.

## 5. Comandos: cómo recibe instrucciones el ESP32

El usuario solicita una dispensación desde:

```http
POST /api/v1/feeders/:feederId/actions/dispense
Content-Type: application/json
```

```json
{
  "grams": 25
}
```

El backend guarda un `DeviceCommand`:

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

El ESP32 no recibe la orden automáticamente. Debe hacer polling:

```http
GET /api/v1/device/:feederId/commands/pending
```

Se recomienda consultar cada **3 segundos**. No consultar más rápido que una
vez por segundo.

Respuesta:

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

### Ejecución obligatoria de un comando

Al encontrar un comando:

1. Guardar temporalmente el `commandId`.
2. Cambiarlo a `processing`.
3. Activar el motor.
4. Detenerlo cuando se alcancen los gramos objetivo.
5. Cambiarlo a `completed` o `failed`.
6. Enviar telemetría nueva.

Para marcarlo como procesando:

```http
PATCH /api/v1/device/commands/:commandId
Content-Type: application/json
```

```json
{
  "status": "processing"
}
```

Para finalizar:

```json
{
  "status": "completed"
}
```

Para informar un fallo:

```json
{
  "status": "failed",
  "failureReason": "Motor bloqueado"
}
```

Estados usados:

```text
queued       El backend espera que el ESP lo recoja.
sent         El ESP informa que lo recibió.
processing   El motor está ejecutándose.
completed    La operación terminó correctamente.
failed       La operación falló.
expired      El dispositivo no lo ejecutó a tiempo.
```

La implementación actual no elimina automáticamente un comando de la lista
hasta que el ESP lo cambie a `completed`, `failed` o `expired`. Por eso es
importante actualizarlo a `processing` inmediatamente.

## 6. Evento de alimentación

El evento registra qué ocurrió, mientras que la telemetría registra el estado
del dispositivo.

Después de una dispensación, el ESP32 puede informar:

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

Estados recomendados:

```text
scheduled, dispensing, completed, partial, skipped, failed, cancelled
```

El ESP32 no necesita calcular `consumedGrams` durante la dispensación. Ese
valor representa cuánto desapareció del plato y puede enviarse como `0` o
dejarse vacío si todavía no existe una lectura posterior.

## 7. Estados de hardware recomendados

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

## 8. Reintentos y desconexiones

Para cualquier petición HTTP:

- Timeout recomendado: 5 segundos.
- Reintento 1: después de 2 segundos.
- Reintento 2: después de 5 segundos.
- Después, volver al ciclo normal.

No repitas una dispensación automáticamente si no sabes si el servidor recibió
la confirmación. Primero consulta los comandos pendientes y revisa el estado.

Si el Wi-Fi se cae:

1. Detén nuevas peticiones.
2. Si el motor está activo, llévalo a un estado seguro.
3. Reconecta Wi-Fi.
4. Ejecuta nuevamente el handshake.
5. Envía telemetría.
6. Reanuda el polling.

## 9. Implementación mínima de Arduino

Librerías:

```text
WiFi
HTTPClient
ArduinoJson
Preferences
```

El firmware debe tener, como mínimo, estas funciones:

```cpp
bool connectWifi();
bool connectDevice();
bool sendTelemetry();
bool pollCommands();
bool updateCommand(String commandId, String status, String reason);
bool sendFeedingEvent(/* datos de la ración */);
void runDispense(int grams);
```

El ejemplo completo de HTTP y JSON está en la sección equivalente de la guía
anterior; para una implementación real debes agregar control de motor,
báscula, sensores y extracción de JSON con ArduinoJson.

## 10. Checklist antes de probar

- [ ] El backend está iniciado.
- [ ] El backend escucha en `0.0.0.0`.
- [ ] El ESP32 y la computadora están en la misma red.
- [ ] El firewall permite el puerto 3000.
- [ ] Existe un feeder con `deviceCode`.
- [ ] `TEST_CODE` coincide con `DEVICE_TEST_CODE`.
- [ ] El ESP32 obtiene `feederId`.
- [ ] El ESP32 envía telemetría cada 30 segundos.
- [ ] El ESP32 consulta comandos cada 3 segundos.
- [ ] El motor se detiene ante error.
- [ ] Cada comando termina en `completed`, `failed` o `expired`.

## 11. Limitaciones del modo demo

Este flujo no verifica identidad real. Quien conozca `deviceCode` y
`testCode` puede operar el comedero. Es apropiado para una demo en red local,
no para Internet o producción.

