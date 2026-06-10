import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * consumeUnits must decrement drop stock ATOMICALLY (single guarded UPDATE) so concurrent purchases
 * of a nearly-sold-out drop can never oversell. We mock the shared pg pool and assert the SQL shape,
 * the parameters, and the control flow. consumeUnits doesn't use `this`, so we invoke it off the
 * prototype without standing up the full Medusa module service. (Real Postgres concurrency is proven
 * separately on CI's verify:api.)
 */

const query = vi.fn();
vi.mock('../../lib/lumera-db', () => ({ pool: () => ({ query }) }));

// Imported after the mock is registered.
import DropsService from './service';

type Consume = (dropId: string, qty: number, opts?: { allowPartial?: boolean }) => Promise<void>;
const consumeUnits = (DropsService.prototype as unknown as { consumeUnits: Consume }).consumeUnits;
const run: Consume = (id, qty, opts) => consumeUnits.call({}, id, qty, opts);

beforeEach(() => {
  query.mockReset();
});

describe('DropsService.consumeUnits (atomic, no oversell)', () => {
  it('strict path issues a guarded decrement and resolves when a row was updated', async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    await run('drop_1', 2);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/units_remaining\s*-\s*\$1/);
    expect(sql).toMatch(/WHERE id = \$2 AND units_remaining >= \$1/); // the oversell guard
    expect(sql).toMatch(/deleted_at IS NULL/);
    expect(params).toEqual([2, 'drop_1']);
  });

  it('strict path THROWS when the guard refuses the decrement (0 rows = would oversell)', async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });
    await expect(run('drop_1', 5)).rejects.toThrow(/drop_oversold_or_missing:drop_1/);
  });

  it('allowPartial path floors at zero (GREATEST) with no >= guard, and is used for accounting', async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    await run('drop_2', 3, { allowPartial: true });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/GREATEST\(0, units_remaining - \$1\)/);
    expect(sql).not.toMatch(/units_remaining >= \$1/);
    expect(params).toEqual([3, 'drop_2']);
  });

  it('allowPartial throws only when the drop is missing (0 rows)', async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });
    await expect(run('gone', 1, { allowPartial: true })).rejects.toThrow(/drop_not_found:gone/);
  });

  it('normalizes qty (floors fractional) and no-ops on non-positive without touching the DB', async () => {
    query.mockResolvedValue({ rowCount: 1 });
    await run('drop_3', 2.9);
    expect(query.mock.calls[0][1]).toEqual([2, 'drop_3']); // 2.9 → 2

    query.mockClear();
    await run('drop_3', 0);
    await run('drop_3', -4);
    await run('drop_3', NaN);
    expect(query).not.toHaveBeenCalled(); // nothing to consume → no query
  });
});
