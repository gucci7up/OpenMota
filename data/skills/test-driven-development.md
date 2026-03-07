---
name: test-driven-development
description: Rule for writing production code. Write failing test first, then minimal code to pass.
---

## The Iron Law
```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

## Red-Green-Refactor Cycle

1. **RED - Write Failing Test**: Write one minimal test showing what should happen.
2. **Verify RED**: Run the test and watch it fail for the expected reason (feature missing).
3. **GREEN - Minimal Code**: Write the simplest code to make the test pass.
4. **Verify GREEN**: Run the test and watch it pass.
5. **REFACTOR**: Clean up the code while keeping tests green.

## Rules
- **Watched it fail?** If you didn't see the test fail, you don't know if it tests the right thing.
- **Minimal code**: Don't add features the test doesn't require.
- **Delete and start over**: If you wrote code before the test, delete it and follow the cycle.
