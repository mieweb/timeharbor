import assert from "assert";
import { Teams, Tickets } from '../collections.js';

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

    describe("Admin Review Functionality", function () {
      let testTeamId, testUserId, testTicketId, otherUserId;

      beforeEach(async function () {
        // Clean up any existing test data
        await Teams.removeAsync({});
        await Tickets.removeAsync({});
        
        // Create test users
        testUserId = 'testuser123';
        otherUserId = 'otheruser456';
        
        // Create a test team with testUserId as leader
        testTeamId = await Teams.insertAsync({
          name: 'Test Team',
          members: [testUserId, otherUserId],
          admins: [testUserId],
          leader: testUserId,
          code: 'TESTCODE',
          createdAt: new Date(),
        });

        // Create a test ticket
        testTicketId = await Tickets.insertAsync({
          teamId: testTeamId,
          title: 'Test Ticket',
          github: 'https://github.com/test/repo',
          accumulatedTime: 3600, // 1 hour
          createdBy: otherUserId,
          createdAt: new Date(),
        });
      });

      afterEach(async function () {
        // Clean up test data
        await Teams.removeAsync({});
        await Tickets.removeAsync({});
      });

      it("should allow team leader to batch update ticket status", async function () {
        // Simulate user context
        const context = { userId: testUserId };
        
        const result = await Meteor.call.bind(context)('batchUpdateTicketStatus', {
          ticketIds: [testTicketId],
          status: 'reviewed',
          teamId: testTeamId
        });

        // Verify ticket was updated
        const updatedTicket = await Tickets.findOneAsync(testTicketId);
        assert.strictEqual(updatedTicket.status, 'reviewed');
        assert.strictEqual(updatedTicket.reviewedBy, testUserId);
        assert.ok(updatedTicket.reviewedAt);
        assert.strictEqual(updatedTicket.updatedBy, testUserId);
        assert.ok(updatedTicket.updatedAt);
      });

      it("should reject unauthorized user trying to batch update", async function () {
        // Simulate unauthorized user context
        const context = { userId: 'unauthorizeduser' };
        
        try {
          await Meteor.call.bind(context)('batchUpdateTicketStatus', {
            ticketIds: [testTicketId],
            status: 'reviewed',
            teamId: testTeamId
          });
          assert.fail('Should have thrown an authorization error');
        } catch (error) {
          assert.strictEqual(error.error, 'not-authorized');
        }
      });

      it("should reject invalid status values", async function () {
        const context = { userId: testUserId };
        
        try {
          await Meteor.call.bind(context)('batchUpdateTicketStatus', {
            ticketIds: [testTicketId],
            status: 'invalid-status',
            teamId: testTeamId
          });
          assert.fail('Should have thrown an invalid status error');
        } catch (error) {
          assert.strictEqual(error.error, 'invalid-status');
        }
      });

      it("should handle batch update of multiple tickets", async function () {
        // Create another test ticket
        const secondTicketId = await Tickets.insertAsync({
          teamId: testTeamId,
          title: 'Second Test Ticket',
          github: '',
          accumulatedTime: 1800, // 30 minutes
          createdBy: testUserId,
          createdAt: new Date(),
        });

        const context = { userId: testUserId };
        
        await Meteor.call.bind(context)('batchUpdateTicketStatus', {
          ticketIds: [testTicketId, secondTicketId],
          status: 'closed',
          teamId: testTeamId
        });

        // Verify both tickets were updated
        const firstTicket = await Tickets.findOneAsync(testTicketId);
        const secondTicket = await Tickets.findOneAsync(secondTicketId);
        
        assert.strictEqual(firstTicket.status, 'closed');
        assert.strictEqual(secondTicket.status, 'closed');
        assert.strictEqual(firstTicket.updatedBy, testUserId);
        assert.strictEqual(secondTicket.updatedBy, testUserId);
      });
    });
  }
});
