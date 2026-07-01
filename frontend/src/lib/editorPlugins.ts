import { $prose } from '@milkdown/kit/utils'
import { keymap } from '@milkdown/kit/prose/keymap'
import { TextSelection } from '@milkdown/kit/prose/state'

/** Remap Cmd/Ctrl+A to select the whole document as a *text* selection instead
 *  of ProseMirror's default AllSelection. Crepe's selection toolbar (bold /
 *  italic / AI rewrite …) only appears for a TextSelection, so a plain
 *  select-all otherwise leaves it hidden. With this, selecting the whole note
 *  brings up the toolbar, letting you restyle or AI-rewrite the entire doc. */
export const selectAllAsText = $prose(() =>
  keymap({
    'Mod-a': (state, dispatch) => {
      const { doc } = state
      const from = TextSelection.atStart(doc).from
      const to = TextSelection.atEnd(doc).to
      if (dispatch) dispatch(state.tr.setSelection(TextSelection.create(doc, from, to)))
      return true
    },
  }),
)
