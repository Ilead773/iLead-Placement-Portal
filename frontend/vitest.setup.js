import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

global.React = React;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;
