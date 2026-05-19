#!/usr/bin/env node
import { runHook } from "../run-hook.js";
const code = await runHook({ hookName: "agent-remote-before-shell", blocking: true });
process.exit(code);
