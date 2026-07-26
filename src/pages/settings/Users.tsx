import { useState } from 'react'
import { Plus, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusPill } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Field } from '@/components/ui/Input'
import { orgUsers } from '@/lib/mock-data'
import { timeAgo } from '@/lib/utils'

export default function Users() {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Users</CardTitle>
          <CardDescription>People with access to this workspace.</CardDescription>
        </div>
        <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
          <Plus size={14} /> Invite user
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="divide-y divide-border/10">
          {orgUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas/60 border border-border/10 text-xs font-semibold text-ink">
                {u.name.split(' ').map((n) => n[0]).join('')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{u.name}</p>
                <p className="truncate text-[11px] text-faint">{u.email}</p>
              </div>
              <Badge tone="neutral">{u.role}</Badge>
              <StatusPill tone={u.status === 'active' ? 'ok' : 'warn'} dot={false} className="hidden sm:inline-flex">
                {u.status}
              </StatusPill>
              <span className="hidden w-20 shrink-0 text-right text-[11px] text-faint sm:block">{timeAgo(u.lastActive)}</span>
              <button className="rounded-md p-1.5 text-faint hover:bg-surface-raised hover:text-ink">
                <MoreVertical size={14} />
              </button>
            </div>
          ))}
        </div>
      </CardContent>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite user" description="Send an invite link by email.">
        <div className="space-y-4">
          <Field label="Email">
            <Input type="email" placeholder="teammate@company.com" />
          </Field>
          <Field label="Role">
            <Select defaultValue="Developer">
              <option>Admin</option>
              <option>Developer</option>
              <option>Viewer</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => { setInviteOpen(false); toast.success('Invite sent') }}>
              Send invite
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}
