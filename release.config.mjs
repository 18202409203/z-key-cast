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
    command: 'pnpm tauri build',
    run: false,
  },
})
