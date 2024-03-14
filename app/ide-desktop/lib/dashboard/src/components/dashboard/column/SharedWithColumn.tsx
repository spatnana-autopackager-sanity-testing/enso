/** @file A column listing the users with which this asset is shared. */
import * as React from 'react'

import Plus2Icon from 'enso-assets/plus2.svg'

import * as setAssetHooks from '#/hooks/setAssetHooks'

import * as authProvider from '#/providers/AuthProvider'
import * as modalProvider from '#/providers/ModalProvider'

import AssetEventType from '#/events/AssetEventType'

import Category from '#/layouts/CategorySwitcher/Category'

import type * as column from '#/components/dashboard/column'
import PermissionDisplay from '#/components/dashboard/PermissionDisplay'

import ManagePermissionsModal from '#/modals/ManagePermissionsModal'

import * as permissions from '#/utilities/permissions'
import * as uniqueString from '#/utilities/uniqueString'

// ========================
// === SharedWithColumn ===
// ========================

/** The type of the `state` prop of a {@link SharedWithColumn}. */
interface SharedWithColumnStateProp
  extends Pick<column.AssetColumnProps['state'], 'category' | 'dispatchAssetEvent' | 'setQuery'> {}

/** Props for a {@link SharedWithColumn}. */
interface SharedWithColumnPropsInternal extends Pick<column.AssetColumnProps, 'item' | 'setItem'> {
  readonly state: SharedWithColumnStateProp
}

/** A column listing the users with which this asset is shared. */
export default function SharedWithColumn(props: SharedWithColumnPropsInternal) {
  const { item, setItem, state } = props
  const { category, dispatchAssetEvent, setQuery } = state
  const { user } = authProvider.useNonPartialUserSession()
  const { setModal } = modalProvider.useSetModal()
  const smartAsset = item.item
  const asset = smartAsset.value
  const self = asset.permissions?.find(
    permission => permission.user.user_email === user?.value.email
  )
  const managesThisAsset =
    category !== Category.trash &&
    (self?.permission === permissions.PermissionAction.own ||
      self?.permission === permissions.PermissionAction.admin)
  const setAsset = setAssetHooks.useSetAsset(asset, setItem)

  return (
    <div className="group flex items-center gap-column-items">
      {(asset.permissions ?? []).map(otherUser => (
        <PermissionDisplay
          key={otherUser.user.pk}
          action={otherUser.permission}
          onClick={event => {
            setQuery(oldQuery =>
              oldQuery.withToggled(
                'owners',
                'negativeOwners',
                otherUser.user.user_name,
                event.shiftKey
              )
            )
          }}
        >
          {otherUser.user.user_name}
        </PermissionDisplay>
      ))}
      {managesThisAsset && (
        <button
          className="invisible shrink-0 group-hover:visible"
          onClick={event => {
            event.stopPropagation()
            setModal(
              <ManagePermissionsModal
                key={uniqueString.uniqueString()}
                item={smartAsset}
                setItem={setAsset}
                self={self}
                eventTarget={event.currentTarget}
                doRemoveSelf={() => {
                  dispatchAssetEvent({
                    type: AssetEventType.removeSelf,
                    id: asset.id,
                  })
                }}
              />
            )
          }}
        >
          <img className="size-plus-icon" src={Plus2Icon} />
        </button>
      )}
    </div>
  )
}
