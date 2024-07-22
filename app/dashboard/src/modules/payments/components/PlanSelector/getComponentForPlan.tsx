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
import {
  PlanSelectorDialog,
  SubscribeButton,
  type PlanSelectorDialogProps,
  type SubscribeButtonProps,
} from './components'

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
 * The props for the submit dialog.
 */
export interface SubmitButtonProps
  extends Omit<PlanSelectorDialogProps, 'planName' | 'title'>,
    SubscribeButtonProps {
  readonly defaultOpen?: boolean
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
    submitButton: props => {
      const {
        isDowngrade = false,
        isCurrent = false,
        userHasSubscription = false,
        canTrial = false,
      } = props

      return (
        <SubscribeButton
          userHasSubscription={userHasSubscription}
          isDisabled={true}
          isDowngrade={isDowngrade}
          isCurrent={isCurrent}
          canTrial={canTrial}
        />
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
        canTrial = false,
        features,
      } = props

      const { getText } = textProvider.useText()

      const disabled = isCurrent || isDowngrade || isDisabled

      return (
        <ariaComponents.DialogTrigger defaultOpen={disabled ? false : defaultOpen}>
          <SubscribeButton
            userHasSubscription={userHasSubscription}
            isDisabled={isDisabled}
            isDowngrade={isDowngrade}
            isCurrent={isCurrent}
            canTrial={canTrial}
          />

          <PlanSelectorDialog
            title={getText('upgradeTo', getText(plan))}
            onSubmit={onSubmit}
            planName={getText(plan)}
            features={features}
            plan={plan}
            isTrialing={canTrial}
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
        onSubmit,
        defaultOpen = false,
        plan,
        isDowngrade = false,
        isCurrent = false,
        isDisabled = false,
        userHasSubscription = false,
        canTrial = false,
        features,
      } = props

      const { getText } = textProvider.useText()

      const disabled = isCurrent || isDowngrade || isDisabled

      return (
        <ariaComponents.DialogTrigger defaultOpen={disabled ? false : defaultOpen}>
          <SubscribeButton
            userHasSubscription={userHasSubscription}
            isDisabled={isDisabled}
            isDowngrade={isDowngrade}
            isCurrent={isCurrent}
            canTrial={canTrial}
          />

          <PlanSelectorDialog
            title={getText('upgradeTo', getText(plan))}
            onSubmit={onSubmit}
            planName={getText(plan)}
            features={features}
            plan={plan}
            isTrialing={canTrial}
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
