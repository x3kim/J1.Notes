import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const prismaClientSingleton = () => {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db'
  // PrismaBetterSqlite3 expects the file path (without "file:" prefix) as url
  const adapter = new PrismaBetterSqlite3({ url: url.replace(/^file:/, '') })
  return new PrismaClient({ adapter })
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()
export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
