// Shared UI component library for Swappa.
// Components are built on Tailwind CSS + shadcn/ui primitives.
//
// Add new components via the shadcn CLI (run from the consuming app):
//   pnpm dlx shadcn@latest add <component>
//
// Then move the generated component here and re-export it.

export { Button, type ButtonProps } from './components/button'
export { FormInput, type FormInputProps } from './components/form-input'
export { AuthCard, type AuthCardProps } from './components/auth-card'
