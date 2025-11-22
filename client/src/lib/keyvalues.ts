
export type KeyValues = {
  [key: string]: string | KeyValues;
};

export function parseKeyValues(text: string): KeyValues {
  const root: KeyValues = {};
  const stack: KeyValues[] = [root];
  let currentKey: string | null = null;
  let i = 0;
  const len = text.length;

  function skipWhitespace() {
    while (i < len) {
      const char = text[i];
      if (char === '/' && text[i + 1] === '/') {
        // Comment, skip to end of line
        i += 2;
        while (i < len && text[i] !== '\n') {
          i++;
        }
      } else if (/\s/.test(char)) {
        i++;
      } else {
        break;
      }
    }
  }

  function readString(): string {
    skipWhitespace();
    if (i >= len) return '';

    const char = text[i];
    if (char === '"') {
      i++; // Skip opening quote
      let str = '';
      while (i < len) {
        if (text[i] === '"') {
          i++; // Skip closing quote
          return str;
        }
        if (text[i] === '\\') {
          i++;
          if (i < len) str += text[i];
        } else {
          str += text[i];
        }
        i++;
      }
      return str;
    } else {
      // Unquoted string
      let str = '';
      while (i < len) {
        const c = text[i];
        if (/\s/.test(c) || c === '{' || c === '}' || c === '"') {
          break;
        }
        str += c;
        i++;
      }
      return str;
    }
  }

  while (i < len) {
    skipWhitespace();
    if (i >= len) break;

    const char = text[i];

    if (char === '{') {
      i++;
      if (currentKey === null) {
        throw new Error(`Unexpected '{' at position ${i}`);
      }
      const newObj: KeyValues = {};
      const current = stack[stack.length - 1];
      
      // Handle duplicate keys by merging or overwriting? 
      // Standard KV overwrites or appends. For now, let's overwrite/mix.
      // If it's a list of keys, we might need an array, but KV is usually object-based.
      // Let's assume object structure.
      if (typeof current[currentKey] === 'object') {
         // Merge if already exists and is object
         stack.push(current[currentKey] as KeyValues);
      } else {
         current[currentKey] = newObj;
         stack.push(newObj);
      }
      currentKey = null;
    } else if (char === '}') {
      i++;
      if (stack.length > 1) {
        stack.pop();
      } else {
        // Extra closing brace, ignore or error?
        // console.warn("Extra closing brace");
      }
    } else {
      const key = readString();
      if (!key) {
          // Could be trailing whitespace or end of file
          continue;
      }

      // Check for conditionals like [$WIN32] - ignore for now
      // If the next token starts with [, it's a conditional.
      skipWhitespace();
      if (i < len && text[i] === '[') {
          // Skip conditional
          while(i < len && text[i] !== ']') i++;
          if(i < len) i++; // skip ]
      }

      skipWhitespace();
      
      if (i < len && text[i] === '{') {
        currentKey = key;
        // Next loop will handle '{'
      } else {
        // It's a value
        const value = readString();
        
        // Check for conditionals after value too
        skipWhitespace();
        if (i < len && text[i] === '[') {
            // Skip conditional
            while(i < len && text[i] !== ']') i++;
            if(i < len) i++; // skip ]
        }

        const current = stack[stack.length - 1];
        current[key] = value;
      }
    }
  }

  return root;
}

export function stringifyKeyValues(data: KeyValues, depth = 0): string {
  let output = '';
  const indent = '\t'.repeat(depth);

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null) {
      output += `${indent}"${key}"\n${indent}{\n`;
      output += stringifyKeyValues(value, depth + 1);
      output += `${indent}}\n`;
    } else {
      output += `${indent}"${key}"\t\t"${value}"\n`;
    }
  }

  return output;
}
