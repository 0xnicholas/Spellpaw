/**
 * Seed a user account with the canonical demo dataset.
 * Idempotent: clears existing seed-owned records and re-creates them.
 */
import type { PrismaClient } from '@prisma/client';
import { seedProjects, seedTrees, seedCanvases, seedChatMessages } from './seed-data';

export async function seedUser(prisma: PrismaClient, userId: string): Promise<void> {
  // Clean existing seed data for this user to stay idempotent
  await prisma.project.deleteMany({ where: { userId } });
  await prisma.chat.deleteMany({ where: { userId } });

  // Seed projects (tree + canvas stored as JSON in the data column)
  for (const project of seedProjects) {
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

  // Seed global chat
  await prisma.chat.create({
    data: {
      userId,
      messages: JSON.stringify(seedChatMessages),
    },
  });
}
