import { describe, expect, it } from 'vitest';
import { POST } from './route';

// Tests the actual exported Route Handler directly, with a real Request
// object, rather than only indirectly through mocked fetch calls in the
// UI/journey tests — this exercises the real HTTP contract (status codes,
// JSON shape, error handling) that those mocks stand in for elsewhere.

function post(body) {
  return POST(new Request('http://localhost/api/risk', { method: 'POST', body: JSON.stringify(body) }));
}

describe('POST /api/risk', () => {
  it('returns 200 with the calculated pressure for valid input', async () => {
    const res = await post({ mood: 2, sleep: 3, focus: 3, initiation: 3, confidence: 3 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ score: 45, band: 'Moderate' });
    expect(body.factors).toBeDefined();
  });

  it('returns 400 with a plain-language error for incomplete input', async () => {
    const res = await post({ mood: 2 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Please answer every check-in question.');
  });

  it('returns 400 for out-of-range values rather than a raw validation stack trace', async () => {
    const res = await post({ mood: 99, sleep: 3, focus: 3, initiation: 3, confidence: 3 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Please answer every check-in question.');
  });

  it('returns 400 rather than crashing on a malformed request body', async () => {
    const res = await POST(new Request('http://localhost/api/risk', { method: 'POST', body: 'not json' }));
    expect(res.status).toBe(400);
  });
});
