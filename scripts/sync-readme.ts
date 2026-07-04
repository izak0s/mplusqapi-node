/**
 * Rewrites the generated-code counts quoted in README.md and regenerates
 * API.md (the full method index) so they never drift from src/generated/.
 * Everything is derived directly from the generated sources (the source of
 * truth), so this is safe to run after every regeneration.
 *
 *   npm run sync:readme
 */
import * as fs from 'fs';
import * as path from 'path';

const projectRoot = path.resolve(__dirname, '..');
const generatedDir = path.join(projectRoot, 'src', 'generated');
const readmePath = path.join(projectRoot, 'README.md');

function countMatches(file: string, re: RegExp): number {
  const text = fs.readFileSync(path.join(generatedDir, file), 'utf8');
  return (text.match(re) ?? []).length;
}

const methods = countMatches('client.ts', /^ {2}async /gm);
const enums = countMatches('types.ts', /^export type \w+ =/gm);
const interfaces = countMatches('types.ts', /^export interface /gm);

let readme = fs.readFileSync(readmePath, 'utf8');
const before = readme;

readme = readme
  .replace(/\d+ typed async methods/g, `${methods} typed async methods`)
  .replace(/\d[\d,]* enum types and [\d,]+\+? interfaces/g, `${enums} enum types and ${interfaces} interfaces`)
  .replace(/all \d+ methods/g, `all ${methods} methods`);

if (readme === before) {
  console.log(`README counts already current (${methods} methods, ${enums} enums, ${interfaces} interfaces).`);
} else {
  fs.writeFileSync(readmePath, readme);
  console.log(`README counts updated: ${methods} methods, ${enums} enums, ${interfaces} interfaces.`);
}

// --- API.md: full method index ---

const clientSource = fs.readFileSync(path.join(generatedDir, 'client.ts'), 'utf8');
const signatures = [...clientSource.matchAll(/^ {2}async (\w+)\((.*)\): (Promise<.*>) \{$/gm)]
  .map(([, name, params, ret]) => ({ name, params: params.replace(/\bT\./g, ''), ret: ret.replace(/\bT\./g, '') }))
  .sort((a, b) => a.name.localeCompare(b.name));

const apiMd = `# MplusKASSA API — method index

All ${signatures.length} SOAP operations of the MplusKASSA API (\`urn:mplusqapi\`), as exposed by
[\`@izak0s/mplusqapi-node\`](https://www.npmjs.com/package/@izak0s/mplusqapi-node) as typed async
methods on \`MplusKassaClient\`. See the [README](README.md) for installation and usage.

Every method also accepts an optional trailing \`requestId?: string\` for debug tracing.
\`Input<T>\` relaxes a response type for use as request input (e.g. \`Date\` fields, plain arrays).

> Auto-generated from \`src/generated/client.ts\` by \`npm run sync:readme\` — do not edit manually.

| Method | Returns |
| --- | --- |
${signatures
  .map(({ name, params, ret }) => {
    const cell = (s: string) => `\`${s}\``.replace(/\|/g, '\\|');
    const paramList = params.replace(/, requestId\?: string$/, '').replace(/^requestId\?: string$/, '');
    return `| ${cell(`${name}(${paramList})`)} | ${cell(ret.replace(/^Promise<(.*)>$/, '$1'))} |`;
  })
  .join('\n')}
`;

const apiMdPath = path.join(projectRoot, 'API.md');
const apiBefore = fs.existsSync(apiMdPath) ? fs.readFileSync(apiMdPath, 'utf8') : '';
if (apiMd === apiBefore) {
  console.log(`API.md already current (${signatures.length} methods).`);
} else {
  fs.writeFileSync(apiMdPath, apiMd);
  console.log(`API.md regenerated (${signatures.length} methods).`);
}
