/**
 * @file
 * Setup page
 */
import * as React from 'react'

import { useNavigate } from 'react-router'
import invariant from 'tiny-invariant'

import type * as text from 'enso-common/src/text'

import { DASHBOARD_PATH } from '#/appUtils'

import * as textProvider from '#/providers/TextProvider'

import * as ariaComponents from '#/components/AriaComponents'
import type { FormInstance } from '#/components/AriaComponents'
import Page from '#/components/Page'
import * as stepper from '#/components/Stepper'

import { Plan } from '#/services/Backend'
import { PlanSelector } from '#/modules/payments'

const SETUP_SCHEMA = ariaComponents.Form.schema.object({
  username: ariaComponents.Form.schema.string().min(3).max(24),
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
    title: 'choosePlan',
    text: 'choosePlanDescription',
    canSkip: true,
    hideNext: true,
    component: ({ form, goToNextStep }) => (
      <PlanSelector
        onSubscribeSuccess={plan => {
          form.setValue('plan', plan)
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
  {
    title: 'setUsername',
    text: 'setUsernameDescription',
    component: () => {
      const { getText } = textProvider.useText()
      return (
        <>
          <ariaComponents.Input
            className="max-w-96"
            name="username"
            label={getText('setUsername')}
            placeholder={getText('usernamePlaceholder')}
            description="Minimum 3 characters, maximum 24 characters"
          />
        </>
      )
    },
  },
]

/**
 * Setup page
 */
export function Setup() {
  const { getText } = textProvider.useText()
  const steps = BASE_STEPS

  const navigate = useNavigate()

  const form = ariaComponents.Form.useForm({
    schema: SETUP_SCHEMA,
    defaultValues: { plan: Plan.free },
  })

  const { stepperState, nextStep, previousStep, currentStep } = stepper.useStepperState({
    steps: steps.length,
    onStepChange: (step, direction) => {
      const screen = steps[step]
      if (screen?.ignore != null) {
        if (
          screen.ignore({
            form,
            plan: form.getValues('plan'),
            goToNextStep: () => {},
            goToPreviousStep: () => {},
          })
        ) {
          if (direction === 'forward') {
            nextStep()
          } else {
            previousStep()
          }
        }
      }
    },
  })

  const currentScreen = steps.at(currentStep)

  invariant(currentScreen != null, 'Current screen not found')

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
                isDisabled={
                  step.ignore?.({
                    plan: form.getValues('plan'),
                    goToNextStep: () => {},
                    goToPreviousStep: () => {},
                    form,
                  }) ?? false
                }
              >
                {stepProps.isLast ? null : <ariaComponents.Separator variant="current" />}
              </stepper.Stepper.Step>
            )
          }}
        >
          {({ isLast, isFirst }) => (
            <ariaComponents.Form
              key="Form"
              form={form}
              onSubmit={() => {
                navigate(DASHBOARD_PATH)
              }}
            >
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

              <ariaComponents.Form.FormError />
            </ariaComponents.Form>
          )}
        </stepper.Stepper>
      </div>
    </Page>
  )
}
