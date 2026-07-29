import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// Built from the app's own CSS custom properties (src/index.css) instead of a stock
// CodeMirror theme, so the editor matches the surrounding surface/border/accent colors
// in both light and dark mode rather than clashing with them.
const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'rgb(var(--surface-raised))',
    color: 'rgb(var(--ink))',
  },
  '.cm-content': {
    caretColor: 'rgb(var(--signal))',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'rgb(var(--signal))',
  },
  // CodeMirror's drawSelection extension ships its own baseTheme with this exact
  // selector chain (`&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground`),
  // which is MORE specific than a plain `.cm-focused .cm-selectionBackground` rule — so
  // without matching that shape (or !important), our color loses and CM's own opaque
  // default (a bright, near-solid lavender) wins instead, washing out the text under it.
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground':
    {
      backgroundColor: 'rgb(var(--signal) / 0.25) !important',
    },
  '.cm-gutters': {
    backgroundColor: 'rgb(var(--surface-raised))',
    color: 'rgb(var(--faint))',
    border: 'none',
  },
  '.cm-activeLineGutter, .cm-activeLine': {
    backgroundColor: 'rgb(var(--border) / 0.06)',
  },
  '.cm-placeholder': {
    color: 'rgb(var(--faint))',
  },
  '&.cm-editor.cm-focused': {
    outline: 'none',
  },
})

const highlightStyle = HighlightStyle.define([
  { tag: t.tagName, color: 'rgb(var(--signal))' },
  { tag: t.attributeName, color: 'rgb(var(--info))' },
  { tag: [t.attributeValue, t.string], color: 'rgb(var(--ok))' },
  { tag: [t.angleBracket, t.punctuation, t.bracket], color: 'rgb(var(--muted))' },
  { tag: t.propertyName, color: 'rgb(var(--violet))' },
  { tag: [t.number, t.bool, t.null], color: 'rgb(var(--warn))' },
  { tag: t.comment, color: 'rgb(var(--faint))', fontStyle: 'italic' },
  { tag: t.keyword, color: 'rgb(var(--signal))' },
])

export const appCodeTheme = [editorTheme, syntaxHighlighting(highlightStyle)]
