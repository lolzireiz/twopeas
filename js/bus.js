// Lets screens ask for a redraw after async work, without importing the app shell.
export const bus = { rerender: () => {} };
