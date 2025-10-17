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
  theme = 'dark'               // Default theme
}) => {
 
  
  const [isDarkTheme, setIsDarkTheme] = useState(theme === 'dark')
  const [showLogsPanel, setShowLogsPanel] = useState(false)  
  const [logs, setLogs] = useState([])
  const [originalContent, setOriginalContent] = useState('')  
  const [showDiffModal, setShowDiffModal] = useState(false)   
  const [modifiedContent, setModifiedContent] = useState('')
  
  // NEW: State for cursor tracking
  const [currentPersonIndex, setCurrentPersonIndex] = useState(-1)
  const [cursorLine, setCursorLine] = useState(1)
  const [currentPersonData, setCurrentPersonData] = useState(null)
  
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

  // NEW: Function to extract current person's data from YAML
  const extractPersonData = (personIndex, content) => {
    if (personIndex < 0) {
      return null
    }
    
    try {
      const parsed = yaml.load(content)
      
      if (!parsed || !parsed.people || !Array.isArray(parsed.people)) {
        return null
      }
      
      if (personIndex >= parsed.people.length) {
        return null
      }
      
      const person = parsed.people[personIndex]
      console.log('Extracted person data:', person)
      
      // Return person data with safe fallbacks for missing fields
      return {
        uid: person.uid || person.id || '',
        name: person.name || '',
        surname: person.surname || '',
        username: person.username || '',
        title: person.title || '',
        org: person.org || '',
        email: person.email || '',
        phone: person.phone && Array.isArray(person.phone) && person.phone.length > 0 
          ? person.phone[0].number 
          : '',
        address: person.address ? {
          street: person.address.street || '',
          city: person.address.city || '',
          state: person.address.state || '',
          postal_code: person.address.postal_code || '',
          country: person.address.country || ''
        } : null
      }
     
      
    } catch (error) {
      console.error('Error parsing person data:', error)
      return null
    }
  }

  // NEW: Function to detect which person block the cursor is in
  const detectCurrentPerson = (lineNumber, content) => {
    try {
      const lines = content.split('\n')
      
      // Find all lines that start a person entry (lines with "- uid:")
      const personStarts = []
      lines.forEach((line, index) => {
        if (line.trim().startsWith('- uid:')) {
          personStarts.push(index + 1) // Monaco uses 1-based line numbers
        }
      })
      
      if (personStarts.length === 0) {
        return -1
      }
      
      // Determine which person block the cursor is in
      for (let i = 0; i < personStarts.length; i++) {
        const startLine = personStarts[i]
        const endLine = personStarts[i + 1] ? personStarts[i + 1] - 1 : lines.length
        
        if (lineNumber >= startLine && lineNumber <= endLine) {
          return i // Return person index (0-based)
        }
      }
      
      return -1
    } catch (error) {
      console.error('Error detecting person:', error)
      return -1
    }
  }

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
      const parsed = JSON.parse(saved)
      const yamlContent = yaml.dump(parsed)
      
      if (editorRef.current) {
        editorRef.current.setValue(yamlContent)
        setOriginalContent(yamlContent)
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
    if (onClose) {
      onClose();  
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>yCard YAML Editor</h2>
          <button 
            onClick={() => (handleClose())}
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
          
          {/* NEW: Show current editing position */}
          {currentPersonIndex >= 0 && (
            <>
              <span style={{ 
                padding: '8px 12px', 
                background: '#0e639c', 
                borderRadius: '4px',
                fontSize: '12px',
                color: '#fff'
              }}>
                Editing: Person {currentPersonIndex + 1} (Line {cursorLine})
              </span>
              <div className="toolbar-divider"></div>
            </>
          )}
          
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

        <div className="modal-body modal-body-flex">
          {/* Editor Side */}
          <div className={`editor-container ${currentPersonData ? 'editor-container-flex with-card' : 'editor-container-flex'}`}>
            <Editor
              height="100%"
              defaultLanguage="yaml"
              defaultValue={exampleYCard}
              theme={isDarkTheme ? "vs-dark" : "light"}
              onMount={(editor) => {
                editorRef.current = editor
                
                // NEW: Add cursor position tracking
                editor.onDidChangeCursorPosition((e) => {
                  const line = e.position.lineNumber
                  setCursorLine(line)
                  
                  const content = editor.getValue()
                  const personIndex = detectCurrentPerson(line, content)
                  setCurrentPersonIndex(personIndex)
                  
                  // NEW: Extract person data
                  if (personIndex >= 0) {
                    const personData = extractPersonData(personIndex, content)
                    setCurrentPersonData(personData)
                    addLog('info', `Editing Person ${personIndex + 1}`)
                  } else {
                    setCurrentPersonData(null)
                  }
                })
                
                // NEW: Add content change tracking for live updates
                editor.onDidChangeModelContent(() => {
                  if (currentPersonIndex >= 0) {
                    const content = editor.getValue()
                    const personData = extractPersonData(currentPersonIndex, content)
                    setCurrentPersonData(personData)
                  }
                })
                
                const saved = localStorage.getItem('ycard-data')
                
                if (saved) {
                  try {
                    const parsed = JSON.parse(saved)
                    const yamlContent = yaml.dump(parsed)
                    editor.setValue(yamlContent)
                    setOriginalContent(yamlContent)
                    addLog('success', 'Loaded saved data from localStorage')
                  } catch (error) {
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

          {/* NEW: Card Preview Panel */}
          {currentPersonData && (
            <div className={`card-preview-panel ${isDarkTheme ? 'dark' : 'light'}`}>
              <h3 className={`card-preview-title ${isDarkTheme ? 'dark' : 'light'}`}>
                👤 Card Preview
              </h3>
              
              <div className={`person-card ${isDarkTheme ? 'dark' : 'light'}`}>
                {/* Header Section */}
                <div className={`card-header ${isDarkTheme ? 'dark' : 'light'}`}>
                  <div className="card-header-content">
                    {currentPersonData.uid && (
                        <div className={`card-uid ${isDarkTheme ? 'dark' : 'light'}`} style={{ marginBottom: '8px' }}>
                          ID: {currentPersonData.uid}
                        </div>
                    )}
                    <h2 className={`card-name ${isDarkTheme ? 'dark' : 'light'}`}>
                      {currentPersonData.name || <span className="card-name-placeholder">No name</span>}{' '}
                      {currentPersonData.surname || <span className="card-name-placeholder">No surname</span>}
                    </h2>
                    {currentPersonData.username && (
                      <div className={`card-username ${isDarkTheme ? 'dark' : 'light'}`}>
                        @{currentPersonData.username}
                      </div>
                    )}
                  </div>
                  {currentPersonData.uid && (
                    <span className="card-uid-badge">
                      {currentPersonData.uid}
                    </span>
                  )}
                </div>
                
                {/* Job Info Section */}
                {(currentPersonData.title || currentPersonData.org) && (
                  <div className={`card-job-section ${isDarkTheme ? 'dark' : 'light'}`}>
                    {currentPersonData.title && (
                      <div className={`card-job-title ${isDarkTheme ? 'dark' : 'light'}`}>
                        💼 {currentPersonData.title}
                      </div>
                    )}
                    {currentPersonData.org && (
                      <div className={`card-job-org ${isDarkTheme ? 'dark' : 'light'}`}>
                        🏢 {currentPersonData.org}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Contact Section */}
                <div className="card-contact-section">
                  <div className={`card-section-title ${isDarkTheme ? 'dark' : 'light'}`}>
                    Contact
                  </div>
                  
                  {currentPersonData.email ? (
                    <div className="card-contact-item filled email">
                      📧 {currentPersonData.email}
                    </div>
                  ) : (
                    <div className="card-contact-item empty">
                      📧 No email
                    </div>
                  )}
                  
                  {currentPersonData.phone ? (
                    <div className="card-contact-item filled">
                      📱 {currentPersonData.phone}
                    </div>
                  ) : (
                    <div className="card-contact-item empty">
                      📱 No phone
                    </div>
                  )}
                </div>
                
                {/* Address Section */}
                {currentPersonData.address && (
                  <div className="card-address-section">
                    <div className={`card-section-title ${isDarkTheme ? 'dark' : 'light'}`}>
                      Address
                    </div>
                    <div className={`card-address-content ${isDarkTheme ? 'dark' : 'light'}`}>
                      {currentPersonData.address.street && (
                        <div>📍 {currentPersonData.address.street}</div>
                      )}
                      {(currentPersonData.address.city || currentPersonData.address.state || currentPersonData.address.postal_code) && (
                        <div>
                          {[
                            currentPersonData.address.city,
                            currentPersonData.address.state,
                            currentPersonData.address.postal_code
                          ].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {currentPersonData.address.country && (
                        <div>{currentPersonData.address.country}</div>
                      )}
                      {!currentPersonData.address.street && 
                       !currentPersonData.address.city && 
                       !currentPersonData.address.country && (
                        <div className="card-address-empty">
                          No address details
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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

