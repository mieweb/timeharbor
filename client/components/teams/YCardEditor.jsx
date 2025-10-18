import { useState, useRef, useMemo } from 'react'
import Editor from '@monaco-editor/react'
import { DiffEditor } from '@monaco-editor/react'  
import './YCardEditor.css'
import yaml from 'js-yaml'
import React from 'react';
import YCardManager from './YCardManager.js'

export const YCardEditor = ({
  initialData = null,           // Allow passing initial YAML data
  onSave = null,                // Custom save callback
  onClose = null,               // Custom close callback
  isOpen =true,                // Control visibility from parent
  theme = 'dark'               // Default theme
}) => {
 
  
  // Initialize the manager
  const manager = useMemo(() => new YCardManager(initialData), [initialData])
  
  // UI State
  const [isDarkTheme, setIsDarkTheme] = useState(theme === 'dark')
  const [showLogsPanel, setShowLogsPanel] = useState(false)  
  const [logs, setLogs] = useState([])
  const [showDiffModal, setShowDiffModal] = useState(false)   
  const [modifiedContent, setModifiedContent] = useState('')
  
  // Cursor tracking state
  const [currentPersonIndex, setCurrentPersonIndex] = useState(-1)
  const [cursorLine, setCursorLine] = useState(1)
  const [currentPersonData, setCurrentPersonData] = useState(null)
  
  const editorRef = useRef(null)

  // Logging helper
  const addLog = (type, message) => {
    const timestamp = new Date().toLocaleTimeString()
    const newLog = { type, message, timestamp }
    
    setLogs(prevLogs => {
      const updated = [...prevLogs, newLog]
      if (updated.length > 50) updated.shift()
      return updated
    })
  }

  // Update person data when cursor moves
  const updatePersonData = (lineNumber, content) => {
    const personIndex = manager.detectPersonAtLine(lineNumber, content)
    setCurrentPersonIndex(personIndex)
    
    if (personIndex >= 0) {
      const personData = manager.extractPerson(personIndex, content)
      setCurrentPersonData(personData)
      addLog('info', `Editing Person ${personIndex + 1}`)
    } else {
      setCurrentPersonData(null)
    }
  }

  // Reset editor
  const resetEditor = () => {
    if (!editorRef.current) return
    
    const defaultContent = manager.reset()
    editorRef.current.setValue(defaultContent)
    addLog('info', 'Editor reset to example data')
    alert(' Editor Reset\n\nEditor content has been reset to example data')
  }

  // Show diff
  const handleDiff = () => {
    if (!editorRef.current) {
      alert('Editor not ready')
      return
    }

    const currentContent = editorRef.current.getValue()
    
    if (!manager.hasChanges(currentContent)) {
      addLog('info', 'No changes detected')
      alert('ℹ No Changes\n\nThe document has not been modified')
      return
    }
    
    setModifiedContent(currentContent)
    addLog('info', 'Opening diff view...')
    setShowDiffModal(true)
  }

  // Validate content
  const handleValidate = () => {
    if (!editorRef.current) {
      alert('Editor not ready')
      return
    }
    
    addLog('info', 'Validation started...') 
    const content = editorRef.current.getValue()
    const result = manager.validate(content)
    
    if (result.valid) {
      addLog('success', `Validation passed! Found ${result.count} people`)  
      alert(`✓ Valid YAML\n\n${result.count} people found`)
    } else {
      addLog('error', `Validation failed: ${result.errors[0]}`)
      alert(`✗ Validation Failed\n\n${result.errors[0]}`)
    }
  }

  // Load from localStorage
  const handleRefresh = () => {
    const result = manager.loadFromLocalStorage()
    
    if (result.success) {
      if (editorRef.current) {
        editorRef.current.setValue(result.content)
        manager.updateOriginal(result.content)
        addLog('success', 'Data loaded from localStorage')
        alert('✓ Data Loaded\n\nData loaded from localStorage')
      }
    } else {
      addLog('warning', result.error)
      alert(`ℹ ${result.error}`)
    }
  }

  // Save data
  const handleSave = () => {
    if (!editorRef.current) {
      alert('Editor not ready')
      return
    }

    addLog('info', 'Save initiated...')
    const content = editorRef.current.getValue()
    
    // Validate first
    const validation = manager.validate(content)
    if (!validation.valid) {
      addLog('error', `Save failed: ${validation.errors[0]}`)
      alert(`✗ Cannot Save\n\n${validation.errors[0]}`)
      return
    }
    
    if (onSave) {
      // Use custom save function
      try {
        const parsed = manager.parse(content)
        const jsonData = JSON.stringify(parsed, null, 2)
        addLog('info', 'Calling custom save function...')
        onSave(jsonData, parsed)
        addLog('success', 'Data passed to parent via onSave')
        manager.updateOriginal(content)
      } catch (error) {
        addLog('error', `Save failed: ${error.message}`)
        alert(`✗ Save Failed\n\n${error.message}`)
      }
    } else {
      // Save to localStorage
      const result = manager.saveToLocalStorage(content)
      if (result.success) {
        addLog('success', `Saved ${result.count} people to localStorage`)
        alert(`✓ Saved Successfully!\n\n${result.count} people saved to localStorage`)
        manager.updateOriginal(content)
      } else {
        addLog('error', `Save failed: ${result.error}`)
        alert(`✗ Cannot Save\n\n${result.error}`)
      }
    }
  }

  const handleClose = () => {
    if (onClose) onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>yCard YAML Editor</h2>
          <button onClick={handleClose} className="close-button">✕</button>
        </div>
      
        <div className="toolbar">
          <button 
            className="toolbar-btn toolbar-btn-theme"
            onClick={() => setIsDarkTheme(!isDarkTheme)}
          >
            {isDarkTheme ? "☀️ Light" : "🌙 Dark"} 
          </button>
          
          <div className="toolbar-divider"></div>
          
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
              defaultValue={manager.getDefaultContent()}
              theme={isDarkTheme ? "vs-dark" : "light"}
              onMount={(editor) => {
                editorRef.current = editor
                
                // Cursor position tracking
                editor.onDidChangeCursorPosition((e) => {
                  const line = e.position.lineNumber
                  setCursorLine(line)
                  const content = editor.getValue()
                  updatePersonData(line, content)
                })
                
                // Content change tracking
                editor.onDidChangeModelContent(() => {
                  if (currentPersonIndex >= 0) {
                    const content = editor.getValue()
                    const personData = manager.extractPerson(currentPersonIndex, content)
                    setCurrentPersonData(personData)
                  }
                })
                
                // Load saved data if available
                const loadResult = manager.loadFromLocalStorage()
                if (loadResult.success) {
                  editor.setValue(loadResult.content)
                  manager.updateOriginal(loadResult.content)
                  addLog('success', 'Loaded saved data from localStorage')
                } else {
                  manager.updateOriginal(manager.getDefaultContent())
                  addLog('success', 'Editor initialized with example data')
                }
              }}
            />
          </div>

          {/* Card Preview Panel */}
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
                    <div className={`card-contact-item filled email ${isDarkTheme ? 'dark' : 'light'}`}>
                      📧 {currentPersonData.email}
                    </div>
                  ) : (
                    <div className={`card-contact-item empty ${isDarkTheme ? 'dark' : 'light'}`}>
                      📧 No email
                    </div>
                  )}
                  
                  {currentPersonData.phone ? (
                    <div className={`card-contact-item filled phone ${isDarkTheme ? 'dark' : 'light'}`}>
                      📱 {currentPersonData.phone}
                    </div>
                  ) : (
                    <div className={`card-contact-item empty phone ${isDarkTheme ? 'dark' : 'light'}`}>
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
                original={manager.originalContent}
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

