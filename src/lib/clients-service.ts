import { prisma } from "@/lib/prisma";
import type { ClientListItem } from "@/lib/clients-data";
import { clientTypeLabels } from "@/lib/client-schema";

type ClientActivity = {
  date: string;
  title: string;
  owner: string;
  type: string;
};

export async function getClientsForList(): Promise<ClientListItem[]> {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  try {
    const dbClients = await prisma.client.findMany({
      include: {
        contacts: {
          take: 1,
          orderBy: {
            createdAt: "asc"
          }
        },
        contracts: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return dbClients.map((client) => {
      const primaryContact = client.contacts[0];
      const totalRevenue = client.contracts.reduce((sum, contract) => sum + Number(contract.totalAmount), 0);

      return {
        slug: client.id,
        name: client.name,
        type: clientTypeLabels[client.clientType] ?? "기타",
        contact: primaryContact?.name ?? "-",
        phone: primaryContact?.phone ?? client.phone ?? "-",
        email: primaryContact?.email ?? client.email ?? "-",
        address: client.address ?? "",
        businessNumber: client.businessNumber ?? "",
        website: client.website ?? "",
        memo: client.memo ?? "",
        contracts: client.contracts.length,
        revenue: `${totalRevenue.toLocaleString("ko-KR")}만원`,
        lastMeeting: "-",
        status: "활성"
      };
    });
  } catch {
    return [];
  }
}

export async function getClientDetail(slug: string) {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  try {
    const dbClient = await prisma.client.findUnique({
      where: {
        id: slug
      },
      include: {
        contacts: true,
        contracts: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!dbClient) {
      return null;
    }

    const totalRevenue = dbClient.contracts.reduce((sum, contract) => sum + Number(contract.totalAmount), 0);
    const primaryContact = dbClient.contacts[0];

    return {
      client: {
        slug: dbClient.id,
        name: dbClient.name,
        type: clientTypeLabels[dbClient.clientType] ?? "기타",
        contact: primaryContact?.name ?? "-",
        phone: primaryContact?.phone ?? dbClient.phone ?? "-",
        email: primaryContact?.email ?? dbClient.email ?? "-",
        address: dbClient.address ?? "",
        businessNumber: dbClient.businessNumber ?? "",
        website: dbClient.website ?? "",
        memo: dbClient.memo ?? "",
        contracts: dbClient.contracts.length,
        revenue: `${totalRevenue.toLocaleString("ko-KR")}만원`,
        lastMeeting: "-",
        status: "활성"
      },
      contacts: dbClient.contacts.map((contact, index) => ({
        name: contact.name,
        role: contact.position ?? "-",
        department: contact.department ?? "",
        phone: contact.phone ?? "-",
        email: contact.email ?? "-",
        businessCardImageUrl: contact.businessCardImageUrl ?? "",
        ocrConfidence: contact.ocrConfidence ? Number(contact.ocrConfidence) : null,
        primary: index === 0
      })),
      contracts: dbClient.contracts.map((contract) => ({
        title: contract.projectTitle,
        status: contract.contractStatus,
        amount: `${Number(contract.totalAmount).toLocaleString("ko-KR")}만원`,
        due: contract.dueDate ? contract.dueDate.toISOString().slice(0, 10) : "-"
      })),
      activities: [] as ClientActivity[]
    };
  } catch {
    return null;
  }
}
