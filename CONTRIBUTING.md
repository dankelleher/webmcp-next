# Contributing to webmcp-next

Thanks for your interest in contributing.

## Getting started

```bash
git clone https://github.com/dankelleher/webmcp-next.git
cd webmcp-next
pnpm install
pnpm --filter webmcp-next build
```

The demo app runs on port 3700:

```bash
pnpm --filter demo-app dev
```

## Development workflow

1. Make changes in `packages/webmcp-next/src/`
2. Rebuild the plugin: `pnpm --filter webmcp-next build`
3. The demo app hot-reloads and picks up the new build
4. Run lint: `pnpm -r lint`

## Pull requests

- Keep PRs focused on a single change
- Include a clear description of what and why
- Make sure `pnpm -r lint` passes
- Add or update tests if applicable

## Reporting issues

Open an issue at https://github.com/dankelleher/webmcp-next/issues with:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Next.js version and browser

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
