const STATE_KEY = 'fo_state_v1';

function asInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error('INVALID_INT');
  return n;
}
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

export default class FractionalOwnershipContract {
  // REQUIRED by SimStorage
  emptyPromise() { return Promise.resolve(); }

  // MVP: do not reserve keys (avoid SimStorage conflicts)
  isReservedKey(_key) { return false; }

  async _getState(storage) {
    const row = await storage.get(STATE_KEY);
    if (!row || row.value == null) return { assets: {}, holders: {} };
    return clone(row.value);
  }

  async _setState(storage, state) {
    await storage.put(STATE_KEY, state);
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

      await this._setState(storage, state);
      return { ok: true, assetId, totalShares, initialOwner };
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

      await this._setState(storage, state);
      return { ok: true, assetId, from: fromAddr, to, shares };
    }

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
