import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const confirmation = process.env.CLEAR_OPERATIONAL_DATA;
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

if (confirmation !== "YES") {
  throw new Error(
    "Refusing to clear data. Set CLEAR_OPERATIONAL_DATA=YES and run this script only after confirming the backup."
  );
}

if (!adminEmail) {
  throw new Error("ADMIN_EMAIL is required so the bootstrap administrator can be preserved.");
}

try {
  const administrator = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true }
  });

  if (!administrator) {
    throw new Error(`Administrator ${adminEmail} was not found. No data was deleted.`);
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const notification = await tx.notification.deleteMany({});
    const auditLog = await tx.auditLog.deleteMany({});
    const attachment = await tx.attachment.deleteMany({});
    const meetingAttendee = await tx.meetingAttendee.deleteMany({});
    const actionItem = await tx.actionItem.deleteMany({});
    const meeting = await tx.meeting.deleteMany({});
    const calendarEvent = await tx.calendarEvent.deleteMany({});
    const expense = await tx.expense.deleteMany({});
    const projectContract = await tx.projectContract.deleteMany({});
    const clientContact = await tx.clientContact.deleteMany({});
    const client = await tx.client.deleteMany({});
    const dailyReport = await tx.dailyManagementReport.deleteMany({});

    // Keep the administrator account but remove links to the cleared HR records.
    await tx.user.updateMany({ data: { employeeId: null } });
    const employee = await tx.employee.deleteMany({});

    // Keep only the configured bootstrap administrator account.
    const user = await tx.user.deleteMany({
      where: { email: { not: administrator.email } }
    });

    return {
      notification: notification.count,
      auditLog: auditLog.count,
      attachment: attachment.count,
      meetingAttendee: meetingAttendee.count,
      actionItem: actionItem.count,
      meeting: meeting.count,
      calendarEvent: calendarEvent.count,
      expense: expense.count,
      projectContract: projectContract.count,
      clientContact: clientContact.count,
      client: client.count,
      dailyReport: dailyReport.count,
      employee: employee.count,
      user: user.count
    };
  });

  console.log(`Operational data cleared. Preserved administrator: ${administrator.email}`);
  console.log(JSON.stringify(deleted));
} finally {
  await prisma.$disconnect();
}
