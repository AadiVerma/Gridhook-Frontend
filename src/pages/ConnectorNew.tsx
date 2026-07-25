import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, Database, Braces, FileCode2, Check } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea, Field } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

const kinds = [
  { id: 'REST', label: 'REST API', icon: Globe, desc: 'OpenAPI / Swagger or manual endpoints' },
  { id: 'GraphQL', label: 'GraphQL', icon: Braces, desc: 'Schema introspection over HTTP' },
  { id: 'Database', label: 'Database', icon: Database, desc: 'Postgres, MySQL, Snowflake, Mongo' },
  { id: 'SOAP', label: 'SOAP / XML', icon: FileCode2, desc: 'WSDL-described legacy services' },
]

export default function ConnectorNew() {
  const navigate = useNavigate()
  const [kind, setKind] = useState('REST')
  const [auth, setAuth] = useState('OAuth2')
  const [name, setName] = useState('')
  const [step, setStep] = useState<'type' | 'details'>('type')

  return (
    <AppShell title="Add connector" subtitle="Turn an API or database into MCP tools" backTo="/connectors" maxWidth="760px">
      {step === 'type' ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Choose a connector type</CardTitle>
              <CardDescription>You can fine-tune authentication and tool mapping in the next step.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {kinds.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setKind(k.id)}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                    kind === k.id
                      ? 'border-signal/50 bg-signal/5 shadow-[0_0_0_1px_rgb(var(--signal)/0.3)]'
                      : 'border-border-strong/15 hover:border-border-strong/30',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      kind === k.id ? 'bg-signal text-white' : 'bg-canvas/60 text-muted border border-border/10',
                    )}
                  >
                    <k.icon size={16} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink">{k.label}</span>
                    <span className="block text-xs text-faint">{k.desc}</span>
                  </span>
                  {kind === k.id && <Check size={15} className="ml-auto shrink-0 text-signal" />}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={() => setStep('details')}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Connection details</CardTitle>
              <CardDescription>{kinds.find((k) => k.id === kind)?.label} connector configuration</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Connector name">
              <Input placeholder="e.g. Internal Billing API" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            <Field label={kind === 'Database' ? 'Connection string host' : 'Base URL'} hint="Requests are routed through this host.">
              <Input placeholder={kind === 'Database' ? 'db.internal:5432/prod' : 'https://api.example.com/v1'} />
            </Field>

            {kind === 'REST' && (
              <Field label="OpenAPI spec URL" hint="Optional — paste a spec to auto-generate tools.">
                <Input placeholder="https://api.example.com/openapi.json" />
              </Field>
            )}

            <Field label="Authentication">
              <Select value={auth} onChange={(e) => setAuth(e.target.value)}>
                <option>OAuth2</option>
                <option>Bearer</option>
                <option>API Key</option>
                <option>Basic</option>
                <option>None</option>
              </Select>
            </Field>

            {auth === 'API Key' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Header name">
                  <Input placeholder="X-API-Key" />
                </Field>
                <Field label="API key">
                  <Input type="password" placeholder="••••••••••••" />
                </Field>
              </div>
            )}

            {auth === 'Basic' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Username">
                  <Input placeholder="service-account" />
                </Field>
                <Field label="Password">
                  <Input type="password" placeholder="••••••••••••" />
                </Field>
              </div>
            )}

            <Field label="Description" hint="Shown to teammates browsing connectors.">
              <Textarea rows={3} placeholder="What does this connector expose?" />
            </Field>

            <div className="flex justify-between border-t border-border/10 pt-4">
              <Button variant="ghost" onClick={() => setStep('type')}>
                Back
              </Button>
              <Button variant="primary" onClick={() => navigate('/connectors')} disabled={!name}>
                Create connector
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  )
}
