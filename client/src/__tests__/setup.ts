import '@testing-library/jest-dom'

// Mock window.matchMedia for responsive component tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Suppress console errors during tests
const originalError = console.error
console.error = (...args: unknown[]) => {
  // Filter out React act() warnings
  if (typeof args[0] === 'string' && /Warning.*not wrapped in act/.test(args[0])) {
    return
  }
  originalError.call(console, ...args)
}
