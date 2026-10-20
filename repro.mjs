// node repro.mjs <delayMs>
// A TLS client that starts reading on "secureConnect" and writes its HTTP request
// <delayMs> later. A request handler is registered, so the response should always be mocked.
import tls from 'node:tls'
import { HttpRequestInterceptor } from '@mswjs/interceptors/http'

const DELAY = Number(process.argv[2] ?? 5)

const interceptor = new HttpRequestInterceptor()
interceptor.apply()
let handlerCalls = 0
interceptor.on('request', ({ controller }) => {
  handlerCalls++
  controller.respondWith(new Response('mocked'))
})

const socket = tls.connect({ host: 'example.com', port: 443, servername: 'example.com' })
socket.on('secureConnect', () => {
  let response = ''
  socket.on('data', (chunk) => (response += chunk)) // reads first...
  setTimeout(() => {
    // ...and writes after a short async gap
    socket.write('GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n')
  }, DELAY)
  socket.on('end', () => {
    console.log(JSON.stringify({ delayMs: DELAY, handlerCalls, result: response.endsWith('mocked') ? 'mocked' : 'NOT mocked' }))
    process.exit(0)
  })
})
socket.on('error', (error) => {
  console.log(JSON.stringify({ delayMs: DELAY, handlerCalls, result: `error ${error.code ?? error.message}` }))
  process.exit(0)
})
