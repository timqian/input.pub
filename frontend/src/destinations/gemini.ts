import type { Destination } from './types'
import { GeminiIcon } from './icons'

/**
 * Gemini has no URL prompt prefill, so copy the content to the clipboard and
 * open the app — the user just pastes.
 */
export const gemini: Destination = {
  id: 'gemini',
  name: 'Gemini',
  icon: GeminiIcon,
  async send(markdown) {
    let copied = false
    try {
      await navigator.clipboard.writeText(markdown)
      copied = true
    } catch {
      // clipboard may be unavailable; still open Gemini
    }
    window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer')
    return copied ? '内容已复制，打开 Gemini 后粘贴即可' : '已打开 Gemini，请手动粘贴内容'
  },
}
