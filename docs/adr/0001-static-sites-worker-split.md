# ADR 0001: Sites for the PWA, Worker for sync

## Decision

Deploy the static PWA to Sites and keep sync, encrypted photo storage, and scheduled Web Push in a separate Cloudflare Worker service.

## Rationale

The app needs scheduled work and custom device-signature authentication. Sites is the website delivery layer; the Worker owns the runtime behavior that must not be coupled to the static build.
