import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Teams } from '../../../collections.js';
import { getUserTeams } from '../../utils/UserTeamUtils.js';

import { parseYCard, yCardToVCard } from 'ycard';
import YAML from 'yaml';

import { stringifyVCard } from 'ycard';



Template.teams.onCreated(function () {
  this.showCreateTeam = new ReactiveVar(false);
  this.showJoinTeam = new ReactiveVar(false);
  this.selectedTeamId = new ReactiveVar(null);
  this.selectedTeamUsers = new ReactiveVar([]);
  this.showYCardEditor = new ReactiveVar(false);

  this.ycardContent = new ReactiveVar('');
  this.showUserSuggestions = new ReactiveVar(false);
  this.userSuggestions = new ReactiveVar([]);
  this.suggestionPosition = new ReactiveVar({ top: 0, left: 0 });
  this.currentCursorPosition = new ReactiveVar(0);

  // Initialize with proper yCard template
  this.ycardContent.set(`# yCard Format - Human-friendly contact data
  people:
    - uid: new-user
      name: Alice
      surname: Smith
      title: Engineer
      org: ExampleCorp
      email: alice.smith@example.com
      phone:
        - number: "+1-555-1234"
          type: work
      address:
        street: "123 Main St"
        city: "Metropolis"
        state: "CA"
        postal_code: "90210"
        country: "USA"
  `);

      
   const org = parseYCard(this.ycardContent.get());

   console.log("Parsed yCard object:", org);
   
   const vcardObjects = yCardToVCard(org);

    
   const vcardString = stringifyVCard(vcardObjects);
    

   console.log("Generated vCard:", vcardString);
          
      

  this.autorun(() => {
    const status = Meteor.status();
    if (!status.connected) {
      console.log('Meteor disconnected:', status);
    }
  });

  this.autorun(() => {
    const selectedId = this.selectedTeamId.get();
    if (selectedId) {
      this.subscribe('teamDetails', selectedId);
      const team = Teams.findOne(selectedId);
      if (team && team.members && team.members.length > 0) {
        Meteor.call('getUsers', team.members, (err, users) => {
          if (!err) {
            this.selectedTeamUsers.set(users);
          } else {
            this.selectedTeamUsers.set([]);
          }
        });
      } else {
        this.selectedTeamUsers.set([]);
      }
    } else {
      this.selectedTeamUsers.set([]);
    }
  });

  // Function to generate YAML from team members
  this.generateYAMLFromTeamMembers = () => {
    const teamId = this.selectedTeamId.get();
    if (!teamId) {
      console.log('No team selected');
      return;
    }

    Meteor.call('getUsers', null, teamId, (err, users) => {
      if (err) {
        console.error('Error fetching team members:', err);
        document.getElementById('editorStatus').textContent = 'Error loading members';
        return;
      }

      if (!users || users.length === 0) {
        document.getElementById('editorStatus').textContent = 'No members to load';
        return;
      }

      // Generate YAML content from users with full structure
      const yamlData = {
        people: users.map(user => {
          console.log("Mapping user to YAML:", user);
          const person = {
            uid: user.id, // MongoDB generated _id
            name: user.firstName || user.username,
            surname: user.lastName || '',
            title: user.title || 'Team Member',
            org: user.organization || 'TimeHarbor',
            email: user.email || `${user.username}@timeharbor.com`
          };

          // Add phone if available
          if (user.phone && user.phone.length > 0) {
            person.phone = user.phone;
          } else {
            person.phone = [{ number: '', type: 'work' }];
          }

          // Add address if available
          if (user.address && user.address.street) {
            person.address = user.address;
          } else {
            person.address = {
              street: '',
              city: '',
              state: '',
              postal_code: '',
              country: 'USA'
            };
          }

          return person;
        })
      };

      // Convert to YAML string
      const yamlString = YAML.stringify(yamlData);
      const formattedYaml = `# yCard Format - Human-friendly contact data\n${yamlString}`;
      
      this.ycardContent.set(formattedYaml);
      document.getElementById('editorStatus').textContent = `Loaded ${users.length} team members`;
    });
  };

  this.searchUsers = (searchTerm, textareaElement) => {
    if (searchTerm.length < 2) return;
    
    Meteor.call('searchUsersByName', searchTerm, (err, users) => {
      if (!err && users) {
        this.userSuggestions.set(users);
        this.showUserSuggestions.set(users.length > 0);
        
        const rect = textareaElement.getBoundingClientRect();
        const cursorPosition = this.getCursorPosition(textareaElement);
        this.suggestionPosition.set({
          top: cursorPosition.top + 20,
          left: cursorPosition.left
        });
      }
    });
  };
  
  this.getCursorPosition = (textarea) => {
    return { top: 100, left: 20 };
  };
  
  this.fillUserData = (user) => {
    const currentContent = this.ycardContent.get();
    const lines = currentContent.split('\n');
    let personBlockStart = -1;
    
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim().startsWith('- uid:')) {
        personBlockStart = i;
        break;
      }
    }
    
    if (personBlockStart !== -1) {
      
      const firstName = user.profile?.firstName || user.username;
      const lastName = user.profile?.lastName || '';
      
      let phoneLines = [];
    if (user.profile?.phone && user.profile.phone.length > 0) {
      phoneLines.push(`    phone:`);
      user.profile.phone.forEach(phone => {
        phoneLines.push(`      - number: "${phone.number || ''}"`);
        phoneLines.push(`        type: ${phone.type || 'work'}`);
      });
    } else {
      phoneLines = [
        `    phone:`,
        `      - number: ""`,
        `        type: work`
      ];
    }
    
    // Build address lines
    let addressLines = [];
    if (user.profile?.address && user.profile.address.street) {
      addressLines = [
        `    address:`,
        `      street: "${user.profile.address.street || ''}"`,
        `      city: "${user.profile.address.city || ''}"`,
        `      state: "${user.profile.address.state || ''}"`,
        `      postal_code: "${user.profile.address.postal_code || ''}"`,
        `      country: "${user.profile.address.country || 'USA'}"`
      ];
    } else {
      addressLines = [
        `    address:`,
        `      street: ""`,
        `      city: ""`,
        `      state: ""`,
        `      postal_code: ""`,
        `      country: "USA"`
      ];
    }
    
    const newPersonBlock = [
      `  - uid: ${user._id}`,
      `    name: ${firstName}`,
      `    surname: ${lastName}`,
      `    title: ${user.profile?.title || 'Team Member'}`,
      `    org: ${user.profile?.organization || 'TimeHarbor'}`,
      `    email: ${user.profile?.email || user.username + '@timeharbor.com'}`,
      ...phoneLines,
      ...addressLines
    ];
    
    let personBlockEnd = personBlockStart;
    for (let i = personBlockStart + 1; i < lines.length; i++) {
      if (lines[i].trim().startsWith('- uid:') || (!lines[i].startsWith('    ') && lines[i].trim() !== '')) {
        break;
      }
      personBlockEnd = i;
    }
      
      const newLines = [
        ...lines.slice(0, personBlockStart),
        ...newPersonBlock,
        ...lines.slice(personBlockEnd + 1)
      ];
      
      this.ycardContent.set(newLines.join('\n'));
      document.getElementById('userLookupStatus').textContent = `Filled data for ${user.username}`;
    }
  };
  
  this.validateYAMLContent = () => {
    const content = this.ycardContent.get();
    try {
      const parsed = YAML.parse(content);
      if (parsed.people && Array.isArray(parsed.people)) {
        document.getElementById('editorStatus').textContent = `YAML Valid ✓ (${parsed.people.length} people)`;
      } else {
        document.getElementById('editorStatus').textContent = 'YAML Invalid - missing people array';
      }
    } catch (e) {
      document.getElementById('editorStatus').textContent = 'YAML Invalid: ' + e.message;
    }
  };
  
  this.formatYAMLContent = () => {
    const content = this.ycardContent.get();
    this.formatYAMLContent = () => {
  const content = this.ycardContent.get();
  
  try {
    // Step 1: Pre-process to fix common structural issues
    let cleanedContent = content
      // Fix "people: - uid:" on same line - split them
      .replace(/people:\s*-\s+/i, 'people:\n  - ')
      // Fix any key: - pattern (array on same line as key)
      .replace(/(\w+):\s+-\s+/g, '$1:\n  - ')
      // Remove multiple consecutive blank lines
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      // Remove trailing whitespace from each line
      .replace(/[ \t]+$/gm, '')
      // Remove leading whitespace before comments
      .replace(/^\s+#/gm, '#')
      // Fix spacing around colons
      .replace(/:\s{2,}/g, ': ')
      .replace(/:\s*([^\s\n])/g, ': $1')
      .trim();
    
    // Step 2: Parse YAML
    const parsed = YAML.parse(cleanedContent);
    
    // Step 3: Validate structure
    if (!parsed || !parsed.people) {
      document.getElementById('editorStatus').textContent = ' Format failed: Invalid structure - missing people array';
      return;
    }
    
    // Step 4: Clean up data
    if (Array.isArray(parsed.people)) {
      parsed.people = parsed.people.map(person => {
        const cleanPerson = {};
        
        Object.keys(person).forEach(key => {
          let value = person[key];
          
          // Trim strings and remove extra spaces
          if (typeof value === 'string') {
            value = value.trim().replace(/\s{2,}/g, ' ');
          }
          
          // Clean phone array
          if (key === 'phone' && Array.isArray(value)) {
            value = value.map(phone => ({
              number: (phone.number || '').toString().trim(),
              type: (phone.type || 'work').toString().trim()
            }));
          }
          
          // Clean address object
          if (key === 'address' && typeof value === 'object' && !Array.isArray(value)) {
            const cleanAddress = {};
            Object.keys(value).forEach(addrKey => {
              cleanAddress[addrKey] = typeof value[addrKey] === 'string' 
                ? value[addrKey].trim() 
                : value[addrKey];
            });
            value = cleanAddress;
          }
          
          cleanPerson[key] = value;
        });
        
        return cleanPerson;
      });
    }
    
    // Step 5: Stringify with proper formatting
    const formatted = YAML.stringify(parsed, {
      indent: 2,
      lineWidth: 80,
      sortKeys: false
    });
    
    // Step 6: Post-process
    let finalFormatted = formatted
      .replace(/[ \t]+$/gm, '')
      .replace(/\n*$/, '\n');
    
    // Step 7: Add header comment
    const withComment = `# yCard Format - Human-friendly contact data\n${finalFormatted}`;
    
    this.ycardContent.set(withComment);
    document.getElementById('editorStatus').textContent = ' Code formatted successfully';
    
  } catch (e) {
    console.error('Format error:', e);
    
    // Better error reporting
    if (e.mark) {
      const lineNum = e.mark.line + 1;
      const colNum = e.mark.column + 1;
      document.getElementById('editorStatus').textContent = 
        ` Format failed at line ${lineNum}, col ${colNum}: ${e.reason || e.message}`;
    } else {
      document.getElementById('editorStatus').textContent = ` Format failed: ${e.message}`;
    }
    }
   };
  };
  
  this.saveYCardData = () => {
    const content = this.ycardContent.get();
    const teamId = this.selectedTeamId.get();
    
    if (!teamId) {
      document.getElementById('editorStatus').textContent = 'Error: No team selected';
      return;
    }
    
    if (!Meteor.status().connected) {
      document.getElementById('editorStatus').textContent = 'Error: Not connected to server';
      return;
    }
    
    document.getElementById('editorStatus').textContent = 'Processing yCard data...';
    
    try {
      // Parse YAML to yCard format
      const yCardData = parseYCard(content);
      console.log('Parsed yCard:', yCardData);
      
      // Convert yCard to vCard
      const vCards = yCardToVCard(yCardData);
      console.log('Generated vCards:', vCards);
      
      // Save to database
      Meteor.call('saveYCardData', teamId, content, vCards, (err, result) => {
        if (err) {
          console.error('Save error:', err);
          document.getElementById('editorStatus').textContent = 'Save failed: ' + (err.reason || err.message);
        } else {
          console.log('Save result:', result);
          
          let statusMessage = result.message;
          
          if (result.errors && result.errors.length > 0) {
            statusMessage += ' Check console for error details.';
            console.warn('yCard processing errors:', result.errors);
          }
          
          document.getElementById('editorStatus').textContent = statusMessage;
          document.getElementById('userLookupStatus').textContent = 
            `Processed ${result.totalProcessed} members with vCard data`;
          
          // Refresh team data
          const currentTeamId = this.selectedTeamId.get();
          this.selectedTeamId.set(null);
          Tracker.afterFlush(() => {
            this.selectedTeamId.set(currentTeamId);
          });
        }
      });
    } catch (parseError) {
      console.error('Parse error:', parseError);
      document.getElementById('editorStatus').textContent = 'Parse failed: ' + parseError.message;
    }
  };


  this.validateYAMLContent = () => {
  const content = this.ycardContent.get();
  const errors = [];
  const warnings = [];
  
  try {
    const parsed = YAML.parse(content);
    
    // Check if people array exists
    if (!parsed.people) {
      errors.push('Missing "people" array');
      document.getElementById('editorStatus').textContent = ' YAML Invalid - missing people array';
      return;
    }
    
    if (!Array.isArray(parsed.people)) {
      errors.push('"people" must be an array');
      document.getElementById('editorStatus').textContent = ' YAML Invalid - people must be an array';
      return;
    }
    
    if (parsed.people.length === 0) {
      warnings.push('No people defined in the array');
    }
    
    // Validate each person
    parsed.people.forEach((person, index) => {
      const personNum = index + 1;
      
      // Required fields
      if (!person.name || person.name.trim() === '') {
        errors.push(`Person ${personNum}: Missing required field "name"`);
      }
      
      if (!person.email || person.email.trim() === '') {
        errors.push(`Person ${personNum}: Missing required field "email"`);
      } else {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(person.email)) {
          errors.push(`Person ${personNum}: Invalid email format "${person.email}"`);
        }
      }
      
      // Optional but recommended fields
      if (!person.uid || person.uid === 'new-user') {
        warnings.push(`Person ${personNum} (${person.name}): No valid uid specified`);
      }
      
      if (!person.surname || person.surname.trim() === '') {
        warnings.push(`Person ${personNum} (${person.name}): Missing surname`);
      }
      
      if (!person.title || person.title.trim() === '') {
        warnings.push(`Person ${personNum} (${person.name}): Missing title`);
      }
      
      // Validate phone structure if present
      if (person.phone) {
        if (!Array.isArray(person.phone)) {
          errors.push(`Person ${personNum} (${person.name}): "phone" must be an array`);
        } else {
          person.phone.forEach((phoneEntry, phoneIndex) => {
            if (typeof phoneEntry !== 'object') {
              errors.push(`Person ${personNum} (${person.name}): Phone entry ${phoneIndex + 1} must be an object`);
            } else {
              if (!phoneEntry.number && phoneEntry.number !== '') {
                errors.push(`Person ${personNum} (${person.name}): Phone entry ${phoneIndex + 1} missing "number" field`);
              }
              if (!phoneEntry.type) {
                warnings.push(`Person ${personNum} (${person.name}): Phone entry ${phoneIndex + 1} missing "type" field`);
              }
            }
          });
        }
      }
      
      // Validate address structure if present
      if (person.address) {
        if (typeof person.address !== 'object' || Array.isArray(person.address)) {
          errors.push(`Person ${personNum} (${person.name}): "address" must be an object`);
        } else {
          const addressFields = ['street', 'city', 'state', 'postal_code', 'country'];
          const missingAddressFields = addressFields.filter(field => !(field in person.address));
          if (missingAddressFields.length > 0) {
            warnings.push(`Person ${personNum} (${person.name}): Address missing fields: ${missingAddressFields.join(', ')}`);
          }
        }
      }
    });
    
    // Display results
    if (errors.length > 0) {
      const errorMsg = ` YAML Invalid - ${errors.length} error(s) found:\n${errors.join('\n')}`;
      document.getElementById('editorStatus').textContent = errorMsg;
      console.error('Validation errors:', errors);
      
      if (warnings.length > 0) {
        console.warn('Validation warnings:', warnings);
      }
    } else if (warnings.length > 0) {
      const warningMsg = ` YAML Valid but has ${warnings.length} warning(s) - Check console`;
      document.getElementById('editorStatus').textContent = warningMsg;
      console.warn('Validation warnings:', warnings);
    } else {
      document.getElementById('editorStatus').textContent = ` YAML Valid - ${parsed.people.length} people, no issues found`;
    }
    
  } catch (e) {
    document.getElementById('editorStatus').textContent = ` YAML Parse Error: ${e.message}`;
    console.error('YAML parse error:', e);
  }
};







});

Template.teams.helpers({
  showCreateTeam() {
    return Template.instance().showCreateTeam.get();
  },
  showJoinTeam() {
    return Template.instance().showJoinTeam.get();
  },
  userTeams: getUserTeams,
  selectedTeam() {
    const id = Template.instance().selectedTeamId.get();
    const queriedTeam = id ? Teams.findOne(id) : null;
    if (!queriedTeam) return null;
    return {
      name: queriedTeam.name,
      code: queriedTeam.code,
      members: Template.instance().selectedTeamUsers.get(),
      admins: queriedTeam.admins,
      leader: queriedTeam.leader,
      createdAt: queriedTeam.createdAt,
    };
  },
  showYCardEditor() {
    return Template.instance().showYCardEditor.get();
  },
  ycardContent() {
    return Template.instance().ycardContent.get();
  },
  showUserSuggestions() {
    return Template.instance().showUserSuggestions.get();
  },
  userSuggestions() {
    return Template.instance().userSuggestions.get();
  },
  suggestionTop() {
    return Template.instance().suggestionPosition.get().top;
  },
  suggestionLeft() {
    return Template.instance().suggestionPosition.get().left;
  },
  isTeamLeader(userId, leaderId) {
    return userId === leaderId;
  }
});

Template.teams.events({
  'click #showCreateTeamForm'(e, t) {
    t.showCreateTeam.set(true);
    t.showJoinTeam && t.showJoinTeam.set(false);
  },
  'click #showJoinTeamForm'(e, t) {
    t.showJoinTeam.set(true);
    t.showCreateTeam && t.showCreateTeam.set(false);
  },
  'click #cancelCreateTeam'(e, t) {
    t.showCreateTeam.set(false);
  },
  'submit #createTeamForm'(e, t) {
    e.preventDefault();
    const teamName = e.target.teamName.value;
    Meteor.call('createTeam', teamName, (err) => {
      if (!err) {
        t.showCreateTeam.set(false);
      } else {
        alert('Error creating team: ' + err.reason);
      }
    });
  },
  'submit #joinTeamForm'(e, t) {
    e.preventDefault();
    const teamCode = e.target.teamCode.value;
    Meteor.call('joinTeamWithCode', teamCode, (err) => {
      if (!err) {
        t.showJoinTeam.set(false);
      } else {
        alert('Error joining team: ' + err.reason);
      }
    });
  },
  'click .team-link'(e, t) {
    e.preventDefault();
    t.selectedTeamId.set(e.currentTarget.dataset.id);
  },
  'click #backToTeams'(e, t) {
    t.selectedTeamId.set(null);
    t.selectedTeamUsers.set([]);
  },
  'click #copyTeamCode'(e, t) {
    const teamId = Template.instance().selectedTeamId.get();
    const joinCode = Teams.findOne(teamId)?.code;
    if (joinCode) {
      navigator.clipboard.writeText(joinCode)
        .then(() => {
          const btn = e.currentTarget;
          const originalText = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          alert('Failed to copy code to clipboard');
        });
    }
  },
  'click #toggleYCardEditor'(e, t) {
    const currentState = t.showYCardEditor.get();
    const newState = !currentState;
    t.showYCardEditor.set(newState);
    
    // Auto-generate YAML from team members when opening editor
    if (newState) {
      setTimeout(() => {
        t.generateYAMLFromTeamMembers();
      }, 100);
    }
  },
  'click #closeYCardEditor'(e, t) {
    t.showYCardEditor.set(false);
    t.showUserSuggestions.set(false);
  },
  'input #ycardEditor'(e, t) {
    const content = e.target.value;
    t.ycardContent.set(content);
    
    const cursorPosition = e.target.selectionStart;
    t.currentCursorPosition.set(cursorPosition);
    
    const lines = content.substring(0, cursorPosition).split('\n');
    const currentLine = lines[lines.length - 1];
    
    const nameMatch = currentLine.match(/name:\s*"?([^"\n]*)"?$/);
    if (nameMatch && nameMatch[1].length >= 2) {
      const searchTerm = nameMatch[1];
      t.searchUsers(searchTerm, e.target);
    } else {
      t.showUserSuggestions.set(false);
    }
  },
  'click .user-suggestion'(e, t) {
    const userId = e.currentTarget.dataset.userId;
    const selectedUser = t.userSuggestions.get().find(u => u._id === userId);
    
    if (selectedUser) {
      t.fillUserData(selectedUser);
    }
    
    t.showUserSuggestions.set(false);
  },
  'click #validateYAML'(e, t) {
    t.validateYAMLContent();
  },
  'click #formatCode'(e, t) {
    t.formatYAMLContent();
  },
  'click #resetEditor'(e, t) {
    t.ycardContent.set(`# yCard Format - Human-friendly contact data
people:
  - uid: "new-user"
    name: "John"      
    surname: "Doe"
    title: "Team Member"
    org: "TimeHarbor"
    email: "john@gmail.com"
    phone:
      - number: "7777777777"
        type: work
    address:
      street: "1234 abby St"
      city: "Belmont"
      state: "California"
      postal_code: "444444"
      country: "USA"`);
    t.showUserSuggestions.set(false);
    document.getElementById('editorStatus').textContent = 'Editor reset';
  },
  'click #saveYCardChanges'(e, t) {
    console.log('Save button clicked');
    console.log('Team ID:', t.selectedTeamId.get());
    console.log('Content length:', t.ycardContent.get().length);
    t.saveYCardData();
  },

  'click .download-vcard-btn'(e, t) {
  e.preventDefault();
  
  // Get the user ID from the button's data attribute
  const userId = e.currentTarget.dataset.userId;
  
  // Find the user in the selected team members
  const members = t.selectedTeamUsers.get();
  const user = members.find(member => member.id === userId);
  
  
  
  if (!user) {
    alert('User not found');
    return;
  }
  
  // Create yCard data for THIS SINGLE USER (not an array)
  const yamlData = {
    people: [{  // Array with one person
      uid: user.id,
      name: user.firstName || user.username,
      surname: user.lastName || '',
      title: user.title || 'Team Member',
      org: user.organization || 'TimeHarbor',
      email: user.email || `${user.username}@timeharbor.com`,
      phone: (user.phone && user.phone.length > 0) ? user.phone : [{ number: '', type: 'work' }],
      address: (user.address && user.address.street) ? user.address : {
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'USA'
      }
    }]
  };
  
  
  
  // Convert to YAML string
  const yamlString = YAML.stringify(yamlData);
  const ycardContent = `# yCard Format - Human-friendly contact data\n${yamlString}`;
  
  
  
  // Parse and convert to vCard
  const org = parseYCard(ycardContent);
  const cards = yCardToVCard(org);
  const vcardString = stringifyVCard(cards,'3.0');
  
  console.log('Generated vCard for ' + user.firstName + ' ' + user.lastName + ':', vcardString);
  
  const blob = new Blob([vcardString], { type: 'text/vcard;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${user.firstName}_${user.lastName}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  
},
 
'click #validateYAML'(e, t) {
    t.validateYAMLContent();
  }

});