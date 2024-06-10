/** @file A toolbar containing chat and the user menu. */
import * as React from 'react'

import * as reactQuery from '@tanstack/react-query'

import ChatIcon from 'enso-assets/chat.svg'
import DefaultUserIcon from 'enso-assets/default_user.svg'

import * as appUtils from '#/appUtils'

import * as store from '#/store'

import * as backendHooks from '#/hooks/backendHooks'

import * as authProvider from '#/providers/AuthProvider'
import * as modalProvider from '#/providers/ModalProvider'
import * as textProvider from '#/providers/TextProvider'

import * as pageSwitcher from '#/layouts/PageSwitcher'
import UserMenu from '#/layouts/UserMenu'

import * as aria from '#/components/aria'
import * as ariaComponents from '#/components/AriaComponents'
import FocusArea from '#/components/styled/FocusArea'

import InviteUsersModal from '#/modals/InviteUsersModal'
import ManagePermissionsModal from '#/modals/ManagePermissionsModal'

import * as backendModule from '#/services/Backend'
import type Backend from '#/services/Backend'

// ===============
// === UserBar ===
// ===============

/** Props for a {@link UserBar}. */
export interface UserBarProps {
  readonly backend: Backend | null
  /** When `true`, the element occupies space in the layout but is not visible.
   * Defaults to `false`. */
  readonly invisible?: boolean
  readonly page: pageSwitcher.Page
  readonly setPage: (page: pageSwitcher.Page) => void
  readonly setIsHelpChatOpen: (isHelpChatOpen: boolean) => void
  readonly onSignOut: () => void
}

/** A toolbar containing chat and the user menu. */
export default function UserBar(props: UserBarProps) {
  const { backend, invisible = false, page, setPage, setIsHelpChatOpen } = props
  const { onSignOut } = props
  const { type: sessionType, user } = authProvider.useNonPartialUserSession()
  const { setModal, updateModal } = modalProvider.useSetModal()
  const { getText } = textProvider.useText()
  const queryClient = reactQuery.useQueryClient()
  const projectAsset = store.useStore(storeState => {
    const projectId = storeState.projectStartupInfo?.project.projectId
    if (projectId == null || backend == null) {
      return null
    } else {
      const allAssets = Object.values(
        backendHooks.getBackendAllKnownDirectories(queryClient, user, backend)
      ).flat()
      const allAssetsMap = new Map(allAssets.map(asset => [asset.id, asset]))
      return allAssetsMap.get(projectId) ?? null
    }
  })
  const self =
    user != null
      ? projectAsset?.permissions?.find(
          backendModule.isUserPermissionAnd(permissions => permissions.user.userId === user.userId)
        ) ?? null
      : null
  const shouldShowShareButton =
    backend != null && page === pageSwitcher.Page.editor && projectAsset != null && self != null
  const shouldShowInviteButton =
    backend != null && sessionType === authProvider.UserSessionType.full && !shouldShowShareButton

  return (
    <FocusArea active={!invisible} direction="horizontal">
      {innerProps => (
        <div
          className="pointer-events-auto flex h-row shrink-0 cursor-default items-center gap-1 rounded-full bg-frame px-icons-x pr-profile-picture backdrop-blur-default"
          {...innerProps}
        >
          <ariaComponents.Button
            variant="icon"
            size="custom"
            className="mr-1"
            icon={ChatIcon}
            aria-label={getText('openHelpChat')}
            onPress={() => {
              setIsHelpChatOpen(true)
            }}
          />

          {shouldShowInviteButton && (
            <ariaComponents.DialogTrigger>
              <ariaComponents.Button rounded="full" size="small" variant="tertiary">
                {getText('invite')}
              </ariaComponents.Button>

              <InviteUsersModal />
            </ariaComponents.DialogTrigger>
          )}

          <ariaComponents.Button
            variant="primary"
            rounded="full"
            size="small"
            href={appUtils.SUBSCRIBE_PATH}
          >
            {getText('upgrade')}
          </ariaComponents.Button>
          {shouldShowShareButton && (
            <ariaComponents.Button
              size="custom"
              variant="custom"
              className="text my-auto rounded-full bg-share px-button-x text-inversed"
              aria-label={getText('shareButtonAltText')}
              onPress={() => {
                setModal(
                  <ManagePermissionsModal
                    backend={backend}
                    item={projectAsset}
                    self={self}
                    eventTarget={null}
                  />
                )
              }}
            >
              <aria.Text slot="label">{getText('share')}</aria.Text>
            </ariaComponents.Button>
          )}
          <ariaComponents.Button
            size="custom"
            variant="custom"
            className="flex size-profile-picture select-none items-center overflow-clip rounded-full"
            aria-label={getText('userMenuAltText')}
            onPress={() => {
              updateModal(oldModal =>
                oldModal?.type === UserMenu ? null : (
                  <UserMenu setPage={setPage} onSignOut={onSignOut} />
                )
              )
            }}
          >
            <img
              src={user?.profilePicture ?? DefaultUserIcon}
              alt={getText('openUserMenu')}
              className="pointer-events-none"
              height={28}
              width={28}
            />
          </ariaComponents.Button>
          {/* Required for shortcuts to work. */}
          <div className="hidden">
            <UserMenu hidden setPage={setPage} onSignOut={onSignOut} />
          </div>
        </div>
      )}
    </FocusArea>
  )
}
