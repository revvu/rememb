import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'schema.prisma'),

  // Used by prisma db push, prisma db pull, etc.
  datasource: {
    async url() {
      return process.env.DATABASE_URL!
    }
  },

  // Used by prisma migrate
  migrate: {
    async url() {
      return process.env.DATABASE_URL!
    }
  }
})
