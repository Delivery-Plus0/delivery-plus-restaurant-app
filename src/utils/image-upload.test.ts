import { describe, expect, it, vi } from 'vitest';

import { acceptedMimeType, pickedImageProblem } from './image-upload';

// Hoisted by vitest above the import: the helpers under test don't touch the native modules.
vi.mock('expo-image-picker', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

describe('acceptedMimeType', () => {
  it('accepts what the backend upload policy accepts', () => {
    expect(acceptedMimeType('image/png', 'a.png')).toBe('image/png');
    expect(acceptedMimeType('image/webp', null)).toBe('image/webp');
    expect(acceptedMimeType('image/jpg', null)).toBe('image/jpeg');
  });

  it('falls back to the file extension when the type is missing', () => {
    expect(acceptedMimeType(undefined, 'Photo.JPG')).toBe('image/jpeg');
    expect(acceptedMimeType(null, 'dish.webp')).toBe('image/webp');
  });

  it('rejects other formats', () => {
    expect(acceptedMimeType('image/gif', 'a.gif')).toBeNull();
    expect(acceptedMimeType('image/heic', 'a.heic')).toBeNull();
    expect(acceptedMimeType(undefined, 'notes.txt')).toBeNull();
  });
});

describe('pickedImageProblem', () => {
  it('explains a wrong type or an oversized file', () => {
    expect(pickedImageProblem(null)).toBe('Choose a JPEG, PNG or WebP image.');
    expect(pickedImageProblem('image/png', 10 * 1024 * 1024 + 1)).toBe('Choose an image under 10 MB.');
    expect(pickedImageProblem('image/png', 5 * 1024 * 1024 + 1, 5 * 1024 * 1024)).toBe('Choose an image under 5 MB.');
  });

  it('allows an accepted image within the limit (or of unknown size)', () => {
    expect(pickedImageProblem('image/jpeg', 2_000_000)).toBeNull();
    expect(pickedImageProblem('image/jpeg')).toBeNull();
  });
});
