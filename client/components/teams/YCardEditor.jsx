import { useState, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { DiffEditor } from '@monaco-editor/react'  
import './YCardEditor.css'
import yaml from 'js-yaml'
import React from 'react';

export const YCardEditor = ({
  initialData = null,           // Allow passing initial YAML data
  onSave = null,                // Custom save callback
  onClose = null,               // Custom close callback
  isOpen =true,                // Control visibility from parent
  theme = 'dark'                // Default theme
}) => {
 
  
  const [isDarkTheme, setIsDarkTheme] = useState(theme === 'dark')
  const [showLogsPanel, setShowLogsPanel] = useState(false)  
  const [logs, setLogs] = useState([])
  const [originalContent, setOriginalContent] = useState('')  
  const [showDiffModal, setShowDiffModal] = useState(false)   
  const [modifiedContent, setModifiedContent] = useState('')
  const editorRef = useRef(null)  
  

  const defaultYCard = `# Example yCard
people:
  - uid: user-001
    name: Alice
    surname: Smith
    username: Asmith
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
  - uid: user-002
    name: Bob
    surname: Johnson
    username: Bjohnson
    title: Manager
    org: ExampleCorp
    email: bob.johnson@example.com
    phone:
      - number: "+1-555-1234"
        type: work
    address:
      street: "123 Main St"
      city: "Metropolis"
      state: "CA"
      postal_code: "90210"
      country: "USA"`
  const exampleYCard = initialData || defaultYCard

  const addLog = (type, message) => {
    const timestamp = new Date().toLocaleTimeString()
    const newLog = {
      type: type,
      message: message,
      timestamp: timestamp
    }
    
    setLogs(prevLogs => {
      const updated = [...prevLogs, newLog]
      if (updated.length > 50) {
        updated.shift()
      }
      return updated
    })
  }

  const resetEditor = () => {
    if (editorRef.current) {
      editorRef.current.setValue(exampleYCard)
      setOriginalContent(exampleYCard)
      addLog('info', 'Editor reset to example data')
      alert(' Editor Reset\n\nEditor content has been reset to example data')
    }
  }


  const handleDiff = () => {
    if (!editorRef.current) {
      alert('Editor not ready')
      return
    }

    const currentContent = editorRef.current.getValue()
    
    if (currentContent === originalContent) {
      addLog('info', 'No changes detected')
      alert(' No Changes\n\nThe document has not been modified')
      return
    }
    setModifiedContent(currentContent)
    addLog('info', 'Opening diff view...')
    setShowDiffModal(true)
  }

  const handleValidate = () => {
    if (!editorRef.current) {
      alert('Editor not ready')
      return
    }
    addLog('info', 'Validation started...') 

    const content = editorRef.current.getValue()
    
    try {
      const parsed = yaml.load(content)
      
      if (!parsed || !parsed.people) {
        addLog('error', 'Validation failed: Missing "people" array') 
        alert(' Invalid YAML\n\nMissing "people" array')
        return
      }
      
      if (!Array.isArray(parsed.people)) {
        addLog('error', 'Validation failed: "people" must be an array')
        alert(' Invalid YAML\n\n"people" must be an array')
        return
      }

      for (let i = 0; i < parsed.people.length; i++) {
        const person = parsed.people[i]
        
        if (!person.name || person.name.trim() === '') {
          addLog('error', `Validation failed: Person ${i + 1} missing "name"`)
          alert(` Validation Failed\n\nPerson ${i + 1}: "name" is required`)
          return
        }
        
        if (!person.surname || person.surname.trim() === '') {
          addLog('error', `Validation failed: Person ${i + 1} missing "surname"`)
          alert(` Validation Failed\n\nPerson ${i + 1}: "surname" is required`)
          return
        }
        
        if (!person.uid || person.uid.trim() === '') {
          addLog('error', `Validation failed: Person ${i + 1} missing "uid"`)
          alert(` Validation Failed\n\nPerson ${i + 1}: "uid" is required`)
          return
        }
        
        if (!person.email || person.email.trim() === '') {
          addLog('error', `Validation failed: Person ${i + 1} missing "email"`)
          alert(` Validation Failed\n\nPerson ${i + 1}: "email" is required`)
          return
        }

        if (person.phone && !Array.isArray(person.phone)) {
          addLog('error', `Validation failed: Person ${i + 1} "phone" must be an array`)
          alert(` Validation Failed\n\nPerson ${i + 1}: "phone" must be an array`)
          return
        }

        if (person.address && Array.isArray(person.address)) {
          addLog('error', `Validation failed: Person ${i + 1} "address" should be an object`)
          alert(` Validation Failed\n\nPerson ${i + 1}: "address" should be an object, not an array`)
          return
        }
      }

      const count = parsed.people.length
      addLog('success', `Validation passed! Found ${count} people`)  
      alert(` Valid YAML\n\n${count} people found`)
      
    } catch (error) {
      addLog('error', `YAML parse error: ${error.message}`)
      alert(` Invalid YAML\n\n${error.message}`)
    }
  }

  const handleRefresh = () => {
  const saved = localStorage.getItem('ycard-data')
  
  if (!saved) {
    addLog('warning', 'No saved data found in localStorage')
    alert(' No Saved Data\n\nNo data found in localStorage')
    return
  }
  
  try {
    // Parse JSON back to object
    const parsed = JSON.parse(saved)
    
    // Convert back to YAML
    const yamlContent = yaml.dump(parsed)
    
    // Set in editor
    if (editorRef.current) {
      editorRef.current.setValue(yamlContent)
      setOriginalContent(yamlContent)  // Update original too
      addLog('success', 'Data loaded from localStorage')
      alert(' Data Loaded\n\nData loaded from localStorage')
    }
  } catch (error) {
    addLog('error', `Error loading data: ${error.message}`)
    alert(` Error Loading Data\n\n${error.message}`)
  }
 }

  const handleSave = () => {
    if (!editorRef.current) {
      alert('Editor not ready')
      return
    }

    addLog('info', 'Save initiated...')
    const content = editorRef.current.getValue()
    
    try {
      const parsed = yaml.load(content)
      
      if (!parsed || !parsed.people) {
        addLog('error', 'Save failed: Missing "people" array')
        alert(' Cannot Save\n\nMissing "people" array in YAML')
        return
      }
      
      if (!Array.isArray(parsed.people)) {
        addLog('error', 'Save failed: "people" must be an array')
        alert(' Cannot Save\n\n"people" must be an array')
        return
      }
      
      for (let i = 0; i < parsed.people.length; i++) {
        const person = parsed.people[i]
        
        if (!person.name || person.name.trim() === '') {
          addLog('error', `Save failed: Person ${i + 1} missing "name"`)
          alert(` Cannot Save\n\nPerson ${i + 1}: "name" is required`)
          return
        }
        
        if (!person.surname || person.surname.trim() === '') {
          addLog('error', `Save failed: Person ${i + 1} missing "surname"`)
          alert(` Cannot Save\n\nPerson ${i + 1}: "surname" is required`)
          return
        }
        
        if (!person.uid || person.uid.trim() === '') {
          addLog('error', `Save failed: Person ${i + 1} missing "uid"`)
          alert(` Cannot Save\n\nPerson ${i + 1}: "uid" is required`)
          return
        }
        
        if (!person.email || person.email.trim() === '') {
          addLog('error', `Save failed: Person ${i + 1} missing "email"`)
          alert(` Cannot Save\n\nPerson ${i + 1}: "email" is required`)
          return
        }
      }
      
      const jsonData = JSON.stringify(parsed, null, 2)

      if (onSave) {
        addLog('info', 'Calling custom save function...')
        onSave(jsonData, parsed)
        addLog('success', `Data passed to parent via onSave`)
      } else {
        localStorage.setItem('ycard-data', jsonData)
        addLog('success', `Saved ${parsed.people.length} people to localStorage`)
        alert(` Saved Successfully!\n\n${parsed.people.length} people saved to localStorage`)
      }
      
    } catch (error) {
      addLog('error', `Save failed: ${error.message}`)
      alert(` Cannot Save - Invalid YAML\n\n${error.message}`)
    }
  }
  const handleClose = () => {
    
    addLog('info', 'Editor closed')
    if (onClose) {
      onClose()
    }
  }


  if (!isOpen) return null

  return (
    
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2>yCard YAML Editor</h2>
              <button 
                onClick={() => handleClose()}
                className="close-button"
              >
                ✕
              </button>
            </div>
          
            <div className="toolbar">
              <button 
                className="toolbar-btn toolbar-btn-theme"
                onClick={() => setIsDarkTheme(!isDarkTheme)}
              >
                {isDarkTheme ? "☀️ Light" : "🌙 Dark"} 
              </button>
              
              <div className="toolbar-divider"></div>
              
              
              <div className="toolbar-divider"></div>
              
              <button className="toolbar-btn toolbar-btn-validate" onClick={handleValidate}>
                 Validate
              </button>
              <button className="toolbar-btn toolbar-btn-save" onClick={handleSave}>
                 Save
              </button>
              <button className="toolbar-btn toolbar-btn-diff" onClick={handleDiff}>
                ⇄ Diff
              </button>
              <button 
                className="toolbar-btn toolbar-btn-logs" 
                onClick={() => {
                  setShowLogsPanel(!showLogsPanel)
                  addLog('info', showLogsPanel ? 'Logs panel closed' : 'Logs panel opened')
                }}
              >
                 Logs
              </button>
              
              <div className="toolbar-divider"></div>
              
              <button className="toolbar-btn toolbar-btn-reset" onClick={resetEditor}>
                ↻ Reset
              </button>
              <button className="toolbar-btn toolbar-btn-refresh" onClick={handleRefresh}>
                 Refresh
              </button>
            </div>

            <div className="modal-body">
              <div className="editor-container">
                <Editor
                  height="500px"
                  defaultLanguage="yaml"
                  defaultValue={exampleYCard}
                  theme={isDarkTheme ? "vs-dark" : "light"}
                  onMount={(editor) => {
                  editorRef.current = editor
                  
                  // Check if there's saved data
                  const saved = localStorage.getItem('ycard-data')
                  
                  if (saved) {
                    try {
                      const parsed = JSON.parse(saved)
                      const yamlContent = yaml.dump(parsed)
                      editor.setValue(yamlContent)
                      setOriginalContent(yamlContent)
                      addLog('success', 'Loaded saved data from localStorage')
                    } catch (error) {
                      // If error, use default
                      setOriginalContent(exampleYCard)
                      addLog('warning', 'Could not load saved data, using example')
                    }
                  } else {
                    setOriginalContent(exampleYCard)
                    addLog('success', 'Editor initialized with example data')
                  }
                }}
                />
              </div>

              {showLogsPanel && (
                <div className="logs-panel">
                  <div className="logs-header">
                    <h3>Activity Logs</h3>
                    <button 
                      onClick={() => {
                        setShowLogsPanel(false)
                        addLog('info', 'Logs panel closed')
                      }}
                      className="close-panel-btn"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="logs-content">
                    {logs.length === 0 ? (
                      <div className="no-logs">No activity yet</div>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className="log-entry">
                          <span className={`log-icon log-${log.type}`}>
                            {log.type === 'success' && '✓'}
                            {log.type === 'error' && '✗'}
                            {log.type === 'warning' && '⚠'}
                            {log.type === 'info' && 'ℹ'}
                          </span>
                          <span className="log-time">{log.timestamp}</span>
                          <span className="log-message">{log.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        
      

      {/* Diff Modal - OUTSIDE main modal */}
      {showDiffModal && (
        <div className="diff-modal-backdrop">
          <div className="diff-modal-content">
            <div className="diff-header">
              <h2> Compare Changes</h2>
              <button 
                onClick={() => {
                  setShowDiffModal(false)
                  addLog('info', 'Diff view closed')
                }}
                className="close-button"
              >
                ✕ Close
              </button>
            </div>
            
            <div className="diff-labels">
              <div className="diff-label-left">Original Content</div>
              <div className="diff-label-right">Current Content (Modified)</div>
            </div>
            
            <div className="diff-editor-container">
              <DiffEditor
                height="100%"
                language="yaml"
                original={originalContent}
                modified={modifiedContent}
                theme={isDarkTheme ? "vs-dark" : "light"}
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  enableSplitViewResizing: true,
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

