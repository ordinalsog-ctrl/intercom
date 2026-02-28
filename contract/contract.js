/**
 * Fractional Trading Card Ownership Contract (MVP)
 *
 * This contract is implemented as a class with an execute(op, storage) method
 * because trac-peer expects peer.contract.instance.execute(...) to exist.
 *
 * We store all contract state under a single deterministic storage key:
 *   fo_state_v1
 *
 * Dispatch payload is provided via:
 *   op.value.dispatch  -> { type, value }
 *
 * Supported dispatch types:
 * - create_asset
 * - transfer_shares
 * - read_asset
 * - read_holders
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
  async _getState(storage) {
    const row = await storage.get(STATE_KEY);
    if (!row || row.value == null) {
      return { assets: {}, holders: {} };
    }
    // storage value can be stored directly as object
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
    // We only care about tx operations (simulation and real tx both call execute)
    if (!op || op.type !== 'tx') return null;

    const dispatch = op?.value?.dispatch;
    if (!dispatch || typeof dispatch !== 'object') throw new Error('INVALID_DISPATCH');

    const type = dispatch.type;
    const args = dispatch.value ?? {};

    // Load state
    const state = await this._getState(storage);

    // ---- Commands ----
    if (type === 'create_asset') {
      const assetId = String(args.assetId || '').trim();
      if (!assetId) throw new Error('ASSET_ID_REQUIRED');

      const totalShares = asInt(args.totalShares);
      if (totalShares <= 0) throw new Error('TOTAL_SHARES_INVALID');

      // initialOwner is optional; fallback to tx initiator public key (ipk)
      const initialOwner = String(args.initialOwner || op?.value?.ipk || '').trim();
      if (!initialOwner) throw new Error('INITIAL_OWNER_REQUIRED');

      if (state.assets[assetId]) throw new Error('ASSET_ALREADY_EXISTS');

      state.assets[assetId] = {
        assetId,
        totalShares,
        createdAt: Date.now()
      };

      state.holders[assetId] = {
        [initialOwner]: totalShares
      };

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

    // ---- Reads ----
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

    // Unknown command: no-op
    return { ok: false, error: 'UNKNOWN_COMMAND', type };
  }
}
