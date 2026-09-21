# Architecture

The first usable slice is a static Vite React PWA. IndexedDB stores the local snapshot under the `beyond-the-calendar` database. The front end is designed to call a future Cloudflare Worker API, but local data remains usable without it.

The planned hosted split is:

- Sites: static `dist` output, manifest, service worker, and UI.
- Worker: request signing, encrypted sync, Web Push scheduling.
- D1: opaque encrypted envelopes, device public keys, cursors, subscriptions, reminder trigger times.
- R2: encrypted photo bytes.

Plaintext diary content and unencrypted photo bytes must never be sent to the Worker.
