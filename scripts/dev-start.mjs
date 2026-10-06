import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';

const mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
const uri = mongo.getUri();
console.log('MongoMemoryServer URI:', uri);

const env = {
  ...process.env,
  MONGO_URI: uri,
  JWT_SECRET: 'codeshield-dev-secret-1234567890',
  JWT_EXPIRES_IN: '8h',
  PORT: '5000',
  CLIENT_STUDENT_URL: 'http://localhost:5173',
  CLIENT_TEACHER_URL: 'http://localhost:5174',
  CODE_RUNNER_URL: 'http://localhost:8000',
  CODE_RUNNER_TOKEN: 'CodeShieldRunnerDevToken123456',
};

const child = spawn('npx', ['tsx', 'watch', 'src/server.ts'], {
  cwd: 'C:/Users/Hp/OneDrive/Documents/Desktop/IPD/CodeShield/backend',
  env,
  shell: true,
  stdio: 'inherit',
});

child.on('exit', async (code) => {
  console.log(`backend exited with code ${code}`);
  await mongo.stop();
  process.exit(code ?? 0);
});

process.on('SIGINT', async () => {
  child.kill('SIGINT');
  await mongo.stop();
  process.exit(0);
});
