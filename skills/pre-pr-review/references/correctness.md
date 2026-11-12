# Lens: correctness

**Question:** does the changed code do what its author clearly intended, for every input and state it will realistically see?

Use the intent you inferred in step 1 (from names, doc comments, types, tests, the PR's evident purpose) as the spec. Most real bugs are a gap between that intent and the code.

## Look for

**Intent vs. implementation**
- Units and scales: percent vs. fraction, cents vs. dollars, ms vs. s, bytes vs. KB, 0- vs. 1-based indexes
- Doc comments, names, or types that promise one thing while the code does another
- Inclusive vs. exclusive bounds (`slice`, `range`, `substring`, `<` vs. `<=`)

**Boundaries and inputs**
- Off-by-one at loop ends, page boundaries, string and array limits
- Empty, null/undefined/None, zero, negative, very large, NaN, duplicate, unsorted, Unicode and whitespace inputs
- Dates and times: time zones, DST, end-of-month, string vs. Date comparison
- Floating-point arithmetic on money or quantities that need exact values

**Control flow**
- Inverted or incomplete conditions, wrong operator precedence, `&&` vs. `||`
- Missing `return`/`break`, fall-through, unreachable branches, early returns that skip cleanup or state updates
- Error and fallback paths that report success

**Async and concurrency**
- Promises not awaited (`forEach(async …)`, fire-and-forget calls whose result matters)
- Races on shared state, check-then-act sequences, non-idempotent retries
- Missing cancellation or timeouts where a hang blocks the caller

**Errors and partial failure**
- Swallowed exceptions (`catch {}`, `catch (e) { log }` followed by success)
- A failure midway that leaves data half-updated (no transaction or compensation)
- Wrong error type or status code that callers or clients rely on

**Contracts and integration**
- Changed function signatures, return shapes, or semantics where callers weren't updated. **Search for callers.**
- Public API, serialized formats, events, or DB schemas changed without a migration or versioning
- New config or env vars read without a default or validation
- Resource leaks: handles, connections, listeners, timers not closed. Unbounded growth (caches, queues)
- N+1 queries or per-item network calls inside loops over unbounded data

## Don't report (correctness)

- Missing tests. The quality lens owns that.
- "Might be null" when the type system, a guard, or every caller you checked rules it out.
- Defensive checks for inputs that cannot occur given the call sites you read.
- Performance without a concrete trigger (an unbounded loop, an N+1 on user-sized data). Micro-optimizations never count.
- Behavior that matches what the code clearly intends but that you'd personally design differently.
