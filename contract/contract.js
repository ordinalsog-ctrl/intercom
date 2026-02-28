/**
 * Fractional Trading Card Ownership Contract (MVP)
 *
 * IMPORTANT:
 * For real TXs, the framework expects the contract to RETURN state operations
 * (e.g. put/del) that will be applied to the subnet state (base.view),
 * so that `/get --key ...` can read them.
 *
 * Therefore execute() returns:
 * - an array of ops for writes: [{ type:'put', key, value }]
 * - a plain object for reads
 *
 * Also required by SimStorage:
 * - emptyPromise()
 * - isReservedKey()
 */

const STATE_KEY = 'fo_state_v1';

function asInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error('INVALID_INT');
  return n;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export default class FractionalOwnershipContract {
  emptyPromise() { return Promise.resolve(); }
  isReservedKey(_key) { return false; } // MVP

  async _getState(storage) {
    const row = await storage.get(STATE_KEY);
    if (!row || row.value == null) return { assets: {}, holders: {} };
    return clone(row.value);
  }

  _ensureAsset(state, assetId) {
    const a = state.assets[assetId];
    if (!a) throw new Error('ASSET_NOT_FOUND');
    state.holders[assetId] ??= {};
    return a;
  }

  async execute(op, storage) {
    if (!op || op.type !== 'tx') return null;

    const dispatch = op?.value?.dispatch;
    if (!dispatch || typeof dispatch !== 'object') throw new Error('INVALID_DISPATCH');

    const type = dispatch.type;
    const args = dispatch.value ?? {};

    const state = await this._getState(storage);

    // ---------- Writes (return ops) ----------
    if (type === 'create_asset') {
      const assetId = String(args.assetId || '').trim();
      if (!assetId) throw new Error('ASSET_ID_REQUIRED');

      const totalShares = asInt(args.totalShares);
      if (totalShares <= 0) throw new Error('TOTAL_SHARES_INVALID');

      const initialOwner = String(args.initialOwner || op?.value?.ipk || '').trim();
      if (!initialOwner) throw new Error('INITIAL_OWNER_REQUIRED');

      if (state.assets[assetId]) throw new Error('ASSET_ALREADY_EXISTS');

      state.assets[assetId] = { assetId, totalShares, createdAt: Date.now() };
      state.holders[assetId] = { [initialOwner]: totalShares };

      return [{ type: 'put', key: STATE_KEY, value: state }];
    }

    if (type === 'transfer_shares') {
      const assetId = String(args.assetId || '').trim();
      const to = String(args.to || '').trim();
      const shares = asInt(args.shares);

      if (!assetId) throw new Error('ASSET_ID_REQUIRED');
      if (!to) throw new Error('TO_REQUIRED');
      if (shares <= 0) throw new Error('SHARES_INVALID');

      this._ensureAsset(state, assetId);

      const fromAddr = String(op?.value?.ipk || '').trim();
      if (!fromAddr) throw new Error('FROM_REQUIRED');

      const holders = (state.holders[assetId] ??= {});
      const fromBal = asInt(holders[fromAddr] || 0);
      if (fromBal < shares) throw new Error('INSUFFICIENT_SHARES');

      holders[fromAddr] = fromBal - shares;
      holders[to] = asInt(holders[to] || 0) + shares;
      if (holders[fromAddr] === 0) delete holders[fromAddr];

      return [{ type: 'put', key: STATE_KEY, value: state }];
    }

    // ---------- Reads (return plain objects) ----------
    if (type === 'read_asset') {
      const assetId = String(args.assetId || '').trim();
      if (!assetId) throw new Error('ASSET_ID_REQUIRED');
      return { asset: state.assets[assetId] || null };
    }

    if (type === 'read_holders') {
      const assetId = String(args.assetId || '').trim();
      if (!assetId) throw new Error('ASSET_ID_REQUIRED');
      return { holders: state.holders[assetId] || {} };
    }

    return { ok: false, error: 'UNKNOWN_COMMAND', type };
  }
}
