import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Field } from '@/components/ui/Input'

export default function Profile() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal account details.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-signal to-violet text-lg font-bold text-white">
              AV
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                Upload photo
              </Button>
              <Button variant="ghost" size="sm">
                Remove
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input defaultValue="Aditya Verma" />
            </Field>
            <Field label="Email">
              <Input defaultValue="aditya.verma@ark.in" type="email" />
            </Field>
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t border-border/10 pt-4">
          <Button variant="primary" size="sm" onClick={() => toast.success('Profile updated')}>
            Save changes
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your account password.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Current password">
            <Input type="password" placeholder="••••••••••" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="New password">
              <Input type="password" placeholder="••••••••••" />
            </Field>
            <Field label="Confirm new password">
              <Input type="password" placeholder="••••••••••" />
            </Field>
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t border-border/10 pt-4">
          <Button variant="primary" size="sm" onClick={() => toast.success('Password updated')}>
            Update password
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
