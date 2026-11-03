# Screen inventory

| Screen | Design file | Route / place | Phase |
| --- | --- | --- | --- |
| Splash | `Splash.dc.html` | App launch (first load; skipped on return visits once data is local) | 1 |
| Onboarding 1–3 | `Onboard1–3.dc.html` | `/welcome` (first launch only) | 1 |
| Create account | `Signup.dc.html` | `/signup` | 0 (P0-12 can use it plainly) |
| Sign in (mobile) | `Signin.dc.html` | `/signin` | 0 |
| Sign in (desktop) | `AuthDesktop.dc.html` | `/signin` at ≥1024px | 1 |
| Verify email | `Verify.dc.html` | `/verify` | 1 |
| Add to Home Screen | `InstallPWA.dc.html` | After first sign-in on iPhone Safari only | 1 |
| First run, empty Today | `FirstToday.dc.html` | `/` with no data | 1 |
| Allow notifications | `NotifyPermission.dc.html` | Sheet after the first reminder is set | 1 |
| Today | `PhoneToday.dc.html`, `Main.dc.html` (+ dark: `PhoneTodayDark`, `MainDark`) | `/` | 1 |
| Quick add | `PhoneCapture.dc.html` | Sheet from FAB (mobile), quick-add bar / `N` (desktop) | 1 |
| Upcoming | `PhoneUpcoming.dc.html`, `Upcoming.dc.html` | `/upcoming` | 1 |
| Notes | `PhoneNotes.dc.html`, `Notes.dc.html` | `/notes` | 1 |
| Note editor | `PhoneEditor.dc.html`, `Editor.dc.html` | `/notes/$noteId` | 1 (pen, image, voice tools: phase 2) |
| Locked note | `PhoneLocked.dc.html` | Opening a locked note | 1 |
| Search | `PhoneSearch.dc.html` | `/search` (mobile) | 1 |
| Command palette | `Palette.dc.html` | `⌘K` (desktop) | 1 |
| Notifications | `PhoneInbox.dc.html`, `Inbox.dc.html` | Bell | 1 |
| Settings | `PhoneSettings.dc.html`, `Settings.dc.html` | `/settings` | 1 |
| Tab bar | `TabBar.dc.html` | Mobile shell | 1 |
| Sidebar | `Sidebar.dc.html` | Desktop shell | 1 |
| UI kit / Motion | `Components.dc.html`, `Motion.dc.html` | Reference only (build a `/dev/ui` page from them) | 0 |
| Forgot password | `ForgotPassword.dc.html` | `/forgot` | 1 |
| Session expired | `SessionExpired.dc.html` | Sheet when the refresh token expired offline | 1 |
| Create account (desktop) | `SignupDesktop.dc.html` | `/signup` at ≥1024px | 1 |
| Task detail | `PhoneTask.dc.html`, `TaskPanel.dc.html` | Full-screen sheet on phones, side panel on desktop (opened from any task row) | 1 |
| Due date and reminder picker | `PhoneDatePicker.dc.html` | Sheet from task detail / quick add | 1 |
| Repeat picker | `PhoneRepeat.dc.html` | Sheet from task detail | 1 |
| Snooze | `PhoneSnooze.dc.html` | Sheet from a fired reminder | 1 |
| Note actions and export | `PhoneExport.dc.html` | Note "More" menu | 1 (export: 2) |
| Version history | `PhoneHistory.dc.html` | From note actions | 1 |
| Trash | `PhoneTrash.dc.html` | `/trash` | 1 |
| Lists and folders | `PhoneLists.dc.html` | `/lists` (and `/lists/$listId`) | 1 |
| Handwriting mode | `PhoneDraw.dc.html`, `DesktopDraw.dc.html` | Pen tool in the editor | 2 |
| Voice recording | `PhoneVoice.dc.html` | Mic tool in the editor | 2 |
| Keyboard shortcuts | `Shortcuts.dc.html` | `?` on desktop | 1 |
| Empty, error and loading states | `States.dc.html` | Reference: use these exact messages | 1 |
