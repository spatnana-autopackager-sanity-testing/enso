/**
 * @file
 * Setup page
 */
import * as React from 'react'

import { PlanSelector } from '#/modules/payments'
import invariant from 'tiny-invariant'

import type * as text from 'enso-common/src/text'

import * as textProvider from '#/providers/TextProvider'

import * as ariaComponents from '#/components/AriaComponents'
import Page from '#/components/Page'
import * as stepper from '#/components/Stepper'

import { Plan } from '#/services/Backend'

/**
 *
 */
interface Step {
  readonly title: text.TextId
  readonly description?: text.TextId
  readonly text?: text.TextId
  readonly component?: React.ComponentType<Context>
  readonly canSkip?: boolean
  readonly ignore?: (context: Context) => boolean
}

/**
 *
 */
interface Context {
  readonly plan: Plan | undefined
  readonly goToNextStep: () => void
  readonly goToPreviousStep: () => void
}

const BASE_STEPS: Step[] = [
  {
    title: 'choosePlan',
    text: 'choosePlanDescription',
    canSkip: true,
    component: () => <PlanSelector />,
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

  const form = ariaComponents.Form.useForm({
    schema: z =>
      z.object({
        username: z.string().min(3).max(24),
      }),
  })

  const { stepperState, nextStep, previousStep, currentStep } = stepper.useStepperState({
    steps: steps.length,
    onCompleted: () => {
      console.log('completed')
    },
    onStepChange: (step, direction) => {
      const screen = steps[step]

      if (screen?.ignore != null) {
        if (
          screen.ignore({ plan: Plan.free, goToNextStep: () => {}, goToPreviousStep: () => {} })
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
              >
                {stepProps.isLast ? null : <ariaComponents.Separator variant="current" />}
              </stepper.Stepper.Step>
            )
          }}
        >
          {({ isLast, isFirst }) => (
            <ariaComponents.Form key="Form" form={form} onSubmit={() => {}}>
              {currentScreen.text && (
                <ariaComponents.Text>{getText(currentScreen.text)}</ariaComponents.Text>
              )}

              {currentScreen.component && (
                <currentScreen.component goToNextStep={nextStep} goToPreviousStep={previousStep} />
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

                {isLast ? (
                  <ariaComponents.Form.Submit />
                ) : (
                  <ariaComponents.Button variant="primary" onPress={nextStep}>
                    {getText('next')}
                  </ariaComponents.Button>
                )}
              </ariaComponents.ButtonGroup>

              <ariaComponents.Form.FormError />
            </ariaComponents.Form>
          )}
        </stepper.Stepper>
      </div>
    </Page>
  )
}
