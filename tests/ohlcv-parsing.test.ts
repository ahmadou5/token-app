import { describe, it, expect } from 'vitest';

// Mocked version of the parsing logic from useOHLCV.tsx
function parseOHLCV(ohlcvData: any[]) {
  return ohlcvData.map((c: any) => {
    if (Array.isArray(c)) {
      return {
        time: (c[0] || 0) * 1000,
        open: Number(c[1] || 0),
        high: Number(c[2] || 0),
        low: Number(c[3] || 0),
        close: Number(c[4] || 0),
        volume: Number(c[5] || 0),
      };
    }
    return {
      time: (c.time || c.timestamp || 0) * 1000,
      open: Number(c.open || 0),
      high: Number(c.high || 0),
      low: Number(c.low || 0),
      close: Number(c.close || 0),
      volume: Number(c.volume || 0),
    };
  }).filter(c => c.time > 0);
}

describe('OHLCV Data Parsing', () => {
  it('should correctly parse Tuple format [T,O,H,L,C,V]', () => {
    const rawData = [
      [1714582800, 150.5, 152.0, 149.0, 151.2, 1000000]
    ];
    const parsed = parseOHLCV(rawData);
    expect(parsed[0]).toEqual({
      time: 1714582800000,
      open: 150.5,
      high: 152.0,
      low: 149.0,
      close: 151.2,
      volume: 1000000
    });
  });

  it('should correctly parse Object format {time, open, ...}', () => {
    const rawData = [
      { time: 1714582800, open: 150.5, high: 152.0, low: 149.0, close: 151.2, volume: 1000000 }
    ];
    const parsed = parseOHLCV(rawData);
    expect(parsed[0].time).toBe(1714582800000);
    expect(parsed[0].close).toBe(151.2);
  });

  it('should handle missing data points with fallbacks', () => {
    const rawData = [[1714582800, 150.5]]; // Partial tuple
    const parsed = parseOHLCV(rawData);
    expect(parsed[0].high).toBe(0);
    expect(parsed[0].volume).toBe(0);
  });

  it('should filter out entries with 0 or missing time', () => {
    const rawData = [
      [0, 10, 10, 10, 10, 10],
      [1714582800, 150, 150, 150, 150, 150]
    ];
    const parsed = parseOHLCV(rawData);
    expect(parsed.length).toBe(1);
    expect(parsed[0].time).toBe(1714582800000);
  });
});
