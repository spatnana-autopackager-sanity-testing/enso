/**
 * @file
 *
 * Stepper state hook
 */
import * as React from 'react'

import invariant from 'tiny-invariant'

import * as eventCallbackHooks from '#/hooks/eventCallbackHooks'

/**
 * Props for {@link useStepperState}
 */
export interface StepperStateProps {
  readonly defaultStep?: number
  readonly steps: number
  readonly onStepChange?: (step: number, direction: 'back' | 'forward') => void
  readonly onCompleted?: () => void
}

/**
 * State for a stepper component
 */
export interface StepperState {
  readonly currentStep: number
  readonly onStepChange: (step: number) => void
  readonly totalSteps: number
  readonly nextStep: () => void
  readonly previousStep: () => void
}

/**
 * Result of {@link useStepperState}
 */
export interface UseStepperStateResult {
  readonly stepperState: StepperState
  readonly currentStep: number
  readonly setCurrentStep: (step: number | ((current: number) => number)) => void
  readonly isCurrentStep: (step: number) => boolean
  readonly isFirstStep: boolean
  readonly isLastStep: boolean
  readonly percentComplete: number
  readonly nextStep: () => void
  readonly previousStep: () => void
}

/**
 * Hook to manage the state of a stepper component
 * @param props - {@link StepperState}
 * @returns current step and a function to set the current step
 */
export function useStepperState(props: StepperStateProps): UseStepperStateResult {
  const { steps, defaultStep = 0, onStepChange, onCompleted } = props

  invariant(steps > 0, 'Invalid number of steps')
  invariant(defaultStep >= 0, 'Default step must be greater than or equal to 0')
  invariant(defaultStep < steps, 'Default step must be less than the number of steps')

  const [currentStep, privateSetCurrentStep] = React.useState(defaultStep)

  const setCurrentStep = eventCallbackHooks.useEventCallback(
    (step: number | ((current: number) => number)) => {
      privateSetCurrentStep(current => {
        const newStep = typeof step === 'function' ? step(current) : step

        if (newStep < 0) {
          return 0
        } else if (newStep > steps) {
          onCompleted?.()
          return steps
        } else {
          onStepChange?.(newStep, newStep > current ? 'forward' : 'back')
          return newStep
        }
      })
    }
  )

  const isCurrentStep = eventCallbackHooks.useEventCallback((step: number) => step === currentStep)

  const nextStep = eventCallbackHooks.useEventCallback(() => {
    setCurrentStep(current => current + 1)
  })
  const previousStep = eventCallbackHooks.useEventCallback(() => {
    setCurrentStep(current => current - 1)
  })

  return {
    stepperState: {
      currentStep,
      onStepChange: setCurrentStep,
      totalSteps: steps,
      nextStep,
      previousStep,
    },
    currentStep,
    setCurrentStep,
    isCurrentStep,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps - 1,
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    percentComplete: (currentStep / (steps - 1)) * 100,
    nextStep,
    previousStep,
  } satisfies UseStepperStateResult
}
