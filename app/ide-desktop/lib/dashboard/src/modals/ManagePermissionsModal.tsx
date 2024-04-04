/** @file A modal with inputs for user email and permission level. */
import * as React from 'react'

import * as toast from 'react-toastify'
import isEmail from 'validator/es/lib/isEmail'

import * as asyncEffectHooks from '#/hooks/asyncEffectHooks'
import * as toastAndLogHooks from '#/hooks/toastAndLogHooks'

import * as authProvider from '#/providers/AuthProvider'
import * as modalProvider from '#/providers/ModalProvider'
import * as textProvider from '#/providers/TextProvider'

import Autocomplete from '#/components/Autocomplete'
import PermissionSelector from '#/components/dashboard/PermissionSelector'
import UserPermission from '#/components/dashboard/UserPermission'
import Modal from '#/components/Modal'

import * as backendModule from '#/services/Backend'

import * as object from '#/utilities/object'
import * as permissionsModule from '#/utilities/permissions'

// =================
// === Constants ===
// =================

/** The vertical offset of the `PermissionTypeSelector` from its parent element, for the
 * input to invite new users. */
const TYPE_SELECTOR_Y_OFFSET_PX = 32

// ==============================
// === ManagePermissionsModal ===
// ==============================

/** Props for a {@link ManagePermissionsModal}. */
export interface ManagePermissionsModalProps<
  Asset extends backendModule.AnySmartAsset = backendModule.AnySmartAsset,
> {
  readonly item: Asset
  readonly setItem: React.Dispatch<React.SetStateAction<Asset['value']>>
  readonly self: backendModule.UserPermission
  /** Remove the current user's permissions from this asset. This MUST be a prop because it should
   * change the assets list. */
  readonly doRemoveSelf: () => void
  /** If this is `null`, this modal will be centered. */
  readonly eventTarget: HTMLElement | null
}

/** A modal with inputs for user email and permission level.
 * @throws {Error} when the current backend is the local backend, or when the user is offline.
 * This should never happen, as this modal should not be accessible in either case. */
export default function ManagePermissionsModal<
  Asset extends backendModule.AnySmartAsset = backendModule.AnySmartAsset,
>(props: ManagePermissionsModalProps<Asset>) {
  const { item, setItem, self, doRemoveSelf, eventTarget } = props
  const { user } = authProvider.useNonPartialUserSession()
  const { unsetModal } = modalProvider.useSetModal()
  const toastAndLog = toastAndLogHooks.useToastAndLog()
  const { getText } = textProvider.useText()
  const asset = item.value
  const [permissions, setPermissions] = React.useState(asset.permissions ?? [])
  const [users, setUsers] = React.useState<backendModule.UserInfo[]>([])
  const [email, setEmail] = React.useState<string | null>(null)
  const [action, setAction] = React.useState(permissionsModule.PermissionAction.view)
  const position = React.useMemo(() => eventTarget?.getBoundingClientRect(), [eventTarget])
  const editablePermissions = React.useMemo(
    () =>
      self.permission === permissionsModule.PermissionAction.own
        ? permissions
        : permissions.filter(
            permission => permission.permission !== permissionsModule.PermissionAction.own
          ),
    [permissions, self.permission]
  )
  const usernamesOfUsersWithPermission = React.useMemo(
    () => new Set(asset.permissions?.map(userPermission => userPermission.user.name)),
    [asset.permissions]
  )
  const emailsOfUsersWithPermission = React.useMemo(
    () => new Set<string>(asset.permissions?.map(userPermission => userPermission.user.email)),
    [asset.permissions]
  )
  const isOnlyOwner = React.useMemo(
    () =>
      self.permission === permissionsModule.PermissionAction.own &&
      permissions.every(
        permission =>
          permission.permission !== permissionsModule.PermissionAction.own ||
          permission.user.userId === user?.value.userId
      ),
    [user?.value.userId, permissions, self.permission]
  )

  React.useEffect(() => {
    setItem(object.merger<backendModule.AnyAsset>({ permissions }))
  }, [permissions, /* should never change */ setItem])

  if (user == null) {
    // This should never happen - the local backend does not have the "shared with" column,
    // and `organization` is absent only when offline - in which case the user should only
    // be able to access the local backend.
    // This MUST be an error, otherwise the hooks below are considered as conditionally called.
    throw new Error('Cannot share assets on the local backend.')
  } else {
    const listedUsers = asyncEffectHooks.useAsyncEffect(null, () => user.listUsers(), [user])
    const allUsers = React.useMemo(
      () =>
        (listedUsers ?? []).filter(
          listedUser =>
            !usernamesOfUsersWithPermission.has(listedUser.name) &&
            !emailsOfUsersWithPermission.has(listedUser.email)
        ),
      [emailsOfUsersWithPermission, usernamesOfUsersWithPermission, listedUsers]
    )
    const willInviteNewUser = React.useMemo(() => {
      if (users.length !== 0 || email == null || email === '') {
        return false
      } else {
        const lowercase = email.toLowerCase()
        return (
          lowercase !== '' &&
          !usernamesOfUsersWithPermission.has(lowercase) &&
          !emailsOfUsersWithPermission.has(lowercase) &&
          !allUsers.some(
            innerUser =>
              innerUser.name.toLowerCase() === lowercase ||
              innerUser.email.toLowerCase() === lowercase
          )
        )
      }
    }, [users.length, email, emailsOfUsersWithPermission, usernamesOfUsersWithPermission, allUsers])

    const doSubmit = async () => {
      if (willInviteNewUser) {
        try {
          setUsers([])
          setEmail('')
          if (email != null) {
            await user.invite(backendModule.EmailAddress(email))
            toast.toast.success(getText('inviteSuccess', email))
          }
        } catch (error) {
          toastAndLog('couldNotInviteUser', error, email ?? '(unknown)')
        }
      } else {
        setUsers([])
        const addedUsersPermissions = users.map<backendModule.UserPermission>(newUser => ({
          user: {
            organizationId: newUser.organizationId,
            userId: newUser.userId,
            email: newUser.email,
            name: newUser.name,
          },
          permission: action,
        }))
        const addedUsersIds = new Set(addedUsersPermissions.map(newUser => newUser.user.userId))
        const oldUsersPermissions = permissions.filter(userPermission =>
          addedUsersIds.has(userPermission.user.userId)
        )
        try {
          setPermissions(oldPermissions =>
            [
              ...oldPermissions.filter(
                oldUserPermissions => !addedUsersIds.has(oldUserPermissions.user.userId)
              ),
              ...addedUsersPermissions,
            ].sort(backendModule.compareUserPermissions)
          )
          const actorsIds = addedUsersPermissions.map(
            userPermissions => userPermissions.user.userId
          )
          await item.setPermissions({ actorsIds, action })
        } catch (error) {
          setPermissions(oldPermissions =>
            [
              ...oldPermissions.filter(permission => !addedUsersIds.has(permission.user.userId)),
              ...oldUsersPermissions,
            ].sort(backendModule.compareUserPermissions)
          )
          const usernames = addedUsersPermissions.map(userPermissions => userPermissions.user.name)
          toastAndLog('setPermissionsError', error, usernames.join("', '"))
        }
      }
    }

    const doDelete = async (userToDelete: backendModule.UserInfo) => {
      if (userToDelete.userId === self.user.userId) {
        doRemoveSelf()
      } else {
        const oldPermission = permissions.find(
          userPermission => userPermission.user.userId === userToDelete.userId
        )
        try {
          setPermissions(oldPermissions =>
            oldPermissions.filter(
              oldUserPermissions => oldUserPermissions.user.userId !== userToDelete.userId
            )
          )
          await item.setPermissions({ actorsIds: [userToDelete.userId], action: null })
        } catch (error) {
          if (oldPermission != null) {
            setPermissions(oldPermissions =>
              [...oldPermissions, oldPermission].sort(backendModule.compareUserPermissions)
            )
          }
          toastAndLog('setPermissionsError', error, userToDelete.email)
        }
      }
    }

    return (
      <Modal
        centered={eventTarget == null}
        className="absolute left top size-full overflow-hidden bg-dim"
      >
        <div
          tabIndex={-1}
          style={
            position != null
              ? { left: position.left + window.scrollX, top: position.top + window.scrollY }
              : {}
          }
          className="sticky w-manage-permissions-modal rounded-default before:absolute before:h-full before:w-full before:rounded-default before:bg-selected-frame before:backdrop-blur-default"
          onClick={mouseEvent => {
            mouseEvent.stopPropagation()
          }}
          onContextMenu={mouseEvent => {
            mouseEvent.stopPropagation()
            mouseEvent.preventDefault()
          }}
          onKeyDown={event => {
            if (event.key !== 'Escape') {
              event.stopPropagation()
            }
          }}
        >
          <div className="relative flex flex-col gap-modal rounded-default p-modal">
            <div className="flex h-row items-center gap-modal-tabs px-modal-tab-bar-x">
              <h2 className="text text-sm font-bold">{getText('invite')}</h2>
              {/* Space reserved for other tabs. */}
            </div>
            <form
              className="flex gap-input-with-button"
              onSubmit={event => {
                event.preventDefault()
                void doSubmit()
              }}
            >
              <div className="flex grow items-center gap-user-permission rounded-full border border-primary/10 px-manage-permissions-modal-input">
                <PermissionSelector
                  input
                  disabled={willInviteNewUser}
                  selfPermission={self.permission}
                  typeSelectorYOffsetPx={TYPE_SELECTOR_Y_OFFSET_PX}
                  action={permissionsModule.PermissionAction.view}
                  assetType={item.type}
                  onChange={setAction}
                />
                <div className="-mx-button-px grow">
                  <Autocomplete
                    multiple
                    autoFocus
                    placeholder={
                      // `listedUsers` will always include the current user.
                      listedUsers?.length !== 1
                        ? getText('inviteUserPlaceholder')
                        : getText('inviteFirstUserPlaceholder')
                    }
                    type="text"
                    itemsToString={items =>
                      items.length === 1 && items[0] != null
                        ? items[0].email
                        : getText('xUsersSelected', items.length)
                    }
                    values={users}
                    setValues={setUsers}
                    items={allUsers}
                    itemToKey={otherUser => otherUser.userId}
                    itemToString={otherUser => `${otherUser.name} (${otherUser.email})`}
                    matches={(otherUser, text) =>
                      otherUser.email.toLowerCase().includes(text.toLowerCase()) ||
                      otherUser.name.toLowerCase().includes(text.toLowerCase())
                    }
                    text={email}
                    setText={setEmail}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={
                  willInviteNewUser
                    ? email == null || !isEmail(email)
                    : users.length === 0 ||
                      (email != null && emailsOfUsersWithPermission.has(email))
                }
                className="button bg-invite px-button-x text-tag-text selectable enabled:active"
              >
                <div className="h-text py-modal-invite-button-text-y">
                  {willInviteNewUser ? 'Invite' : 'Share'}
                </div>
              </button>
            </form>
            <div className="max-h-manage-permissions-modal-permissions-list overflow-auto px-manage-permissions-modal-input">
              {editablePermissions.map(userPermission => (
                <div key={userPermission.user.userId} className="flex h-row items-center">
                  <UserPermission
                    asset={item}
                    self={self}
                    isOnlyOwner={isOnlyOwner}
                    userPermission={userPermission}
                    setUserPermission={newUserPermission => {
                      setPermissions(oldPermissions =>
                        oldPermissions.map(oldUserPermission =>
                          oldUserPermission.user.userId === newUserPermission.user.userId
                            ? newUserPermission
                            : oldUserPermission
                        )
                      )
                      if (newUserPermission.user.userId === self.user.userId) {
                        // This must run only after the permissions have
                        // been updated through `setItem`.
                        setTimeout(() => {
                          unsetModal()
                        }, 0)
                      }
                    }}
                    doDelete={userToDelete => {
                      if (userToDelete.userId === self.user.userId) {
                        unsetModal()
                      }
                      void doDelete(userToDelete)
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    )
  }
}
