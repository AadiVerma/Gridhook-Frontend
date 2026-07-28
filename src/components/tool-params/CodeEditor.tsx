import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import { graphqlLanguageSupport } from 'cm6-graphql'
import { oneDark } from '@codemirror/theme-one-dark'
import { useTheme } from '@/lib/theme'

const extensionsByLang = {
  json: [json()],
  xml: [xml()],
  graphql: [graphqlLanguageSupport()],
}

export function CodeEditor({
  lang,
  value,
  onChange,
  placeholder,
}: {
  lang: 'json' | 'xml' | 'graphql'
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const { theme } = useTheme()
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensionsByLang[lang]}
      theme={theme === 'dark' ? oneDark : 'light'}
      placeholder={placeholder}
      basicSetup={{ foldGutter: false }}
      className="rounded-lg border border-border-strong/15 text-xs overflow-hidden"
      height="160px"
    />
  )
}
