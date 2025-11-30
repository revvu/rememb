// Prisma client with in-memory fallback for development
// When DATABASE_URL is configured and Prisma is generated, it will use the real database
// Otherwise, it uses an in-memory store for testing

interface Source {
  id: string;
  title: string;
  url: string;
  videoId: string;
  transcript: string;
  duration: number;
  thumbnail: string | null;
  createdAt: Date;
  updatedAt: Date;
  sessions: Session[];
}

interface Session {
  id: string;
  sourceId: string;
  startTime: number;
  endTime: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory store for development without database
class InMemoryStore {
  private sources: Map<string, Source> = new Map();
  private sessions: Map<string, Session> = new Map();

  source = {
    findUnique: async ({ where }: { where: { id?: string; videoId?: string } }) => {
      if (where.id) {
        return this.sources.get(where.id) || null;
      }
      if (where.videoId) {
        for (const source of this.sources.values()) {
          if (source.videoId === where.videoId) return source;
        }
      }
      return null;
    },
    findMany: async ({ orderBy, take, include }: { orderBy?: any; take?: number; include?: any } = {}) => {
      let results = Array.from(this.sources.values());
      if (orderBy?.createdAt === 'desc') {
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      if (take) {
        results = results.slice(0, take);
      }
      if (include?.sessions) {
        results = results.map(source => ({
          ...source,
          sessions: Array.from(this.sessions.values()).filter(s => s.sourceId === source.id)
        }));
      }
      return results;
    },
    create: async ({ data }: { data: Omit<Source, 'id' | 'createdAt' | 'updatedAt' | 'sessions'> }) => {
      const id = `source_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const source: Source = {
        ...data,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        sessions: []
      };
      this.sources.set(id, source);
      return source;
    }
  };

  session = {
    create: async ({ data }: { data: Omit<Session, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const session: Session = {
        ...data,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.sessions.set(id, session);
      return session;
    }
  };
}

// Try to use real Prisma, fall back to in-memory store
let prisma: any;

try {
  // Attempt to import Prisma (will fail if not generated)
  const { PrismaClient } = require('@prisma/client');
  const globalForPrisma = globalThis as unknown as { prisma: any };

  // Prisma 7 requires passing datasourceUrl to constructor
  prisma = globalForPrisma.prisma ?? new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
  console.log('Using Prisma database connection');
} catch {
  // Fall back to in-memory store
  prisma = new InMemoryStore();
  console.log('Using in-memory store (run `npx prisma generate` after setting up DATABASE_URL to use database)');
}

export default prisma;
