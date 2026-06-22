import type { Destination } from './types'
import { deriveTitle } from '../lib/title'
import { RedditIcon } from './icons'

/**
 * Open Reddit's submit page with the title + body prefilled. Reddit self-posts
 * render Markdown, so the content goes through as-is. Off by default.
 */
export const reddit: Destination = {
  id: 'reddit',
  name: 'Reddit',
  icon: RedditIcon,
  defaultEnabled: false,
  send(markdown) {
    const title = deriveTitle(markdown) || 'Input Pub'
    const url = `https://www.reddit.com/submit?title=${encodeURIComponent(
      title,
    )}&text=${encodeURIComponent(markdown.trim())}`
    window.open(url, '_blank', 'noopener,noreferrer')
    return 'Opened the Reddit submit page'
  },
}
