import { prisma } from "@/lib/prisma";
import {
  clientContacts,
  clientContracts,
  clientDetailActivities,
  clients,
  getClientBySlug
} from "@/lib/clients-data";
import { clientTypeLabels } from "@/lib/client-schema";

type ClientListItem = (typeof clients)[number];

export async function getClientsForList(): Promise<ClientListItem[]> {
  if (!process.env.DATABASE_URL) {
    return clients;
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

    if (dbClients.length === 0) {
      return clients;
    }

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
        memo: client.memo ?? "",
        contracts: client.contracts.length,
        revenue: `${totalRevenue.toLocaleString("ko-KR")}원`,
        lastMeeting: "-",
        status: "활성"
      };
    });
  } catch {
    return clients;
  }
}

export async function getClientDetail(slug: string) {
  const sampleClient = getClientBySlug(slug);

  if (sampleClient) {
    return {
      client: sampleClient,
      contacts: clientContacts,
      contracts: clientContracts,
      activities: clientDetailActivities
    };
  }

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
        memo: dbClient.memo ?? "",
        contracts: dbClient.contracts.length,
        revenue: `${totalRevenue.toLocaleString("ko-KR")}원`,
        lastMeeting: "-",
        status: "활성"
      },
      contacts: dbClient.contacts.map((contact, index) => ({
        name: contact.name,
        role: contact.position ?? "-",
        phone: contact.phone ?? "-",
        email: contact.email ?? "-",
        primary: index === 0
      })),
      contracts: dbClient.contracts.map((contract) => ({
        title: contract.projectTitle,
        status: contract.contractStatus,
        amount: `${Number(contract.totalAmount).toLocaleString("ko-KR")}원`,
        due: contract.dueDate ? contract.dueDate.toISOString().slice(0, 10) : "-"
      })),
      activities: []
    };
  } catch {
    return null;
  }
}
