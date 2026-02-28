# Demo: Run 2 Peers (Admin + Joiner)

This demo proves the base networking works:
- one **admin** peer creates the subnet/app
- one **joiner** peer joins using the admin writer key (bootstrap)

> Important: Intercom must be run via **Pear** (not plain Node).

---

## 0) Requirements

- Node.js >= 22
- Pear runtime:
  ```bash
  npm install -g pear
  pear -v
