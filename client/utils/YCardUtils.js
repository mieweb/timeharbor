import yaml from 'js-yaml';

// yCard field definitions for validation and parsing
export const ycardFields = [
  'uid', 'name', 'surname', 'title', 'email', 'org', 'org_unit', 'manager', 'phone', 'address', 'jobs', 'i18n',
  'id', 'nombre', 'apellido', 'puesto', 'correo', 'jefe', '上司', 'displayName', 'lastName', 'role', 'mail', 
  'organization', 'company', 'department', 'ou', 'boss', 'tel', 'adr', 'sn'
];

// Resolve aliases to canonical fields
export function resolveAlias(primary, ...aliases) {
  return primary ?? aliases.find(alias => alias != null);
}

// Normalize a person object to canonical fields
export function normalizePerson(person) {
  if (!person) return null;
  
  return {
    // Core identifiers
    uid: person.uid || person.id,
    
    // Name fields with aliases
    name: person.name || person.nombre || person.displayName,
    surname: person.surname || person.apellido || person.sn || person.lastName,
    
    // Title/position with aliases
    title: person.title || person.puesto || person.role,
    
    // Contact information with aliases
    email: person.email || person.correo || person.mail,
    
    // Organization with aliases
    org: person.org || person.organization || person.company,
    org_unit: person.org_unit || person.department || person.ou,
    
    // Management with aliases
    manager: person.manager || person.jefe || person['上司'] || person.boss,
    
    // Contact details
    phone: person.phone || person.tel,
    address: person.address || person.adr,
    
    // Multi-hat support
    jobs: person.jobs,
    
    // Internationalization
    i18n: person.i18n,
    
    // Keep original data for reference
    _original: person
  };
}

// Parse yCard YAML text into normalized person objects
export function parseYCard(yamlText) {
  try {
    if (!yamlText || yamlText.trim() === '') {
      return { people: [], errors: [] };
    }
    
    const data = yaml.load(yamlText);
    if (!data) {
      return { people: [], errors: ['Empty or invalid YAML'] };
    }
    
    let people = [];
    const errors = [];
    
    // Handle people array format
    if (Array.isArray(data.people)) {
      people = data.people.map((person, idx) => {
        const normalized = normalizePerson(person);
        if (!normalized.uid) {
          errors.push(`Person ${idx + 1}: Missing uid`);
        }
        if (!normalized.name) {
          errors.push(`Person ${idx + 1}: Missing name (or alias)`);
        }
        return normalized;
      }).filter(Boolean);
    }
    // Handle single person object
    else if (typeof data === 'object' && (data.uid || data.name || data.surname)) {
      const normalized = normalizePerson(data);
      if (!normalized.uid) {
        errors.push('Missing uid');
      }
      if (!normalized.name) {
        errors.push('Missing name (or alias)');
      }
      people = [normalized];
    }
    // Handle root-level people properties (backward compatibility)
    else if (typeof data === 'object') {
      // Try to extract people from other possible structures
      Object.keys(data).forEach(key => {
        if (Array.isArray(data[key])) {
          data[key].forEach((person, idx) => {
            const normalized = normalizePerson(person);
            if (normalized && (normalized.uid || normalized.name)) {
              people.push(normalized);
            }
          });
        }
      });
    }
    
    return { people, errors };
  } catch (error) {
    return { people: [], errors: [error.message || 'YAML parsing error'] };
  }
}

// Generate yCard YAML from person objects
export function generateYCard(people) {
  if (!Array.isArray(people) || people.length === 0) {
    return '';
  }
  
  const yamlData = {
    people: people.map(person => {
      // Remove internal fields and return clean object
      const { _original, ...cleanPerson } = person;
      // Remove undefined/null values
      return Object.fromEntries(
        Object.entries(cleanPerson).filter(([_, value]) => value != null && value !== '')
      );
    })
  };
  
  try {
    return yaml.dump(yamlData, { indent: 2, lineWidth: 120 });
  } catch (error) {
    console.error('Error generating yCard YAML:', error);
    return '';
  }
}

// Build organizational hierarchy from people data
export function buildHierarchy(people) {
  if (!Array.isArray(people)) return [];
  
  const personMap = new Map();
  const roots = [];
  
  // Create person map
  people.forEach(person => {
    personMap.set(person.uid, { ...person, children: [] });
  });
  
  // Build hierarchy
  people.forEach(person => {
    const personData = personMap.get(person.uid);
    if (person.manager && personMap.has(person.manager)) {
      const manager = personMap.get(person.manager);
      manager.children.push(personData);
    } else {
      roots.push(personData);
    }
  });
  
  return roots;
}

// Validate yCard structure and return errors
export function validateYCard(yamlText) {
  const { people, errors } = parseYCard(yamlText);
  
  // Additional validation
  const validationErrors = [...errors];
  
  // Check for duplicate UIDs
  const uids = new Set();
  people.forEach((person, idx) => {
    if (person.uid) {
      if (uids.has(person.uid)) {
        validationErrors.push(`Duplicate uid "${person.uid}" found`);
      }
      uids.add(person.uid);
    }
  });
  
  // Check for circular manager references
  const checkCircular = (personUid, visited = new Set()) => {
    if (visited.has(personUid)) {
      return true; // Circular reference found
    }
    
    const person = people.find(p => p.uid === personUid);
    if (!person || !person.manager) {
      return false;
    }
    
    visited.add(personUid);
    return checkCircular(person.manager, visited);
  };
  
  people.forEach(person => {
    if (person.manager && checkCircular(person.uid)) {
      validationErrors.push(`Circular manager reference detected for ${person.uid}`);
    }
  });
  
  return validationErrors;
}

// Create sample yCard for demonstration
export function createSampleYCard() {
  return `# Sample yCard for TimeHarbor Project
people:
  - uid: alice-001
    name: Alice
    surname: Smith
    title: Project Manager
    org: TimeHarbor Team
    org_unit: Leadership
    email: alice.smith@example.com
    phone:
      - number: "+1-555-0101"
        type: work
    manager: null

  - uid: bob-002
    name: Bob
    surname: Johnson
    title: Senior Developer
    org: TimeHarbor Team  
    org_unit: Engineering
    email: bob.johnson@example.com
    phone:
      - number: "+1-555-0102"
        type: work
    manager: alice-001

  - uid: carol-003
    name: Carol
    surname: Wilson
    title: UX Designer
    org: TimeHarbor Team
    org_unit: Design
    email: carol.wilson@example.com
    manager: alice-001

  - uid: david-004
    name: David
    surname: Brown
    title: Junior Developer
    org: TimeHarbor Team
    org_unit: Engineering
    email: david.brown@example.com
    manager: bob-002
`;
}