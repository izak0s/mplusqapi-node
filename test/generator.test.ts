import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateAll } from '../scripts/generate';

const FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
             xmlns:xsd="http://www.w3.org/2001/XMLSchema"
             xmlns:tns="urn:mplusqapi" name="mplusqapi" targetNamespace="urn:mplusqapi">
  <types>
    <xsd:schema targetNamespace="urn:mplusqapi">
      <xsd:simpleType name="ThingStatus">
        <xsd:restriction base="xsd:string">
          <xsd:enumeration value="THING-STATUS-ACTIVE" />
          <xsd:enumeration value="THING-STATUS-RETIRED" />
        </xsd:restriction>
      </xsd:simpleType>

      <xsd:complexType name="IdempotentReq">
        <xsd:sequence>
          <xsd:element name="idempotencyKey" type="xsd:string" />
        </xsd:sequence>
      </xsd:complexType>

      <xsd:complexType name="CategoryIdList">
        <xsd:sequence>
          <xsd:element name="category" type="xsd:long" minOccurs="0" maxOccurs="unbounded" />
        </xsd:sequence>
      </xsd:complexType>

      <xsd:complexType name="Thing">
        <xsd:sequence>
          <xsd:element name="thingId" type="xsd:long" />
          <xsd:element name="name" type="xsd:string" minOccurs="0" />
          <xsd:element name="price" type="xsd:decimal" minOccurs="0" />
          <xsd:element name="eft-data" type="xsd:string" minOccurs="0" />
          <xsd:element name="categoryIds" type="tns:CategoryIdList" minOccurs="0" />
          <xsd:element name="status" type="tns:ThingStatus" minOccurs="0" />
        </xsd:sequence>
      </xsd:complexType>

      <xsd:complexType name="ThingList">
        <xsd:sequence>
          <xsd:element name="thing" type="tns:Thing" minOccurs="0" maxOccurs="unbounded" />
        </xsd:sequence>
      </xsd:complexType>

      <xsd:complexType name="CreateThingRequest">
        <xsd:complexContent>
          <xsd:extension base="tns:IdempotentReq">
            <xsd:sequence>
              <xsd:element name="thing" type="tns:Thing" />
            </xsd:sequence>
          </xsd:extension>
        </xsd:complexContent>
      </xsd:complexType>

      <xsd:complexType name="CreateThingResponse">
        <xsd:sequence>
          <xsd:element name="result" type="tns:ThingStatus" />
          <xsd:element name="thing" type="tns:Thing" />
          <xsd:element name="errorMessage" type="xsd:string" minOccurs="0" />
        </xsd:sequence>
      </xsd:complexType>

      <xsd:complexType name="GetThingsResponse">
        <xsd:sequence>
          <xsd:element name="thingList" type="tns:ThingList" />
        </xsd:sequence>
      </xsd:complexType>

      <xsd:element name="createThing">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="request" type="tns:CreateThingRequest" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="CreateThingResponse" type="tns:CreateThingResponse" />

      <xsd:element name="getThings">
        <xsd:complexType>
          <xsd:sequence />
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="GetThingsResponse" type="tns:GetThingsResponse" />

      <xsd:element name="moveThing">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="thingId" type="xsd:long" />
            <xsd:element name="targetBranch" type="xsd:int" minOccurs="0" />
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
    </xsd:schema>
  </types>

  <message name="createThing"><part name="Body" element="tns:createThing" /></message>
  <message name="CreateThingResponse"><part name="Body" element="tns:CreateThingResponse" /></message>
  <message name="getThings"><part name="Body" element="tns:getThings" /></message>
  <message name="GetThingsResponse"><part name="Body" element="tns:GetThingsResponse" /></message>
  <message name="moveThing"><part name="Body" element="tns:moveThing" /></message>
  <message name="brokenOp"><part name="Body" element="tns:brokenOp" /></message>

  <portType name="MplusQapiServicePortType">
    <operation name="createThing">
      <input message="tns:createThing" />
      <output message="tns:CreateThingResponse" />
    </operation>
    <operation name="getThings">
      <input message="tns:getThings" />
      <output message="tns:GetThingsResponse" />
    </operation>
    <operation name="moveThing">
      <input message="tns:moveThing" />
      <output message="tns:CreateThingResponse" />
    </operation>
    <operation name="brokenOp">
      <input message="tns:brokenOp" />
      <output message="tns:missingResponse" />
    </operation>
  </portType>
</definitions>`;

const out = generateAll(FIXTURE);

test('enums become string unions', () => {
  assert.ok(out.types.includes(`export type ThingStatus = 'THING-STATUS-ACTIVE' | 'THING-STATUS-RETIRED';`));
});

test('xsd:decimal maps to string, xsd:long to number', () => {
  assert.ok(out.types.includes('price?: string;'));
  assert.ok(out.types.includes('thingId: number;'));
});

test('hyphenated XML names are sanitized for TS but preserved for XML', () => {
  assert.ok(out.types.includes('eftData?: string;'));
  assert.ok(out.serializer.includes(`serializeString('eft-data'`));
  assert.ok(out.deserializer.includes(`obj['eft-data']`));
});

test('list wrappers flatten to plain arrays with [] fallback', () => {
  // required even though minOccurs=0: deserializer guarantees [] when absent
  assert.ok(out.types.includes('categoryIds: number[];'));
  assert.ok(out.deserializer.includes('r.categoryIds = [];'));
});

test('complexContent extension inherits base fields first', () => {
  const iface = out.types.slice(out.types.indexOf('export interface CreateThingRequest'));
  const keyIdx = iface.indexOf('idempotencyKey');
  const thingIdx = iface.indexOf('thing');
  assert.ok(keyIdx > -1 && thingIdx > -1 && keyIdx < thingIdx, 'base field precedes extension field');
  assert.ok(out.serializer.includes(`serializeString('idempotencyKey'`));
});

test('client wraps inputs in Input<T> and auto-fills idempotencyKey', () => {
  assert.ok(out.client.includes('async createThing(request: T.Input<T.CreateThingRequest>'));
  assert.ok(out.client.includes('request = { idempotencyKey: randomUUID(), ...request };'));
});

test('non-idempotent ops pass idempotent=false to call()', () => {
  const method = out.client.slice(out.client.indexOf('async moveThing'), out.client.indexOf('async moveThing') + 600);
  assert.ok(method.includes('false,'));
  assert.ok(!method.includes('randomUUID'));
});

test('multiple params become an object parameter', () => {
  assert.ok(out.client.includes('async moveThing(params: { thingId?: number; targetBranch?: number }'));
});

test('single list-wrapper responses unwrap to a plain array return type', () => {
  assert.ok(out.client.includes('async getThings(requestId?: string): Promise<T.Thing[]>'));
});

test('required complex fields on response types become optional', () => {
  const iface = out.types.slice(
    out.types.indexOf('export interface CreateThingResponse'),
    out.types.indexOf('export interface GetThingsResponse'),
  );
  assert.ok(iface.includes('thing?: Thing;'), 'server may omit thing on failure results');
  assert.ok(iface.includes('result: ThingStatus;'), 'scalar result stays required');
});

test('missing required response scalars throw in the deserializer', () => {
  assert.ok(out.deserializer.includes(`throw new Error("Missing required field 'result' in CreateThingResponse")`));
});

test('nested types do not get the response-only throw', () => {
  const thing = out.deserializer.slice(
    out.deserializer.indexOf('export function deserializeThing('),
    out.deserializer.indexOf('export function deserializeThingList('),
  );
  assert.ok(!thing.includes('Missing required field'), 'Thing is not a top-level response type');
});

test('operations with unresolvable output elements are reported, not silently dropped', () => {
  assert.deepEqual(out.skippedOperations, ['brokenOp']);
  assert.equal(out.counts.operations, 3);
});
