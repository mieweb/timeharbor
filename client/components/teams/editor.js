import { Template } from 'meteor/templating';
import './editor.html';

Template.codeEditor.onRendered(function() {
  const self = this;
  
  // Load Monaco from CDN
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js';
  script.onload = function() {
    window.require.config({ 
      paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } 
    });
    
    window.require(['vs/editor/editor.main'], function() {
      self.editor = window.monaco.editor.create(document.getElementById('monaco-editor'), {
        value: 'console.log("Hello Monaco!");',
        language: 'yaml',
        theme: 'vs-dark'
      });
    });
  };
  document.head.appendChild(script);
});

Template.codeEditor.onDestroyed(function() {
  if (this.editor) {
    this.editor.dispose();
  }
});