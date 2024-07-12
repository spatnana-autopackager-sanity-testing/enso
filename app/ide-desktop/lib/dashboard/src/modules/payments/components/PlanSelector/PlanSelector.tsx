import * as React from 'react'

import * as reactQuery from '@tanstack/react-query'

import * as backendProvider from '#/providers/BackendProvider'
import * as textProvider from '#/providers/TextProvider'

import * as backendModule from '#/services/Backend'

import * as components from './components'
import * as componentForPlan from './getComponentForPlan'

/**
 * The mutation data for the `onCompleteMutation` mutation.
 */
interface CreateCheckoutSessionMutation {
  readonly plan: backendModule.Plan
  readonly paymentMethodId: string
}

/**
 *
 */
export interface PlanSelectorProps {
  readonly plan?: backendModule.Plan | null | undefined
  readonly onSubscribeSuccess?: (plan: backendModule.Plan, paymentMethodId: string) => void
  readonly onSubscribeError?: (error: Error) => void
}

/**
 *
 */
export function PlanSelector(props: PlanSelectorProps) {
  const { onSubscribeSuccess, onSubscribeError, plan } = props
  const { getText } = textProvider.useText()

  const backend = backendProvider.useRemoteBackendStrict()

  const onCompleteMutation = reactQuery.useMutation({
    mutationFn: async (mutationData: CreateCheckoutSessionMutation) => {
      const { id } = await backend.createCheckoutSession({
        plan: mutationData.plan,
        paymentMethodId: mutationData.paymentMethodId,
      })
      return backend.getCheckoutSession(id).then(data => {
        if (['trialing', 'active'].includes(data.status)) {
          return data
        } else {
          throw new Error(
            'Session not complete, please contact the support team or try with another payment method.'
          )
        }
      })
    },
    onSuccess: (_, mutationData) =>
      onSubscribeSuccess?.(mutationData.plan, mutationData.paymentMethodId),
    onError: error => onSubscribeError?.(error),
  })

  return (
    <div className="w-full rounded-default bg-selected-frame p-8">
      <div className="flex gap-6 overflow-auto scroll-hidden">
        {backendModule.PLANS.map(newPlan => {
          const planProps = componentForPlan.getComponentPerPlan(newPlan, getText)

          return (
            <components.Card
              key={newPlan}
              className="min-w-64 flex-1"
              features={planProps.features}
              subtitle={planProps.subtitle}
              title={planProps.title}
              submitButton={
                <planProps.submitButton
                  onSubmit={async paymentMethodId => {
                    await onCompleteMutation.mutateAsync({
                      plan: newPlan,
                      paymentMethodId,
                    })
                  }}
                  plan={newPlan}
                  defaultOpen={newPlan === plan}
                />
              }
              learnMore={<planProps.learnMore />}
              pricing={planProps.pricing}
            />
          )
        })}
      </div>
    </div>
  )
}
