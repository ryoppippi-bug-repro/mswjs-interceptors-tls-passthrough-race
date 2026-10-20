# mswjs-interceptors-tls-passthrough-race

Minimal reproduction for [`@mswjs/interceptors`](https://github.com/mswjs/interceptors): **an HTTPS connection that has a matching request handler is still passed through to the real host when the client's first write lands later than one `setImmediate` after it starts reading.**

`NodeHttpRequestSource` passes a connection through when the client starts reading (`data`/`readable` listener) and no bytes have arrived by the next `setImmediate` (`onClientRead` in `src/interceptors/http/source.ts`). The heuristic exists for server-first protocols such as a SQL handshake. It is also applied to `tls.TLSSocket`s, but TLS clients always speak first, so for HTTPS the heuristic can only misfire. Under load, an HTTPS client's first write can miss that window. The connection is then dialed to the real host, and the client fails with `ERR_TLS_CERT_ALTNAME_INVALID`.

This repro forces the timing deterministically. A `tls.connect()` client attaches its `data` listener on `secureConnect`, then writes its request N ms later.

> **Network:** the passthrough really connects to `example.com:443`, so this repro needs outbound network access.

## Steps

```sh
npm ci
npm start
```

`npm start` runs `repro.mjs <delayMs>` in a fresh process 5 times for each delay. Set `RUNS=n` to change the count.

## Expected

A request listener calls `respondWith(new Response('mocked'))`, so every run should print `mocked`, whatever the delay.

## Actual

This output is from a real run:

```
first write after  0 ms: 5/5 mocked
first write after  1 ms: 5/5 mocked
first write after  2 ms: 5/5 mocked
first write after  5 ms: 5/5 error ERR_TLS_CERT_ALTNAME_INVALID
first write after 10 ms: 5/5 error ERR_TLS_CERT_ALTNAME_INVALID
first write after 20 ms: 4/5 error ERR_TLS_CERT_ALTNAME_INVALID, 1/5 mocked
first write after 50 ms: 5/5 mocked
```

The request listener is still called in the failing runs, but a real passthrough connection has already been dialed by then, and the client fails with its TLS error. When the server-first heuristic is skipped for `tls.TLSSocket`, every delay prints `mocked`.

## Environment

- `@mswjs/interceptors` 0.45.9
- Node.js 24.22.0. Node 24+ is required, because 0.45.9 uses `Promise.withResolvers`.
- Linux x86_64
