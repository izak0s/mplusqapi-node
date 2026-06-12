/**
 * WSDL → TypeScript generator.
 * Reads a WSDL URL or local WSDL file and writes src/generated/{types,serializer,deserializer,client}.ts
 *
 * Run:
 *   npm run generate -- https://api.mpluskassa.nl:PORT/?wsdl
 *   MPLUS_WSDL_URL=https://api.mpluskassa.nl:PORT/?wsdl npm run generate
 *   npm run generate -- wsdl.xml
 */

import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';

// ---------------------------------------------------------------------------
// Types for our intermediate representation
// ---------------------------------------------------------------------------

interface EnumType {
  name: string;
  values: string[];
  doc?: string;
}

interface FieldDef {
  /** TypeScript field name (sanitized, valid identifier) */
  name: string;
  /** Original XML element name (for serialization) */
  xmlName: string;
  /** Resolved TypeScript type (e.g. "string", "number", "Relation", "Date") */
  tsType: string;
  /** Sanitized WSDL type without namespace prefix (for calling serialize/deserialize functions) */
  wsdlType: string;
  optional: boolean;
  array: boolean;
  doc?: string;
}

interface ComplexTypeDef {
  /** TypeScript type name (sanitized) */
  name: string;
  fields: FieldDef[];
  doc?: string;
}

/** Maps complex type name → its single inner array field, for transparent list flattening */
type ListWrapperMap = Map<string, FieldDef>;

/** An input element for an operation — may have 0..N fields */
interface InputElementDef {
  name: string;
  fields: FieldDef[];
}

/** An output element — references a complexType */
interface OutputElementDef {
  name: string;
  typeRef: string;
}

interface OperationDef {
  name: string;
  inputElement: InputElementDef;
  outputElement: OutputElementDef;
  outputTsType: string;
}

// ---------------------------------------------------------------------------
// XSD → TypeScript mapping
// ---------------------------------------------------------------------------

const XSD_PRIMITIVES: Record<string, string> = {
  string: 'string',
  int: 'number',
  long: 'number',
  short: 'number',
  byte: 'number',
  integer: 'number',
  unsignedInt: 'number',
  unsignedLong: 'number',
  unsignedShort: 'number',
  unsignedByte: 'number',
  decimal: 'string',
  float: 'number',
  double: 'number',
  boolean: 'boolean',
  base64Binary: 'string',
  base64: 'string',
  date: 'Date',
  dateTime: 'Date',
  anySimpleType: 'string',
  anyType: 'unknown',
};

/** XSD date/dateTime — stored as ISO string in XML, not a SoapMplusDateTime struct */
const ISO_DATE_WSDL_TYPES = new Set(['date', 'dateTime']);

const DATETIME_TYPES = new Set(['SoapMplusDateTime', 'SoapMplusDate']);

function stripNs(value: string): string {
  const idx = value.indexOf(':');
  return idx >= 0 ? value.slice(idx + 1) : value;
}

/** Convert XML names with hyphens/dots to valid TypeScript identifiers. */
function sanitizeIdent(name: string): string {
  return name.replace(/[-.]([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase())
             .replace(/^-/, '_');
}

function wsdlTypeToTs(rawType: string): string {
  const base = sanitizeIdent(stripNs(rawType));
  if (DATETIME_TYPES.has(base)) return 'Date';
  const primitive = XSD_PRIMITIVES[base];
  return primitive ?? base;
}

function isPrimitive(tsType: string): boolean {
  return ['string', 'number', 'boolean', 'unknown'].includes(tsType);
}

/**
 * Type reference for an input (request) position. Complex types are wrapped in
 * `T.Input<...>` so array fields — required on deserialized responses — become
 * optional when callers build request objects.
 */
function inputTypeRef(tsType: string, wsdlType: string, enumNames: Set<string>): string {
  if (tsType === 'Date') return 'Date';
  if (isPrimitive(tsType)) return tsType;
  if (enumNames.has(wsdlType)) return `T.${tsType}`;
  return `T.Input<T.${tsType}>`;
}

function buildListWrapperMap(complexTypes: ComplexTypeDef[]): ListWrapperMap {
  const map: ListWrapperMap = new Map();
  for (const ct of complexTypes) {
    if (ct.fields.length === 1 && ct.fields[0].array) {
      map.set(ct.name, ct.fields[0]);
    }
  }
  return map;
}

type PrimitiveWrapperMap = Map<string, FieldDef>;

function buildPrimitiveWrapperMap(complexTypes: ComplexTypeDef[]): PrimitiveWrapperMap {
  const map: PrimitiveWrapperMap = new Map();
  for (const ct of complexTypes) {
    if (ct.fields.length === 1 && !ct.fields[0].array &&
        (isPrimitive(ct.fields[0].tsType) || ct.fields[0].tsType === 'Date')) {
      map.set(ct.name, ct.fields[0]);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// WSDL parser
// ---------------------------------------------------------------------------

export function parseWsdl(xml: string): {
  enums: EnumType[];
  complexTypes: ComplexTypeDef[];
  inputElements: Map<string, InputElementDef>;
  outputElements: Map<string, OutputElementDef>;
  operations: OperationDef[];
  skippedOperations: string[];
} {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
    textNodeName: '#text',
    isArray: (name) => [
      'simpleType', 'complexType', 'element', 'enumeration',
      'message', 'operation', 'part',
    ].includes(name),
  });

  const doc = parser.parse(xml) as Record<string, unknown>;
  const definitions = doc['definitions'] as Record<string, unknown>;
  const types = definitions['types'] as Record<string, unknown>;
  const schema = types['schema'] as Record<string, unknown>;

  // --- Simple types (enums) ---
  const enums: EnumType[] = [];
  const enumNames = new Set<string>();
  for (const st of asArray(schema['simpleType'])) {
    const rawName = attr(st, 'name');
    if (!rawName) continue;
    const name = sanitizeIdent(rawName);
    const restriction = st['restriction'] as Record<string, unknown> | undefined;
    if (!restriction) continue;
    const enumerations = asArray(restriction['enumeration']);
    if (enumerations.length === 0) continue;
    const values = enumerations.map((e) => String(attr(e, 'value') ?? ''));
    enums.push({ name, values, doc: extractDoc(st) });
    enumNames.add(name);
  }

  // --- Complex types ---
  // Two passes: collect raw nodes first so complexContent/extension bases can
  // be resolved regardless of declaration order.
  const rawComplexTypes = new Map<string, Record<string, unknown>>();
  for (const ct of asArray(schema['complexType'])) {
    const rawName = attr(ct, 'name');
    if (!rawName) continue;
    rawComplexTypes.set(rawName, ct);
  }

  const complexTypes: ComplexTypeDef[] = [];
  const complexTypeMap = new Map<string, ComplexTypeDef>();
  for (const [rawName, ct] of rawComplexTypes) {
    const name = sanitizeIdent(rawName);
    const fields = extractFields(ct, enumNames, rawComplexTypes);
    const def: ComplexTypeDef = { name, fields, doc: extractDoc(ct) };
    complexTypes.push(def);
    complexTypeMap.set(name, def);
  }

  // --- Elements (input/output wrappers) ---
  const inputElements = new Map<string, InputElementDef>();
  const outputElements = new Map<string, OutputElementDef>();

  for (const el of asArray(schema['element'])) {
    const rawElName = attr(el, 'name');
    if (!rawElName) continue;
    // Keep original name as map key (used to look up by WSDL message references)
    // but sanitize for use as TypeScript identifiers in the name field
    const name = rawElName;

    const typeRef = attr(el, 'type');
    if (typeRef) {
      // Output element referencing a complexType
      const typeName = sanitizeIdent(stripNs(typeRef));
      outputElements.set(name, { name, typeRef: typeName });
    } else {
      // Inline complexType — input element
      // isArray wraps complexType in an array even for inline single occurrences
      const ctRaw = el['complexType'];
      const ct = Array.isArray(ctRaw)
        ? (ctRaw[0] as Record<string, unknown>)
        : (ctRaw as Record<string, unknown> | undefined);
      const fields = ct ? extractFields(ct, enumNames, rawComplexTypes) : [];
      inputElements.set(name, { name, fields });
    }
  }

  // --- Messages ---
  const messageToElement = new Map<string, string>();
  for (const msg of asArray(definitions['message'])) {
    const msgName = attr(msg, 'name');
    if (!msgName) continue;
    for (const part of asArray(msg['part'])) {
      const elementRef = attr(part, 'element');
      if (elementRef) {
        messageToElement.set(msgName, stripNs(elementRef));
      }
    }
  }

  // --- PortType operations (first portType only) ---
  const portTypeRaw = definitions['portType'];
  const portType = Array.isArray(portTypeRaw) ? portTypeRaw[0] : portTypeRaw;
  const operations: OperationDef[] = [];
  const skippedOperations: string[] = [];

  for (const op of asArray((portType as Record<string, unknown>)?.['operation'])) {
    const opName = attr(op, 'name');
    if (!opName) continue;

    const inputMsgRef = stripNs(attr((op as Record<string, unknown>)['input'] as Record<string, unknown>, 'message') ?? '');
    const outputMsgRef = stripNs(attr((op as Record<string, unknown>)['output'] as Record<string, unknown>, 'message') ?? '');

    const inputElementName = messageToElement.get(inputMsgRef) ?? opName;
    const outputElementName = messageToElement.get(outputMsgRef);
    if (!outputElementName) {
      skippedOperations.push(opName);
      continue;
    }

    const inputEl = inputElements.get(inputElementName) ?? { name: inputElementName, fields: [] };
    const outputEl = outputElements.get(outputElementName);
    if (!outputEl) {
      skippedOperations.push(opName);
      continue;
    }

    const outputTsType = outputEl.typeRef;

    operations.push({
      name: opName,
      inputElement: inputEl,
      outputElement: outputEl,
      outputTsType,
    });
  }

  return { enums, complexTypes, inputElements, outputElements, operations, skippedOperations };
}

function extractFields(
  ct: Record<string, unknown>,
  enumNames: Set<string>,
  ctByRawName: Map<string, Record<string, unknown>>,
  seen: Set<string> = new Set(),
): FieldDef[] {
  // complexContent/extension: inherited base fields come first (XSD order),
  // then the extension's own sequence.
  const cc = ct['complexContent'] as Record<string, unknown> | undefined;
  if (cc) {
    const extRaw = cc['extension'];
    const ext = (Array.isArray(extRaw) ? extRaw[0] : extRaw) as Record<string, unknown> | undefined;
    if (!ext) return [];
    const fields: FieldDef[] = [];
    const baseName = stripNs(attr(ext, 'base') ?? '');
    if (baseName && !seen.has(baseName)) {
      seen.add(baseName);
      const baseCt = ctByRawName.get(baseName);
      if (baseCt) fields.push(...extractFields(baseCt, enumNames, ctByRawName, seen));
    }
    fields.push(...extractSequenceFields(ext));
    return fields;
  }

  return extractSequenceFields(ct);
}

function extractSequenceFields(ct: Record<string, unknown>): FieldDef[] {
  const sequence = ct['sequence'] as Record<string, unknown> | undefined;
  if (!sequence) return [];

  const fields: FieldDef[] = [];
  for (const el of asArray(sequence['element'])) {
    const rawName = attr(el, 'name');
    const rawType = attr(el, 'type');
    if (!rawName || !rawType) continue;

    const name = sanitizeIdent(rawName);
    const minOccurs = attr(el, 'minOccurs');
    const maxOccurs = attr(el, 'maxOccurs');
    const optional = minOccurs === '0';
    const array = maxOccurs === 'unbounded';

    const wsdlType = sanitizeIdent(stripNs(rawType));
    const tsType = wsdlTypeToTs(rawType);

    fields.push({
      name,
      xmlName: rawName,
      tsType,
      wsdlType,
      optional,
      array,
      doc: extractDoc(el),
    });
  }
  return fields;
}

function extractDoc(node: Record<string, unknown>): string | undefined {
  const annotation = node['annotation'] as Record<string, unknown> | undefined;
  if (!annotation) return undefined;
  const documentation = annotation['documentation'];
  if (!documentation) return undefined;
  const text = typeof documentation === 'string'
    ? documentation
    : (documentation as Record<string, unknown>)?.['#text'] as string | undefined ?? '';
  return text.trim().replace(/\s+/g, ' ') || undefined;
}

function attr(node: unknown, name: string): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const val = (node as Record<string, unknown>)[`@${name}`];
  return val !== undefined ? String(val) : undefined;
}

function asArray(val: unknown): Record<string, unknown>[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as Record<string, unknown>[];
  return [val as Record<string, unknown>];
}

// ---------------------------------------------------------------------------
// Code generators
// ---------------------------------------------------------------------------

const HEADER = `// Generated by scripts/generate.ts — do not edit manually.\n`;

// --- types.ts ---

function generateTypes(enums: EnumType[], complexTypes: ComplexTypeDef[], listWrapperMap: ListWrapperMap, primitiveWrapperMap: PrimitiveWrapperMap): string {
  const lines: string[] = [HEADER, ''];

  for (const e of enums) {
    if (e.doc) lines.push(`/** ${e.doc} */`);
    const values = e.values.map((v) => `'${v}'`).join(' | ');
    lines.push(`export type ${e.name} = ${values};`, '');
  }

  // Mark special types to skip (we handle them via Date in the API)
  const skip = new Set(['SoapMplusDateTime', 'SoapMplusDate']);

  for (const ct of complexTypes) {
    if (skip.has(ct.name)) continue;
    if (ct.doc) lines.push(`/** ${ct.doc} */`);
    lines.push(`export interface ${ct.name} {`);
    for (const f of ct.fields) {
      if (f.doc) lines.push(`  /** ${f.doc} */`);
      const inner = !f.array ? listWrapperMap.get(f.wsdlType) : undefined;
      if (inner) {
        const primitiveInner = primitiveWrapperMap.get(inner.wsdlType);
        const innerTsType = primitiveInner ? primitiveInner.tsType : inner.tsType;
        const lwOpt = ct.name.endsWith('Request') ? '?' : '';
        lines.push(`  ${f.name}${lwOpt}: ${innerTsType}[];`);
      } else {
        const opt = (ct.name.endsWith('Request') || f.optional || f.array) ? '?' : '';
        const arrSuffix = f.array ? '[]' : '';
        lines.push(`  ${f.name}${opt}: ${f.tsType}${arrSuffix};`);
      }
    }
    lines.push('}', '');
  }

  lines.push(
    `/**`,
    ` * Input variant of a generated type: all fields become deeply optional.`,
    ` * Field requiredness in the WSDL describes what responses are guaranteed to`,
    ` * contain (e.g. an order's orderId, list fields), not what requests must`,
    ` * provide — the server assigns/validates those. Omitted fields are simply`,
    ` * not serialized.`,
    ` */`,
    `export type Input<T> =`,
    `  T extends Date ? T :`,
    `  T extends readonly (infer U)[] ? Input<U>[] :`,
    `  T extends object ? { [K in keyof T]?: Input<T[K]> } :`,
    `  T;`,
    '',
  );

  return lines.join('\n');
}

// --- serializer.ts ---

function generateSerializer(
  complexTypes: ComplexTypeDef[],
  inputElements: Map<string, InputElementDef>,
  operations: OperationDef[],
  enumNames: Set<string>,
  listWrapperMap: ListWrapperMap,
  primitiveWrapperMap: PrimitiveWrapperMap,
): string {
  const lines: string[] = [
    HEADER,
    `import {`,
    `  serializeString,`,
    `  serializeNumber,`,
    `  serializeBoolean,`,
    `  serializeDateTime,`,
    `  serializeDate,`,
    `  NS_PREFIX,`,
    `} from '../soap';`,
    `import type * as T from './types';`,
    '',
  ];

  // Emit a serialize function for each complex type
  const skip = new Set(['SoapMplusDateTime', 'SoapMplusDate']);
  for (const ct of complexTypes) {
    if (skip.has(ct.name)) continue;
    lines.push(...emitComplexTypeSerializer(ct, enumNames, listWrapperMap, primitiveWrapperMap));
  }

  // Emit operation-level request body serializers
  const seen = new Set<string>();
  for (const op of operations) {
    const el = op.inputElement;
    if (seen.has(el.name)) continue;
    seen.add(el.name);
    lines.push(...emitOperationBodySerializer(el, enumNames, listWrapperMap, primitiveWrapperMap));
  }

  return lines.join('\n');
}

function emitComplexTypeSerializer(ct: ComplexTypeDef, enumNames: Set<string>, listWrapperMap: ListWrapperMap, primitiveWrapperMap: PrimitiveWrapperMap): string[] {
  const lines: string[] = [];
  lines.push(`export function serialize${ct.name}(obj: T.Input<T.${ct.name}>, elemName: string): string {`);
  lines.push(`  let xml = \`<\${NS_PREFIX}:\${elemName}>\`;`);
  for (const f of ct.fields) {
    lines.push(...emitFieldSerializer(f, enumNames, 'obj', 2, listWrapperMap, primitiveWrapperMap));
  }
  lines.push(`  xml += \`</\${NS_PREFIX}:\${elemName}>\`;`);
  lines.push(`  return xml;`);
  lines.push(`}`, '');
  return lines;
}

function emitFieldSerializer(
  f: FieldDef,
  enumNames: Set<string>,
  objRef: string,
  indent: number,
  listWrapperMap: ListWrapperMap,
  primitiveWrapperMap: PrimitiveWrapperMap,
): string[] {
  const pad = ' '.repeat(indent);
  const lines: string[] = [];
  const accessor = `${objRef}.${f.name}`;

  const inner = !f.array ? listWrapperMap.get(f.wsdlType) : undefined;
  if (inner) {
    const primitiveInner = primitiveWrapperMap.get(inner.wsdlType);
    lines.push(`${pad}if (${accessor} !== undefined && ${accessor} !== null) {`);
    lines.push(`${pad}  xml += \`<\${NS_PREFIX}:${f.xmlName}>\`;`);
    lines.push(`${pad}  for (const item of ${accessor}) {`);
    if (primitiveInner) {
      lines.push(`${pad}    xml += \`<\${NS_PREFIX}:${inner.xmlName}>\${serializeString('${primitiveInner.xmlName}', String(item))}</\${NS_PREFIX}:${inner.xmlName}>\`;`);
    } else {
      const innerF: FieldDef = { ...inner, xmlName: inner.xmlName, array: false };
      lines.push(...emitSingleValueSerializer(innerF, enumNames, 'item', indent + 4));
    }
    lines.push(`${pad}  }`);
    lines.push(`${pad}  xml += \`</\${NS_PREFIX}:${f.xmlName}>\`;`);
    lines.push(`${pad}}`);
    return lines;
  }

  const guard = !f.array ? `${pad}if (${accessor} !== undefined && ${accessor} !== null) {\n` : '';
  const closeGuard = guard ? `${pad}}\n` : '';

  if (f.array) {
    lines.push(`${pad}if (${accessor} !== undefined && ${accessor} !== null) {`);
    lines.push(`${pad}  for (const item of ${accessor}) {`);
    lines.push(...emitSingleValueSerializer(f, enumNames, 'item', indent + 4));
    lines.push(`${pad}  }`);
    lines.push(`${pad}}`);
  } else {
    if (guard) lines.push(guard.trimEnd());
    lines.push(...emitSingleValueSerializer(f, enumNames, accessor, indent + (guard ? 2 : 0)));
    if (closeGuard) lines.push(closeGuard.trimEnd());
  }

  return lines;
}

function emitSingleValueSerializer(
  f: FieldDef,
  enumNames: Set<string>,
  valueRef: string,
  indent: number,
): string[] {
  const pad = ' '.repeat(indent);
  const xmlName = f.xmlName;
  if (f.tsType === 'Date' && f.wsdlType === 'SoapMplusDateTime') {
    return [`${pad}xml += serializeDateTime('${xmlName}', ${valueRef});`];
  }
  if (f.tsType === 'Date' && f.wsdlType === 'SoapMplusDate') {
    return [`${pad}xml += serializeDate('${xmlName}', ${valueRef});`];
  }
  if (f.tsType === 'Date' && ISO_DATE_WSDL_TYPES.has(f.wsdlType)) {
    const fmt = f.wsdlType === 'date'
      ? `${valueRef}.toISOString().substring(0, 10)`
      : `${valueRef}.toISOString()`;
    return [`${pad}xml += serializeString('${xmlName}', ${fmt});`];
  }
  if (f.tsType === 'string' || enumNames.has(f.wsdlType)) {
    return [`${pad}xml += serializeString('${xmlName}', String(${valueRef}));`];
  }
  if (f.tsType === 'number') {
    return [`${pad}xml += serializeNumber('${xmlName}', ${valueRef});`];
  }
  if (f.tsType === 'boolean') {
    return [`${pad}xml += serializeBoolean('${xmlName}', ${valueRef});`];
  }
  // Complex type
  return [`${pad}xml += serialize${f.wsdlType}(${valueRef}, '${xmlName}');`];
}

function emitOperationBodySerializer(el: InputElementDef, enumNames: Set<string>, listWrapperMap: ListWrapperMap, primitiveWrapperMap: PrimitiveWrapperMap): string[] {
  const lines: string[] = [];
  const fnName = `serialize${capitalize(el.name)}Body`;

  if (el.fields.length === 0) {
    lines.push(`export function ${fnName}(): string {`);
    lines.push(`  return '';`);
    lines.push(`}`, '');
    return lines;
  }

  // Determine parameter type
  // Single field named 'request' → unwrap to that field's type
  if (el.fields.length === 1 && el.fields[0].name === 'request' && !isPrimitive(el.fields[0].tsType)) {
    const f = el.fields[0];
    const typeRef = inputTypeRef(f.tsType, f.wsdlType, enumNames);
    const paramType = f.optional ? `${typeRef} | undefined` : typeRef;
    lines.push(`export function ${fnName}(request: ${paramType}): string {`);
    if (f.optional) {
      lines.push(`  if (request === undefined) return '';`);
    }
    lines.push(`  let xml = '';`);
    lines.push(`  xml += serialize${f.tsType}(request!, 'request');`);
    lines.push(`  return xml;`);
    lines.push(`}`, '');
    return lines;
  }

  // Single positional field — the param IS the value, not an object to access .fieldName on
  if (el.fields.length === 1) {
    const f = el.fields[0];
    const paramType = buildParamType(f, enumNames);
    lines.push(`export function ${fnName}(${f.name}: ${paramType}): string {`);
    lines.push(`  let xml = '';`);
    if (f.array) {
      lines.push(`  if (${f.name} !== undefined && ${f.name} !== null) {`);
      lines.push(`    for (const item of ${f.name}) {`);
      for (const l of emitSingleValueSerializer(f, enumNames, 'item', 6)) {
        lines.push(l);
      }
      lines.push(`    }`);
      lines.push(`  }`);
    } else {
      lines.push(`  if (${f.name} !== undefined && ${f.name} !== null) {`);
      for (const l of emitSingleValueSerializer(f, enumNames, f.name, 4)) {
        lines.push(l);
      }
      lines.push(`  }`);
    }
    lines.push(`  return xml;`);
    lines.push(`}`, '');
    return lines;
  }

  // Multiple fields → params object
  const paramFields = el.fields
    .map((f) => {
      const innerW = !f.array ? listWrapperMap.get(f.wsdlType) : undefined;
      if (innerW) {
        const primitiveInnerW = primitiveWrapperMap.get(innerW.wsdlType);
        const resolvedTsType = primitiveInnerW ? primitiveInnerW.tsType : innerW.tsType;
        const innerBase = inputTypeRef(resolvedTsType, innerW.wsdlType, enumNames);
        return `${f.name}?: ${innerBase}[]`;
      }
      const base = inputTypeRef(f.tsType, f.wsdlType, enumNames);
      return `${f.name}?: ${base}${f.array ? '[]' : ''}`;
    })
    .join('; ');
  lines.push(`export function ${fnName}(params: { ${paramFields} }): string {`);
  lines.push(`  let xml = '';`);
  for (const f of el.fields) {
    const accessor = `params.${f.name}`;
    if (f.array) {
      lines.push(`  if (${accessor} !== undefined && ${accessor} !== null) {`);
      lines.push(`    for (const item of ${accessor}) {`);
      for (const l of emitSingleValueSerializer(f, enumNames, 'item', 6)) {
        lines.push(l);
      }
      lines.push(`    }`);
      lines.push(`  }`);
    } else {
      const inner = listWrapperMap.get(f.wsdlType);
      if (inner) {
        const primitiveInner = primitiveWrapperMap.get(inner.wsdlType);
        lines.push(`  if (${accessor} !== undefined && ${accessor} !== null) {`);
        lines.push(`    xml += \`<\${NS_PREFIX}:${f.xmlName}>\`;`);
        lines.push(`    for (const item of ${accessor}) {`);
        if (primitiveInner) {
          lines.push(`      xml += \`<\${NS_PREFIX}:${inner.xmlName}>\${serializeString('${primitiveInner.xmlName}', String(item))}</\${NS_PREFIX}:${inner.xmlName}>\`;`);
        } else {
          const innerF: FieldDef = { ...inner, xmlName: inner.xmlName, array: false };
          lines.push(...emitSingleValueSerializer(innerF, enumNames, 'item', 6));
        }
        lines.push(`    }`);
        lines.push(`    xml += \`</\${NS_PREFIX}:${f.xmlName}>\`;`);
        lines.push(`  }`);
      } else {
        lines.push(`  if (${accessor} !== undefined && ${accessor} !== null) {`);
        for (const l of emitSingleValueSerializer(f, enumNames, accessor, 4)) {
          lines.push(l);
        }
        lines.push(`  }`);
      }
    }
  }
  lines.push(`  return xml;`);
  lines.push(`}`, '');
  return lines;
}

function buildParamType(f: FieldDef, enumNames: Set<string>): string {
  const base = inputTypeRef(f.tsType, f.wsdlType, enumNames);
  const arrSuffix = f.array ? '[]' : '';
  const optSuffix = f.optional ? ' | undefined' : '';
  return `${base}${arrSuffix}${optSuffix}`;
}

// --- deserializer.ts ---

function generateDeserializer(
  complexTypes: ComplexTypeDef[],
  operations: OperationDef[],
  enumNames: Set<string>,
  listWrapperMap: ListWrapperMap,
  primitiveWrapperMap: PrimitiveWrapperMap,
  responseTypeNames: Set<string>,
): string {
  const lines: string[] = [
    HEADER,
    `import {`,
    `  toArray,`,
    `  deserializeDateTime,`,
    `  deserializeDate,`,
    `} from '../soap';`,
    `import type * as T from './types';`,
    '',
  ];

  const skip = new Set(['SoapMplusDateTime', 'SoapMplusDate']);

  for (const ct of complexTypes) {
    if (skip.has(ct.name)) continue;
    lines.push(...emitComplexTypeDeserializer(ct, enumNames, listWrapperMap, primitiveWrapperMap, responseTypeNames.has(ct.name)));
  }

  return lines.join('\n');
}

function emitComplexTypeDeserializer(ct: ComplexTypeDef, enumNames: Set<string>, listWrapperMap: ListWrapperMap, primitiveWrapperMap: PrimitiveWrapperMap, isResponseType = false): string[] {
  const lines: string[] = [];
  lines.push(`export function deserialize${ct.name}(obj: Record<string, unknown>): T.${ct.name} {`);
  lines.push(`  const r: Partial<T.${ct.name}> = {};`);

  for (const f of ct.fields) {
    // Access by original XML name (as it appears in the response XML)
    const val = `obj['${f.xmlName}']`;

    const inner = !f.array ? listWrapperMap.get(f.wsdlType) : undefined;
    if (inner) {
      const primitiveInner = primitiveWrapperMap.get(inner.wsdlType);
      const outerVal = `obj['${f.xmlName}']`;
      const innerXmlName = inner.xmlName;
      lines.push(`  if (${outerVal} !== undefined) {`);
      lines.push(`    const _w = ${outerVal} as Record<string, unknown>;`);
      lines.push(`    const _iv = (_w)['${innerXmlName}'];`);
      lines.push(`    if (_iv !== undefined) {`);
      if (primitiveInner) {
        lines.push(`      r.${f.name} = toArray(_iv).map((v) => String((v as Record<string, unknown>)['${primitiveInner.xmlName}'] ?? v));`);
      } else if (inner.tsType === 'Date' && inner.wsdlType === 'SoapMplusDateTime') {
        lines.push(`      r.${f.name} = toArray(_iv).map((v) => deserializeDateTime(v as Record<string, unknown>));`);
      } else if (inner.tsType === 'Date' && inner.wsdlType === 'SoapMplusDate') {
        lines.push(`      r.${f.name} = toArray(_iv).map((v) => deserializeDate(v as Record<string, unknown>));`);
      } else if (inner.tsType === 'Date') {
        lines.push(`      r.${f.name} = toArray(_iv).map((v) => new Date(String(v)));`);
      } else if (inner.tsType === 'number') {
        lines.push(`      r.${f.name} = toArray(_iv).map(Number);`);
      } else if (inner.tsType === 'string' || enumNames.has(inner.wsdlType)) {
        const castType = enumNames.has(inner.wsdlType) ? ` as T.${inner.wsdlType}[]` : '';
        lines.push(`      r.${f.name} = toArray(_iv).map(String)${castType};`);
      } else if (inner.tsType === 'boolean') {
        lines.push(`      r.${f.name} = toArray(_iv).map((v) => v === 'true' || v === true);`);
      } else {
        lines.push(`      r.${f.name} = toArray(_iv).map((v) => deserialize${inner.wsdlType}(v as Record<string, unknown>));`);
      }
      lines.push(`    } else {`);
      lines.push(`      r.${f.name} = [];`);
      lines.push(`    }`);
      lines.push(`  } else {`);
      lines.push(`    r.${f.name} = [];`);
      lines.push(`  }`);
      continue;
    }

    if (f.array) {
      lines.push(`  if (${val} !== undefined) {`);
      if (f.tsType === 'Date' && f.wsdlType === 'SoapMplusDateTime') {
        lines.push(`    r.${f.name} = toArray(${val}).map((v) => deserializeDateTime(v as Record<string, unknown>));`);
      } else if (f.tsType === 'Date' && f.wsdlType === 'SoapMplusDate') {
        lines.push(`    r.${f.name} = toArray(${val}).map((v) => deserializeDate(v as Record<string, unknown>));`);
      } else if (f.tsType === 'Date') {
        lines.push(`    r.${f.name} = toArray(${val}).map((v) => new Date(String(v)));`);
      } else if (f.tsType === 'number') {
        lines.push(`    r.${f.name} = toArray(${val}).map(Number);`);
      } else if (f.tsType === 'string' || enumNames.has(f.wsdlType)) {
        const castType = enumNames.has(f.wsdlType) ? ` as T.${f.wsdlType}[]` : '';
        lines.push(`    r.${f.name} = toArray(${val}).map(String)${castType};`);
      } else if (f.tsType === 'boolean') {
        lines.push(`    r.${f.name} = toArray(${val}).map((v) => v === 'true' || v === true);`);
      } else {
        lines.push(`    r.${f.name} = toArray(${val}).map((v) => deserialize${f.wsdlType}(v as Record<string, unknown>));`);
      }
      lines.push(`  }`);
    } else if (f.optional) {
      if (f.tsType === 'Date' && f.wsdlType === 'SoapMplusDateTime') {
        lines.push(`  if (${val} !== undefined) r.${f.name} = deserializeDateTime(${val} as Record<string, unknown>);`);
      } else if (f.tsType === 'Date' && f.wsdlType === 'SoapMplusDate') {
        lines.push(`  if (${val} !== undefined) r.${f.name} = deserializeDate(${val} as Record<string, unknown>);`);
      } else if (f.tsType === 'Date') {
        lines.push(`  if (${val} !== undefined) r.${f.name} = new Date(String(${val}));`);
      } else if (f.tsType === 'number') {
        lines.push(`  if (${val} !== undefined) r.${f.name} = Number(${val});`);
      } else if (f.tsType === 'string' || enumNames.has(f.wsdlType)) {
        const castType = enumNames.has(f.wsdlType) ? `T.${f.wsdlType}` : 'string';
        lines.push(`  if (${val} !== undefined) r.${f.name} = String(${val}) as ${castType};`);
      } else if (f.tsType === 'boolean') {
        lines.push(`  if (${val} !== undefined) r.${f.name} = ${val} === 'true' || ${val} === true;`);
      } else {
        lines.push(`  if (${val} !== undefined) r.${f.name} = deserialize${f.wsdlType}(${val} as Record<string, unknown>);`);
      }
    } else {
      // Required field. In top-level response types a missing value is a
      // protocol violation — fail loudly instead of fabricating ''/NaN/false.
      if (isResponseType && f.tsType !== 'unknown') {
        lines.push(`  if (${val} === undefined) throw new Error("Missing required field '${f.xmlName}' in ${ct.name}");`);
      }
      if (f.tsType === 'Date' && f.wsdlType === 'SoapMplusDateTime') {
        lines.push(`  r.${f.name} = deserializeDateTime(${val} as Record<string, unknown> ?? {});`);
      } else if (f.tsType === 'Date' && f.wsdlType === 'SoapMplusDate') {
        lines.push(`  r.${f.name} = deserializeDate(${val} as Record<string, unknown> ?? {});`);
      } else if (f.tsType === 'Date') {
        lines.push(`  r.${f.name} = new Date(String(${val} ?? ''));`);
      } else if (f.tsType === 'number') {
        lines.push(`  r.${f.name} = Number(${val});`);
      } else if (f.tsType === 'string' || enumNames.has(f.wsdlType)) {
        const castType = enumNames.has(f.wsdlType) ? `T.${f.wsdlType}` : 'string';
        lines.push(`  r.${f.name} = String(${val} ?? '') as ${castType};`);
      } else if (f.tsType === 'boolean') {
        lines.push(`  r.${f.name} = ${val} === 'true' || ${val} === true;`);
      } else if (f.tsType === 'unknown') {
        lines.push(`  r.${f.name} = ${val};`);
      } else {
        lines.push(`  r.${f.name} = deserialize${f.wsdlType}(${val} as Record<string, unknown> ?? {});`);
      }
    }
  }

  lines.push(`  return r as T.${ct.name};`);
  lines.push(`}`, '');
  return lines;
}

// --- client.ts ---

function generateClient(operations: OperationDef[], enumNames: Set<string>, listWrapperMap: ListWrapperMap, primitiveWrapperMap: PrimitiveWrapperMap, complexTypes: ComplexTypeDef[]): string {
  const lines: string[] = [
    HEADER,
    `import { randomUUID } from 'node:crypto';`,
    `import { SoapTransport, TransportOptions } from '../transport';`,
    `import { buildEnvelope, parseEnvelopeBody } from '../soap';`,
    `import {`,
    `  MplusApiDeserializationError,`,
    `  MplusApiSerializationError,`,
    `  MplusApiFaultError,`,
    `  MplusApiClientError,`,
    `  MplusApiServerError,`,
    `} from '../errors';`,
    `import type * as T from './types';`,
    `import * as S from './serializer';`,
    `import * as D from './deserializer';`,
    '',
    `export type { TransportOptions as MplusKassaClientOptions };`,
    '',
    `export class MplusKassaClient {`,
    `  private readonly transport: SoapTransport;`,
    '',
    `  constructor(options: TransportOptions) {`,
    `    this.transport = new SoapTransport(options);`,
    `  }`,
    '',
    `  private async call<R>(`,
    `    operationName: string,`,
    `    responseElementName: string,`,
    `    responseTypeName: string,`,
    `    bodyXml: string,`,
    `    deserialize: (obj: Record<string, unknown>) => R,`,
    `    idempotent: boolean,`,
    `    requestId?: string,`,
    `  ): Promise<R> {`,
    `    let xmlRequest = '';`,
    `    try {`,
    `      xmlRequest = buildEnvelope(operationName, bodyXml);`,
    `    } catch (err) {`,
    `      throw new MplusApiSerializationError(\`Failed to serialize \${operationName}: \${err}\`);`,
    `    }`,
    '',
    `    const xmlResponse = await this.transport.send(operationName, xmlRequest, requestId, idempotent);`,
    '',
    `    const parsed = parseEnvelopeBody(xmlResponse);`,
    `    if ('fault' in parsed) {`,
    `      const { faultcode, faultstring } = parsed.fault;`,
    `      const message = \`[\${faultcode}] \${operationName}: \${faultstring}\`;`,
    `      if (faultcode.startsWith('Client')) throw new MplusApiClientError(message, faultcode, xmlRequest, xmlResponse);`,
    `      if (faultcode.startsWith('Server')) throw new MplusApiServerError(message, faultcode, xmlRequest, xmlResponse);`,
    `      throw new MplusApiFaultError(message, faultcode, xmlRequest, xmlResponse);`,
    `    }`,
    '',
    `    const responseData = parsed.data[responseElementName] as Record<string, unknown> | undefined;`,
    `    if (responseData === undefined) {`,
    `      throw new MplusApiDeserializationError(`,
    `        \`Missing response element '\${responseElementName}' in \${operationName} response\`,`,
    `        xmlRequest,`,
    `        xmlResponse,`,
    `      );`,
    `    }`,
    '',
    `    try {`,
    `      return deserialize(responseData);`,
    `    } catch (err) {`,
    `      throw new MplusApiDeserializationError(`,
    `        \`Failed to deserialize \${responseTypeName}: \${err}\`,`,
    `        xmlRequest,`,
    `        xmlResponse,`,
    `      );`,
    `    }`,
    `  }`,
    '',
  ];

  const complexTypeMap = new Map<string, ComplexTypeDef>(complexTypes.map(ct => [ct.name, ct]));

  for (const op of operations) {
    lines.push(...emitClientMethod(op, enumNames, listWrapperMap, primitiveWrapperMap, complexTypeMap));
  }

  lines.push(`}`);

  return lines.join('\n');
}

function emitClientMethod(op: OperationDef, enumNames: Set<string>, listWrapperMap: ListWrapperMap, primitiveWrapperMap: PrimitiveWrapperMap, complexTypeMap: Map<string, ComplexTypeDef>): string[] {
  const lines: string[] = [];
  const { name, inputElement, outputElement, outputTsType } = op;
  const responseEl = outputElement.name;

  const { paramStr, bodyCallStr } = buildMethodParams(inputElement, enumNames, listWrapperMap, primitiveWrapperMap);
  const allParams = paramStr
    ? `${paramStr}, requestId?: string`
    : `requestId?: string`;

  // Requests extending IdempotentReq are safe to retry once they carry a key.
  // Auto-generate one when the caller didn't, and tell the transport the call
  // is idempotent so network errors can be retried without duplicating work.
  const requestField = inputElement.fields.length === 1
    && inputElement.fields[0].name === 'request'
    && !isPrimitive(inputElement.fields[0].tsType)
    ? inputElement.fields[0] : undefined;
  const requestCt = requestField ? complexTypeMap.get(requestField.tsType) : undefined;
  const idempotent = requestCt?.fields.some((f) => f.name === 'idempotencyKey') ?? false;

  // Determine if response type has a single field that can be unwrapped
  let returnType = `T.${outputTsType}`;
  let singleFieldName: string | undefined;

  const outputCt = complexTypeMap.get(outputTsType);
  if (outputCt && outputCt.fields.length === 1) {
    const rf = outputCt.fields[0];
    singleFieldName = rf.name;
    const innerW = !rf.array ? listWrapperMap.get(rf.wsdlType) : undefined;
    if (innerW) {
      const primitiveInnerW = primitiveWrapperMap.get(innerW.wsdlType);
      const resolvedTsType = primitiveInnerW ? primitiveInnerW.tsType : innerW.tsType;
      const innerBase = resolvedTsType === 'Date' ? 'Date' : isPrimitive(resolvedTsType) ? resolvedTsType : `T.${resolvedTsType}`;
      returnType = `${innerBase}[]`;
    } else if (rf.array) {
      const base = rf.tsType === 'Date' ? 'Date' : isPrimitive(rf.tsType) ? rf.tsType : `T.${rf.tsType}`;
      returnType = rf.optional ? `${base}[] | undefined` : `${base}[]`;
    } else {
      const base = rf.tsType === 'Date' ? 'Date' : isPrimitive(rf.tsType) ? rf.tsType : `T.${rf.tsType}`;
      returnType = rf.optional ? `${base} | undefined` : base;
    }
  }

  lines.push(`  async ${name}(${allParams}): Promise<${returnType}> {`);
  if (idempotent) {
    lines.push(`    request = { idempotencyKey: randomUUID(), ...request };`);
  }
  lines.push(`    const bodyXml = ${bodyCallStr};`);
  if (singleFieldName) {
    lines.push(`    return (await this.call(`);
    lines.push(`      '${name}',`);
    lines.push(`      '${responseEl}',`);
    lines.push(`      '${outputTsType}',`);
    lines.push(`      bodyXml,`);
    lines.push(`      D.deserialize${outputTsType},`);
    lines.push(`      ${idempotent},`);
    lines.push(`      requestId,`);
    lines.push(`    )).${singleFieldName};`);
  } else {
    lines.push(`    return this.call(`);
    lines.push(`      '${name}',`);
    lines.push(`      '${responseEl}',`);
    lines.push(`      '${outputTsType}',`);
    lines.push(`      bodyXml,`);
    lines.push(`      D.deserialize${outputTsType},`);
    lines.push(`      ${idempotent},`);
    lines.push(`      requestId,`);
    lines.push(`    );`);
  }
  lines.push(`  }`, '');

  return lines;
}

function buildMethodParams(
  el: InputElementDef,
  enumNames: Set<string>,
  listWrapperMap: ListWrapperMap,
  primitiveWrapperMap: PrimitiveWrapperMap,
): { paramStr: string; bodyCallStr: string } {
  const fnName = `S.serialize${capitalize(el.name)}Body`;

  if (el.fields.length === 0) {
    return { paramStr: '', bodyCallStr: `${fnName}()` };
  }

  if (el.fields.length === 1 && el.fields[0].name === 'request' && !isPrimitive(el.fields[0].tsType)) {
    const f = el.fields[0];
    const typePart = inputTypeRef(f.tsType, f.wsdlType, enumNames);
    const paramName = 'request';
    const param = f.optional ? `${paramName}?: ${typePart}` : `${paramName}: ${typePart}`;
    return {
      paramStr: param,
      bodyCallStr: `${fnName}(${paramName})`,
    };
  }

  if (el.fields.length === 1) {
    const f = el.fields[0];
    const base = inputTypeRef(f.tsType, f.wsdlType, enumNames);
    const arrSuffix = f.array ? '[]' : '';
    const opt = f.optional ? '?' : '';
    const param = `${f.name}${opt}: ${base}${arrSuffix}`;
    return {
      paramStr: param,
      bodyCallStr: `${fnName}(${f.name})`,
    };
  }

  const paramFields = el.fields
    .map((f) => {
      const innerW = !f.array ? listWrapperMap.get(f.wsdlType) : undefined;
      if (innerW) {
        const primitiveInnerW = primitiveWrapperMap.get(innerW.wsdlType);
        const resolvedTsType = primitiveInnerW ? primitiveInnerW.tsType : innerW.tsType;
        const innerBase = inputTypeRef(resolvedTsType, innerW.wsdlType, enumNames);
        return `${f.name}?: ${innerBase}[]`;
      }
      const base = inputTypeRef(f.tsType, f.wsdlType, enumNames);
      return `${f.name}?: ${base}${f.array ? '[]' : ''}`;
    })
    .join('; ');
  return {
    paramStr: `params: { ${paramFields} }`,
    bodyCallStr: `${fnName}(params)`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

async function loadWsdl(source: string): Promise<string> {
  if (!isUrl(source)) {
    return fs.readFileSync(source, 'utf-8');
  }

  return fetchText(source);
}

function fetchText(url: string, redirectCount = 0): Promise<string> {
  if (redirectCount > 5) {
    return Promise.reject(new Error(`Too many redirects while fetching ${url}`));
  }

  const parsedUrl = new URL(url);
  const transport = parsedUrl.protocol === 'http:' ? http : https;

  return new Promise((resolve, reject) => {
    const req = transport.get(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        protocol: parsedUrl.protocol,
        rejectUnauthorized: false,
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;
        const location = res.headers.location;

        if (statusCode >= 300 && statusCode < 400 && location) {
          res.resume();
          const redirectUrl = new URL(location, url).toString();
          resolve(fetchText(redirectUrl, redirectCount + 1));
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          res.resume();
          reject(new Error(`Failed to fetch WSDL: HTTP ${statusCode}`));
          return;
        }

        res.setEncoding('utf8');
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve(body);
        });
      },
    );

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error(`Timed out fetching WSDL from ${url}`));
    });
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export interface GenerateResult {
  types: string;
  serializer: string;
  deserializer: string;
  client: string;
  skippedOperations: string[];
  counts: { enums: number; complexTypes: number; operations: number };
}

/** Full pipeline: WSDL XML string → the four generated source files. */
export function generateAll(xml: string): GenerateResult {
  const { enums, complexTypes, inputElements, operations, skippedOperations } = parseWsdl(xml);

  const enumNames = new Set(enums.map((e) => e.name));
  const listWrapperMap = buildListWrapperMap(complexTypes);
  const primitiveWrapperMap = buildPrimitiveWrapperMap(complexTypes);

  // Top-level response types: the WSDL marks fields required, but the server
  // omits e.g. `relation` when result is NOT-FOUND. Complex fields become
  // optional so absent data deserializes to undefined instead of a fabricated
  // empty object. Remaining required fields (scalars/enums/dates) get an
  // explicit missing-field throw in the deserializer instead of ''/NaN/false.
  const responseTypeNames = new Set(operations.map((op) => op.outputTsType));
  const complexTypeByName = new Map(complexTypes.map((ct) => [ct.name, ct]));
  for (const name of responseTypeNames) {
    const ct = complexTypeByName.get(name);
    if (!ct) continue;
    for (const f of ct.fields) {
      const isComplex = !isPrimitive(f.tsType) && f.tsType !== 'Date' && f.tsType !== 'unknown'
        && !enumNames.has(f.wsdlType) && !listWrapperMap.has(f.wsdlType) && !f.array;
      if (isComplex && !f.optional) f.optional = true;
    }
  }

  return {
    types: generateTypes(enums, complexTypes, listWrapperMap, primitiveWrapperMap),
    serializer: generateSerializer(complexTypes, inputElements, operations, enumNames, listWrapperMap, primitiveWrapperMap),
    deserializer: generateDeserializer(complexTypes, operations, enumNames, listWrapperMap, primitiveWrapperMap, responseTypeNames),
    client: generateClient(operations, enumNames, listWrapperMap, primitiveWrapperMap, complexTypes),
    skippedOperations,
    counts: { enums: enums.length, complexTypes: complexTypes.length, operations: operations.length },
  };
}

async function main(): Promise<void> {
  const projectRoot = path.resolve(__dirname, '..');
  const wsdlSourceArg = process.argv[2] ?? process.env.MPLUS_WSDL_URL;
  if (!wsdlSourceArg) {
    throw new Error(
      'Missing WSDL source. Run `npm run generate -- <wsdl-url-or-path>` or set MPLUS_WSDL_URL.',
    );
  }
  const wsdlSource = isUrl(wsdlSourceArg)
    ? wsdlSourceArg
    : path.resolve(projectRoot, wsdlSourceArg);
  const outDir = path.join(projectRoot, 'src', 'generated');

  console.log(`Loading WSDL from ${wsdlSource}...`);
  const xml = await loadWsdl(wsdlSource);

  console.log('Parsing and generating...');
  const result = generateAll(xml);

  console.log(`  ${result.counts.enums} enum types`);
  console.log(`  ${result.counts.complexTypes} complex types`);
  console.log(`  ${result.counts.operations} operations`);
  if (result.skippedOperations.length > 0) {
    console.warn(`  WARNING: skipped ${result.skippedOperations.length} operation(s) with unresolvable output elements:`);
    for (const name of result.skippedOperations) console.warn(`    - ${name}`);
  }

  fs.writeFileSync(path.join(outDir, 'types.ts'), result.types);
  fs.writeFileSync(path.join(outDir, 'serializer.ts'), result.serializer);
  fs.writeFileSync(path.join(outDir, 'deserializer.ts'), result.deserializer);
  fs.writeFileSync(path.join(outDir, 'client.ts'), result.client);

  console.log('Done.');
}

if (require.main === module) main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
