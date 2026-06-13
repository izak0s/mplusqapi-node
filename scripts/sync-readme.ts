/**
 * Rewrites the generated-code counts quoted in README.md so they never drift
 * from src/generated/. Counts are derived directly from the generated sources
 * (the source of truth), so this is safe to run after every regeneration.
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
