import { distanceKm, estimateTransportFee } from './geo.util';

describe('geo.util', () => {
  it('calculates distance between Pune and Mumbai roughly', () => {
    const km = distanceKm(18.5204, 73.8567, 19.076, 72.8777);
    expect(km).toBeGreaterThan(100);
    expect(km).toBeLessThan(160);
  });

  it('estimates transport fee from distance', () => {
    const fee = estimateTransportFee(50);
    expect(fee).toBeGreaterThan(500);
  });
});
