# 🚨 Cursor Prompt: Fixing Mobile Navigation & Interaction

**Context:**
We are building a real-time interaction platform called **CoAct** using Next.js (App Router), Tailwind CSS v4, and Socket.io. 

**The Problem:**
On mobile devices (specifically in **Development Mode**), the UI is experiencing critical failures:
1. **Unresponsive Buttons:** Primary buttons like "Join Now" and "Create Session" appear on the screen but do not respond to touch or clicks.
2. **Stuck Navigation:** Even when the logic seems correct, `router.push()` hangs or fails to navigate the user to the session page (`/session/[id]`).
3. **Hydration Errors:** The "Next.js Development Overlay" or hydration mismatches are likely swallowing events or blocking the UI.
4. **Visibility:** Sometimes the UI text or cards disappear entirely, leaving only the background.

**Required Fixes:**
1. **Terminology:** Ensure all references to "Players" are renamed to **"Participants"**.
2. **Navigation Stability:** Optimize the navigation logic to work reliably on mobile. We've tried `window.location.href`, but it needs to be bulletproof.
3. **Button Responsiveness:** Ensure buttons use `touch-manipulation` and that background layers (gradients/blurs) have `pointer-events-none` so they don't intercept taps.
4. **Hydration Resilience:** The app must render its interactive state immediately. Avoid any complex `useEffect` based visibility guards that might hang in dev mode.
5. **Form Submission:** Ensure `<form onSubmit={...}>` works correctly on mobile keyboards (the "Go" or "Enter" key should trigger the same logic as the button).

**Files to Check:**
- `src/app/page.tsx` (Landing Page)
- `src/app/session/[id]/page.tsx` (Participant Page)
- `src/app/host/session/[id]/page.tsx` (Host Page)
- `src/components/providers/SocketProvider.tsx` (Socket Context)

**Goal:**
I want to be able to open the site on my mobile phone, enter a name and a 6-digit code, and have the **Join Now** button immediately glow and take me into the session without any lag or unresponsive behavior.
