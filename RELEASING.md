# Releasing

How to publish a new version of `ts-netstorageapi-akamai` to npm and update the documentation site on GitHub Pages. Written for 1.1.0; change the version numbers for later releases. Run every command from the repository root unless a step says otherwise.

## 1. Check you are logged in to npm as boffincoders

```bash
npm whoami
```

- **What it does:** prints the npm account this machine publishes as.
- **Check it worked:** it prints `boffincoders`. If not, run `npm login` and repeat.

## 2. Start from the release branch

```bash
git checkout maint/1.1.0
```

- **What it does:** switches to the branch that holds the release.
- **Check it worked:** `git status` shows `On branch maint/1.1.0` and `nothing to commit, working tree clean`.

## 3. Install exactly the locked dependencies

```bash
npm ci
```

- **What it does:** deletes `node_modules` and installs what `package-lock.json` lists.
- **Check it worked:** it ends with `added … packages` and no `ERR!` lines.

## 4. Build

```bash
npm run build
```

- **What it does:** cleans `dist/` and compiles JavaScript and type definitions.
- **Check it worked:** no errors are printed and `dist/netstorage.js`, `dist/netstorage.d.ts` and `dist/cli.js` exist.

## 5. Run the tests

```bash
npm test
```

- **What it does:** runs the Vitest suite against the built `dist/` and a local mock NetStorage server. It never contacts Akamai.
- **Check it worked:** the summary shows every test passed (85 for 1.1.0) and 0 failed.

## 6. Check for known vulnerabilities

```bash
npm audit --omit=dev
```

- **What it does:** checks the runtime dependencies that users install.
- **Check it worked:** it prints `found 0 vulnerabilities`.

## 7. Review what will be published

```bash
npm pack --dry-run
```

- **What it does:** lists the files that would go into the npm tarball, without creating it.
- **Check it worked:** the list holds only `CHANGELOG.md`, `LICENSE`, `README.md`, `package.json` and `dist/**/*.js` / `dist/**/*.d.ts` (47 files for 1.1.0, about 22 kB packed and 90 kB unpacked). There must be no `src/`, `test/`, `website/`, `assets/`, `scripts/`, `.github/`, config files, lockfile or `.zip`. The version line must say `1.1.0`.

## 8. Build the documentation site

```bash
npm run site
```

- **What it does:** writes the documentation site and the TypeDoc API reference to `website/dist` (ignored by git). GitHub Actions runs the same command when you merge.
- **Check it worked:** it ends with `website/dist: 24 pages plus the API reference`. To look at it, run `python3 -m http.server 8080 --directory website/dist` and open http://localhost:8080 (stop it with Ctrl+C).

## 9. Set the release date in the changelog

Replace `## [1.1.0] - unreleased` in `CHANGELOG.md` with today's date, e.g. `## [1.1.0] - 2026-11-02`, then fold it into the release commit:

```bash
git commit -a --amend --no-edit
```

- **What it does:** adds the date to the existing release commit, so the branch still has a single commit.
- **Check it worked:** `git show --stat HEAD` lists `CHANGELOG.md`.

## 10. Confirm there is one commit and no AI attribution

```bash
git log --oneline master..HEAD
```

```bash
git log --format=%B master..HEAD | grep -ciE "co-authored-by|generated with"
```

- **What it does:** lists the commits that will be pushed, then counts attribution lines in their messages.
- **Check it worked:** the first command shows exactly one line, and the second prints `0`.

## 11. Push the branch

```bash
git push -u origin maint/1.1.0
```

- **What it does:** uploads the branch to GitHub.
- **Check it worked:** the push ends without errors and prints a link to open a pull request.

## 12. Turn on GitHub Pages (first release only)

```bash
gh api -X POST repos/boffincoders/akamai-netstorageapi-typescript/pages -f build_type=workflow
```

- **What it does:** enables GitHub Pages for the repository with GitHub Actions as the source, so `.github/workflows/pages.yml` can deploy the site. On the website this is **Settings → Pages → Build and deployment → Source: GitHub Actions**.
- **Check it worked:** `gh api repos/boffincoders/akamai-netstorageapi-typescript/pages --jq .build_type` prints `workflow`. If Pages is already enabled, the first command reports a conflict; that is fine.

## 13. Open a pull request

```bash
gh pr create --base master --head maint/1.1.0 --title "Release 1.1.0" --body-file CHANGELOG.md
```

- **What it does:** opens a pull request (you can also use the GitHub website). CI runs the build and tests on Node 18, 20 and 22.
- **Check it worked:** all three CI jobs are green on the pull request.

## 14. Merge without a merge commit

```bash
gh pr merge maint/1.1.0 --rebase
```

- **What it does:** puts the release commit on top of master ("Rebase and merge" on the website), so master gets one commit. Do not use "Create a merge commit".
- **Check it worked:** the commit list on GitHub shows the release commit as the latest commit on master, with no merge commit. The merge also starts the "Docs site" workflow.

## 15. Update your local master

```bash
git checkout master && git pull
```

- **What it does:** moves to `master` and fetches the merge.
- **Check it worked:** `git log -1 --oneline` shows the release commit, and `npm pkg get version` prints `"1.1.0"`.

## 16. Check the documentation site went live

```bash
gh run list --workflow pages.yml --limit 1
```

- **What it does:** shows the latest run of the "Docs site" workflow.
- **Check it worked:** the run shows `completed` and `success` (it takes about a minute). Then open https://boffincoders.github.io/akamai-netstorageapi-typescript/ and check the home page, a method page, the playground and https://boffincoders.github.io/akamai-netstorageapi-typescript/api/.

## 17. Publish to npm

```bash
npm publish
```

- **What it does:** runs `prepublishOnly` (build and tests again), then uploads the package. Enter your one-time password if npm asks for it.
- **Check it worked:** it ends with `+ ts-netstorageapi-akamai@1.1.0`.

## 18. Check the npm registry

```bash
npm view ts-netstorageapi-akamai version
```

- **What it does:** asks the registry for the latest version.
- **Check it worked:** it prints `1.1.0`. Also open https://www.npmjs.com/package/ts-netstorageapi-akamai and check the description, the README images, the homepage and the repository link.

## 19. Test a clean install

Run these one after the other in a new terminal:

```bash
cd "$(mktemp -d)" && npm init -y > /dev/null && npm install ts-netstorageapi-akamai@1.1.0
```

```bash
node -e "const N = require('ts-netstorageapi-akamai').default; console.log(typeof N, new N({hostname:'h',keyName:'k',key:'s',cpCode:'1'}) instanceof N)"
```

```bash
npx akamai-netstorage --version
```

- **What it does:** installs the published package in an empty folder, loads it the CommonJS way and runs the CLI.
- **Check it worked:** the install reports `found 0 vulnerabilities`, the second command prints `function true`, and the third prints `1.1.0`.

## 20. Tag the release

```bash
git tag -a v1.1.0 -m "v1.1.0"
```

```bash
git push origin v1.1.0
```

- **What it does:** marks the published commit and pushes the tag.
- **Check it worked:** `git ls-remote --tags origin v1.1.0` prints one line.

## 21. Create the GitHub release (optional)

```bash
gh release create v1.1.0 --title "v1.1.0" --notes-file CHANGELOG.md
```

- **What it does:** publishes release notes on GitHub.
- **Check it worked:** the release appears at https://github.com/boffincoders/akamai-netstorageapi-typescript/releases.

## 22. Point the repository "About" box at the docs (optional, once)

```bash
gh repo edit boffincoders/akamai-netstorageapi-typescript --homepage https://boffincoders.github.io/akamai-netstorageapi-typescript/ --add-topic akamai,netstorage,typescript,nodejs,cdn,cli
```

- **What it does:** shows the documentation link and search topics on the GitHub repository page.
- **Check it worked:** the repository page shows the link and the topics on the right.

## If something goes wrong

- **`npm whoami` shows another account, or `npm publish` fails with E403/E401:** run `npm logout`, then `npm login` as boffincoders, and retry from step 17.
- **`npm publish` asks for a one-time password and fails:** run `npm publish --otp=123456` with a fresh code from your authenticator.
- **CI fails and you need to change something after pushing:** make the fix, then keep the single commit with `git commit -a --amend --no-edit` and `git push --force-with-lease`. Only do this on `maint/1.1.0` before it is merged, never on master.
- **The "Docs site" workflow fails at "deploy" with a Pages error:** Pages is not enabled yet. Do step 12, then start the workflow again with `gh workflow run pages.yml`.
- **The site shows a 404 right after the first deploy:** wait a minute and reload; the first GitHub Pages deployment can take a little longer.
- **Tests fail locally but passed in CI:** run `npm ci` again (step 3) to reset `node_modules`, then repeat steps 4 and 5.
- **CI fails only on Node 18:** the Node 18 job installs Vitest 3.2.7 because Vitest 4 needs Node 20. Check whether a dependency update dropped Node 18 support.
- **The published package is broken:** do not unpublish. Point `latest` back to the previous version so new installs get it, then fix and publish 1.1.1:

  ```bash
  npm dist-tag add ts-netstorageapi-akamai@1.0.4 latest
  ```

  ```bash
  npm deprecate ts-netstorageapi-akamai@1.1.0 "Broken release, use 1.1.1"
  ```

  After 1.1.1 is published, it becomes `latest` automatically.
- **The tag points at the wrong commit (before it was pushed):** `git tag -d v1.1.0` and create it again.
