/** @file Container responsible for rendering and interactions in setting username flow, after
 * registration. */
import * as React from 'react'

import ArrowRightIcon from '#/assets/arrow_right.svg'
import AtIcon from '#/assets/at.svg'

import * as authProvider from '#/providers/AuthProvider'
import * as backendProvider from '#/providers/BackendProvider'
import * as textProvider from '#/providers/TextProvider'

import AuthenticationPage from '#/pages/authentication/AuthenticationPage'

import Input from '#/components/Input'
import SubmitButton from '#/components/SubmitButton'

import * as eventModule from '#/utilities/event'

// ===================
// === SetUsername ===
// ===================

/** A form for users to set their username upon registration. */
export default function SetUsername() {
  const { setUsername: authSetUsername } = authProvider.useAuth()
  const { email } = authProvider.usePartialUserSession()
  const backend = backendProvider.useRemoteBackendStrict()
  const { getText } = textProvider.useText()
  const localBackend = backendProvider.useLocalBackend()
  const supportsOffline = localBackend != null

  const [username, setUsername] = React.useState('')

  return (
    <AuthenticationPage
      data-testid="set-username-panel"
      title={getText('setYourUsername')}
      supportsOffline={supportsOffline}
      onSubmit={async event => {
        event.preventDefault()
        await authSetUsername(backend, username, email)
      }}
    >
      <Input
        autoFocus
        id="username"
        type="text"
        name="username"
        autoComplete="off"
        icon={AtIcon}
        placeholder={getText('usernamePlaceholder')}
        value={username}
        setValue={setUsername}
      />

      <SubmitButton
        text={getText('setUsername')}
        icon={ArrowRightIcon}
        onPress={eventModule.submitForm}
      />
    </AuthenticationPage>
  )
}
