# Documentos de integración ESP32 y API

La documentación detallada se separó en dos guías:

- [README-ESP32.md](./README-ESP32.md): qué debe hacer el ESP32, cuándo enviar
  datos, cómo interpretar respuestas, ejecutar comandos y recuperarse de
  errores.
- [README-API.md](./README-API.md): endpoints, tipos, cuerpos, respuestas,
  validaciones y limitaciones reales del backend.

Este archivo se conserva como referencia histórica del primer prototipo.

Este documento describe la integracion minima para una demo funcional. El
ESP32 se conecta por Wi-Fi y se comunica con la API mediante HTTP y JSON.

## Alcance actual

El proyecto esta en modo demo:

- No hay JWT, API keys, HMAC ni certificados.
- El `deviceCode` identifica al comedero.
- El `testCode` solo confirma que el ESP conoce el codigo de prueba.
- Cualquier persona que conozca esos valores puede enviar datos.
- No debe exponerse directamente a Internet en produccion.

El objetivo es conectar rapido el prototipo, no crear un canal seguro.

## Requisitos

- ESP32 con Wi-Fi.
- Firmware Arduino o PlatformIO.
- URL accesible del backend.
- Un comedero creado previamente desde la API.

En una red local, el backend debe escuchar en una direccion accesible por el
ESP32. `localhost` dentro del ESP32 no significa la computadora donde corre
NestJS. Usa la IP local de esa computadora:

```text
http://192.168.1.50:3000/api/v1
```

En el backend, NestJS debe arrancar escuchando en todas las interfaces si la
red no lo alcanza:

```ts
await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
```

## Paso 1: crear el comedero

Crear un registro una sola vez:

```http
POST /api/v1/feeders
Content-Type: application/json
```

```json
{
  "name": "Comedero Milo",
  "deviceCode": "SF-ESP32-MILO-001",
  "timezone": "America/Mexico_City"
}
```

La respuesta contiene el `feederId`. El ESP32 debe guardar ambos valores:

```json
{
  "data": {
    "id": "feeder-uuid",
    "deviceCode": "SF-ESP32-MILO-001"
  }
}
```

El `deviceCode` se graba en el firmware o en preferencias no volatiles del
ESP32. El `feederId` se obtiene en el handshake y tambien conviene guardarlo.

## Paso 2: handshake de conexion

El codigo de prueba actual es:

```text
SMART-FEEDER-TEST
```

El ESP32 envia:

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

Respuesta exitosa:

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

El backend marca el comedero como `isOnline = true` y actualiza
`lastSeenAt`. Si el codigo no existe devuelve `404`; si el codigo de prueba es
incorrecto devuelve `400`.

Se puede cambiar el codigo sin modificar el codigo fuente:

```env
DEVICE_TEST_CODE=MI-CODIGO-DE-DEMO
```

## Paso 3: enviar telemetria

El ESP32 debe enviar telemetria cada 15-30 segundos y tambien despues de una
dispensacion:

```http
POST /api/v1/device/:feederId/telemetry
Content-Type: application/json
```

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

La API guarda `DeviceTelemetry`, crea una foto en `FeederStatus` y actualiza:

```text
Feeder.isOnline = true
Feeder.lastSeenAt
```

Si el ESP32 deja de enviar telemetria, el backend no lo marca offline
automaticamente todavia. Para la demo, el frontend puede considerar offline un
dispositivo cuyo `lastSeenAt` tenga mas de 90 segundos.

## Paso 4: consultar comandos

El ESP32 consulta comandos pendientes mediante polling:

```http
GET /api/v1/device/:feederId/commands/pending
```

Respuesta:

```json
{
  "data": [
    {
      "id": "command-uuid",
      "type": "dispense",
      "requestedGrams": 25,
      "status": "queued"
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

El flujo recomendado del firmware es:

1. Consultar comandos cada 2-5 segundos.
2. Cambiar el comando a `processing`.
3. Activar el motor.
4. Medir o estimar la cantidad dispensada.
5. Cambiarlo a `completed` o `failed`.

```http
PATCH /api/v1/device/commands/:commandId
Content-Type: application/json
```

```json
{
  "status": "completed"
}
```

Estados permitidos por el flujo:

```text
queued
sent
processing
completed
failed
expired
```

## Paso 5: registrar eventos de alimentacion

Cuando termina una racion, el ESP32 o el backend puede registrar el evento:

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

En una primera version es aceptable que el ESP32 solo envie telemetria y que
el backend cree los eventos cuando procesa comandos. Para mediciones reales,
el firmware debe enviar el resultado despues de activar el motor.

## Ejemplo minimo para ESP32 Arduino

Instala las librerias `WiFi` y `HTTPClient`. El ejemplo omite el control del
motor para concentrarse en la comunicacion:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "MI_WIFI";
const char* WIFI_PASSWORD = "MI_PASSWORD";
const char* API_BASE = "http://192.168.1.50:3000/api/v1";
const char* DEVICE_CODE = "SF-ESP32-MILO-001";
const char* TEST_CODE = "SMART-FEEDER-TEST";

String feederId;

bool postJson(const String& url, const String& body, String& response) {
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int status = http.POST(body);
  response = http.getString();
  http.end();
  return status >= 200 && status < 300;
}

bool connectDevice() {
  String response;
  String body = "{\"deviceCode\":\"" + String(DEVICE_CODE) +
                "\",\"testCode\":\"" + String(TEST_CODE) + "\"}";

  if (!postJson(String(API_BASE) + "/device/connect", body, response)) {
    Serial.println("Handshake rechazado: " + response);
    return false;
  }

  // Para una demo se puede extraer feederId con ArduinoJson.
  // Guardalo en Preferences para no depender de una configuracion manual.
  Serial.println("Handshake exitoso: " + response);
  return true;
}

void sendTelemetry() {
  String response;
  String body = "{\"reportedAt\":\"2026-11-02T20:01:00.000Z\","
                "\"plateFoodGrams\":18,\"hopperFoodGrams\":420,"
                "\"motorStatus\":\"ready\",\"sensorStatus\":\"ready\","
                "\"wifiSignal\":" + String(WiFi.RSSI()) +
                ",\"firmwareVersion\":\"0.1.0\"}";

  postJson(String(API_BASE) + "/device/" + feederId + "/telemetry",
           body, response);
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  connectDevice();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(5000);
    return;
  }

  sendTelemetry();
  delay(30000);
}
```

Para extraer `feederId` de la respuesta, agrega `ArduinoJson`:

```cpp
JsonDocument json;
deserializeJson(json, response);
feederId = json["data"]["feederId"].as<String>();
```

## Flujo completo

```text
ESP32 arranca
  -> conecta a Wi-Fi
  -> POST /device/connect con deviceCode + testCode
  -> recibe feederId
  -> envia telemetria cada 15-30 s
  -> consulta /commands/pending
  -> ejecuta dispense
  -> confirma el comando
  -> envia evento y nueva telemetria
```

## Diagnostico rapido

### El ESP32 recibe connection refused

- No uses `localhost`.
- Usa la IP LAN de la computadora.
- Verifica que el puerto 3000 este abierto en el firewall.
- Arranca NestJS escuchando en `0.0.0.0`.

### El handshake devuelve 404

- El `deviceCode` no coincide exactamente.
- Primero crea el comedero con `POST /api/v1/feeders`.

### La telemetria devuelve 404

- El `feederId` no fue extraido correctamente.
- Guarda el `feederId` recibido en el handshake.

### El frontend muestra offline

- Revisa `lastSeenAt`.
- Envia telemetria periodicamente.
- No dependas solo del handshake; el handshake no reemplaza al heartbeat.

## Limitaciones aceptadas por tiempo

- No hay autenticacion ni cifrado de dispositivo.
- No hay MQTT ni WebSocket; se usa polling HTTP.
- No se verifica que un ESP32 sea el propietario del `deviceCode`.
- No se detecta offline automaticamente en el backend.
- El codigo de prueba es compartido.

Para produccion, el primer cambio debe ser sustituir el `testCode` compartido
por una clave individual por dispositivo y HTTPS.
