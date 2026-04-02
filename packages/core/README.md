# @alerthq/core

Core library for alerthq. Provides domain types, plugin interfaces, config/plugin loading, and core functions.

## Installation

```bash
pnpm add @alerthq/core
```

## Usage

```ts
import { bootstrap, sync, getAlerts } from '@alerthq/core';

const ctx = await bootstrap('./alerthq.config.yml');
const run = await sync(ctx);
const alerts = await getAlerts(ctx);
await ctx.dispose();
```

## License

MIT
