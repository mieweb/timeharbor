import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { Tracker } from 'meteor/tracker';
import { parseYCard, yCardToVCard, stringifyVCard } from 'ycard';
import YAML from 'yaml';

import './editor.html';

Template.ycardEditor.onCreated(function() {
  this.ycardContent = new ReactiveVar('');
  this.showUserSuggestions = new ReactiveVar(false);
  this.userSuggestions = new ReactiveVar([]);
  this.suggestionPosition = new ReactiveVar({ top: 0, left: 0 });
  this.currentCursorPosition = new ReactiveVar(0);
  this.teamId = new ReactiveVar(null);

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

  // Watch for team ID changes from Session
  this.autorun(() => {
    const sessionTeamId = Session.get('editorTeamId');
    if (sessionTeamId) {
      this.teamId.set(sessionTeamId);
    }
  });

  // Function to generate YAML from team members
  this.generateYAMLFromTeamMembers = () => {
    const teamId = this.teamId.get();
    if (!teamId) {
      console.log('No team selected');
      return;
    }

    Meteor.call('getUsers', null, teamId, (err, users) => {
      if (err) {
        console.error('Error fetching team members:', err);
        const statusEl = document.getElementById('editorStatus');
        if (statusEl) statusEl.textContent = 'Error loading members';
        return;
      }

      if (!users || users.length === 0) {
        const statusEl = document.getElementById('editorStatus');
        if (statusEl) statusEl.textContent = 'No members to load';
        return;
      }

      // Generate YAML content from users with full structure
      const yamlData = {
        people: users.map(user => {
          console.log("Mapping user to YAML:", user);
          const person = {
            uid: user.id,
            name: user.firstName || user.username,
            surname: user.lastName || '',
            title: user.title || 'Team Member',
            org: user.organization || 'TimeHarbor',
            email: (user.email && user.email.length > 0) ? user.email : [""]
          };

          if (user.phone && user.phone.length > 0) {
            person.phone = user.phone;
          } else {
            person.phone = [{ number: '', type: 'work' }];
          }

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

      const yamlString = YAML.stringify(yamlData);
      const formattedYaml = `# yCard Format - Human-friendly contact data\n${yamlString}`;
      
      this.ycardContent.set(formattedYaml);
      const statusEl = document.getElementById('editorStatus');
      if (statusEl) statusEl.textContent = `Loaded ${users.length} team members`;
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

      let emailLines = [];
      const userEmail = user.profile?.email || user.emails?.[0]?.address || '';
      if (userEmail) {
        emailLines = [
          `    email:`,
          `      - "${userEmail}"`
        ];
      } else {
        emailLines = [
          `    email:`,
          `      - ""`
        ];
      }
      
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
        ...emailLines,
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
      const statusEl = document.getElementById('userLookupStatus');
      if (statusEl) statusEl.textContent = `Filled data for ${user.username}`;
    }
  };

  this.validateYAMLContent = () => {
    const content = this.ycardContent.get();
    const errors = [];
    const warnings = [];
    
    try {
      const parsed = YAML.parse(content);
      
      if (!parsed.people) {
        errors.push('Missing "people" array');
        const statusEl = document.getElementById('editorStatus');
        if (statusEl) statusEl.textContent = '❌ YAML Invalid - missing people array';
        return;
      }
      
      if (!Array.isArray(parsed.people)) {
        errors.push('"people" must be an array');
        const statusEl = document.getElementById('editorStatus');
        if (statusEl) statusEl.textContent = '❌ YAML Invalid - people must be an array';
        return;
      }
      
      if (parsed.people.length === 0) {
        warnings.push('No people defined in the array');
      }
      
      parsed.people.forEach((person, index) => {
        const personNum = index + 1;
        
        if (!person.name || person.name.trim() === '') {
          errors.push(`Person ${personNum}: Missing required field "name"`);
        }
        
        if (!person.email || person.email.trim() === '') {
          errors.push(`Person ${personNum}: Missing required field "email"`);
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(person.email)) {
            errors.push(`Person ${personNum}: Invalid email format "${person.email}"`);
          }
        }
        
        if (!person.uid || person.uid === 'new-user') {
          warnings.push(`Person ${personNum} (${person.name}): No valid uid specified`);
        }
        
        if (!person.surname || person.surname.trim() === '') {
          warnings.push(`Person ${personNum} (${person.name}): Missing surname`);
        }
        
        if (!person.title || person.title.trim() === '') {
          warnings.push(`Person ${personNum} (${person.name}): Missing title`);
        }
        
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
      
      const statusEl = document.getElementById('editorStatus');
      if (!statusEl) return;
      
      if (errors.length > 0) {
        const errorMsg = `❌ YAML Invalid - ${errors.length} error(s) found:\n${errors.join('\n')}`;
        statusEl.textContent = errorMsg;
        console.error('Validation errors:', errors);
        
        if (warnings.length > 0) {
          console.warn('Validation warnings:', warnings);
        }
      } else if (warnings.length > 0) {
        const warningMsg = `⚠️ YAML Valid but has ${warnings.length} warning(s) - Check console`;
        statusEl.textContent = warningMsg;
        console.warn('Validation warnings:', warnings);
      } else {
        statusEl.textContent = `✅ YAML Valid - ${parsed.people.length} people, no issues found`;
      }
      
    } catch (e) {
      const statusEl = document.getElementById('editorStatus');
      if (statusEl) statusEl.textContent = `❌ YAML Parse Error: ${e.message}`;
      console.error('YAML parse error:', e);
    }
  };

  this.formatYAMLContent = () => {
    const content = this.ycardContent.get();
    
    try {
      let cleanedContent = content
        .replace(/people:\s*-\s+/i, 'people:\n  - ')
        .replace(/(\w+):\s+-\s+/g, '$1:\n  - ')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/^\s+#/gm, '#')
        .replace(/:\s{2,}/g, ': ')
        .replace(/:\s*([^\s\n])/g, ': $1')
        .trim();
      
      const parsed = YAML.parse(cleanedContent);
      
      if (!parsed || !parsed.people) {
        const statusEl = document.getElementById('editorStatus');
        if (statusEl) statusEl.textContent = '❌ Format failed: Invalid structure - missing people array';
        return;
      }
      
      if (Array.isArray(parsed.people)) {
        parsed.people = parsed.people.map(person => {
          const cleanPerson = {};
          
          Object.keys(person).forEach(key => {
            let value = person[key];
            
            if (typeof value === 'string') {
              value = value.trim().replace(/\s{2,}/g, ' ');
            }
            
            if (key === 'phone' && Array.isArray(value)) {
              value = value.map(phone => ({
                number: (phone.number || '').toString().trim(),
                type: (phone.type || 'work').toString().trim()
              }));
            }
            
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
      
      const formatted = YAML.stringify(parsed, {
        indent: 2,
        lineWidth: 80,
        sortKeys: false
      });
      
      let finalFormatted = formatted
        .replace(/[ \t]+$/gm, '')
        .replace(/\n*$/, '\n');
      
      const withComment = `# yCard Format - Human-friendly contact data\n${finalFormatted}`;
      
      this.ycardContent.set(withComment);
      const statusEl = document.getElementById('editorStatus');
      if (statusEl) statusEl.textContent = '✅ Code formatted successfully';
      
    } catch (e) {
      console.error('Format error:', e);
      
      const statusEl = document.getElementById('editorStatus');
      if (!statusEl) return;
      
      if (e.mark) {
        const lineNum = e.mark.line + 1;
        const colNum = e.mark.column + 1;
        statusEl.textContent = `❌ Format failed at line ${lineNum}, col ${colNum}: ${e.reason || e.message}`;
      } else {
        statusEl.textContent = `❌ Format failed: ${e.message}`;
      }
    }
  };

  this.saveYCardData = () => {
    const content = this.ycardContent.get();
    const teamId = this.teamId.get();
    
    if (!teamId) {
      const statusEl = document.getElementById('editorStatus');
      if (statusEl) statusEl.textContent = 'Error: No team selected';
      return;
    }
    
    if (!Meteor.status().connected) {
      const statusEl = document.getElementById('editorStatus');
      if (statusEl) statusEl.textContent = 'Error: Not connected to server';
      return;
    }
    
    const statusEl = document.getElementById('editorStatus');
    if (statusEl) statusEl.textContent = 'Processing yCard data...';
    
    try {
      const yCardData = parseYCard(content);
      console.log('Parsed yCard:', yCardData);
      
      const vCards = yCardToVCard(yCardData);
      console.log('Generated vCards:', vCards);
      
      Meteor.call('saveYCardData', teamId, content, vCards, (err, result) => {
        if (err) {
          console.error('Save error:', err);
          const statusEl = document.getElementById('editorStatus');
          if (statusEl) statusEl.textContent = 'Save failed: ' + (err.reason || err.message);
        } else {
          console.log('Save result:', result);
          
          let statusMessage = result.message;
          
          if (result.errors && result.errors.length > 0) {
            statusMessage += ' Check console for error details.';
            console.warn('yCard processing errors:', result.errors);
          }
          
          const statusEl = document.getElementById('editorStatus');
          const userLookupEl = document.getElementById('userLookupStatus');
          
          if (statusEl) statusEl.textContent = statusMessage;
          if (userLookupEl) userLookupEl.textContent = `Processed ${result.totalProcessed} members with vCard data`;
        }
      });
    } catch (parseError) {
      console.error('Parse error:', parseError);
      const statusEl = document.getElementById('editorStatus');
      if (statusEl) statusEl.textContent = 'Parse failed: ' + parseError.message;
    }
  };
});

Template.ycardEditor.helpers({
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
  }
});

Template.ycardEditor.events({
  'click #closeYCardEditor'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    
    t.showUserSuggestions.set(false);
    
    const modalCheckbox = document.getElementById('ycardEditorModal');
    if (modalCheckbox) {
      modalCheckbox.checked = false;
    }
  },

  'change #ycardEditorModal'(e, t) {
    if (!e.target.checked) {
      t.showUserSuggestions.set(false);
    } else {
      // When modal opens, load team data
      t.generateYAMLFromTeamMembers();
    }
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
    const statusEl = document.getElementById('editorStatus');
    if (statusEl) statusEl.textContent = 'Editor reset';
  },

  'click #saveYCardChanges'(e, t) {
    console.log('Save button clicked');
    console.log('Team ID:', t.teamId.get());
    console.log('Content length:', t.ycardContent.get().length);
    t.saveYCardData();
  }
});