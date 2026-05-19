# Telegram flow test

## Goal

Design or implement tests for Telegram bot flows using mocked API responses and edge cases.

## Context to read

- `.cursor/rules/50-telegram-bot-api.mdc`
- `.cursor/skills/telegram-bot-api-implementation/SKILL.md`
- `packages/telegram-bot/`
- `docs/ai-workflow/review-checklists.md` (Telegram section)

## Steps

1. List flows to cover: `/start`, `/pair`, `/status`, `/new`, `/ask`, callbacks, unauthorized chat, 409, 429.
2. Mock `fetch` or HTTP client; never use production bot token.
3. Assert `answerCallbackQuery` called for every callback test.
4. Assert offset handling for polling tests.
5. Assert redaction on outbound message bodies in log/diff commands.
6. Run `pnpm test` filtered to telegram-bot.

## Acceptance criteria

- Each listed flow has at least one test or explicit TODO with reason.
- No real tokens in fixtures.

## Safety notes

- Use fake chat IDs and tokens like `123456:TEST_TOKEN_PLACEHOLDER`.

## Expected output

Test plan table + files added + `pnpm test` result snippet.
