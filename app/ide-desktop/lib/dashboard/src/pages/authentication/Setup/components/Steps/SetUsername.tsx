import * as React from 'react'

import * as textProvider from '#/providers/TextProvider'

import * as ariaComponents from '#/components/AriaComponents'

/**
 *
 */
export interface SetUsernameProps {}

/**
 *
 */
export function SetUsername(props: SetUsernameProps) {
  const { getText } = textProvider.useText()

  return (
    <>
      <ariaComponents.Input name="username" />
    </>
  )
}
