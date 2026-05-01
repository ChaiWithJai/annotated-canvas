# Issue Learning Loop

Every implementation issue should teach the next contributor what changed, what was learned, and what traps to avoid. Use this format in issue bodies and updates.

## CDF Sections for Issues

### Learning Objective

State the concrete capability the implementer should demonstrate by closing the issue.

Example: "Implement the sidebar capture scaffold so a contributor can see source metadata, timecode inputs, commentary entry, and publish action in a 360px MV3-compatible panel."

### Prior Knowledge

List what the implementer should already understand before starting:

- Product invariant or domain concept.
- Relevant API/platform constraint.
- Local repo file or doc to read first.

### Misconceptions and Pitfalls

Call out failure modes before work starts. Examples:

- Assuming third-party video bytes can be re-hosted.
- Holding MV3 state only in service-worker module scope.
- Treating KV as strongly consistent source-of-truth storage.
- Creating one global Durable Object for all engagement.

### Practice Task

Describe the smallest useful artifact the implementer must produce:

- Component scaffold.
- OpenAPI schema.
- D1 migration sketch.
- Router contract.
- Architecture decision record.

### Assessment

Define evidence required before the issue is closed:

- Tests or type checks.
- Screenshot or screen recording.
- Contract fixture.
- Architecture diagram.
- Links to docs or comments capturing a roadblock.

### Transfer

Explain how the result will be reused in another stream, such as extension UI reusing web tokens or the API contract driving D1 schema work.

### Roadblocks and Learning Log

Every issue should collect:

- Roadblocks hit.
- Decision made.
- Source/evidence.
- Follow-up issue if the roadblock is not solved.

## Labels

Suggested labels:

- `type:epic`
- `type:task`
- `learning-log`
- `stream:frontend-ui`
- `stream:api-contracts`
- `stream:cloudflare-architecture`
- `stream:chrome-extension`
- `priority:p0`
- `priority:p1`
- `needs-research`
- `risk:platform`
- `risk:legal-rights`
