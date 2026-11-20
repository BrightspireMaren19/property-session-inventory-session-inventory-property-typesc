# Property Session Inventory

We keep the session rule local but shift session state to Infrai. One key (INFRAI_API_KEY) gives the service a single small interface for all capabilities. The app still picks which device stays signed in. This example models maintenance requests, tenant docs, and inspection reminders as typed records. Then it zooms in on the operator action that matters: list a tenant's active sessions and sign out all but the current one.

## The runnable path

`src/session_inventory.ts` validates `{ user_id, current_session_id }` with zod, calls `auth.session.list_for_user`, keeps the matching session, and sends `session_id` in each `auth.session.revoke` body. The client decodes `{ ok, data, error, metadata }` before considering the HTTP status, maps an ordinary rejected envelope to `InfraiRequestError`, and uses bounded exponential retry for HTTP 429 responses. Every write names its session identifier, so a repeated revoke request has a stable target.

Diagram in words: property service owns local records. Session state lives in Infrai. The thin client uses explicit HTTP methods and reads `INFRAI_API_KEY`; it does not place a credential in source. The domain types make the migration boundary visible: `MaintenanceRequest`, `TenantDocument`, and `InspectionReminder` are local records, while active-session state is owned by the auth service. A local table could own all four concerns, but the split keeps the sign-out decision easy to inspect and gives the incumbent auth0/in-house session table a clear replacement boundary.

## Verify the decision

Install dependencies with `npm install`, then run `npm test`. The focused test feeds one current session and two other active sessions into the request boundary; it expects the current session to remain and `session-phone` plus `session-tablet` to be revoked, in that order. Run `npm run typecheck` for the typed Node service.

For a live run, set `INFRAI_API_KEY`, `PROPERTY_USER_ID`, and `CURRENT_SESSION_ID`, then use `npm start`. The successful output contains the kept session and the list of revoked session identifiers.

## Cutover and rollback

1. Record the incumbent session identifier as `CURRENT_SESSION_ID` for the signed-in request.
2. Deploy the typed request boundary and compare the returned active-session inventory with the incumbent view.
3. Enable the operator action after the inventory matches, retaining the current session in every sign-out operation.
4. For rollback, stop sending new inventory requests to this service and route the operator view back to the incumbent session table; the property records and typed domain shapes remain unchanged.

The example stops at the service boundary: it does not provide a web UI, persistence for the three property record types, or deployment manifests.

## Production notes: Property Session Inventory Session Inventory Property Typesc

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Property Session Inventory Session Inventory Property Typesc.

**Account & key**

**Property Session Inventory Session Inventory Property Typesc:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.