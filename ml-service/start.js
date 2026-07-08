const { execSync, spawn } = require('child_process');
const path = require('path');

function checkCommand(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

let pythonCmd = null;
const commands = ['py', 'python', 'python3'];

for (const cmd of commands) {
  if (checkCommand(cmd)) {
    pythonCmd = cmd;
    break;
  }
}

if (!pythonCmd) {
  console.error('❌ [AI Service] Python was not found on your system. The ML service cannot start.');
  console.log('💡 [AI Service] Zero Hunger will continue to run using the local JavaScript fallback predictor.');
  process.exit(0);
}

console.log(`🤖 [AI Service] Found Python executable: "${pythonCmd}". Starting Flask microservice...`);

const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
// Pass arguments array and keep shell true for Windows command compatibility
const child = spawn(pythonCmd, ['app.py'], {
  cwd: __dirname,
  env,
  shell: true,
  stdio: 'inherit'
});

child.on('close', (code) => {
  process.exit(code);
});
