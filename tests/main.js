import assert from "assert";
import { NotificationPreferences } from "../collections.js";

describe("timeharbor", function () {
  it("package.json has correct name", async function () {
    const { name } = await import("../package.json");
    assert.strictEqual(name, "timeharbor");
  });

  if (Meteor.isClient) {
    it("client is not server", function () {
      assert.strictEqual(Meteor.isServer, false);
    });
  }

  if (Meteor.isServer) {
    it("server is not client", function () {
      assert.strictEqual(Meteor.isClient, false);
    });

    describe("Notification Preferences", function () {
      beforeEach(function () {
        // Clean up any existing test data
        NotificationPreferences.remove({});
      });

      it("should create notification preferences", function () {
        const testUserId = "testUser123";
        const preferences = {
          userId: testUserId,
          projectNotifications: ["team1", "team2"],
          eventTypes: ["time_logging", "project_updates"],
          enabled: true,
          createdAt: new Date()
        };

        const prefId = NotificationPreferences.insert(preferences);
        assert(prefId);

        const savedPref = NotificationPreferences.findOne(prefId);
        assert.strictEqual(savedPref.userId, testUserId);
        assert.strictEqual(savedPref.enabled, true);
        assert.strictEqual(savedPref.projectNotifications.length, 2);
        assert.strictEqual(savedPref.eventTypes.length, 2);
      });

      it("should find preferences by user ID", function () {
        const testUserId = "testUser456";
        const preferences = {
          userId: testUserId,
          projectNotifications: ["team3"],
          eventTypes: ["new_tickets"],
          enabled: false,
          createdAt: new Date()
        };

        NotificationPreferences.insert(preferences);
        
        const foundPref = NotificationPreferences.findOne({ userId: testUserId });
        assert(foundPref);
        assert.strictEqual(foundPref.userId, testUserId);
        assert.strictEqual(foundPref.enabled, false);
      });

      it("should update notification preferences", function () {
        const testUserId = "testUser789";
        const preferences = {
          userId: testUserId,
          projectNotifications: [],
          eventTypes: [],
          enabled: false,
          createdAt: new Date()
        };

        const prefId = NotificationPreferences.insert(preferences);
        
        NotificationPreferences.update(prefId, {
          $set: {
            enabled: true,
            projectNotifications: ["newTeam"],
            eventTypes: ["time_logging"]
          }
        });

        const updatedPref = NotificationPreferences.findOne(prefId);
        assert.strictEqual(updatedPref.enabled, true);
        assert.strictEqual(updatedPref.projectNotifications.length, 1);
        assert.strictEqual(updatedPref.eventTypes.length, 1);
      });
    });
  }
});
