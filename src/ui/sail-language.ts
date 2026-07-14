/**
 * Minimal SAIL syntax highlighting for CodeMirror 6 via StreamLanguage — no
 * Lezer grammar (PLAN.md §5). Best-effort token domains: strings (with `""`
 * escaping), numbers, booleans/null, function names, variable/record refs,
 * operators.
 */

import { StreamLanguage, LanguageSupport } from '@codemirror/language';

const VAR_DOMAINS = 'ri|local|pv|ac|cons|rule|fv|tp|rf|rp|pp';

const sailLanguage = StreamLanguage.define<Record<string, never>>({
  token(stream) {
    if (stream.eatSpace()) return null;

    // Block comment /* ... */
    if (stream.match('/*')) {
      while (!stream.eol()) {
        if (stream.match('*/')) break;
        stream.next();
      }
      return 'comment';
    }

    // String literal with "" escaping.
    if (stream.peek() === '"') {
      stream.next();
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === '"') {
          if (stream.peek() === '"') {
            stream.next();
            continue;
          }
          break;
        }
      }
      return 'string';
    }

    if (stream.match(/^\d+(\.\d+)?/)) return 'number';
    if (stream.match(/^(true|false|null)\b/)) return 'atom';

    // Record type reference.
    if (stream.match(/^recordType!/)) {
      stream.match(/^[A-Za-z0-9_.]+/);
      return 'typeName';
    }
    // Variable reference domain!name.
    if (stream.match(new RegExp(`^(${VAR_DOMAINS})!`))) {
      stream.match(/^[A-Za-z0-9_]+/);
      return 'variableName';
    }
    // Function calls a!name / fn!name.
    if (stream.match(/^(a|fn)!\w+/)) return 'keyword';

    // Identifier — highlight as a function when directly followed by '('.
    if (stream.match(/^[A-Za-z_]\w*/)) {
      return stream.peek() === '(' ? 'keyword' : 'variableName';
    }

    if (stream.match(/^(<=|>=|<>|[+\-*/^&<>=])/)) return 'operator';

    stream.next();
    return null;
  },
});

export function sail(): LanguageSupport {
  return new LanguageSupport(sailLanguage);
}
