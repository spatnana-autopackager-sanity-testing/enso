/**
 * @file
 * Setup page
 */
import * as React from 'react'

import { Navigate } from 'react-router'
import invariant from 'tiny-invariant'

import type * as text from 'enso-common/src/text'

import { DASHBOARD_PATH } from '#/appUtils'

import { useIsFirstRender } from '#/hooks/mountHooks'

import { useAuth, UserSessionType } from '#/providers/AuthProvider'
import * as textProvider from '#/providers/TextProvider'

import type { FormInstance } from '#/components/AriaComponents'
import * as ariaComponents from '#/components/AriaComponents'
import Page from '#/components/Page'
import * as stepper from '#/components/Stepper'

import { Plan } from '#/services/Backend'
import { PlanSelector } from '#/modules/payments'

const SETUP_SCHEMA = ariaComponents.Form.schema.object({
  organizationName: ariaComponents.Form.schema.string().min(1).max(64),
  plan: ariaComponents.Form.schema.nativeEnum(Plan),
})

/**
 * Step in the setup process
 */
interface Step {
  readonly title: text.TextId
  readonly description?: text.TextId
  readonly text?: text.TextId
  readonly component?: React.ComponentType<Context>
  readonly canSkip?: boolean
  readonly hideNext?: boolean
  readonly hidePrevious?: boolean
  readonly ignore?: (context: Context) => boolean
}

/**
 * Context for the setup process
 */
interface Context {
  readonly form: FormInstance<typeof SETUP_SCHEMA>
  readonly plan: Plan | undefined
  readonly goToNextStep: () => void
  readonly goToPreviousStep: () => void
}

const BASE_STEPS: Step[] = [
  {
    title: 'setUsername',
    text: 'setUsernameDescription',
    hideNext: true,
    /**
     * Step component
     */
    component: function Step({ goToNextStep }) {
      const { setUsername } = useAuth()
      const { getText } = textProvider.useText()
      return (
        <ariaComponents.Form
          schema={z => z.object({ username: z.string().min(3).max(24) })}
          onSubmit={({ username }) => setUsername(username)}
          onSubmitSuccess={goToNextStep}
        >
          <ariaComponents.Input
            className="max-w-96"
            name="username"
            label={getText('userNameSettingsInput')}
            placeholder={getText('usernamePlaceholder')}
            description="Minimum 3 characters, maximum 24 characters"
          />

          <ariaComponents.Form.Submit>{getText('setUsername')}</ariaComponents.Form.Submit>

          <ariaComponents.Form.FormError />
        </ariaComponents.Form>
      )
    },
  },
  {
    title: 'choosePlan',
    text: 'choosePlanDescription',
    canSkip: true,
    hideNext: true,
    hidePrevious: true,
    component: ({ form, goToNextStep, plan }) => (
      <PlanSelector
        userPlan={plan}
        hasTrial={plan == null}
        onSubscribeSuccess={newPlan => {
          form.setValue('plan', newPlan)
          goToNextStep()
        }}
      />
    ),
  },
  {
    title: 'setOrgNameTitle',
    text: 'setOrgNameDescription',
    ignore: context => context.plan === Plan.free || context.plan == null,
    component: () => {
      const { getText } = textProvider.useText()

      return (
        <ariaComponents.Input
          name="organizationName"
          className="max-w-96"
          autoFocus
          inputMode="text"
          autoComplete="off"
          label={getText('organizationNameSettingsInput')}
          description={getText('organizationNameSettingsInputDescription', 64)}
        />
      )
    },
  },
]

/**
 * Setup page
 */
export function Setup() {
  const { getText } = textProvider.useText()
  const { session } = useAuth()
  const isFirstRender = useIsFirstRender()

  const form = ariaComponents.Form.useForm({
    schema: SETUP_SCHEMA,
    defaultValues: { plan: Plan.free },
  })

  const steps = BASE_STEPS

  const { stepperState, nextStep, previousStep, currentStep } = stepper.useStepperState({
    steps: steps.length,
    onStepChange: (step, direction) => {
      const screen = steps[step]
      if (screen?.ignore != null) {
        if (screen.ignore(context)) {
          if (direction === 'forward') {
            nextStep()
          } else {
            previousStep()
          }
        }
      }
    },
  })

  const context = {
    form,
    plan: form.watch('plan'),
    goToNextStep: nextStep,
    goToPreviousStep: previousStep,
  }

  const currentScreen = steps.at(currentStep)

  invariant(currentScreen != null, 'Current screen not found')

  if (isFirstRender()) {
    if (session?.type === UserSessionType.full) {
      // eslint-disable-next-line no-restricted-syntax
      return <Navigate to={DASHBOARD_PATH} replace />
    }
  }

  return (
    <Page>
      <div className="mx-auto mt-24 w-full max-w-screen-xl px-8 py-6">
        <ariaComponents.Text.Heading level="1" className="mb-4">
          {getText('setupEnso')}
        </ariaComponents.Text.Heading>

        <stepper.Stepper
          state={stepperState}
          renderStep={stepProps => {
            const step = steps[stepProps.index]

            invariant(step != null, 'Step not found')

            return (
              <stepper.Stepper.Step
                {...stepProps}
                title={getText(step.title)}
                description={step.description && getText(step.description)}
                isDisabled={step.ignore?.(context) ?? false}
              >
                {stepProps.isLast ? null : <ariaComponents.Separator variant="current" />}
              </stepper.Stepper.Step>
            )
          }}
        >
          {({ isLast, isFirst }) => (
            <>
              {currentScreen.text && (
                <ariaComponents.Text>{getText(currentScreen.text)}</ariaComponents.Text>
              )}

              {currentScreen.component && (
                <currentScreen.component
                  goToNextStep={nextStep}
                  goToPreviousStep={previousStep}
                  plan={form.watch('plan')}
                  form={form}
                />
              )}

              <ariaComponents.ButtonGroup align="end">
                {currentScreen.canSkip === true && (
                  <ariaComponents.Button variant="ghost" onPress={nextStep}>
                    {getText('skip')}
                  </ariaComponents.Button>
                )}

                {!isFirst && (
                  <ariaComponents.Button variant="outline" onPress={previousStep}>
                    {getText('back')}
                  </ariaComponents.Button>
                )}

                {isLast && <ariaComponents.Form.Submit />}

                {currentScreen.hideNext !== true && !isLast ? (
                  <ariaComponents.Button variant="primary" onPress={nextStep}>
                    {getText('next')}
                  </ariaComponents.Button>
                ) : null}
              </ariaComponents.ButtonGroup>
            </>
          )}
        </stepper.Stepper>
      </div>
    </Page>
  )
}
