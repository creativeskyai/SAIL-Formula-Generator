import { generate } from './src/templates/index';
import { serialize, COMPACT } from './src/core/serialize';
import { validate } from './src/core/validate';
import { catalog } from './src/core/catalog';

const vars = [
  { domain: 'local', name: 'a' },
  { domain: 'local', name: 'b' },
];
const ast = generate('local-variables', { names: ['a','b'], values: ['1',''], body: 'local!a+local!b' }, vars as any);
const out = serialize(ast, COMPACT);
console.log('OUTPUT:', JSON.stringify(out));
try {
  const diags = validate(ast, (catalog as any), vars as any);
  console.log('DIAGS:', JSON.stringify(diags));
} catch(e){ console.log('validate err', String(e)); }
