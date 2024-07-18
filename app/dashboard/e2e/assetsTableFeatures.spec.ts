/** @file Test the drive view. */
import * as test from '@playwright/test'

import * as actions from './actions'

const PASS_TIMEOUT = 5_000

test.test('extra columns should stick to right side of assets table', ({ page }) =>
  actions
    .mockAllAndLogin({ page })
    .driveTable.toggleColumn.accessedByProjects()
    .driveTable.toggleColumn.accessedData()
    .withAssetsTable(async table => {
      await table.evaluate(element => {
        let scrollableParent: HTMLElement | SVGElement | null = element
        while (
          scrollableParent != null &&
          scrollableParent.scrollWidth <= scrollableParent.clientWidth
        ) {
          scrollableParent = scrollableParent.parentElement
        }
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        scrollableParent?.scrollTo({ left: 999999, behavior: 'instant' })
      })
    })
    .do(async thePage => {
      const extraColumns = actions.locateExtraColumns(thePage)
      const assetsTable = actions.locateAssetsTable(thePage)
      await test
        .expect(async () => {
          const extraColumnsRight = await extraColumns.evaluate(
            element => element.getBoundingClientRect().right
          )
          const assetsTableRight = await assetsTable.evaluate(
            element => element.getBoundingClientRect().right
          )
          test.expect(extraColumnsRight).toEqual(assetsTableRight)
        })
        .toPass({ timeout: PASS_TIMEOUT })
    })
)

test.test('extra columns should stick to top of scroll container', async ({ page }) => {
  await actions.mockAllAndLogin({
    page,
    setupAPI: api => {
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      for (let i = 0; i < 100; i += 1) {
        api.addFile('a')
      }
    },
  })

  await actions.locateAccessedByProjectsColumnToggle(page).click()
  await actions.locateAccessedDataColumnToggle(page).click()
  await actions.locateAssetsTable(page).evaluate(element => {
    let scrollableParent: HTMLElement | SVGElement | null = element
    while (
      scrollableParent != null &&
      scrollableParent.scrollWidth <= scrollableParent.clientWidth
    ) {
      scrollableParent = scrollableParent.parentElement
    }
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    scrollableParent?.scrollTo({ top: 999999, behavior: 'instant' })
  })
  const extraColumns = actions.locateExtraColumns(page)
  const assetsTable = actions.locateAssetsTable(page)
  await test
    .expect(async () => {
      const extraColumnsTop = await extraColumns.evaluate(
        element => element.getBoundingClientRect().top
      )
      const assetsTableTop = await assetsTable.evaluate(element => {
        let scrollableParent: HTMLElement | SVGElement | null = element
        while (
          scrollableParent != null &&
          scrollableParent.scrollWidth <= scrollableParent.clientWidth
        ) {
          scrollableParent = scrollableParent.parentElement
        }
        return scrollableParent?.getBoundingClientRect().top
      })
      test.expect(extraColumnsTop).toEqual(assetsTableTop)
    })
    .toPass({ timeout: PASS_TIMEOUT })
})

test.test('can drop onto root directory dropzone', ({ page }) =>
  actions
    .mockAllAndLogin({ page })
    .createFolder()
    .uploadFile('b', 'testing')
    .driveTable.doubleClickRow(0)
    .driveTable.withRows(async rows => {
      const parentLeft = await actions.getAssetRowLeftPx(rows.nth(0))
      const childLeft = await actions.getAssetRowLeftPx(rows.nth(1))
      test.expect(childLeft, 'Child is indented further than parent').toBeGreaterThan(parentLeft)
    })
    .driveTable.dragRow(1, actions.locateRootDirectoryDropzone(page))
    .driveTable.withRows(async rows => {
      const firstLeft = await actions.getAssetRowLeftPx(rows.nth(0))
      // The second row is the indented child of the directory
      // (the "this folder is empty" row).
      const secondLeft = await actions.getAssetRowLeftPx(rows.nth(2))
      test.expect(firstLeft, 'Siblings have same indentation').toEqual(secondLeft)
    })
)
