/**
 * @file
 *
 * This file contains the logic to get the component for a given plan.
 */
import * as React from 'react'

import invariant from 'tiny-invariant'

import type * as text from 'enso-common/src/text'

import OpenInNewTabIcon from '#/assets/open.svg'

import * as textProvider from '#/providers/TextProvider'

import * as ariaComponents from '#/components/AriaComponents'

import * as backendModule from '#/services/Backend'

import * as constants from '../../constants'
import { PlanSelectorDialog } from './components'

/**
 * The props for the submit button.
 */
interface SubmitButtonProps {
  readonly onSubmit: (paymentMethodId: string) => Promise<void>
  readonly plan: backendModule.Plan
  readonly userHasSubscription: boolean
  readonly isCurrent?: boolean
  readonly isDowngrade?: boolean
  readonly defaultOpen?: boolean
  readonly isDisabled?: boolean
  readonly features: string[]
}

/**
 * The component for a plan.
 */
export interface ComponentForPlan {
  readonly pricing: text.TextId
  readonly features: text.TextId
  readonly title: text.TextId
  readonly subtitle: text.TextId
  readonly learnMore: () => React.ReactNode
  readonly submitButton: (props: SubmitButtonProps) => React.ReactNode
  readonly elevated?: boolean
}

/**
 * Get the component for a given plan.
 * @throws Error if the plan is invalid.
 */
export function getComponentPerPlan(plan: backendModule.Plan, getText: textProvider.GetText) {
  const result = COMPONENT_PER_PLAN[plan]

  // We double check that th plan exists in the map.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  invariant(result != null, `Plan ${plan} not found`)

  return {
    ...result,
    features: getText(result.features).split(';'),
  }
}

const COMPONENT_PER_PLAN: Record<backendModule.Plan, ComponentForPlan> = {
  free: {
    learnMore: () => null,
    pricing: 'freePlanPricing',
    features: 'freePlanFeatures',
    title: constants.PLAN_TO_TEXT_ID['free'],
    subtitle: 'freePlanSubtitle',
    submitButton: ({
      isCurrent = false,
      isDowngrade = false,
      isDisabled = true,
      userHasSubscription,
    }) => {
      const { getText } = textProvider.useText()
      const disabled = isCurrent || isDowngrade || isDisabled

      const buttonText = (() => {
        if (isDowngrade) {
          return getText('downgrade')
        } else if (isCurrent) {
          return getText('currentPlan')
        } else if (userHasSubscription) {
          return getText('upgrade')
        } else {
          return getText('subscribe')
        }
      })()

      return (
        <ariaComponents.Button
          fullWidth
          isDisabled={disabled}
          variant="outline"
          size="medium"
          rounded="full"
        >
          {buttonText}
        </ariaComponents.Button>
      )
    },
  },
  [backendModule.Plan.solo]: {
    learnMore: () => {
      const { getText } = textProvider.useText()

      return (
        <ariaComponents.Button
          variant="link"
          href="https://enso.org/pricing"
          target="_blank"
          icon={OpenInNewTabIcon}
          iconPosition="end"
          size="medium"
        >
          {getText('learnMore')}
        </ariaComponents.Button>
      )
    },
    pricing: 'soloPlanPricing',
    submitButton: props => {
      const {
        onSubmit,
        defaultOpen = false,
        plan,
        isDowngrade = false,
        isCurrent = false,
        isDisabled = false,
        userHasSubscription = false,
        features,
      } = props

      const { getText } = textProvider.useText()

      const disabled = isCurrent || isDowngrade || isDisabled

      const buttonText = (() => {
        if (isDowngrade) {
          return getText('downgrade')
        } else if (isCurrent) {
          return getText('currentPlan')
        } else if (userHasSubscription) {
          return getText('upgrade')
        } else {
          return getText('subscribe')
        }
      })()

      return (
        <ariaComponents.DialogTrigger defaultOpen={isDisabled ? false : defaultOpen}>
          <ariaComponents.Button
            variant={'outline'}
            isDisabled={disabled}
            fullWidth
            size="medium"
            rounded="full"
          >
            {buttonText}
          </ariaComponents.Button>

          <PlanSelectorDialog
            title={getText('upgradeTo', getText(plan))}
            onSubmit={onSubmit}
            planName={getText(plan)}
            features={features}
            plan={plan}
          />
        </ariaComponents.DialogTrigger>
      )
    },
    features: 'soloPlanFeatures',
    subtitle: 'soloPlanSubtitle',
    title: constants.PLAN_TO_TEXT_ID['solo'],
  },
  [backendModule.Plan.team]: {
    learnMore: () => {
      const { getText } = textProvider.useText()

      return (
        <ariaComponents.Button
          variant="link"
          href="https://enso.org/pricing"
          target="_blank"
          icon={OpenInNewTabIcon}
          iconPosition="end"
          size="medium"
        >
          {getText('learnMore')}
        </ariaComponents.Button>
      )
    },
    pricing: 'teamPlanPricing',
    features: 'teamPlanFeatures',
    title: constants.PLAN_TO_TEXT_ID['team'],
    subtitle: 'teamPlanSubtitle',
    elevated: true,
    submitButton: props => {
      const {
        plan,
        onSubmit,
        defaultOpen = false,
        isDowngrade = false,
        isCurrent = false,
        userHasSubscription = false,
        isDisabled = false,
        features,
      } = props

      const { getText } = textProvider.useText()

      const disabled = isCurrent || isDowngrade || isDisabled

      const buttonText = (() => {
        if (isDowngrade) {
          return getText('downgrade')
        } else if (isCurrent) {
          return getText('currentPlan')
        } else if (userHasSubscription) {
          return getText('upgrade')
        } else {
          return getText('subscribe')
        }
      })()

      return (
        <ariaComponents.DialogTrigger defaultOpen={isDisabled ? false : defaultOpen}>
          <ariaComponents.Button
            isDisabled={disabled}
            variant={'submit'}
            fullWidth
            size="medium"
            rounded="full"
          >
            {buttonText}
          </ariaComponents.Button>

          <PlanSelectorDialog
            title={getText('upgradeTo', getText(plan))}
            onSubmit={onSubmit}
            planName={getText(plan)}
            features={features}
            plan={plan}
          />
        </ariaComponents.DialogTrigger>
      )
    },
  },
  [backendModule.Plan.enterprise]: {
    learnMore: () => {
      const { getText } = textProvider.useText()

      return (
        <ariaComponents.Button
          variant="link"
          href="https://enso.org/pricing"
          target="_blank"
          icon={OpenInNewTabIcon}
          iconPosition="end"
          size="medium"
        >
          {getText('learnMore')}
        </ariaComponents.Button>
      )
    },
    pricing: 'enterprisePlanPricing',
    features: 'enterprisePlanFeatures',
    title: constants.PLAN_TO_TEXT_ID['enterprise'],
    subtitle: 'enterprisePlanSubtitle',
    submitButton: () => {
      const { getText } = textProvider.useText()

      return (
        <ariaComponents.Button fullWidth isDisabled variant="outline" size="medium" rounded="full">
          {getText('comingSoon')}
        </ariaComponents.Button>
      )
    },
  },
}
