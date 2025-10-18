import yaml from 'js-yaml'

class YCardManager {
  constructor(initialData = null) {
    this.defaultYCard = `# Example yCard
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
      country: "USA"`
    
    this.currentContent = initialData || this.defaultYCard
    this.originalContent = this.currentContent
  }

  // Parse YAML content safely
  parse(content) {
    try {
      return yaml.load(content)
    } catch (error) {
      throw new Error(`YAML parse error: ${error.message}`)
    }
  }

  // Convert object to YAML
  toYAML(obj) {
    try {
      return yaml.dump(obj)
    } catch (error) {
      throw new Error(`YAML dump error: ${error.message}`)
    }
  }

  // Validate yCard structure and data
  validate(content) {
    const errors = []
    
    try {
      const parsed = this.parse(content)
      
      if (!parsed || !parsed.people) {
        errors.push('Missing "people" array')
        return { valid: false, errors }
      }
      
      if (!Array.isArray(parsed.people)) {
        errors.push('"people" must be an array')
        return { valid: false, errors }
      }

      parsed.people.forEach((person, i) => {
        const personNum = i + 1
        
        if (!person.name || person.name.trim() === '') {
          errors.push(`Person ${personNum}: "name" is required`)
        }
        
        if (!person.surname || person.surname.trim() === '') {
          errors.push(`Person ${personNum}: "surname" is required`)
        }
        
        if (!person.uid || person.uid.trim() === '') {
          errors.push(`Person ${personNum}: "uid" is required`)
        }
        
        if (!person.email || person.email.trim() === '') {
          errors.push(`Person ${personNum}: "email" is required`)
        }

        if (person.phone && !Array.isArray(person.phone)) {
          errors.push(`Person ${personNum}: "phone" must be an array`)
        }

        if (person.address && Array.isArray(person.address)) {
          errors.push(`Person ${personNum}: "address" should be an object, not an array`)
        }
      })

      return {
        valid: errors.length === 0,
        errors,
        count: parsed.people.length
      }
      
    } catch (error) {
      errors.push(error.message)
      return { valid: false, errors }
    }
  }

  // Detect which person block contains a specific line
  detectPersonAtLine(lineNumber, content) {
    try {
      const lines = content.split('\n')
      const personStarts = []
      
      lines.forEach((line, index) => {
        if (line.trim().startsWith('- uid:')) {
          personStarts.push(index + 1) // 1-based line numbers
        }
      })
      
      if (personStarts.length === 0) return -1
      
      for (let i = 0; i < personStarts.length; i++) {
        const startLine = personStarts[i]
        const endLine = personStarts[i + 1] ? personStarts[i + 1] - 1 : lines.length
        
        if (lineNumber >= startLine && lineNumber <= endLine) {
          return i
        }
      }
      
      return -1
    } catch (error) {
      console.error('Error detecting person:', error)
      return -1
    }
  }

  // Extract specific person's data
  extractPerson(personIndex, content) {
    if (personIndex < 0) return null
    
    try {
      const parsed = this.parse(content)
      
      if (!parsed?.people || !Array.isArray(parsed.people)) {
        return null
      }
      
      if (personIndex >= parsed.people.length) {
        return null
      }
      
      const person = parsed.people[personIndex]
      
      return {
        uid: person.uid || person.id || '',
        name: person.name || '',
        surname: person.surname || '',
        username: person.username || '',
        title: person.title || '',
        org: person.org || '',
        email: person.email || '',
        phone: person.phone?.[0]?.number || '',
        address: person.address ? {
          street: person.address.street || '',
          city: person.address.city || '',
          state: person.address.state || '',
          postal_code: person.address.postal_code || '',
          country: person.address.country || ''
        } : null
      }
    } catch (error) {
      console.error('Error extracting person:', error)
      return null
    }
  }

  // Save to localStorage
  saveToLocalStorage(content, key = 'ycard-data') {
    try {
      const validation = this.validate(content)
      
      if (!validation.valid) {
        throw new Error(validation.errors[0])
      }
      
      const parsed = this.parse(content)
      const jsonData = JSON.stringify(parsed, null, 2)
      
      localStorage.setItem(key, jsonData)
      
      return {
        success: true,
        count: parsed.people.length,
        data: parsed
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Load from localStorage
  loadFromLocalStorage(key = 'ycard-data') {
    try {
      const saved = localStorage.getItem(key)
      
      if (!saved) {
        return {
          success: false,
          error: 'No saved data found'
        }
      }
      
      const parsed = JSON.parse(saved)
      const yamlContent = this.toYAML(parsed)
      
      return {
        success: true,
        content: yamlContent,
        data: parsed
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Check if content has changes
  hasChanges(currentContent) {
    return currentContent !== this.originalContent
  }

  // Reset content
  reset() {
    this.currentContent = this.defaultYCard
    this.originalContent = this.defaultYCard
    return this.defaultYCard
  }

  // Get example/default content
  getDefaultContent() {
    return this.defaultYCard
  }

  // Update original content (after save)
  updateOriginal(content) {
    this.originalContent = content
  }
}

export default YCardManager