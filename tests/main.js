import assert from "assert";

describe("timeharbor", function () {
  it("package.json has correct name", async function () {
    // We can import from within a test file
    const { name } = await import("../package.json");
    assert.strictEqual(name, "timeharbor");
  });

  if (Meteor.isServer) {
    it("server is not client", function () {
      assert.strictEqual(Meteor.isClient, false);
    });
  }
});