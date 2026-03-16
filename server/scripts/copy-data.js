require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;

if (!sourceUrl) {
  throw new Error("SOURCE_DATABASE_URL is missing. It can also fall back to DATABASE_URL.");
}

if (!targetUrl) {
  throw new Error("TARGET_DATABASE_URL is missing.");
}

if (sourceUrl === targetUrl) {
  throw new Error("SOURCE_DATABASE_URL and TARGET_DATABASE_URL must be different.");
}

const source = new PrismaClient({
  datasources: {
    db: { url: sourceUrl },
  },
});

const target = new PrismaClient({
  datasources: {
    db: { url: targetUrl },
  },
});

async function main() {
  console.log("Reading source data...");

  const [
    organizations,
    users,
    meetings,
    meetingParticipants,
    orgSettings,
    auditLogs,
    meetingMinutes,
  ] = await Promise.all([
    source.organization.findMany(),
    source.user.findMany(),
    source.meeting.findMany(),
    source.meetingParticipant.findMany(),
    source.orgSettings.findMany(),
    source.auditLog.findMany(),
    source.meetingMinutes.findMany(),
  ]);

  console.log("Source counts:");
  console.log({
    organizations: organizations.length,
    users: users.length,
    meetings: meetings.length,
    meetingParticipants: meetingParticipants.length,
    orgSettings: orgSettings.length,
    auditLogs: auditLogs.length,
    meetingMinutes: meetingMinutes.length,
  });

  console.log("Clearing target data...");
  await target.meetingMinutes.deleteMany();
  await target.meetingParticipant.deleteMany();
  await target.auditLog.deleteMany();
  await target.meeting.deleteMany();
  await target.orgSettings.deleteMany();
  await target.user.deleteMany();
  await target.organization.deleteMany();

  console.log("Writing target data...");
  if (organizations.length) await target.organization.createMany({ data: organizations });
  if (users.length) await target.user.createMany({ data: users });
  if (meetings.length) await target.meeting.createMany({ data: meetings });
  if (meetingParticipants.length) {
    await target.meetingParticipant.createMany({ data: meetingParticipants });
  }
  if (orgSettings.length) await target.orgSettings.createMany({ data: orgSettings });
  if (auditLogs.length) await target.auditLog.createMany({ data: auditLogs });
  if (meetingMinutes.length) await target.meetingMinutes.createMany({ data: meetingMinutes });

  console.log("Data copy complete.");
}

main()
  .catch((error) => {
    console.error("Data copy failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
