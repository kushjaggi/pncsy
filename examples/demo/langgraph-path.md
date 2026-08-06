---
title: LangGraph — Learning Path
subtitle: Intermediate track, standard depth
kicker: Learning Path
chips: [Prereqs, Basic, Intermediate, Traps]
format: pdf
---

<!-- pncsy:learn topic="LangGraph" level="intermediate" depth="standard" -->

# LangGraph — Learning Path

Build stateful agent workflows as graphs: nodes, edges, shared state, tool loops, memory, and human approval. This path takes you from first graph to production-shaped patterns.

## Snapshot

| Field | Value |
|-------|-------|
| Topic | LangGraph |
| Target level | Intermediate |
| Depth | standard |
| Time to target | 2–4 weeks (5–8 hrs/week) |
| Assumes you know | Python basics, what an LLM API call is |

## Prerequisites

| Prerequisite | Self-check |
|--------------|------------|
| Python 3.10+ | Can you run `pip install` and import a package? |
| Basic LLM calls | Have you called ChatGPT/OpenAI API once? |
| JSON & dicts | Can you explain what a TypedDict is for? |

## Level 1 — Basic

### Goals

- Explain State, Node, Edge in one sentence each
- Run a one-node graph START → chatbot → END
- Read `invoke()` output and find messages in state

### Core concepts

- **State** — shared bag of data every node reads/writes
- **Node** — one function: state in, partial update out
- **Edge** — who runs next (fixed or conditional)
- **Reducer** — how list fields merge (e.g. `add_messages`)
- **compile()** — turn graph definition into runnable app

### Resources

| Type | Resource | Why | Time |
|------|----------|-----|------|
| Doc | LangGraph quickstart | Official minimal graph | 1h |
| Video | LangChain LangGraph intro (verify) | Visual walkthrough | 45m |

### Do this

Build a 1-node chatbot graph. User says hi, model replies. Print final message.

## Level 2 — Intermediate

### Goals

- Wire two nodes with a fixed edge (pipeline)
- Add a conditional edge (branch on state)
- Run a tool-calling loop with ToolNode

### Core concepts

- **Fixed edges** — assembly-line steps
- **Conditional edges** — router function picks next node
- **ToolNode** — executes model tool calls
- **tools_condition** — route to tools or END
- **recursion_limit** — cap agent loops

### Resources

| Type | Resource | Why | Time |
|------|----------|-----|------|
| Doc | LangGraph agents tutorial | Tool loop pattern | 2h |
| Doc | Conditional edges guide | Branching graphs | 1h |

### Do this

Agent that can multiply two numbers via a tool. Max 5 tool rounds.

## Videos and courses

| Resource | Creator | Watch for | Skip |
|----------|---------|-----------|------|
| LangGraph 101 playlist (verify) | LangChain | graph mental model | marketing intros |
| ReAct agent deep dive (verify) | community | tool loop debugging | outdated API bits |

## Common traps

| Trap | What actually breaks | Fix |
|------|----------------------|-----|
| History vanishes | No `add_messages` reducer | Annotate messages with reducer |
| Infinite tool loop | Router always → tools | Check tool_calls on last message |
| "Memory broken" | New thread_id each turn | Reuse `configurable.thread_id` |

## Glossary

| Term | Meaning |
|------|---------|
| State | Shared data for one run |
| Node | One step in the graph |
| Edge | Transition to next step |
| Checkpointer | Persists state between steps |
| Thread ID | Which conversation to load |
| Interrupt | Pause for human input |

## Next

- Checkpointer + multi-turn memory
- Human-in-the-loop before risky actions
- Subgraphs for multi-agent systems
