# ESP32 and API integration documents

The detailed documentation is split into two guides:

- [README-ESP32.md](./README-ESP32.md): what the ESP32 must do, when to send
  data, how to interpret responses, execute commands, and recover from
  errors.
- [README-API.md](./README-API.md): endpoints, types, bodies, responses,
  validations, and the backend's actual limitations.

This file is retained as a historical reference for the first prototype.

This document describes the minimal integration for a functional demo. The
ESP32 connects over Wi-Fi and communicates with the API via HTTP and JSON.

## Current scope

The project is in demo mode:

- There are no JWT, API keys, HMAC, or certificates.
- `deviceCode` identifies the feeder.
- `testCode` only confirms that the ESP knows the test code.
- Anyone who knows those values can send data.
- It must not be exposed directly to the Internet in production.

The goal is to connect the prototype quickly, not to create a secure channel.

## Requirements

- ESP32 with Wi-Fi.
- Arduino or PlatformIO firmware.
- An accessible backend URL.
- A feeder previously created through the API.

On a local network, the backend must listen on an address accessible to the
ESP32. `localhost` inside the ESP32 does not mean the computer where NestJS
runs. Use that computer's local IP:

```text
https://b8d4-2806-104e-2d-37c6-697e-1481-5554-61a3.ngrok-free.app/api/v1
```

In the backend, NestJS must listen on all interfaces if the network cannot
reach it:

```ts
await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
```

## Step 1: create the feeder

Create a record once:

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

The response contains the `feederId`. The ESP32 must store both values:

```json
{
  "data": {
    "id": "feeder-uuid",
    "deviceCode": "SF-ESP32-MILO-001"
  }
}
```

`deviceCode` is stored in the firmware or in the ESP32's non-volatile
preferences. `feederId` is obtained during the handshake and should also be stored.

## Step 2: connection handshake

The current test code is:

```text
SMART-FEEDER-TEST
```

The ESP32 sends:

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

Successful response:

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

The backend marks the feeder as `isOnline = true` and updates
`lastSeenAt`. If the code does not exist it returns `404`; if the test code is
incorrect it returns `400`.

The code can be changed without modifying the source code:

```env
DEVICE_TEST_CODE=MI-CODIGO-DE-DEMO
```

## Step 3: send telemetry

The ESP32 must send telemetry every 15-30 seconds and also after dispensing:

```http
POST /api/v1/device/:feederId/telemetry
Content-Type: application/json
```

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

The API stores `DeviceTelemetry`, creates a snapshot in `FeederStatus`, and updates:

```text
Feeder.isOnline = true
Feeder.lastSeenAt
```

If the ESP32 stops sending telemetry, the backend considers the device offline
when its last telemetry is more than 5 minutes old. The frontend must apply the
same rule to avoid showing a stale response as available.

## Step 4: query commands

The ESP32 polls for pending commands:

```http
GET /api/v1/device/:feederId/commands/pending
```

Response:

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

The recommended firmware flow is:

1. Query commands every 2-5 seconds.
2. Change the command to `processing`.
3. Activate the motor.
4. Measure or estimate the dispensed amount.
5. Change it to `completed` or `failed`.

```http
PATCH /api/v1/device/commands/:commandId
Content-Type: application/json
```

```json
{
  "status": "completed"
}
```

States allowed by the flow:

```text
queued
sent
processing
completed
failed
expired
```

## Step 5: record feeding events

When a portion finishes, the ESP32 or the backend can record the event:

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

In an initial version, it is acceptable for the ESP32 to send only telemetry
and for the backend to create events while processing commands. For real
measurements, the firmware must send the result after activating the motor.

## Minimal ESP32 Arduino example

Install the `WiFi` and `HTTPClient` libraries. The example omits motor control
to focus on communication:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "MI_WIFI";
const char* WIFI_PASSWORD = "MI_PASSWORD";
const char* API_BASE = "https://b8d4-2806-104e-2d-37c6-697e-1481-5554-61a3.ngrok-free.app/api/v1";
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

  // For a demo, feederId can be extracted with ArduinoJson.
  // Store it in Preferences to avoid depending on manual configuration.
  Serial.println("Handshake exitoso: " + response);
  return true;
}

void sendTelemetry() {
  String response;
  String body = "{\"reportedAt\":\"2026-11-02T20:01:00.000Z\","
                "\"plateFoodGrams\":18,\"hopperFoodPercent\":84,"
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

To extract `feederId` from the response, add `ArduinoJson`:

```cpp
JsonDocument json;
deserializeJson(json, response);
feederId = json["data"]["feederId"].as<String>();
```

## Complete flow

```text
ESP32 starts
  -> connects to Wi-Fi
  -> POST /device/connect with deviceCode + testCode
  -> receives feederId
  -> sends telemetry every 15-30 s
  -> polls /commands/pending
  -> executes dispense
  -> confirms the command
  -> sends the event and new telemetry
```

## Quick troubleshooting

### ESP32 receives connection refused

- Do not use `localhost`.
- Use the computer's LAN IP address.
- Verify that port 3000 is open in the firewall.
- Start NestJS listening on `0.0.0.0`.

### The handshake returns 404

- `deviceCode` does not match exactly.
- First create the feeder with `POST /api/v1/feeders`.

### Telemetry returns 404

- `feederId` was not extracted correctly.
- Store the `feederId` received during the handshake.

### The frontend shows offline

- Check `lastSeenAt`.
- Send telemetry periodically.
- Do not rely only on the handshake; it does not replace the heartbeat.

## Time-accepted limitations

- There is no device authentication or encryption.
- There is no MQTT or WebSocket; HTTP polling is used.
- The backend does not verify that an ESP32 owns the `deviceCode`.
- The backend does not automatically detect offline devices.
- The test code is shared.

For production, the first change should be to replace the shared `testCode`
with an individual device key and HTTPS.
