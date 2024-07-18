/** @file Settings screen. */
import * as React from 'react'

import * as reactQuery from '@tanstack/react-query'

import BurgerMenuIcon from '#/assets/burger_menu.svg'

import * as backendHooks from '#/hooks/backendHooks'
import * as searchParamsState from '#/hooks/searchParamsStateHooks'
import * as toastAndLogHooks from '#/hooks/toastAndLogHooks'

import * as authProvider from '#/providers/AuthProvider'
import * as backendProvider from '#/providers/BackendProvider'
import * as textProvider from '#/providers/TextProvider'

import SearchBar from '#/layouts/SearchBar'
import * as settingsData from '#/layouts/Settings/settingsData'
import SettingsTab from '#/layouts/Settings/SettingsTab'
import SettingsTabType from '#/layouts/Settings/SettingsTabType'
import SettingsSidebar from '#/layouts/SettingsSidebar'

import * as aria from '#/components/aria'
import * as ariaComponents from '#/components/AriaComponents'
import * as portal from '#/components/Portal'
import Button from '#/components/styled/Button'

import type Backend from '#/services/Backend'
import * as projectManager from '#/services/ProjectManager'

import * as array from '#/utilities/array'
import * as string from '#/utilities/string'

// ================
// === Settings ===
// ================

/** Props for a {@link Settings}. */
export interface SettingsProps {
  readonly backend: Backend | null
}

/** Settings screen. */
export default function Settings() {
  const backend = backendProvider.useRemoteBackendStrict()
  const localBackend = backendProvider.useLocalBackend()
  const [tab, setTab] = searchParamsState.useSearchParamsState(
    'SettingsTab',
    SettingsTabType.account,
    array.includesPredicate(Object.values(SettingsTabType))
  )
  const { user, accessToken } = authProvider.useNonPartialUserSession()
  const { authQueryKey } = authProvider.useAuth()
  const { getText } = textProvider.useText()
  const toastAndLog = toastAndLogHooks.useToastAndLog()
  const [query, setQuery] = React.useState('')
  const root = portal.useStrictPortalContext()
  const [isSidebarPopoverOpen, setIsSidebarPopoverOpen] = React.useState(false)
  const organization = backendHooks.useBackendGetOrganization(backend)
  const isQueryBlank = !/\S/.test(query)

  const client = reactQuery.useQueryClient()
  const updateUserMutation = backendHooks.useBackendMutation(backend, 'updateUser', {
    meta: { invalidates: [authQueryKey], awaitInvalidates: true },
  })
  const updateOrganizationMutation = backendHooks.useBackendMutation(backend, 'updateOrganization')
  const updateUser = updateUserMutation.mutateAsync
  const updateOrganization = updateOrganizationMutation.mutateAsync

  const updateLocalRootPathMutation = reactQuery.useMutation({
    mutationKey: [localBackend?.type, 'updateRootPath'],
    mutationFn: (value: string) => {
      if (localBackend) {
        localBackend.rootPath = projectManager.Path(value)
      }
      return Promise.resolve()
    },
    meta: { invalidates: [[localBackend?.type, 'listDirectory']], awaitInvalidates: true },
  })

  const updateLocalRootPath = updateLocalRootPathMutation.mutateAsync

  const context = React.useMemo<settingsData.SettingsContext>(
    () => ({
      accessToken,
      user,
      backend,
      localBackend,
      organization,
      updateUser,
      updateOrganization,
      updateLocalRootPath,
      toastAndLog,
      getText,
      queryClient: client,
    }),
    [
      accessToken,
      backend,
      getText,
      localBackend,
      organization,
      toastAndLog,
      updateLocalRootPath,
      updateOrganization,
      updateUser,
      user,
      client,
    ]
  )

  const isMatch = React.useMemo(() => {
    const regex = new RegExp(string.regexEscape(query.trim()).replace(/\s+/g, '.+'), 'i')
    return (name: string) => regex.test(name)
  }, [query])

  const doesEntryMatchQuery = React.useCallback(
    (entry: settingsData.SettingsEntryData) => {
      switch (entry.type) {
        case settingsData.SettingsEntryType.input: {
          return isMatch(getText(entry.nameId))
        }
        case settingsData.SettingsEntryType.custom: {
          const doesAliasesIdMatch =
            entry.aliasesId == null ? false : getText(entry.aliasesId).split('\n').some(isMatch)
          if (doesAliasesIdMatch) {
            return true
          } else {
            return entry.getExtraAliases == null
              ? false
              : entry.getExtraAliases(context).some(isMatch)
          }
        }
      }
    },
    [context, getText, isMatch]
  )

  const tabsToShow = React.useMemo<readonly SettingsTabType[]>(() => {
    if (isQueryBlank) {
      return settingsData.ALL_SETTINGS_TABS
    } else {
      return settingsData.SETTINGS_DATA.flatMap(tabSection =>
        tabSection.tabs
          .filter(tabData =>
            isMatch(getText(tabData.nameId)) || isMatch(getText(tabSection.nameId))
              ? true
              : tabData.sections.some(section =>
                  isMatch(getText(section.nameId))
                    ? true
                    : section.entries.some(doesEntryMatchQuery)
                )
          )
          .map(tabData => tabData.settingsTab)
      )
    }
  }, [isQueryBlank, doesEntryMatchQuery, getText, isMatch])
  const effectiveTab = tabsToShow.includes(tab) ? tab : tabsToShow[0] ?? SettingsTabType.account

  const data = React.useMemo<settingsData.SettingsTabData>(() => {
    const tabData = settingsData.SETTINGS_TAB_DATA[effectiveTab]
    if (isQueryBlank) {
      return tabData
    } else {
      if (isMatch(getText(tabData.nameId))) {
        return tabData
      } else {
        const sections = tabData.sections.flatMap(section => {
          const matchingEntries = isMatch(getText(section.nameId))
            ? section.entries
            : section.entries.filter(doesEntryMatchQuery)
          if (matchingEntries.length === 0) {
            return []
          } else {
            return [{ ...section, entries: matchingEntries }]
          }
        })
        return {
          ...tabData,
          sections:
            sections.length === 0 ? [settingsData.SETTINGS_NO_RESULTS_SECTION_DATA] : sections,
        }
      }
    }
  }, [isQueryBlank, doesEntryMatchQuery, getText, isMatch, effectiveTab])

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden px-page-x pt-4">
      <aria.Heading level={1} className="flex items-center px-heading-x">
        <aria.MenuTrigger isOpen={isSidebarPopoverOpen} onOpenChange={setIsSidebarPopoverOpen}>
          <Button image={BurgerMenuIcon} buttonClassName="mr-3 sm:hidden" onPress={() => {}} />
          <aria.Popover UNSTABLE_portalContainer={root}>
            <SettingsSidebar
              isMenu
              context={context}
              tabsToShow={tabsToShow}
              tab={effectiveTab}
              setTab={setTab}
              onClickCapture={() => {
                setIsSidebarPopoverOpen(false)
              }}
            />
          </aria.Popover>
        </aria.MenuTrigger>

        <ariaComponents.Text variant="h1" className="font-bold">
          {getText('settingsFor')}
        </ariaComponents.Text>

        <ariaComponents.Text
          variant="h1"
          truncate="1"
          className="ml-2.5 max-w-lg rounded-full bg-white px-2.5 font-bold"
          aria-hidden
        >
          {data.organizationOnly === true ? organization?.name ?? 'your organization' : user.name}
        </ariaComponents.Text>
      </aria.Heading>
      <div className="flex sm:ml-[222px]">
        <SearchBar
          data-testid="settings-search-bar"
          query={query}
          setQuery={setQuery}
          label={getText('settingsSearchBarLabel')}
          placeholder={getText('settingsSearchBarPlaceholder')}
        />
      </div>
      <div className="flex flex-1 gap-6 overflow-hidden pr-0.5">
        <aside className="hidden h-full shrink-0 basis-[206px] flex-col overflow-y-auto overflow-x-hidden pb-12 sm:flex">
          <SettingsSidebar
            context={context}
            tabsToShow={tabsToShow}
            tab={effectiveTab}
            setTab={setTab}
          />
        </aside>
        <SettingsTab
          context={context}
          data={data}
          onInteracted={() => {
            if (effectiveTab !== tab) {
              setTab(effectiveTab)
            }
          }}
        />
      </div>
    </div>
  )
}
