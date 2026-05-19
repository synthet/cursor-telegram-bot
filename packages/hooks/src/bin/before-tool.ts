#!/usr/bin/env node
import { runHook } from "../run-hook.js";
const code = await runHook({ hookName: "agent-remote-before-tool", blocking: false });
process.exit(code);
