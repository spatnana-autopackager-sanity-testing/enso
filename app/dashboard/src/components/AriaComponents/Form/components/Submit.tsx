/**
 * @file
 *
 * Submit button for forms.
 * Manages the form state and displays a loading spinner when the form is submitting.
 */
import * as React from 'react'

import * as textProvider from '#/providers/TextProvider'

import * as ariaComponents from '#/components/AriaComponents'

import type * as types from './types'
import * as formContext from './useFormContext'

/**
 * Additional props for the Submit component.
 */
interface SubmitButtonBaseProps {
  readonly variant?: ariaComponents.ButtonProps['variant']
  /**
   * Connects the submit button to a form.
   * If not provided, the button will use the nearest form context.
   *
   * This field is helpful when you need to use the submit button outside of the form.
   */
  // For this component, we don't need to know the form fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly form?: types.FormInstance<any, any>
  /**
   * Prop that allows to close the parent dialog without submitting the form.
   *
   * This looks tricky, but it's recommended by MDN as a receipt for closing the dialog without submitting the form.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog#closing_a_dialog_with_a_required_form_input
   */
  readonly formnovalidate?: boolean
}

/**
 * Props for the Submit component.
 */
export type SubmitProps = Omit<ariaComponents.ButtonProps, 'href' | 'variant'> &
  SubmitButtonBaseProps

/**
 * Submit button for forms.
 *
 * Manages the form state and displays a loading spinner when the form is submitting.
 */
export function Submit(props: SubmitProps): React.JSX.Element {
  const {
    form = formContext.useFormContext(),
    variant = 'submit',
    size = 'medium',
    testId = 'form-submit-button',
    formnovalidate = false,
    loading = false,
    children,
    ...buttonProps
  } = props

  const { getText } = textProvider.useText()
  const dialogContext = ariaComponents.useDialogContext()
  const { formState } = form

  const isLoading = loading || formState.isSubmitting
  const type = formnovalidate || isLoading ? 'button' : 'submit'

  return (
    <ariaComponents.Button
      /* This is safe because we are passing all props to the button */
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any,no-restricted-syntax */
      {...(buttonProps as any)}
      type={type}
      variant={variant}
      size={size}
      loading={isLoading}
      testId={testId}
      onPress={() => {
        if (formnovalidate) {
          dialogContext?.close()
        }
      }}
    >
      {children ?? getText('submit')}
    </ariaComponents.Button>
  )
}
