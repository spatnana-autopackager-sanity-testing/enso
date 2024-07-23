/**
 * @file Constants for the subscribe page.
 */
import type * as text from 'enso-common/src/text'

import * as backendModule from '#/services/Backend'

/**
 * The text id for the plan name.
 */
export const PLAN_TO_TEXT_ID: Readonly<Record<backendModule.Plan, text.TextId>> = {
  [backendModule.Plan.free]: 'freePlanName',
  [backendModule.Plan.solo]: 'soloPlanName',
  [backendModule.Plan.team]: 'teamPlanName',
  [backendModule.Plan.enterprise]: 'enterprisePlanName',
} satisfies { [Plan in backendModule.Plan]: `${Plan}PlanName` }

export const PRICE_CURRENCY = 'USD'
export const PRICE_PER_PLAN: Readonly<Record<backendModule.Plan, number>> = {
  [backendModule.Plan.free]: 0,
  [backendModule.Plan.solo]: 60,
  [backendModule.Plan.team]: 150,
  [backendModule.Plan.enterprise]: 250,
} satisfies { [Plan in backendModule.Plan]: number }
