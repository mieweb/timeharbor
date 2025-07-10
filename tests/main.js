import assert from "assert";
import { Teams } from "../collections.js";

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
      beforeEach(function () {
        // Clear teams collection before each test
        Teams.remove({});
      });
      
      it("should prevent creating teams with duplicate names (case-insensitive)", async function () {
        // Create a test user
        const userId = Accounts.createUser({ username: 'testuser', password: 'password' });
        
        // Set the user context for the method call
        this.userId = userId;
        
        // Create first team
        const teamId1 = await Meteor.call('createTeam', 'Test Project');
        assert(teamId1);
        
        // Try to create a team with the same name (different case)
        try {
          await Meteor.call('createTeam', 'test project');
          assert.fail('Should have thrown an error for duplicate name');
        } catch (error) {
          assert.strictEqual(error.error, 'duplicate-team-name');
          assert(error.reason.includes('A project with this name already exists'));
        }
        
        // Try to create a team with the same name (same case)
        try {
          await Meteor.call('createTeam', 'Test Project');
          assert.fail('Should have thrown an error for duplicate name');
        } catch (error) {
          assert.strictEqual(error.error, 'duplicate-team-name');
          assert(error.reason.includes('A project with this name already exists'));
        }
        
        // Verify only one team was created
        const teams = Teams.find({}).fetch();
        assert.strictEqual(teams.length, 1);
        assert.strictEqual(teams[0].name, 'Test Project');
      });
      
      it("should allow creating teams with different names", async function () {
        // Create a test user
        const userId = Accounts.createUser({ username: 'testuser', password: 'password' });
        
        // Set the user context for the method call
        this.userId = userId;
        
        // Create first team
        const teamId1 = await Meteor.call('createTeam', 'Project A');
        assert(teamId1);
        
        // Create second team with different name
        const teamId2 = await Meteor.call('createTeam', 'Project B');
        assert(teamId2);
        
        // Verify both teams were created
        const teams = Teams.find({}).fetch();
        assert.strictEqual(teams.length, 2);
        
        const teamNames = teams.map(t => t.name).sort();
        assert.deepStrictEqual(teamNames, ['Project A', 'Project B']);
      });
      
      it("should trim whitespace from team names", async function () {
        // Create a test user
        const userId = Accounts.createUser({ username: 'testuser', password: 'password' });
        
        // Set the user context for the method call
        this.userId = userId;
        
        // Create team with whitespace
        const teamId = await Meteor.call('createTeam', '  Test Project  ');
        assert(teamId);
        
        // Verify the team was created with trimmed name
        const team = Teams.findOne(teamId);
        assert.strictEqual(team.name, 'Test Project');
      });
    });
  }
});
