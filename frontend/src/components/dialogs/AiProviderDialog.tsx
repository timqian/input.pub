import { useState } from 'react'
import type { ConfigField } from '../../destinations/types'
import { getAiConfig, setAiConfig, type AiConfig } from '../../lib/storage'
import { Button, Modal, ModalActions, ModalNote, ModalTitle } from '../Modal'
import { Field } from '../Field'
import { SparklesIcon } from '../../destinations/icons'

// OpenAI-compatible provider config. Works with OpenAI, DeepSeek, OpenRouter,
// Moonshot, local (Ollama/LM Studio), etc. — anything speaking the
// /chat/completions API.
const fields: { key: keyof AiConfig; field: ConfigField }[] = [
  {
    key: 'baseUrl',
    field: {
      key: 'baseUrl',
      label: 'Base URL',
      placeholder: 'https://api.openai.com/v1',
      hint: 'OpenAI-compatible endpoint. Leave blank for OpenAI.',
    },
  },
  {
    key: 'apiKey',
    field: { key: 'apiKey', label: 'API key', type: 'password', placeholder: 'sk-…' },
  },
  {
    key: 'model',
    field: { key: 'model', label: 'Model', placeholder: 'gpt-4o-mini' },
  },
]

/** Configure the AI provider (OpenAI-compatible). Stored only in this browser.
 *  Prompts/suggestions are managed separately in the AI prompts dialog. */
export function AiProviderDialog({ onClose }: { onClose: () => void }) {
  const [values, setValues] = useState<AiConfig>(getAiConfig)
  const [saved, setSaved] = useState(false)

  const canSave = !!values.apiKey.trim() && !!values.model.trim()

  function save() {
    setAiConfig({
      baseUrl: values.baseUrl.trim(),
      apiKey: values.apiKey.trim(),
      model: values.model.trim(),
    })
    setSaved(true)
    setTimeout(onClose, 700)
  }

  return (
    <Modal onClose={onClose}>
      <ModalTitle>
        <span className="[&_svg]:inline [&_svg]:size-[0.9em] [&_svg]:align-[-0.1em]">
          {SparklesIcon}
        </span>{' '}
        Configure AI Provider
      </ModalTitle>
      <ModalNote>
        Select some text in the editor, then use the ✨ button in the toolbar to have AI revise it.
        Your key is saved only in this browser (localStorage) and sent straight to the endpoint —
        never to us.
      </ModalNote>
      {fields.map(({ key, field }, i) => (
        <Field
          key={key}
          field={field}
          value={values[key]}
          autoFocus={i === 0}
          onChange={(value) => setValues((v) => ({ ...v, [key]: value }))}
          onEnter={() => canSave && save()}
        />
      ))}
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!canSave} onClick={save}>
          {saved ? 'Saved' : 'Save'}
        </Button>
      </ModalActions>
    </Modal>
  )
}
