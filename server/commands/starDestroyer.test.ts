import { Star } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { findLatestEvent } from "@server/test/support";
import starDestroyer from "./starDestroyer";

describe("starDestroyer", () => {
  const ip = "127.0.0.1";

  it("should destroy existing star", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const star = await Star.create({
      teamId: document.teamId,
      documentId: document.id,
      userId: user.id,
      createdById: user.id,
      index: "P",
    });

    await starDestroyer({
      star,
      user,
      ip,
    });

    const count = await Star.count({
      where: {
        userId: user.id,
      },
    });
    expect(count).toEqual(0);

    const event = await findLatestEvent();
    expect(event!.name).toEqual("stars.delete");
    expect(event!.modelId).toEqual(star.id);
  });
});
