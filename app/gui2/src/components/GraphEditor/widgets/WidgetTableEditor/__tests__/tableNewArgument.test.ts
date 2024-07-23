import { WidgetInput } from '@/providers/widgetRegistry'
import { Ast } from 'shared/ast'
import { expect, test } from 'vitest'
import { useTableNewArgument } from '../readTableNewArgument'

test.each([
  {
    code: 'Table.new [["a", [1, 2, 3]], ["b", [4, 5, 6]]]',
    expectedColumnDefs: [{ field: 'a' }, { field: 'b' }],
    expectedRowData: [
      { a: 1, b: 4 },
      { a: 2, b: 5 },
      { a: 3, b: 6 },
    ],
  },
])('Reading table from $code', ({ code, expectedColumnDefs, expectedRowData }) => {
  const ast = Ast.parse(code)
  const input = WidgetInput.FromAst(ast)
  const tableNewArgs = useTableNewArgument(input)
  expect(tableNewArgs.columnDefs.value).toEqual(expectedColumnDefs)
  expect(tableNewArgs.rowData.value).toEqual(expectedRowData)
})
