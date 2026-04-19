import { Server } from '@hocuspocus/server'

const port = parseInt(process.env.PORT ?? '1234')

const server = new Server({ port })

server.listen(port, () => {
  console.log(`[collab] Hocuspocus läuft auf Port ${port}`)
})
