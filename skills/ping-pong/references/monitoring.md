# Monitoring - the Monitor tool, not an agent

`pp-monitor` does not exist as an agent. Use Claude Code's native `Monitor` tool when the lead wants supervision without baby-sitting. Monitor runs a command in the background and feeds its output lines back to the lead mid-conversation.

```sh
# Example poll script - emit ALERT lines for hang / staleness / rate-limit
while true; do
  # check task list for stale in_progress items
  # check team config for member tmuxPaneId == "" (dead inbox)
  # tail the project's dev log for rate-limit hits
  # ... emit "ALERT: <category> <detail>" lines
  sleep 60
done
```

Each `ALERT:` line surfaces to the lead as it happens. Lead reacts: respawn, nudge via SendMessage, or bubble to the user.

**Worker-side hang rule (independent of Monitor):** pp-pong kills any test command sitting at 0% CPU for >3 min and treats it as a failure. The lead's Monitor is the backstop, not the only line of defense.

**Availability:** Monitor is version- and platform-gated (newer Claude Code releases; not available on Bedrock/Vertex/Foundry or when non-essential traffic is disabled). If the tool isn't present, poll manually - run the same checks via Bash between dispatches, or shorten dispatch batches so staleness surfaces at return time.

Teams die. Panes go stale. Members stop responding. Monitor (or a manual poll) catches it; the lead respawns. Predefined agents make this trivial - `Agent({subagent_type: "pp-ping", name: "ping-attempt-2"})` gives a fresh instance any time.
