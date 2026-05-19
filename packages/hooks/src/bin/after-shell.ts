#!/usr/bin/env node
import { runHook } from "../run-hook.js";
const code = await runHook({ hookName: "agent-remote-after-shell", blocking: false });
process.exit(code);
