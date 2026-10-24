import { db } from "./db";
import { ORG } from "./studio/input";

// Only project metadata is needed on the start page, not assets or editor history.
export async function dashboardState() {
  const [campaigns, series, websites] = await Promise.all([
    db.campaign.findMany({
      where: { organizationId: ORG },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        customer: { select: { name: true } },
      },
    }),
    db.studioSeries.findMany({
      where: { organizationId: ORG, concept: { is: null } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        title: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),
    db.websiteProject.findMany({
      where: { organizationId: ORG },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: { id: true, name: true, updatedAt: true },
    }),
  ]);
  return {
    projects: [
      ...campaigns.map((p) => ({
        id: p.id,
        title: p.title,
        section: "Kampagnen" as const,
        kind: "Kampagne",
        customer: p.customer?.name,
        date: p.updatedAt.toISOString(),
        dateLabel: "Bearbeitet",
      })),
      ...series.map((p) => ({
        id: p.id,
        title: p.title,
        section: "Content-Studio" as const,
        kind: "Content-Projekt",
        customer: p.customer?.name,
        date: p.createdAt.toISOString(),
        dateLabel: "Erstellt",
      })),
      ...websites.map((p) => ({
        id: p.id,
        title: p.name,
        section: "Website" as const,
        kind: "Website",
        customer: undefined,
        date: p.updatedAt.toISOString(),
        dateLabel: "Bearbeitet",
      })),
    ].sort((a, b) => b.date.localeCompare(a.date)),
  };
}
