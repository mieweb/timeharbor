import { formatDurationText, cn } from './utils';

describe('formatDurationText', () => {
  it('formats seconds correctly', () => {
    expect(formatDurationText(30)).toBe('30s');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatDurationText(90)).toBe('1m 30s');
  });

  it('formats hours, minutes and seconds correctly', () => {
    expect(formatDurationText(3665)).toBe('1h 1m 5s');
  });

  it('handles 0 seconds', () => {
    expect(formatDurationText(0)).toBe('0s');
  });

  it('handles invalid input', () => {
    expect(formatDurationText(-1)).toBe('0s');
    // @ts-ignore
    expect(formatDurationText('abc')).toBe('0s');
  });
});

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('c1', 'c2')).toBe('c1 c2');
  });

  it('merges tailwind classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });
});
