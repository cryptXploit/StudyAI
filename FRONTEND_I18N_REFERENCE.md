# Bilingual Translation Reference (i18n)

Prepia fully supports English (EN), Bengali (BN), and Hindi (HI). This ensures maximum accessibility for South Asian students.

## How it works
The translations are managed via a custom context provider that toggles language states instantly without reloading the page.

## Key Namespaces
- uth.*: Login, Signup, Password reset text.
- dashboard.*: Upload buttons, syllabus generation, and user statistics.
- chat.*: Chat interface placeholders, AI model selection dropdowns.
- common.*: Generic buttons (Save, Cancel, Delete).

To add a new language, simply add a new JSON key-value map in the frontend translation utilities and update the Language Switcher component in the Navbar.
