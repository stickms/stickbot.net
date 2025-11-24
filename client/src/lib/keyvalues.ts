export type KeyValues = {
  [key: string]: string | KeyValues;
};

export type KVDefinition = {
  value: string | KVMap;
  condition?: string;
  line: number;
  sourceFile?: string;
};

export type KVNode = {
  definitions: KVDefinition[];
};

export type KVMap = {
  [key: string]: KVNode;
};

export function parseKeyValues(text: string): KeyValues {
  // ... (keep existing simple parser or update it? The user only uses the line number one for the editor)
  // For simplicity and safety, let's leave the simple parser as is for now, 
  // but we might need to update it if it's used elsewhere. 
  // Actually, the simple parser returns `KeyValues` which is just a simple object.
  // It doesn't support duplicates/conditionals well in that structure.
  // Let's focus on `parseKeyValuesWithLineNumbers` which is used by the editor.
  
  const root: KeyValues = {};
  const stack: KeyValues[] = [root];
  let currentKey: string | null = null;
  let i = 0;
  const len = text.length;

  function skipWhitespace() {
    while (i < len) {
      const char = text[i];
      if (char === '/' && text[i + 1] === '/') {
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
      i++;
      let str = '';
      while (i < len) {
        if (text[i] === '"') {
          i++;
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

      if (typeof current[currentKey] === 'object') {
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
      }
    } else {
      const key = readString();
      if (!key) continue;

      skipWhitespace();
      if (i < len && text[i] === '[') {
        while (i < len && text[i] !== ']') i++;
        if (i < len) i++;
      }

      skipWhitespace();

      if (i < len && text[i] === '{') {
        currentKey = key;
      } else {
        const value = readString();
        skipWhitespace();
        if (i < len && text[i] === '[') {
          while (i < len && text[i] !== ']') i++;
          if (i < len) i++;
        }
        const current = stack[stack.length - 1];
        current[key] = value;
      }
    }
  }

  return root;
}

export function parseKeyValuesWithLineNumbers(text: string): KVMap {
  const root: KVMap = {};
  const stack: KVMap[] = [root];
  let currentKey: string | null = null;
  let currentKeyLine: number = 0;
  let i = 0;
  const len = text.length;
  let lineNumber = 1;

  function skipWhitespace() {
    while (i < len) {
      const char = text[i];
      if (char === '/' && text[i + 1] === '/') {
        i += 2;
        while (i < len && text[i] !== '\n') {
          i++;
        }
      } else if (char === '\n') {
        lineNumber++;
        i++;
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
      i++;
      let str = '';
      while (i < len) {
        if (text[i] === '"') {
          i++;
          return str;
        }
        if (text[i] === '\\') {
          i++;
          if (i < len) {
            if (text[i] === '\n') lineNumber++;
            str += text[i];
          }
        } else {
          if (text[i] === '\n') lineNumber++;
          str += text[i];
        }
        i++;
      }
      return str;
    } else {
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

  function readCondition(): string | undefined {
    skipWhitespace();
    if (i < len && text[i] === '[') {
      i++; // skip [
      let cond = '';
      while (i < len && text[i] !== ']') {
        if (text[i] === '\n') lineNumber++;
        cond += text[i];
        i++;
      }
      if (i < len) i++; // skip ]
      return cond;
    }
    return undefined;
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
      const newObj: KVMap = {};
      const current = stack[stack.length - 1];

      // If key exists, we might need to merge or append.
      // For objects (sub-sections), we usually merge if they are the same section.
      // But with the new structure, we can just push another definition.
      // However, typical KV behavior for sections with same name is merging.
      // Let's assume we append a new definition which contains the new object.
      
      if (!current[currentKey]) {
        current[currentKey] = { definitions: [] };
      }
      
      // Check if there's a previous definition that is an object to merge with?
      // Actually, let's just add a new definition.
      const newDef: KVDefinition = { value: newObj, line: currentKeyLine };
      current[currentKey].definitions.push(newDef);
      
      stack.push(newObj);
      currentKey = null;
    } else if (char === '}') {
      i++;
      if (stack.length > 1) {
        stack.pop();
      }
    } else {
      const keyLine = lineNumber;
      const key = readString();
      if (!key) continue;

      // Check for conditional on the KEY itself (rare but possible)
      const keyCondition = readCondition();
      // If key has a condition, we should probably store it. 
      // But our structure is Map[Key] -> Definitions.
      // If the key itself is conditional, it might mean the whole block is conditional.
      // For now, let's attach the keyCondition to the definition we are about to create.

      skipWhitespace();

      if (i < len && text[i] === '{') {
        currentKey = key;
        currentKeyLine = keyLine;
        // We'll handle the condition when we process the '{' block?
        // Actually, we need to pass this condition to the next block creation.
        // But `currentKey` is just a string. 
        // Let's ignore key-level conditions for sections for now as they are rare in HUDs.
      } else {
        const value = readString();
        const valueCondition = readCondition();

        const current = stack[stack.length - 1];
        if (!current[key]) {
          current[key] = { definitions: [] };
        }
        
        current[key].definitions.push({
          value,
          condition: valueCondition || keyCondition, // Use either
          line: keyLine
        });
      }
    }
  }

  return root;
}

export function extractBaseIncludes(text: string): string[] {
  const includes: string[] = [];
  const regex = /^\s*#base\s+"([^"]+)"/gm;
  let match;
  while ((match = regex.exec(text)) !== null) {
    includes.push(match[1]);
  }
  return includes;
}

export function mergeKVMap(base: KVMap, override: KVMap): KVMap {
  const result: KVMap = { ...base };
  for (const [key, node] of Object.entries(override)) {
    if (!result[key]) {
      result[key] = node;
    } else {
      // Append definitions from override to base
      // We create a new node to avoid mutating the base
      result[key] = {
        definitions: [...result[key].definitions, ...node.definitions]
      };
    }
  }
  return result;
}

export function checkCondition(condition: string | undefined, platform: string): boolean {
  if (!condition) return true;
  
  const cond = condition.replace(/[\[\]]/g, '');
  const isNegated = cond.startsWith('!');
  const cleanCond = isNegated ? cond.substring(1) : cond;
  const targetPlatform = cleanCond.startsWith('$') ? cleanCond.substring(1) : cleanCond;
  
  const matches = targetPlatform.toUpperCase() === platform;
  return isNegated ? !matches : matches;
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
