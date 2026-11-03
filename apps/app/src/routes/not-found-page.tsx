import { buttonClass, EmptyState } from "@personal/ui"
import { Link } from "@tanstack/react-router"
import { CircleHelp } from "lucide-react"
import { PageHeader } from "../ui/page-header"

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Not found" />
      <EmptyState
        icon={<CircleHelp size={24} strokeWidth={2} aria-hidden />}
        title="This page doesn't exist"
        action={
          <Link to="/" className={buttonClass("secondary", "sm")}>
            Go to Today
          </Link>
        }
      >
        It may have moved, or the link is wrong.
      </EmptyState>
    </>
  )
}
