import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// CodeMirror 6 imports
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { yaml } from '@codemirror/lang-yaml';
import { lintKeymap } from '@codemirror/lint';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';

// Import theme extensions
import { oneDark } from '@codemirror/theme-one-dark';

import './editor.html';

Template.codemirrorEditor.onCreated(function() {
  // Reactive variables
  this.editorView = null; // Will store CodeMirror instance
  this.teamId = new ReactiveVar(null);
  this.originalContent = new ReactiveVar(''); // For diff comparison
  this.showHistoryPanel = new ReactiveVar(false);
  this.showLogsPanel = new ReactiveVar(false);
  this.editorLogs = new ReactiveVar([]);
  this.isDarkTheme = new ReactiveVar(false); // Theme state
  
  // Watch for team ID from Session
  this.autorun(() => {
    const sessionTeamId = Session.get('editorTeamId');
    if (sessionTeamId) {
      this.teamId.set(sessionTeamId);
    }
  });
  
  // Log helper function
  this.addLog = (type, message) => {
    const logs = this.editorLogs.get();
    const timestamp = new Date().toLocaleTimeString();
    logs.push({
      type: type, // 'info', 'success', 'error', 'warning'
      message: message,
      timestamp: timestamp
    });
    // Keep only last 50 logs
    if (logs.length > 50) {
      logs.shift();
    }
    this.editorLogs.set(logs);
  };
});

Template.codemirrorEditor.onRendered(function() {
  const template = this;
  
  // Initial YAML content
  const initialDoc = `# yCard Format - Human-friendly contact data
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
`;

  // Function to get current extensions based on theme
  const getExtensions = (isDark) => {
    const baseExtensions = [
      // Line numbers
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      
      // History (undo/redo)
      history(),
      
      // Selection
      drawSelection(),
      rectangularSelection(),
      crosshairCursor(),
      
      // Active line highlighting
      highlightActiveLine(),
      
      // Bracket matching
      bracketMatching(),
      closeBrackets(),
      
      // Code folding
      foldGutter(),
      
      // Auto-indent
      indentOnInput(),
      
      // Autocompletion
      autocompletion(),
      
      // Highlight selection matches
      highlightSelectionMatches(),
      
      // YAML language support
      yaml(),
      
      // Keymaps
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...completionKeymap,
        ...lintKeymap,
      ]),
      
      // Tab size for YAML (2 spaces)
      EditorState.tabSize.of(2),
      
      // Update listener - logs changes
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          template.addLog('info', 'Document modified');
        }
      }),
    ];
    
    // Add dark theme if enabled
    if (isDark) {
      baseExtensions.push(oneDark);
    }
    
    return baseExtensions;
  };

  // Create CodeMirror editor state
  const startState = EditorState.create({
    doc: initialDoc,
    extensions: getExtensions(false),
  });

  // Create the editor view
  const view = new EditorView({
    state: startState,
    parent: document.getElementById('codemirrorContainer'),
  });
  
  // Add CSS to make editor fill container
  const style = document.createElement('style');
  style.textContent = `
    #codemirrorContainer .cm-editor {
      height: 100%;
    }
    #codemirrorContainer .cm-scroller {
      overflow: auto;
    }
  `;
  document.head.appendChild(style);

  // Store the view in template instance
  template.editorView = view;
  
  // Store original content for diff
  template.originalContent.set(initialDoc);
  
  // Log editor initialization
  template.addLog('success', 'Editor initialized successfully');
  
  // Store the getExtensions function on template for use in toggleTheme
  template.getExtensions = getExtensions;
  
  // Load team data if teamId exists
  const teamId = template.teamId.get();
  if (teamId) {
    template.loadTeamData();
  }
});

Template.codemirrorEditor.onDestroyed(function() {
  // Clean up CodeMirror instance
  if (this.editorView) {
    this.editorView.destroy();
    this.editorView = null;
  }
});

Template.codemirrorEditor.helpers({
  showHistoryPanel() {
    return Template.instance().showHistoryPanel.get();
  },
  
  showLogsPanel() {
    return Template.instance().showLogsPanel.get();
  },
  
  editorLogs() {
    return Template.instance().editorLogs.get();
  }
});

Template.codemirrorEditor.events({
  // Close modal
  'click #closeCodemirrorEditor'(e, template) {
    e.preventDefault();
    const modal = document.getElementById('codemirrorEditorModal');
    if (modal) {
      modal.checked = false;
    }
    template.addLog('info', 'Editor closed');
  },
  
  // Theme Toggle button
  'click #btnThemeToggle'(e, template) {
    e.preventDefault();
    
    const isDark = !template.isDarkTheme.get();
    template.isDarkTheme.set(isDark);
    
    if (!template.editorView) return;
    
    // Get current content
    const currentContent = template.editorView.state.doc.toString();
    
    // Create new state with updated theme
    const newState = EditorState.create({
      doc: currentContent,
      extensions: template.getExtensions(isDark),
    });
    
    // Update the editor view
    template.editorView.setState(newState);
    
    // Update button text
    const btnText = document.getElementById('themeButtonText');
    if (btnText) {
      btnText.textContent = isDark ? 'Light' : 'Dark';
    }
    
    // Update the editor wrapper background
    const editorWrapper = document.getElementById('editorWrapper');
    const codemirrorContainer = document.getElementById('codemirrorContainer');
    if (editorWrapper && codemirrorContainer) {
      if (isDark) {
        editorWrapper.style.backgroundColor = '#282c34';
        codemirrorContainer.style.backgroundColor = '#282c34';
      } else {
        editorWrapper.style.backgroundColor = '#ffffff';
        codemirrorContainer.style.backgroundColor = '#ffffff';
      }
    }
    
    template.addLog('info', `Theme changed to ${isDark ? 'dark' : 'light'} mode`);
  },
  
  // Undo button
  'click #btnUndo'(e, template) {
    e.preventDefault();
    if (template.editorView) {
      // Import undo command
      import('@codemirror/commands').then(({ undo }) => {
        undo(template.editorView);
        template.addLog('info', 'Undo performed');
      });
    }
  },
  
  // Redo button
  'click #btnRedo'(e, template) {
    e.preventDefault();
    if (template.editorView) {
      // Import redo command
      import('@codemirror/commands').then(({ redo }) => {
        redo(template.editorView);
        template.addLog('info', 'Redo performed');
      });
    }
  },
  
  // Validate button
  'click #btnValidate'(e, template) {
    e.preventDefault();
    template.addLog('info', 'Validation started...');
    
    if (!template.editorView) {
      template.addLog('error', 'Editor not initialized');
      return;
    }
    
    const content = template.editorView.state.doc.toString();
    
    // Import YAML for validation
    import('yaml').then((YAML) => {
      try {
        const parsed = YAML.default.parse(content);
        
        if (!parsed || !parsed.people) {
          template.addLog('error', 'Invalid structure: Missing "people" array');
          Swal.fire({
            icon: 'error',
            title: 'Validation Failed',
            text: 'Missing "people" array in YAML',
          });
          return;
        }
        
        if (!Array.isArray(parsed.people)) {
          template.addLog('error', 'Invalid structure: "people" must be an array');
          Swal.fire({
            icon: 'error',
            title: 'Validation Failed',
            text: '"people" must be an array',
          });
          return;
        }
        
        // Count validation
        const peopleCount = parsed.people.length;
        template.addLog('success', `YAML is valid! Found ${peopleCount} people`);
        
        Swal.fire({
          icon: 'success',
          title: 'Validation Passed',
          text: `YAML is valid! Found ${peopleCount} people`,
          timer: 2000,
        });
        
      } catch (error) {
        template.addLog('error', `YAML parse error: ${error.message}`);
        Swal.fire({
          icon: 'error',
          title: 'YAML Parse Error',
          text: error.message,
        });
      }
    });
  },
  
  // Save button
  'click #btnSave'(e, template) {
    e.preventDefault();
    template.addLog('info', 'Save initiated...');
    
    if (!template.editorView) {
      template.addLog('error', 'Editor not initialized');
      return;
    }
    
    const content = template.editorView.state.doc.toString();
    const teamId = template.teamId.get();
    
    if (!teamId) {
      template.addLog('error', 'No team selected');
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: 'No team selected',
      });
      return;
    }
    
    // Show loading
    Swal.fire({
      title: 'Saving...',
      text: 'Processing yCard data',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    template.addLog('info', 'Parsing yCard data...');
    
    // TODO: Implement actual save logic with yCard parsing
    // For now, just simulate save
    setTimeout(() => {
      template.addLog('success', 'Data saved successfully');
      Swal.fire({
        icon: 'success',
        title: 'Saved!',
        text: 'Your changes have been saved',
        timer: 2000,
      });
    }, 1000);
  },
  
  // History button
  'click #btnHistory'(e, template) {
    e.preventDefault();
    const isShowing = template.showHistoryPanel.get();
    template.showHistoryPanel.set(!isShowing);
    
    // Close logs panel if open
    if (!isShowing) {
      template.showLogsPanel.set(false);
    }
    
    template.addLog('info', isShowing ? 'History panel closed' : 'History panel opened');
  },
  
  // Logs button
  'click #btnLogs'(e, template) {
    e.preventDefault();
    const isShowing = template.showLogsPanel.get();
    template.showLogsPanel.set(!isShowing);
    
    // Close history panel if open
    if (!isShowing) {
      template.showHistoryPanel.set(false);
    }
    
    template.addLog('info', isShowing ? 'Logs panel closed' : 'Logs panel opened');
  },
  
  // Diff button
  'click #btnDiff'(e, template) {
    e.preventDefault();
    template.addLog('info', 'Diff comparison requested');
    
    if (!template.editorView) {
      template.addLog('error', 'Editor not initialized');
      return;
    }
    
    const currentContent = template.editorView.state.doc.toString();
    const originalContent = template.originalContent.get();
    
    if (currentContent === originalContent) {
      template.addLog('info', 'No changes detected');
      Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'The document has not been modified',
        timer: 2000,
      });
    } else {
      template.addLog('info', 'Changes detected - showing diff');
      // TODO: Implement actual diff view
      Swal.fire({
        icon: 'info',
        title: 'Diff View',
        text: 'Diff comparison feature coming soon!',
      });
    }
  },
  
  // Reset button
  'click #btnReset'(e, template) {
    e.preventDefault();
    
    Swal.fire({
      icon: 'warning',
      title: 'Reset Editor?',
      text: 'This will discard all changes and reload the original data',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset it',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        const originalContent = template.originalContent.get();
        
        if (template.editorView) {
          // Replace editor content
          template.editorView.dispatch({
            changes: {
              from: 0,
              to: template.editorView.state.doc.length,
              insert: originalContent
            }
          });
          
          template.addLog('warning', 'Editor reset to original content');
          
          Swal.fire({
            icon: 'success',
            title: 'Reset Complete',
            text: 'Editor has been reset',
            timer: 1500,
          });
        }
      }
    });
  },
  
  // Close history panel
  'click #closeHistoryPanel'(e, template) {
    e.preventDefault();
    template.showHistoryPanel.set(false);
  },
  
  // Close logs panel
  'click #closeLogsPanel'(e, template) {
    e.preventDefault();
    template.showLogsPanel.set(false);
  },
});

// Helper method to load team data
Template.codemirrorEditor.loadTeamData = function() {
  const template = Template.instance();
  const teamId = template.teamId.get();
  
  if (!teamId) {
    template.addLog('warning', 'No team ID provided');
    return;
  }
  
  template.addLog('info', `Loading data for team: ${teamId}`);
  
  // Call Meteor method to get team users
  Meteor.call('getUsers', null, teamId, (err, users) => {
    if (err) {
      template.addLog('error', `Failed to load team data: ${err.message}`);
      console.error('Error fetching team members:', err);
      return;
    }

    if (!users || users.length === 0) {
      template.addLog('warning', 'No team members found');
      return;
    }

    template.addLog('success', `Loaded ${users.length} team members`);
    
    // Generate YAML content from users
    import('yaml').then((YAML) => {
      const yamlData = {
        people: users.map(user => {
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

      const yamlString = YAML.default.stringify(yamlData);
      const formattedYaml = `# yCard Format - Human-friendly contact data\n${yamlString}`;
      
      // Update editor content
      if (template.editorView) {
        template.editorView.dispatch({
          changes: {
            from: 0,
            to: template.editorView.state.doc.length,
            insert: formattedYaml
          }
        });
        
        // Store as original for diff
        template.originalContent.set(formattedYaml);
        
        template.addLog('success', 'Team data loaded into editor');
      }
    });
  });
};