/**
 * Seed a user account with the canonical demo dataset.
 * Idempotent: clears existing seed-owned records and re-creates them.
 */
import type { PrismaClient } from '@prisma/client';
import { seedProjects, seedTrees, seedCanvases, seedChatMessages } from './seed-data';

export async function seedUser(prisma: PrismaClient, userId: string): Promise<void> {
  const seedProjectIds = seedProjects.map((p) => p.id);

  // Seed projects only if they are missing. Existing seed projects (possibly edited by the user)
  // are left untouched so their version history is preserved.
  const existingIds = new Set(
    (await prisma.project.findMany({
      where: { userId, id: { in: seedProjectIds } },
      select: { id: true },
    })).map((p) => p.id)
  );

  for (const project of seedProjects) {
    if (existingIds.has(project.id)) continue;

    const tree = seedTrees[project.id] ?? null;
    const canvas = seedCanvases[project.id] ?? { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
    await prisma.project.create({
      data: {
        id: project.id,
        userId,
        title: project.title,
        description: project.description,
        coverColor: project.coverColor,
        version: project.version,
        data: JSON.stringify({ tree, canvas }),
      },
    });
  }

  // Seed project-scoped chat histories
  for (const project of seedProjects) {
    const existingChat = await prisma.chat.findUnique({
      where: { userId_projectId: { userId, projectId: project.id } },
    });
    if (!existingChat) {
      await prisma.chat.create({
        data: {
          userId,
          projectId: project.id,
          messages:
            project.id === 'proj_1'
              ? JSON.stringify(seedChatMessages)
              : JSON.stringify([]),
        },
      });
    }
  }
}
