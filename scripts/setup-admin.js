// Creates (or resets) the admin login used by the /admin panel.
// Run with: npm run setup

const readline = require('readline');
const bcrypt = require('bcryptjs');
const { Admin } = require('../lib/store');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

(async () => {
  console.log('\nTest Series - admin account setup');
  console.log('----------------------------------');

  const existing = Admin.get();
  if (existing) {
    console.log(`An admin account already exists (username: "${existing.username}").`);
    const proceed = (await ask('Replace it with a new username/password? (y/N): ')).trim().toLowerCase();
    if (proceed !== 'y') {
      console.log('Left the existing admin account unchanged.');
      rl.close();
      return;
    }
  }

  let username = '';
  while (!username) {
    username = (await ask('Choose an admin username: ')).trim();
  }

  let password = '';
  while (password.length < 6) {
    password = (await ask('Choose an admin password (min 6 characters): ')).trim();
    if (password.length < 6) console.log('Password is too short, try again.');
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  Admin.save({ username, passwordHash });

  console.log(`\nDone. You can log in at /admin/login as "${username}".\n`);
  rl.close();
})();
