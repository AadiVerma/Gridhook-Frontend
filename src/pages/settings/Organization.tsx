import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Field, Select } from '@/components/ui/Input'

export default function Organization() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Organization</CardTitle>
            <CardDescription>General workspace settings.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Organization name">
              <Input defaultValue="ARK Workspace" />
            </Field>
            <Field label="Workspace slug">
              <Input defaultValue="ARK" />
            </Field>
          </div>
          <Field label="Default timezone">
            <Select defaultValue="Asia/Kolkata">
              <option>Asia/Kolkata</option>
              <option>UTC</option>
              <option>America/New_York</option>
            </Select>
          </Field>
        </CardContent>
        <CardFooter className="justify-end border-t border-border/10 pt-4">
          <Button variant="primary" size="sm" onClick={() => toast.success('Organization settings saved')}>
            Save changes
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-bad/25">
        <CardHeader>
          <div>
            <CardTitle className="text-bad">Danger zone</CardTitle>
            <CardDescription>Irreversible and destructive actions.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-bad/20 bg-bad/5 p-3.5">
            <div>
              <p className="text-sm font-medium text-ink">Delete this workspace</p>
              <p className="text-xs text-muted">Removes all connectors, MCP servers, and logs permanently.</p>
            </div>
            <Button variant="danger" size="sm">
              Delete workspace
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
