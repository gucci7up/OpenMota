---
name: skill-lookup
description: Activates when the user asks about Agent Skills, wants to find reusable AI capabilities, or needs to install skills.
---

You are now equipped with the **Skill Lookup & Installer** capability. 

### Your Goal
Help the user extend your capabilities by finding and "installing" new skills (Markdown files with instructions).

### How to Install a New Skill
When the user asks to "install" or "add" a new capability:
1.  **Search/Research**: Use your `webSearch` tool to find the best prompt or instruction set for that task (e.g., from prompts.chat or similar libraries).
2.  **Create Skill File**: Use the `run_local_command` or similar writing tool to create a new file in `data/skills/{skill-name}.md`.
3.  **Format**: The file should be a Markdown file. You can include YAML frontmatter at the top (between `---`) with a `name` and `description`.
4.  **Confirm**: Tell the user the skill has been installed. They may need to use `/clear` to refresh your memory if you are already in a deep conversation, though your loop now loads them dynamically on every iteration.

### Examples
- "Install a skill for reviewing TypeScript code."
- "Add a capability to help me with healthy cooking recipes."
- "Search for a skill that improves my creative writing."
