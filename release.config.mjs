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
    requireClean: true,
    push: false,
  },
  build: {
    // Runs after the tag, on that commit. site:publish then fills website/publish/.
    // Upload stays manual. 45m covers a cold Tauri compile plus the site build.
    command: 'pnpm tauri build && pnpm website:build',
    run: true,
    timeout: '45m',
  },
  hooks: {
    // Copies the bundle and website/build into website/publish/ and writes latest.json.
    // Skips when dry-run. Does not upload.
    postrelease: [
      {
        name: 'site:publish',
        run: 'pnpm site:publish',
      },
    ],
  },
})
