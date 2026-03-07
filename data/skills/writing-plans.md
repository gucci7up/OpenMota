---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code.
---

# Writing Plans

## Overview
Write comprehensive implementation plans assuming the engineer has zero context for our codebase. Document everything: which files to touch, code snippets, testing, and commands. 

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Bite-Sized Task Granularity
**Each step is one action (2-5 minutes):**
- "Write the failing test"
- "Run it to make sure it fails"
- "Implement minimal code"
- "Verify it passes"
- "Commit"

## Plan Document Header
Every plan MUST start with:
```markdown
# [Feature Name] Implementation Plan
> **For Agent:** Use test-driven-development to implement this plan task-by-task.
```

## Remember
- Exact file paths always
- Complete code snippets in plan
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits
