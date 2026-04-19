import { Server } from '@hocuspocus/server'

const port = parseInt(process.env.PORT ?? '1234')

const server = Server.configure({
  port,
  async onConnect() {
    // All connections allowed — access control is handled by the Next.js app
  },
})

server.listen()
console.log(`[collab] Hocuspocus läuft auf Port ${port}`)
