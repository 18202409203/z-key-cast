import { defineConfig } from '@zhupengji/release-kit'

export default defineConfig({
  versionFiles: [
    'package.json',
    'src-tauri/Cargo.toml',
    'src-tauri/tauri.conf.json',
  ],
  changelog: {
    file: 'CHANGELOG.md',
    header: '# Changelog',
    ignore: [/^chore(\(.+\))?!?:/, /^release:/],
    sections: [
      { title: 'Features', pattern: /^feat(\(.+\))?!?:/, strip: /^feat(\(.+\))?!?:\s*/ },
      { title: 'Bug Fixes', pattern: /^fix(\(.+\))?!?:/, strip: /^fix(\(.+\))?!?:\s*/ },
      { title: 'Other', pattern: /.*/ },
    ],
  },
  git: {
    tagPrefix: 'v',
    commitMessage: 'chore: release ${tag}',
    branch: 'main',
    remote: 'origin',
    requireClean: 'ask',
    push: false,
  },
  build: {
    // Keep false: Gitee Release uploads stay manual. Run `pnpm tauri build` (or
    // `--build`) before release when you also want site:publish-artifacts to copy bundles.
    command: 'pnpm tauri build',
    run: false,
  },
  hooks: {
    // Same core command as `pnpm site:publish-artifacts`. Skips when dry-run.
    // Does not upload to Gitee. Requires prior build artifacts if you want a real publish.
    postrelease: [
      {
        name: 'site:publish-artifacts',
        run: 'pnpm site:publish-artifacts',
        onError: 'warn',
      },
    ],
  },
})
