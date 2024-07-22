/**
 * The subscribe button component.
 */
import { getSalesEmail } from '#/appUtils'

import { useText } from '#/providers/TextProvider'

import { Button, Text } from '#/components/AriaComponents'

/**
 * The props for the submit button.
 */
export interface SubscribeButtonProps {
  readonly userHasSubscription: boolean
  readonly isCurrent?: boolean
  readonly isDowngrade?: boolean
  readonly isDisabled?: boolean
  readonly canTrial?: boolean
}

/**
 * Subscribe to a plan button
 */
export function SubscribeButton(props: SubscribeButtonProps) {
  const {
    userHasSubscription,
    isCurrent = false,
    isDowngrade = false,
    isDisabled = false,
    canTrial = false,
  } = props

  const { getText } = useText()
  const disabled = isCurrent || isDowngrade || isDisabled

  const buttonText = (() => {
    if (isDowngrade) {
      // eslint-disable-next-line no-restricted-syntax
      return getText('downgrade')
    }

    if (isCurrent) {
      // eslint-disable-next-line no-restricted-syntax
      return getText('currentPlan')
    }

    if (userHasSubscription) {
      // eslint-disable-next-line no-restricted-syntax
      return getText('upgrade')
    }

    // eslint-disable-next-line no-restricted-syntax
    return getText('subscribe')
  })()

  const description = (() => {
    if (isCurrent) {
      return null
    }

    if (isDowngrade) {
      return (
        <>
          {getText('downgradeInfo')}{' '}
          <Button variant="link" href={getSalesEmail() + `?subject=Downgrade%20our%20plan`}>
            {getText('contactSales')}
          </Button>
        </>
      )
    }

    if (canTrial) {
      return getText('trialDescription')
    }

    return null
  })()

  const variant = (() => {
    if (isCurrent) {
      return 'outline'
    }

    if (isDowngrade) {
      return 'outline'
    }

    return 'submit'
  })()

  return (
    <div className="w-full text-center">
      <Button fullWidth isDisabled={disabled} variant={variant} size="large" rounded="full">
        {buttonText}
      </Button>

      {canTrial && !isCurrent && !isDowngrade && (
        <>
          <Text transform="capitalize" className="my-0.5 flex">
            {getText('or')}
          </Text>
          <Button variant="outline" fullWidth>
            {description}
          </Button>
        </>
      )}
    </div>
  )
}
