import { buildUser, buildTeam, buildAdmin } from "@server/test/factories";
import { setCloudHosted, setSelfHosted } from "@server/test/support";
import { serialize } from "./index";

it.skip("should allow reading only", async () => {
  await setSelfHosted();

  const team = await buildTeam();
  const user = await buildUser({
    teamId: team.id,
  });
  const abilities = serialize(user, team);
  expect(abilities.read).toEqual(true);
  expect(abilities.createTeam).toEqual(false);
  expect(abilities.createAttachment).toEqual(true);
  expect(abilities.createCollection).toEqual(true);
  expect(abilities.createDocument).toEqual(true);
  expect(abilities.createGroup).toEqual(false);
  expect(abilities.createIntegration).toEqual(false);
});

it.skip("should allow admins to manage", async () => {
  await setSelfHosted();

  const team = await buildTeam();
  const admin = await buildAdmin({
    teamId: team.id,
  });
  const abilities = serialize(admin, team);
  expect(abilities.read).toEqual(true);
  expect(abilities.createTeam).toEqual(false);
  expect(abilities.createAttachment).toEqual(true);
  expect(abilities.createCollection).toEqual(true);
  expect(abilities.createDocument).toEqual(true);
  expect(abilities.createGroup).toEqual(true);
  expect(abilities.createIntegration).toEqual(true);
});

it("should allow creation on hosted envs", async () => {
  setCloudHosted();

  const team = await buildTeam();
  const admin = await buildAdmin({
    teamId: team.id,
  });
  const abilities = serialize(admin, team);
  expect(abilities.read).toEqual(true);
  expect(abilities.createTeam).toEqual(true);
  expect(abilities.createAttachment).toEqual(true);
  expect(abilities.createCollection).toEqual(true);
  expect(abilities.createDocument).toEqual(true);
  expect(abilities.createGroup).toEqual(true);
  expect(abilities.createIntegration).toEqual(true);
});
