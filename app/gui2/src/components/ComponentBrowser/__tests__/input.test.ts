import { useComponentBrowserInput } from '@/components/ComponentBrowser/input'
import { asNodeId, GraphDb, type NodeId } from '@/stores/graph/graphDatabase'
import type { RequiredImport } from '@/stores/graph/imports'
import { ComputedValueRegistry } from '@/stores/project/computedValueRegistry'
import { SuggestionDb } from '@/stores/suggestionDatabase'
import {
  makeConstructor,
  makeFunction,
  makeLocal,
  makeMethod,
  makeModule,
  makeModuleMethod,
  makeStaticMethod,
  makeType,
  type SuggestionEntry,
} from '@/stores/suggestionDatabase/entry'
import { unwrap } from '@/util/data/result'
import { tryIdentifier, tryQualifiedName } from '@/util/qualifiedName'
import { initializeFFI } from 'shared/ast/ffi'
import { assertUnreachable } from 'shared/util/assert'
import { expect, test } from 'vitest'

await initializeFFI()

const aiMock = { query: assertUnreachable }
const operator1Id = '3d0e9b96-3ca0-4c35-a820-7d3a1649de55' as NodeId
const operator2Id = '5eb16101-dd2b-4034-a6e2-476e8bfa1f2b' as NodeId

function mockGraphDb() {
  const computedValueRegistryMock = ComputedValueRegistry.Mock()
  computedValueRegistryMock.db.set(operator1Id, {
    typename: 'Standard.Base.Number',
    methodCall: undefined,
    payload: { type: 'Value' },
    profilingInfo: [],
  })
  const db = GraphDb.Mock(computedValueRegistryMock)
  db.mockNode('operator1', operator1Id, 'Data.read')
  db.mockNode('operator2', operator2Id)
  return db
}

test.each([
  ['', 0, { type: 'insert', position: 0 }, {}],
  [
    'Data.',
    5,
    { type: 'insert', position: 5, oprApp: ['Data', '.', null] },
    { qualifiedNamePattern: 'Data' },
  ],
  ['Data.', 4, { type: 'changeIdentifier', identifier: 'Data' }, { pattern: 'Data' }],
  [
    'Data.read',
    5,
    { type: 'insert', position: 5, oprApp: ['Data', '.', 'read'] },
    { qualifiedNamePattern: 'Data' },
  ],
  [
    'Data.read',
    7,
    { type: 'changeIdentifier', identifier: 'read', oprApp: ['Data', '.', 'read'] },
    { pattern: 're', qualifiedNamePattern: 'Data' },
  ],
  [
    'Base . Data .',
    13,
    { type: 'insert', position: 13, oprApp: ['Base . Data', '.', null] },
    { qualifiedNamePattern: 'Base.Data' },
  ],
  ['2 +', 3, { type: 'insert', position: 3, oprApp: ['2', '+', null] }, {}],
  ['2 + 3', 5, { type: 'changeLiteral', literal: '3' }, { pattern: '3' }],
  [
    'operator1.',
    10,
    { type: 'insert', position: 0 },
    { selfArg: { type: 'known', typename: 'Standard.Base.Number' } },
  ],
  ['operator2.', 10, { type: 'insert', position: 0 }, { selfArg: { type: 'unknown' } }],
  [
    'operator3.',
    10,
    { type: 'insert', position: 10, oprApp: ['operator3', '.', null] },
    // No self type, as there is no operator3 node in current graph
    { qualifiedNamePattern: 'operator3' },
  ],
  [
    'operator1 -> operator1.',
    23,
    { type: 'insert', position: 23, oprApp: ['operator1', '.', null] },
    { selfArg: { type: 'unknown' } },
  ],
  [
    'operator2 -> operator1.',
    23,
    { type: 'insert', position: 23, oprApp: ['operator1', '.', null] },
    { selfArg: { type: 'known', typename: 'Standard.Base.Number' } },
  ],
])(
  "Input context and filtering, when content is '%s' and cursor at %i",
  (
    code,
    cursorPos,
    expContext: {
      type: string
      position?: number
      oprApp?: (string | null)[]
      identifier?: string
      literal?: string
    },
    expFiltering: {
      pattern?: string
      qualifiedNamePattern?: string
      selfArg?: { type: string; typename?: string }
    },
  ) => {
    const input = useComponentBrowserInput(mockGraphDb(), new SuggestionDb(), aiMock)
    input.content.value = { text: code, selection: { start: cursorPos, end: cursorPos } }
    const context = input.context.value
    const filter = input.filter.value
    expect(context.type).toStrictEqual(expContext.type)
    switch (context.type) {
      case 'insert':
        expect(context.position).toStrictEqual(expContext.position)
        expect(
          context.oprApp != null ? Array.from(context.oprApp.componentsReprs()) : undefined,
        ).toStrictEqual(expContext.oprApp)
        break
      case 'changeIdentifier':
        expect(context.identifier.repr()).toStrictEqual(expContext.identifier)
        expect(
          context.oprApp != null ? Array.from(context.oprApp.componentsReprs()) : undefined,
        ).toStrictEqual(expContext.oprApp)
        break
      case 'changeLiteral':
        expect(context.literal.repr()).toStrictEqual(expContext.literal)
    }
    expect(filter.pattern).toStrictEqual(expFiltering.pattern)
    expect(filter.qualifiedNamePattern).toStrictEqual(expFiltering.qualifiedNamePattern)
    expect(filter.selfArg).toStrictEqual(expFiltering.selfArg)
  },
)

interface ApplySuggestionCase {
  code: string
  cursorPos?: number
  suggestion: SuggestionEntry
  expected: string
  expectedCursorPos?: number
}

const baseCases: ApplySuggestionCase[] = [
  {
    code: '',
    suggestion: makeLocal('local.Project.Main', 'operator1'),
    expected: 'operator1 ',
  },
  {
    code: 'Main.',
    suggestion: makeFunction('local.Project.Main', 'func1'),
    expected: 'Main.func1 ',
  },
  {
    code: '',
    suggestion: makeMethod('Standard.Base.Data.Vector.get'),
    expected: '_.get ',
  },
  {
    code: '',
    suggestion: makeStaticMethod('Standard.Base.Data.Vector.new'),
    expected: 'Vector.new ',
  },
  {
    code: '',
    suggestion: makeModuleMethod('Standard.Base.Data.read'),
    expected: 'Data.read ',
  },
  {
    code: '',
    suggestion: makeConstructor('local.Project.Main.Option.Some'),
    expected: 'Option.Some ',
  },
  {
    code: 'operator1.',
    suggestion: makeMethod('Standard.Base.Data.Vector.get'),
    expected: 'operator1.get ',
  },
  {
    code: 'Standard.Base.Data.',
    suggestion: makeStaticMethod('Standard.Base.Data.Vector.new'),
    expected: 'Standard.Base.Data.Vector.new ',
  },
  {
    code: 'Base.',
    suggestion: makeStaticMethod('Standard.Base.Data.Vector.new'),
    expected: 'Base.Data.Vector.new ',
  },
  {
    code: 'Base.Data.',
    suggestion: makeStaticMethod('Standard.Base.Data.Vector.new'),
    expected: 'Base.Data.Vector.new ',
  },
  {
    code: 'Data.Vector.',
    suggestion: makeStaticMethod('Standard.Base.Data.Vector.new'),
    expected: 'Data.Vector.new ',
  },
  {
    code: 'Dat.V.',
    suggestion: makeStaticMethod('Standard.Base.Data.Vector.new'),
    expected: 'Data.Vector.new ',
  },
  {
    code: 'Dat . V .',
    suggestion: makeStaticMethod('Standard.Base.Data.Vector.new'),
    expected: 'Data . Vector . new ',
  },
  {
    code: '(type_method some_arg).Vector.',
    suggestion: makeStaticMethod('Standard.Base.Data.Vector.new'),
    expected: '(type_method some_arg).Vector.new ',
  },
  {
    code: '',
    suggestion: makeModule('local.Project.Module'),
    expected: 'local.Project.Module.',
  },
  {
    code: 'local.Project.',
    suggestion: makeModule('local.Project.Module'),
    expected: 'local.Project.Module.',
  },
  {
    code: 'Project.Mod',
    suggestion: makeModule('local.Project.Module'),
    expected: 'Project.Module.',
  },
  {
    code: 'a -> a.',
    suggestion: makeMethod('Standard.Base.Data.Vector.get'),
    expected: 'a -> a.get ',
  },
]

function makeComplexCase(prefix: string, suffix: string): ApplySuggestionCase[] {
  return Array.from(baseCases, (aCase) => {
    return {
      ...aCase,
      code: `${prefix}${aCase.code}${suffix}`,
      // We must remove trailing space. The suffix should contain one.
      expected: `${prefix}${aCase.expected.trimEnd()}${suffix}`,
      cursorPos: prefix.length + aCase.code.length,
      expectedCursorPos: prefix.length + aCase.expected.length,
    }
  })
}

const insideInfixCases = makeComplexCase('333 + ', ' + 444')
const insideBracketsCases = makeComplexCase('(', ')')
const insideListCases = makeComplexCase('[foo, ', ', bar]')

test.each([
  ...baseCases,
  ...insideInfixCases,
  ...insideBracketsCases,
  ...insideListCases,
  // space is added to operands if needed.
  {
    code: '2+',
    suggestion: makeLocal('local.Project.Main', 'operator2'),
    expected: '2+operator2 ',
  },
  {
    code: '2 +',
    suggestion: makeLocal('local.Project.Main', 'operator2'),
    expected: '2 + operator2 ',
  },
])(
  'Applying suggestion $suggestion.name to $code',
  ({ code, cursorPos, suggestion, expected, expectedCursorPos }) => {
    cursorPos = cursorPos ?? code.length
    expectedCursorPos = expectedCursorPos ?? expected.length
    const db = new SuggestionDb()
    const dummyId = 1
    db.set(dummyId, suggestion)
    const graphMock = GraphDb.Mock()
    const input = useComponentBrowserInput(graphMock, db, aiMock)
    input.content.value = { text: code, selection: { start: cursorPos, end: cursorPos } }
    input.applySuggestion(dummyId)
    expect(input.code.value).toEqual(expected)
    expect(input.selection.value).toStrictEqual({
      start: expectedCursorPos,
      end: expectedCursorPos,
    })
  },
)

interface ImportsCase {
  description: string
  suggestionId: number
  initialCode?: string
  manuallyEditedCode?: string
  expectedCode: string
  expectedImports: RequiredImport[]
}

test.each([
  {
    description: 'Basic case of adding required import',
    suggestionId: 3,
    expectedCode: 'Table.new ',
    expectedImports: [
      {
        kind: 'Unqualified',
        from: unwrap(tryQualifiedName('Standard.Base')),
        import: unwrap(tryIdentifier('Table')),
      },
    ],
  },
  {
    description: 'Importing the head of partially edited qualified name',
    suggestionId: 3,
    initialCode: 'Base.',
    expectedCode: 'Base.Table.new ',
    expectedImports: [{ kind: 'Qualified', module: unwrap(tryQualifiedName('Standard.Base')) }],
  },
  {
    description: 'Importing the head of partially edited qualified name (2)',
    suggestionId: 3,
    initialCode: 'Base.Table.',
    expectedCode: 'Base.Table.new ',
    expectedImports: [{ kind: 'Qualified', module: unwrap(tryQualifiedName('Standard.Base')) }],
  },
  {
    description: 'Do not import if user changes input manually after applying suggestion',
    suggestionId: 3,
    manuallyEditedCode: '',
    expectedCode: '',
    expectedImports: [],
  },
] as ImportsCase[])(
  '$description',
  ({ suggestionId, initialCode, manuallyEditedCode, expectedCode, expectedImports }) => {
    initialCode = initialCode ?? ''
    const db = new SuggestionDb()
    db.set(1, makeModule('Standard.Base'))
    db.set(2, makeType('Standard.Base.Table'))
    db.set(3, makeConstructor('Standard.Base.Table.new'))
    const graphMock = GraphDb.Mock(undefined, db)
    const input = useComponentBrowserInput(graphMock, db, aiMock)
    input.content.value = {
      text: initialCode,
      selection: { start: initialCode.length, end: initialCode.length },
    }
    input.applySuggestion(suggestionId)
    if (manuallyEditedCode != null) {
      input.content.value = { ...input.content.value, text: manuallyEditedCode }
    }
    expect(input.code.value).toEqual(expectedCode)
    expect(input.importsToAdd()).toEqual(expectedImports)
  },
)
test.each`
  typed    | finalCodeWithSourceNode
  ${'foo'} | ${'operator1.foo'}
  ${' '}   | ${'operator1. '}
  ${'+'}   | ${'operator1 +'}
  ${'>='}  | ${'operator1 >='}
`('Initialize input for new node and type $typed', ({ typed, finalCodeWithSourceNode }) => {
  const mockDb = mockGraphDb()
  const sourceNode = operator1Id
  const sourcePort = mockDb.getNodeFirstOutputPort(asNodeId(sourceNode))
  const input = useComponentBrowserInput(mockDb, new SuggestionDb(), aiMock)

  // Without source node
  input.reset({ type: 'newNode' })
  expect(input.code.value).toBe('')
  expect(input.selection.value).toEqual({ start: 0, end: 0 })
  expect(input.anyChange.value).toBeFalsy()
  input.content.value = { text: typed, selection: { start: typed.length, end: typed.length } }
  expect(input.code.value).toBe(typed)
  expect(input.selection.value).toEqual({ start: typed.length, end: typed.length })
  expect(input.anyChange.value).toBeTruthy()

  // With source node
  input.reset({ type: 'newNode', sourcePort })
  expect(input.code.value).toBe('operator1.')
  expect(input.text.value).toBe('')
  expect(input.selection.value).toEqual({ start: 0, end: 0 })
  expect(input.anyChange.value).toBeFalsy()
  input.content.value = { text: typed, selection: { start: typed.length, end: typed.length } }
  expect(input.code.value).toBe(finalCodeWithSourceNode)
  expect(input.selection.value).toEqual({
    start: input.text.value.length,
    end: input.text.value.length,
  })
  expect(input.anyChange.value).toBeTruthy()
})

test('Initialize input for edited node', () => {
  const input = useComponentBrowserInput(mockGraphDb(), new SuggestionDb(), aiMock)
  input.reset({ type: 'editNode', node: asNodeId(operator1Id), cursorPos: 4 })
  expect(input.code.value).toBe('Data.read')
  expect(input.selection.value).toEqual({ start: 4, end: 4 })
  expect(input.anyChange.value).toBeFalsy()
  // Typing anything should not affected existing code (in contrary to new node creation)
  input.content.value = { text: `Data.+.read`, selection: { start: 5, end: 5 } }
  expect(input.code.value).toEqual('Data.+.read')
  expect(input.selection.value).toEqual({ start: 5, end: 5 })
  expect(input.anyChange.value).toBeTruthy()
})
