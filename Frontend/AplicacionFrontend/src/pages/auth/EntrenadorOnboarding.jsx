// Compat shim: some imports still reference ./pages/auth/EntrenadorOnboarding
// This file re-exports the component from the canonical location to avoid Vite import errors.
export { default } from '../../pages/entrenador/EntrenadorOnboarding';
