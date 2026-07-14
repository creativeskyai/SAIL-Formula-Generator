import { call, kw, pos, raw } from './src/core/builder.ts';
import { serialize, COMPACT } from './src/core/serialize.ts';
const names=['a','b']; const values=['1',''];
const decls = names.map((n,i)=>kw(`local!${n}`, raw(values[i] ?? 'null')));
const node = call('a!localVariables', [...decls, pos(raw('local!a+local!b'))]);
console.log(JSON.stringify(node));
console.log('COMPACT: ' + serialize(node, COMPACT));
console.log('EXPANDED: ' + serialize(node));
