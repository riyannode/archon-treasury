# ADR-0014: No Hidden Chain-of-Thought Persistence

**Status:** Accepted  
**Date:** 2026-07-15

## Context

LLM reasoning may contain hallucinations, biases, or injected instructions. Persisting raw chain-of-thought creates an attack surface and audit confusion.

## Decision

Persist only: structured task context, confirmed user inputs, tool calls, structured recommendation, summaries, references. Do NOT persist: hidden chain-of-thought, secrets, complete unbounded provider content, unrelated user conversation.

## Consequences

- ✅ Audit trail contains only actionable, verifiable data
- ✅ No hidden reasoning can influence future decisions
- ⚠️ Debugging LLM behavior requires structured logging, not raw thought replay
