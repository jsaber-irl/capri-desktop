# Capri Remote P1 Study

Status: design complete; implementation intentionally deferred.

## Decision

Capri Remote should use a relay-assisted WebSocket design, following the local reference protocol conceptually but implemented only after a separate acceptance review. The PC and phone should connect outward; the relay must carry transport data without access to message plaintext or device keys.

Do not implement LAN-wide listening, browser trust based on a shared password, or public port forwarding as an implicit first release.

## Assets and trust boundaries

| Asset | Owner | Protection |
|---|---|---|
| Room ID | PC and relay | Address identifier, not a secret |
| PC token | PC | High-entropy random token; relay stores only a SHA-256 hash |
| Pairing key/code | PC and phone during pairing | Pairing key stays in the URL fragment; relay sees only code hash |
| Device key/token | PC and phone | Device key stays end to end; relay stores only token hash |
| Session key/nonces | PC and phone | Encrypted and authenticated inside pairing/session envelopes |
| Chat text | PC and phone | End-to-end envelope; relay must not log plaintext |
| Captures/audio/actions | PC and phone | Separate opt-in; never part of the initial text phase |

## Threat model

### Protected

- A compromised relay can observe timing, room/device identifiers, and connection metadata, but cannot read paired chat or device keys.
- A web page must not obtain PC capabilities without Origin checks and explicit WebSocket role authentication.
- A photographed QR must not silently admit a second phone. The confirmation code shown by the PC and waiting phone must match.
- Replay is prevented by room/device/session scope, sequence numbers, one-time pairing codes, and connection replacement rules.
- Revocation invalidates the relay token hash and closes active connections.
- Stolen QR fragments expire with a short configurable lifetime and one-use codes.

### Not protected until implementation adds them

- A device that was legitimately paired but later misused.
- Metadata visible to a relay or network observer.
- Compromise of the PC or phone itself.
- Screen, audio, or desktop actions until independent permissions and local UI controls exist.

## Recommended flow

1. Create a private room and relay address.
2. Open a short-lived QR or pairing link.
3. Display a phone name and confirmation code on the PC.
4. Require explicit **Allow** or **Deny**.
5. Derive pairing and session keys only on the paired devices.
6. Authenticate future devices with a 32-byte random token and a relay-side SHA-256 hash.
7. Start text chat only.
8. Add a persistent local remote indicator and a disconnect/revoke control.

## Relay and deployment

The relay is a transport and presence service, not a message store. It should:

- bind to HTTPS/WSS only;
- reject browser-originated PC connections;
- enforce frame size and per-client timeouts;
- use one isolated room per Durable Object or equivalent;
- store no chat, secret, pairing key, or device key;
- retain only room/hashed-token records and short pairing metadata;
- expose health and room reachability without exposing room membership;
- support horizontal replacement or explicit room deletion after 30 days offline.

For the first release, a hosted relay is preferable to LAN self-hosting because it avoids exposing the PC as a local server. Development may use loopback WebSocket servers only.

## Pairing and revocation

- Every QR is single-use and expires in at most 10 minutes.
- The phone and PC derive the same confirmation code from the pairing key and nonce.
- Pairing links may exist only for already-paired QR devices and must not be chainable.
- Paired devices are listed with name, addition date, and source.
- Revoking a device invalidates its token and closes its active session immediately.
- Revoking a parent QR device also revokes devices that its pairing link admitted.

## Chat security requirements

- Binary end-to-end envelope with authenticated encryption.
- Strict sequence and replay checks.
- Canonical base64url decoding and fixed lengths.
- Maximum 60,000-byte plaintext and 64-KiB transport frames.
- No relay logging of frame payloads.
- Local message retention uses the existing data controls and is not duplicated remotely by default.

## Separate opt-in features

The following features must not be enabled by the first chat implementation:

1. screen capture;
2. microphone/listening;
3. voice routing;
4. desktop/keyboard/window actions.

Each feature requires a separate consent, persistent indicator, local stop, retention settings, and test coverage.

## Required tests before implementation

- malformed and oversized frames;
- replay and sequence replacement;
- wrong or expired pairing code;
- revoked, unknown, and replaced devices;
- relay and network outage;
- relay log inspection for plaintext and key leakage;
- pairing race/confirmation mismatch;
- no relay data created beyond documented metadata;
- PC/phone compromise assumptions and disconnect behavior;
- crash, restart, and stale-session cleanup.
