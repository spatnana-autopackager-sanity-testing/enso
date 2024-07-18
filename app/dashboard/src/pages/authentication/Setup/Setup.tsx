/**
 * @file
 * Setup page
 */
import * as React from 'react'

import invariant from 'tiny-invariant'

import type * as text from 'enso-common/src/text'

import * as textProvider from '#/providers/TextProvider'

import * as ariaComponents from '#/components/AriaComponents'
import * as stepper from '#/components/Stepper'

import AuthenticationPage from '../AuthenticationPage'

/**
 *
 */
interface Step {
  readonly title: text.TextId
  readonly description?: text.TextId
  readonly text?: text.TextId
  readonly component?: React.ComponentType
}

const BASE_STEPS: Step[] = [
  {
    title: 'choosePlan',
    text: 'choosePlanDescription',
    component: () => {
      const { getText } = textProvider.useText()
      return (
        <>
          <ariaComponents.Text>{getText('choosePlan')}</ariaComponents.Text>
          <ariaComponents.PlanSelector />
        </>
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
  })

  const currentScreen = steps.at(currentStep)

  invariant(currentScreen != null, 'Current screen not found')

  return (
    <AuthenticationPage title={getText('setupEnso')} isNotForm>
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
        {({ isLast }) => (
          <ariaComponents.Form key="Form" form={form} onSubmit={() => {}}>
            {currentScreen.text && (
              <ariaComponents.Text>{getText(currentScreen.text)}</ariaComponents.Text>
            )}

            {currentScreen.component && <currentScreen.component />}

            <ariaComponents.ButtonGroup>
              <ariaComponents.Button variant="outline" onPress={previousStep}>
                {getText('back')}
              </ariaComponents.Button>

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
    </AuthenticationPage>
  )
}
