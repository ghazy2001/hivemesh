# HiveMesh Swarm Coordination Rules

When operating as part of a HiveMesh swarm (any conversation where HiveMesh
tools are available and a swarm has been created), follow these rules:

## Blackboard First

Before starting any implementation work, always query the shared blackboard
with `hivemesh_blackboard_query` (no filters) to retrieve all insights posted
by other agents. This prevents duplicate work and ensures you follow
established conventions.

## Stay in Your Lane

Each agent operates in its own Git worktree. Never read from or write to
another agent's worktree directory. If you need something from another agent,
check the blackboard or propose a contract.

## Share What You Learn

When you discover something about the codebase that other agents would benefit
from knowing (architecture patterns, library versions, coding conventions,
gotchas), post it to the blackboard immediately with an appropriate topic.

## Contracts Before Code

If your implementation depends on or will be consumed by another agent's code,
propose a contract using `hivemesh_propose_contract` BEFORE writing the code.
Don't assume what the other agent's API or schema will look like.

## Commit Discipline

Make small, focused commits with conventional commit messages. Each commit
should represent a single logical change. This makes the critic's integration
review and potential merge conflict resolution much easier.

## Report Completion

When you finish your assigned task, send a message to the orchestrator agent
summarizing:
1. What you implemented
2. What you posted to the blackboard
3. Any contracts you proposed or accepted
4. Any concerns or blockers for the merge
