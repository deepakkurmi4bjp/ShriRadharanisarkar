---
name: drizzle-orm db.execute returns QueryResult
description: Raw sql`` queries via db.execute() with node-postgres return the raw pg QueryResult object, not an array. Must access .rows explicitly.
---

When using `drizzle-orm` with the node-postgres driver (`drizzle-orm/node-postgres`), calling `db.execute(sql`...`)` with a raw SQL template and no field selection/customResultMapper returns the raw `pg.QueryResult` object — NOT a plain array.

**Why:** The drizzle source explicitly falls back to `return client.query(rawQuery, params)` (the raw pg QueryResult) when no `fields` or `customResultMapper` is present. This differs from drizzle query builder methods which auto-map rows.

**How to apply:** Always extract `.rows` from the result: `const rows = (result as unknown as { rows: any[] }).rows ?? (result as unknown as any[])`. Never cast `db.execute()` result directly to `any[]` and call `.map()` on it — that throws "TypeError: x.map is not a function".
