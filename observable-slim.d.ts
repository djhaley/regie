declare module 'observable-slim' {
  export function create<S>(
    initialState: S,
    domDelay: boolean | number,
    callback?: (changes: { type: string; property: string; target: any; newValue: any; oldValue: any; currentPath: string }[]) => void,
  ): S
  export function isProxy(obj: any): boolean
  export function getPath(proxy: object): string
}
