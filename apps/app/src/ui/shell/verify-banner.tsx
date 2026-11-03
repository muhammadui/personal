import { Banner, Button } from "@personal/ui"
import { MailWarning } from "lucide-react"
import { useSession } from "../../data/session"
import { emitUi } from "./events"

/** "Verify your email to keep syncing" (States.dc.html), until the address is confirmed. */
export function VerifyBanner() {
  const { user } = useSession()
  if (user.emailVerified) return null
  return (
    <Banner
      tone="warn"
      icon={<MailWarning aria-hidden />}
      title="Verify your email to keep syncing"
      action={
        <Button size="sm" onClick={() => emitUi({ type: "verify-email" })}>
          Enter code
        </Button>
      }
    >
      Confirm {user.email} with the 6-digit code we sent.
    </Banner>
  )
}
