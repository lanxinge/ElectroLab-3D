import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const log = message => console.log(`[ElectroLab] ${message}`);
const exists = async file => !!(await stat(file).catch(() => null));

function options() {
  const result = { open: true, rebuild: false, setupOnly: false, port: undefined };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--no-open') result.open = false;
    else if (args[i] === '--rebuild') result.rebuild = true;
    else if (args[i] === '--setup-only') result.setupOnly = true;
    else if (args[i] === '--port') result.port = args[++i];
    else throw new Error(`未知参数：${args[i]}。使用 --help 查看用法。`);
    if (args[i - 1] === '--port' && !result.port) throw new Error('--port 后需要填写端口号。');
  }
  return result;
}

function runNpm(command) {
  // Windows 的 npm.cmd 通过固定命令调用；用户输入不参与 shell 拼接。
  const win = process.platform === 'win32';
  const argv = command === 'ci' ? ['ci', '--no-audit', '--no-fund'] : ['run', 'build'];
  const child = spawn(win ? (process.env.ComSpec || 'cmd.exe') : 'npm',
    win ? ['/d', '/s', '/c', `npm ${argv.join(' ')}`] : argv,
    { cwd: root, stdio: 'inherit', windowsHide: true });
  return new Promise((resolve, reject) => {
    child.once('error', () => reject(new Error('找不到 npm，请安装包含 npm 的 Node.js 24。')));
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`npm ${argv.join(' ')} 未完成，请查看上方输出后重试。`)));
  });
}

async function newestModification(file) {
  const info = await stat(file).catch(() => null);
  if (!info) return 0;
  if (!info.isDirectory()) return info.mtimeMs;
  const times = await Promise.all((await readdir(file)).map(name => newestModification(path.join(file, name))));
  return Math.max(info.mtimeMs, ...times);
}

async function configure() {
  const file = path.join(root, '.env');
  if (await exists(file)) process.loadEnvFile(file);
  if (!process.env.JWT_SECRET) {
    const secret = randomBytes(32).toString('hex');
    const text = await readFile(file, 'utf8').catch(() => '');
    const updated = /^JWT_SECRET\s*=.*$/m.test(text)
      ? text.replace(/^JWT_SECRET\s*=.*$/m, `JWT_SECRET=${secret}`)
      : `${text}${text && !text.endsWith('\n') ? '\n' : ''}JWT_SECRET=${secret}\n`;
    await writeFile(file, updated, 'utf8');
    process.env.JWT_SECRET = secret;
    log('已创建本机配置 .env。');
  }
}

async function requireFreePort(port) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', error => reject(new Error(error.code === 'EADDRINUSE'
      ? `端口 ${port} 已被占用。请使用 --port 3002 选择其他端口。`
      : `无法使用端口 ${port}：${error.message}`)));
    probe.listen(port, '0.0.0.0', () => probe.close(resolve));
  });
}

function openBrowser(url) {
  const [command, args] = process.platform === 'win32'
    ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  const opener = spawn(command, args, { stdio: 'ignore', windowsHide: true });
  opener.once('error', () => log(`请在浏览器打开 ${url}`));
  opener.unref();
}

async function start(port, shouldOpen) {
  await requireFreePort(port);
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['--no-warnings', '--import', 'tsx', 'server/start.ts'],
    { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'inherit', windowsHide: true });
  let ended = false;
  const completion = new Promise(resolve => {
    child.once('error', error => { ended = true; console.error(error.message); resolve(1); });
    child.once('exit', code => { ended = true; resolve(code ?? 0); });
  });
  let stopping = false;
  const stop = () => { stopping = true; child.kill('SIGTERM'); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  let ready = false;
  for (let i = 0; i < 80 && !ended; i++) {
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(500) });
      const body = await response.json();
      if (response.ok && body.ok && body.service === 'ElectroLab 3D API') { ready = true; break; }
    } catch { /* 服务尚未就绪，继续等待。 */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (ready) {
    log(`实验室已就绪：${url}`);
    log('保持此窗口运行；按 Ctrl+C 结束服务。');
    if (shouldOpen) openBrowser(url);
  } else if (!ended) {
    stop();
    throw new Error('服务未能及时启动，请查看上方输出。');
  }
  const code = await completion;
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
  process.exitCode = stopping ? 0 : code;
}

async function main() {
  if (args.includes('--help')) {
    console.log('用法：node scripts/launch.mjs [--port 3001] [--no-open] [--rebuild] [--setup-only]\n首次安装依赖并构建，后续按改动更新。--setup-only 只准备环境，不启动服务。');
    return;
  }
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 13)) throw new Error('需要 Node.js 22.13 或更新版本，建议安装 Node.js 24。');
  const settings = options();
  await configure();
  const portText = settings.port ?? process.env.PORT ?? '3001';
  if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) throw new Error('端口必须是 1–65535 之间的整数。');
  const port = Number(portText);
  const lock = await stat(path.join(root, 'package-lock.json'));
  const installed = await stat(path.join(root, 'node_modules/.package-lock.json')).catch(() => null);
  const needInstall = !installed || lock.mtimeMs > installed.mtimeMs || !await exists(path.join(root, 'node_modules/tsx'));
  if (needInstall) { log('正在安装项目依赖……'); await runNpm('ci'); }
  else log('依赖已就绪。');
  const built = await stat(path.join(root, 'dist/index.html')).catch(() => null);
  const sourceTime = Math.max(...await Promise.all(['src', 'shared', 'server', 'tests', 'public', 'index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'tailwind.config.js', 'postcss.config.js', 'tsconfig.json'].map(p => newestModification(path.join(root, p)))));
  if (settings.rebuild || needInstall || !built || sourceTime > built.mtimeMs) {
    log('正在构建实验室……'); await runNpm('build');
  } else log('沿用最新构建。');
  if (settings.setupOnly) { log('环境已准备完成。'); return; }
  await start(port, settings.open);
}

process.chdir(root);
main().catch(error => { console.error(`[ElectroLab] ${error.message}`); process.exitCode = 1; });
