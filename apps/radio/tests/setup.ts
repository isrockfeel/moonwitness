import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock HTMLMediaElement methods not supported by jsdom
const mockPause = vi.fn();
const mockPlay = vi.fn();
const mockLoad = vi.fn();
const mockCanPlay = vi.fn();
let mockCurrentTime = 0;
let mockDuration = 0;

// Mock the Audio constructor
global.Audio = class extends global.Audio {
  constructor() {
    super();
    this.pause = mockPause;
    this.play = mockPlay;
    this.load = mockLoad;
    this.canPlayType = mockCanPlay;
    this.currentTime = mockCurrentTime;
    this.duration = mockDuration;
  }
} as unknown as typeof Audio;

// Mock HTMLMediaElement prototype methods
Object.defineProperty(HTMLMediaElement.prototype, "pause", {
  value: mockPause,
  writable: true,
  configurable: true,
});
Object.defineProperty(HTMLMediaElement.prototype, "play", {
  value: mockPlay,
  writable: true,
  configurable: true,
});
Object.defineProperty(HTMLMediaElement.prototype, "load", {
  value: mockLoad,
  writable: true,
  configurable: true,
});
Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
  get: () => mockCurrentTime,
  set: (v: number) => { mockCurrentTime = v; },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(HTMLMediaElement.prototype, "duration", {
  get: () => mockDuration,
  set: (v: number) => { mockDuration = v; },
  enumerable: true,
  configurable: true,
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn().mockImplementation((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn();

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: WebSocket.OPEN,
})) as unknown as typeof WebSocket;

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: WebSocket.OPEN,
})) as unknown as typeof WebSocket;

// Mock MediaSession
Object.defineProperty(navigator, "mediaSession", {
  value: {
    setMetadata: vi.fn(),
    setActionHandler: vi.fn(),
    playbackState: "none",
  },
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => "test-uuid-" + Math.random().toString(36).substring(2, 9),
  },
});

// Suppress console.error in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.("Warning: ReactDOM.render is no longer supported")) return;
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
