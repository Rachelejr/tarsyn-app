// UNIMUNITY AI Assistant - shared constants
// Single source of truth for the Super Admin account gate. Previously the
// same email string was hardcoded separately in api/ai/ping/route.ts and
// admin/ai-test/page.tsx - a real risk if the account ever changed and only
// one copy got updated. Server code (contextManager.ts) and client UI
// (UnimunityAIPanel.tsx) both import it from here now.
//
// Phase 1 ships Super Admin mode only. This is not the app's general
// permission system (see permissions.ts) - it is the one identity check
// that decides who is the Super Admin for AI purposes.
export const SUPER_ADMIN_EMAIL = 'rachelejr779@gmail.com';
