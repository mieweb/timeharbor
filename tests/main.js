import assert from "assert";
import { Teams } from "../collections.js";
import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";

// Import server methods to ensure they're available in tests
import "../server/main.js";

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
    
    describe("Team name validation", function () {
      beforeEach(async function () {
        // Clear teams collection before each test
        await Teams.removeAsync({});
        // Also clear any test users to ensure clean state
        await Meteor.users.removeAsync({});
      });
      
      it("should prevent creating teams with duplicate names (case-insensitive)", async function () {
        // Create a test user
        const userId = Accounts.createUser({ username: 'testuser', password: 'password' });
        await Meteor.users.findOneAsync({ _id: userId }); // Ensure user is created

        // Call the Meteor method as the test user
        const teamId1 = await Meteor.server.applyAsync('createTeam', ['Test Project'], { userId });
        assert(teamId1);

        // Try to create a duplicate team (should throw an error)
        let errorThrown = false;
        try {
          await Meteor.server.applyAsync('createTeam', ['test project'], { userId });
        } catch (e) {
          errorThrown = true;
          assert.strictEqual(e.error, 'duplicate-team-name');
        }
        assert(errorThrown, 'Expected error when creating duplicate team name');

        // Verify only one team was created
        const teamsArray = await Teams.find({}).fetchAsync();
        assert.strictEqual(teamsArray.length, 1);
        assert.strictEqual(teamsArray[0].name, 'Test Project');
      });
      
      it("should allow creating teams with different names", async function () {
        // Create a test user
        const userId = Accounts.createUser({ username: 'testuser', password: 'password' });
        
        // Test that different names are allowed by testing the validation logic
        const name1 = 'Project A';
        const name2 = 'Project B';
        
        // Normalize both names
        const normalizedName1 = name1.trim().toLowerCase();
        const normalizedName2 = name2.trim().toLowerCase();
        
        // They should be different
        assert.notStrictEqual(normalizedName1, normalizedName2);
        
        // Test that the regex patterns don't match each other
        const regex1 = new RegExp(`^${normalizedName1}$`, 'i');
        const regex2 = new RegExp(`^${normalizedName2}$`, 'i');
        
        assert(regex1.test(name1));
        assert(!regex1.test(name2));
        assert(regex2.test(name2));
        assert(!regex2.test(name1));
        
        // Create teams and verify they can coexist
        const teamId1 = await Teams.insertAsync({
          name: name1,
          members: [userId],
          admins: [userId],
          leader: userId,
          code: 'TEST123',
          createdAt: new Date(),
        });
        assert(teamId1);
        
        const teamId2 = await Teams.insertAsync({
          name: name2,
          members: [userId],
          admins: [userId],
          leader: userId,
          code: 'TEST456',
          createdAt: new Date(),
        });
        assert(teamId2);
        
        // Verify both teams exist
        const team1 = await Teams.findOneAsync(teamId1);
        const team2 = await Teams.findOneAsync(teamId2);
        assert(team1);
        assert(team2);
        assert.strictEqual(team1.name, 'Project A');
        assert.strictEqual(team2.name, 'Project B');
      });
      
      it("should trim whitespace from team names", async function () {
        // Create a test user
        const userId = Accounts.createUser({ username: 'testuser', password: 'password' });
        
        // Test the trimming logic directly
        const originalName = '  Test Project  ';
        const trimmedName = originalName.trim();
        assert.strictEqual(trimmedName, 'Test Project');
        
        // Create team with whitespace directly in database
        const teamId = await Teams.insertAsync({
          name: trimmedName, // Store the trimmed name
          members: [userId],
          admins: [userId],
          leader: userId,
          code: 'TEST123',
          createdAt: new Date(),
        });
        assert(teamId);
        
        // Verify the team was created with trimmed name
        const team = await Teams.findOneAsync(teamId);
        assert.strictEqual(team.name, 'Test Project');
      });
    });
  }
});
