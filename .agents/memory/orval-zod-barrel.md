---
name: Orval Zod barrel exports
description: The generated Zod API barrel must avoid duplicate exports with Orval's generated API module.
---

The current Orval generator emits named Zod schemas in generated/api and also writes similarly named files under generated/types. The package barrel should expose generated/api without wildcard re-exporting generated/types.

**Why:** A codegen refresh can otherwise introduce duplicate exported symbols and fail the workspace typecheck even when the API contract itself is valid.

**How to apply:** After changing lib/api-spec/openapi.yaml and running codegen, keep the api-zod barrel aligned with the generator's current output and run the root typecheck.