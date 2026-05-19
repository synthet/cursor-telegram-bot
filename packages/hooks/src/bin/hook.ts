#!/usr/bin/env node
import { runHook } from "../run-hook.js";
const code = await runHook({ hookName: "agent-remote-hook", blocking: false });
process.exit(code);
