import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

// The typecheck CI gate runs `vue-tsc --build`, which checks the e2e project
// through e2e/tsconfig.json. Those specs read process.env and import node
// builtins, so the project needs "node" in its types. tsconfig.app.json sets
// types to ["vite/client"] and TypeScript replaces (does not merge) that array
// on extends, so e2e has to restate both entries. Without this the gate fails
// with TS2591 on 'node:fs', 'node:path' and 'process'.
const e2eDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../e2e');

describe('e2e tsconfig', () => {
  it('resolves node types for e2e specs', () => {
    const configPath = resolve(e2eDir, 'tsconfig.json');
    const read = ts.readConfigFile(configPath, (p) => readFileSync(p, 'utf8'));
    expect(read.error).toBeUndefined();

    const { options, errors } = ts.parseJsonConfigFileContent(
      read.config,
      ts.sys,
      e2eDir,
    );
    expect(errors).toEqual([]);

    const types = options.types ?? [];
    expect(types).toContain('node');
    expect(types).toContain('vite/client');
  });
});
