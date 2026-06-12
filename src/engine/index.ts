/**
 * Public surface of the rules engine. The UI imports from here and nowhere
 * deeper, so internal refactors stay invisible to the React side.
 */
export type * from './types'
export * from './board'
