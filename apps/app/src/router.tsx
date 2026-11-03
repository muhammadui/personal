import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { CompletedPage } from "./routes/completed-page"
import { DevUiPage } from "./routes/dev-ui-page"
import { FlaggedPage } from "./routes/flagged-page"
import { ListPage } from "./routes/list-page"
import { ListsPage } from "./routes/lists-page"
import { NotFoundPage } from "./routes/not-found-page"
import { NotePage } from "./routes/note-page"
import { NotesPage } from "./routes/notes-page"
import { NotificationsPage } from "./routes/notifications-page"
import { ReminderPage } from "./routes/reminder-page"
import { RootLayout } from "./routes/root-layout"
import { SearchPage } from "./routes/search-page"
import { SettingsPage } from "./routes/settings-page"
import { TodayPage } from "./routes/today-page"
import { TrashPage } from "./routes/trash-page"
import { UpcomingPage } from "./routes/upcoming-page"
import { WelcomePage } from "./routes/welcome-page"

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFoundPage })


const todayRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: TodayPage })
const upcomingRoute = createRoute({ getParentRoute: () => rootRoute, path: "/upcoming", component: UpcomingPage })
const flaggedRoute = createRoute({ getParentRoute: () => rootRoute, path: "/flagged", component: FlaggedPage })
const completedRoute = createRoute({ getParentRoute: () => rootRoute, path: "/completed", component: CompletedPage })
const listsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lists",
  component: ListsPage,
  validateSearch: (search: Record<string, unknown>): { new?: boolean } => (search.new === true || search.new === "true" ? { new: true } : {}),
})
const listRoute = createRoute({ getParentRoute: () => rootRoute, path: "/lists/$listId", component: ListPage })
const notesRoute = createRoute({ getParentRoute: () => rootRoute, path: "/notes", component: NotesPage })
const noteRoute = createRoute({ getParentRoute: () => rootRoute, path: "/notes/$noteId", component: NotePage })
const trashRoute = createRoute({ getParentRoute: () => rootRoute, path: "/trash", component: TrashPage })
const notificationsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/notifications", component: NotificationsPage })
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/settings", component: SettingsPage })
const searchRoute = createRoute({ getParentRoute: () => rootRoute, path: "/search", component: SearchPage })
// Onboarding is drawn by RootLayout before sign-in; signed in, /welcome just goes to Today.
const welcomeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/welcome", component: WelcomePage })
const devUiRoute = createRoute({ getParentRoute: () => rootRoute, path: "/dev/ui", component: DevUiPage })
const reminderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reminders/$occurrenceId",
  component: ReminderPage,
  validateSearch: (search: Record<string, unknown>): { reminder?: string; at?: string } => ({
    ...(typeof search.reminder === "string" ? { reminder: search.reminder } : {}),
    ...(typeof search.at === "string" ? { at: search.at } : {}),
  }),
})

const routeTree = rootRoute.addChildren([
  todayRoute,
  upcomingRoute,
  flaggedRoute,
  completedRoute,
  listsRoute,
  listRoute,
  notesRoute,
  noteRoute,
  trashRoute,
  notificationsRoute,
  settingsRoute,
  searchRoute,
  devUiRoute,
  welcomeRoute,
  reminderRoute,
])

export const router = createRouter({ routeTree, defaultPreload: false })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
