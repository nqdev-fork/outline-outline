import { faker } from "@faker-js/faker";
import { TeamDomain } from "@server/models";
import {
  buildAdmin,
  buildCollection,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import {
  getTestServer,
  setCloudHosted,
  setSelfHosted,
} from "@server/test/support";

const server = getTestServer();

describe("teams.create", () => {
  it("creates a team", async () => {
    setCloudHosted();

    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const res = await server.post("/api/teams.create", {
      body: {
        token: user.getJwtToken(),
        name: "factory inc",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.team.name).toEqual("factory inc");
    expect(body.data.team.subdomain).toEqual("factory-inc");
  });

  it("requires a cloud hosted deployment", async () => {
    await setSelfHosted();

    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const res = await server.post("/api/teams.create", {
      body: {
        token: user.getJwtToken(),
        name: faker.company.name(),
      },
    });
    expect(res.status).toEqual(402);
  });
});

describe("#team.update", () => {
  it("should update team details", async () => {
    const admin = await buildAdmin();
    const name = faker.company.name();
    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        name,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual(name);
  });

  it("should not invalidate request if subdomain is sent as null", async () => {
    const admin = await buildAdmin();
    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        subdomain: null,
      },
    });
    expect(res.status).not.toBe(400);
  });

  it("should add new allowed Domains, removing empty string values", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const domain1 = faker.internet.domainName();
    const domain2 = faker.internet.domainName();
    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        allowedDomains: [domain1, "", domain2, "", ""],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.allowedDomains.includes(domain1)).toBe(true);
    expect(body.data.allowedDomains.includes(domain2)).toBe(true);

    const teamDomains: TeamDomain[] = await TeamDomain.findAll({
      where: { teamId: team.id },
    });
    expect(teamDomains.map((d) => d.name).includes(domain1)).toBe(true);
    expect(teamDomains.map((d) => d.name).includes(domain2)).toBe(true);
  });

  it("should remove old allowed Domains", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const existingTeamDomain = await TeamDomain.create({
      teamId: team.id,
      name: faker.internet.domainName(),
      createdById: admin.id,
    });

    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        allowedDomains: [],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.allowedDomains).toEqual([]);

    const teamDomains: TeamDomain[] = await TeamDomain.findAll({
      where: { teamId: team.id },
    });
    expect(teamDomains.map((d) => d.name)).toEqual([]);

    expect(await TeamDomain.findByPk(existingTeamDomain.id)).toBeNull();
  });

  it("should add new allowed domains and remove old ones", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const existingTeamDomain = await TeamDomain.create({
      teamId: team.id,
      name: faker.internet.domainName(),
      createdById: admin.id,
    });
    const domain1 = faker.internet.domainName();
    const domain2 = faker.internet.domainName();

    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        allowedDomains: [domain1, domain2],
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.allowedDomains.includes(domain1)).toBe(true);
    expect(body.data.allowedDomains.includes(domain2)).toBe(true);

    const teamDomains: TeamDomain[] = await TeamDomain.findAll({
      where: { teamId: team.id },
    });
    expect(teamDomains.map((d) => d.name).includes(domain1)).toBe(true);
    expect(teamDomains.map((d) => d.name).includes(domain2)).toBe(true);
    expect(await TeamDomain.findByPk(existingTeamDomain.id)).toBeNull();
  });

  it("should only allow member,viewer or admin as default role", async () => {
    const admin = await buildAdmin();
    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        defaultUserRole: "New name",
      },
    });
    expect(res.status).toEqual(400);
    const successRes = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        defaultUserRole: "viewer",
      },
    });
    const body = await successRes.json();
    expect(successRes.status).toEqual(200);
    expect(body.data.defaultUserRole).toBe("viewer");
  });

  it("should allow identical team details", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        name: team.name,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual(team.name);
  });

  it("should require admin", async () => {
    const user = await buildUser();
    const res = await server.post("/api/team.update", {
      body: {
        token: user.getJwtToken(),
        name: faker.company.name(),
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/team.update");
    expect(res.status).toEqual(401);
  });

  it("should update default collection", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: admin.id,
    });

    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        defaultCollectionId: collection.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.defaultCollectionId).toEqual(collection.id);
  });

  it("should default to home if default collection is deleted", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: admin.id,
    });

    await buildCollection({
      teamId: team.id,
      userId: admin.id,
    });

    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        defaultCollectionId: collection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.defaultCollectionId).toEqual(collection.id);

    const deleteRes = await server.post("/api/collections.delete", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
      },
    });
    expect(deleteRes.status).toEqual(200);

    const res3 = await server.post("/api/auth.info", {
      body: {
        token: admin.getJwtToken(),
      },
    });
    const body3 = await res3.json();
    expect(res3.status).toEqual(200);
    expect(body3.data.team.defaultCollectionId).toEqual(null);
  });

  it("should update default collection to null when collection is made private", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: admin.id,
    });

    await buildCollection({
      teamId: team.id,
      userId: admin.id,
    });

    const res = await server.post("/api/team.update", {
      body: {
        token: admin.getJwtToken(),
        defaultCollectionId: collection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.defaultCollectionId).toEqual(collection.id);

    const updateRes = await server.post("/api/collections.update", {
      body: {
        token: admin.getJwtToken(),
        id: collection.id,
        permission: null,
      },
    });

    expect(updateRes.status).toEqual(200);

    const res3 = await server.post("/api/auth.info", {
      body: {
        token: admin.getJwtToken(),
      },
    });
    const body3 = await res3.json();
    expect(res3.status).toEqual(200);
    expect(body3.data.team.defaultCollectionId).toEqual(null);
  });
});
