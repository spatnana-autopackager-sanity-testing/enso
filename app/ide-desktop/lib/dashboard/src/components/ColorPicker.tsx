/** @file A color picker to select from a predetermined list of colors. */
import * as React from 'react'

import * as color from '#/utilities/color'

/** Props for a {@link ColorPicker}. */
export interface ColorPickerProps {
  readonly setColor: (color: color.LChColor) => void
}

/** A color picker to select from a predetermined list of colors. */
export default function ColorPicker(props: ColorPickerProps) {
  const { setColor } = props
  return (
    <div className="flex items-center gap-colors">
      {color.COLORS.map((currentColor, i) => (
        <label
          key={i}
          className="flex size-radio-button cursor-pointer rounded-full"
          onClick={event => {
            event.stopPropagation()
            setColor(currentColor)
          }}
        >
          <input type="radio" name="new-label-color" className="peer hidden" />
          <button
            type="button"
            className="group pointer-events-none size-radio-button rounded-full p-radio-button-dot"
            style={{ backgroundColor: color.lChColorToCssColor(currentColor) }}
          >
            <div className="hidden size-radio-button-dot rounded-full bg-selected-frame peer-checked:group-[]:block" />
          </button>
        </label>
      ))}
    </div>
  )
}
