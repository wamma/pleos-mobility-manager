# Pleos integration evidence — checked 2026-11-15

## Verified official material

| Topic | Verified fact | Exact source |
|---|---|---|
| Gleo | App-defined function calls and callbacks; requires registered App Schema. This is not a general cloud LLM endpoint. | https://document.pleos.ai/docs/pleos-only/app-integration-guide/guide/core-concepts |
| Schema activation | `assets/schema.json`, review/approval, per-function Android action filters. | https://document.pleos.ai/docs/pleos-only/app-integration-guide/guide/deliver-schema |
| LLM SDK | October 19, 2026 release note explicitly says discontinued and directs developers to Gleo Interface. | https://document.pleos.ai/en/docs/pleos-only/release-note/playground-release-note |
| Vehicle state | Dedicated Pleos AVD and Vehicle Service required. Capability/read/write/listener are distinct. Request completion does not prove actual state changed; reread or listener needed. APIs and area permissions vary. | https://document.pleos.ai/en/docs/pleos-only/tutorial/vehicle-sdk-sample-app |
| Emulator | Dedicated automotive image, Android API 34, Pleos emulator 2.1.0; standard phone emulator is insufficient. | https://document.pleos.ai/docs/connect/guide/getting-started/application-development/setup-connect-sdk-emulator |
| Background | Apps with no continuing user function must release foreground services and allow cached state/process termination. This does not establish permission for overnight operation. | https://document.pleos.ai/docs/pleos-only/vehicle-app-developer-guide/bg-to-cch-transition-guide |
| Manual reference | NH2 / 2026 manual describes front windshield defog and conditional fresh-air/A/C behavior. Demo does not know user's model; references it as an example, asks to check actual vehicle manual, does not claim model verification. | https://ownersmanual.hyundai.com/full_webhelp/NH2/2026/ko_KR/topic_ljm_r2w_w2c.html |

## Local environment and actual boundary

- Release verification: signed Java/WebView Android APK, official Pleos Connect2.1.0/API34 arm64 AVD, 2560×1440/density160. Installation and local simulation flows verified.
- No credentials, approved App Schema, Vehicle SDK dependencies, Vehicle Service connection, real-time maps, weather, speech understanding, battery observations or vehicle controls are wired into this prototype.
- Browser input forms invoke the domain functions directly. They are a structured-input substitute, **not Gleo**. A future approved Android adapter must deserialize/validate Gleo function arguments and call equivalent deterministic logic.
- Candidate application operations (design labels only, not official SDK names): plan trip; forecast stay; open fogging session. No fabricated SDK calls or purportedly valid schema are shipped.
- Specific capability/area/permission support for SOC, HVAC/defrost, original-setting restore, parked sampling, background survival, and power-off/resume remains unverified for the intended vehicle.
- Mobility: every leg shares user-entered travel minutes and average speed. Station hours/dwell/priority are editable fixtures. Charging uses effective battery-side kW and clamps at capacity. There is no geographic route optimization.
- Camping: constant-rate kW×h projection, explicit reserve kWh, no physical battery/thermal/weather model or overnight guarantee. Alternatives revise assumptions; they do not set vehicle HVAC.
- Troubleshooting: on/off observations are explicitly simulated; guidance/manual operation, observation, and subjective outcome are separate. LocalStorage contains only demo outcome records. No real personal data required.

## Next integration gate

1. Dedicated AVD setup is complete; obtain authorized Gleo/Vehicle SDK configuration.
2. Verify read capability and unknown/error handling for each needed vehicle property.
3. Build a minimal Android Gleo action + callback with reviewed schema and prove a real end-to-end request.
4. Then port a single domain flow; keep external-service mocks labeled until demonstrated.
5. Validate parked lifecycle and permission to keep monitoring before claiming an overnight product.
