// Test yCard parsing functionality
import { parseYCard, buildHierarchy, validateYCard, createSampleYCard } from '../client/utils/YCardUtils.js';

describe('yCard Utils', function () {
  
  it('should parse valid yCard YAML', function () {
    const yamlText = `
people:
  - uid: alice-001
    name: Alice
    surname: Smith
    title: Manager
    email: alice@example.com
    manager: null
  - uid: bob-002
    name: Bob
    surname: Johnson
    title: Developer
    email: bob@example.com
    manager: alice-001
`;
    
    const { people, errors } = parseYCard(yamlText);
    
    expect(errors).to.have.length(0);
    expect(people).to.have.length(2);
    expect(people[0].uid).to.equal('alice-001');
    expect(people[0].name).to.equal('Alice');
    expect(people[1].manager).to.equal('alice-001');
  });
  
  it('should handle aliases correctly', function () {
    const yamlText = `
people:
  - uid: alice-001
    nombre: Alice  
    apellido: Smith
    puesto: Manager
    correo: alice@example.com
    jefe: null
`;
    
    const { people, errors } = parseYCard(yamlText);
    
    expect(errors).to.have.length(0);
    expect(people).to.have.length(1);
    expect(people[0].name).to.equal('Alice');
    expect(people[0].surname).to.equal('Smith');
    expect(people[0].title).to.equal('Manager');
    expect(people[0].email).to.equal('alice@example.com');
  });
  
  it('should build hierarchy correctly', function () {
    const people = [
      { uid: 'alice-001', name: 'Alice', manager: null },
      { uid: 'bob-002', name: 'Bob', manager: 'alice-001' },
      { uid: 'carol-003', name: 'Carol', manager: 'alice-001' }
    ];
    
    const hierarchy = buildHierarchy(people);
    
    expect(hierarchy).to.have.length(1);
    expect(hierarchy[0].name).to.equal('Alice');
    expect(hierarchy[0].children).to.have.length(2);
    expect(hierarchy[0].children[0].name).to.equal('Bob');
    expect(hierarchy[0].children[1].name).to.equal('Carol');
  });
  
  it('should validate yCard and return errors', function () {
    const invalidYaml = `
people:
  - name: Alice  # Missing uid
    surname: Smith
  - uid: bob-002  # Missing name
    surname: Johnson
`;
    
    const errors = validateYCard(invalidYaml);
    
    expect(errors).to.have.length.greaterThan(0);
    expect(errors.some(err => err.includes('Missing uid'))).to.be.true;
    expect(errors.some(err => err.includes('Missing name'))).to.be.true;
  });
  
  it('should detect circular references', function () {
    const circularYaml = `
people:
  - uid: alice-001
    name: Alice
    manager: bob-002
  - uid: bob-002
    name: Bob
    manager: alice-001
`;
    
    const errors = validateYCard(circularYaml);
    
    expect(errors.some(err => err.includes('Circular manager reference'))).to.be.true;
  });
  
  it('should create sample yCard', function () {
    const sample = createSampleYCard();
    
    expect(sample).to.be.a('string');
    expect(sample).to.include('people:');
    expect(sample).to.include('uid:');
    expect(sample).to.include('name:');
    
    const { people, errors } = parseYCard(sample);
    expect(errors).to.have.length(0);
    expect(people.length).to.be.greaterThan(0);
  });
  
});