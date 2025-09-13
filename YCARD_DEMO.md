# yCard Support Demo

TimeHarbor now supports yCard format for managing team contacts! Here's how to use it:

## What is yCard?

yCard is a human-friendly YAML format for representing people, org charts, and contacts. It bridges vCard/iCard and LDAP/X.500 formats with modern YAML workflows.

## How to Use yCard in TimeHarbor

1. **Create or Join a Project/Team**
2. **Go to Team Details** - Click on any team name
3. **Add Contacts** - Click the "Add Contacts" button
4. **Paste yCard YAML** - Use the editor to add your team contacts

## Sample yCard Format

```yaml
# Sample yCard for TimeHarbor Project
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
```

## Features

- **Contact Cards** - Visual display of team members with avatars
- **Organization Chart** - Hierarchical view based on manager relationships  
- **Validation** - Real-time YAML validation with error feedback
- **Aliases Support** - Use Spanish (`nombre`, `apellido`, `jefe`) or other language aliases
- **Responsive Design** - Works on desktop and mobile devices

## yCard Field Reference

### Core Fields
- `uid` - Unique identifier (required)
- `name` - First name (required)
- `surname` - Last name
- `title` - Job title or role
- `email` - Email address
- `phone` - Phone number(s)
- `org` - Organization name
- `org_unit` - Department or unit
- `manager` - Manager's uid (for hierarchy)

### Supported Aliases
- `nombre` → `name` (Spanish)
- `apellido` → `surname` (Spanish)  
- `puesto` → `title` (Spanish)
- `correo` → `email` (Spanish)
- `jefe` → `manager` (Spanish)
- `上司` → `manager` (Japanese)

## Multi-hat Support

yCard supports people with multiple roles:

```yaml
people:
  - uid: jordan
    name: Jordan Kim
    email: jordan@example.com
    org: Acme Corp
    jobs:
      - role: "Head of Developer Relations"
        fte: 0.5
        manager: bob
        org_unit: "Engineering"
        primary: true
      - title: "PM, Platform"
        fte: 0.5
        manager: victor
        org_unit: "Product"
        primary: false
```

## Benefits

1. **Standardized Format** - Use industry-standard yCard format
2. **Hierarchy Visualization** - See org structure at a glance
3. **Easy Editing** - Simple YAML format that's human-readable
4. **Validation** - Catch errors before saving
5. **Flexibility** - Support for multiple languages and formats
6. **Integration** - Built into TimeHarbor team management

## Next Steps

- Click "Load Sample" in the editor to try it out
- Paste your own team data in yCard format
- Use the preview to see how it will look
- Save to add contacts to your project

For more information about yCard format, visit: https://github.com/mieweb/yCard