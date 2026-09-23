# 更新签名密钥

[English](./README.md)

私钥（`*.key`）已 gitignore。公钥可以提交。公网和测试各用一对密钥，不要共用私钥。

命令在**仓库根目录**执行。

## 测试

`pnpm tauri:build-test` 和 `pnpm site:dist-test` 使用。空密码生成：

```bash
pnpm tauri signer generate --ci -w updater-keys/updater.test.key
```

| 文件 | 作用 |
|---|---|
| `updater.test.key` | 测试私钥 |
| `updater.test.key.pub` | 测试公钥，嵌进测试包 |

## 公网

`pnpm tauri build` 和 `pnpm site:dist` 使用。按提示设置密码：

```bash
pnpm tauri signer generate -w updater-keys/updater.key
```

| 文件 | 作用 |
|---|---|
| `updater.key` | 公网私钥 |
| `updater.key.pub` | 公网公钥，嵌进公网包。终端也会打印这份公钥 |

非空密码放在环境变量 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`。空密码不用设，生成时加上 `--ci`：

```bash
pnpm tauri signer generate --ci -w updater-keys/updater.key
```
