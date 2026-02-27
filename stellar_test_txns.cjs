/**
 * Stellar Testnet Transaction Script
 * Creates test users and executes USDC transactions on Stellar testnet
 * for Korido/JoonaPay SCF #41 demonstration
 */
const StellarSdk = require('@stellar/stellar-sdk');

const { Keypair, Asset, TransactionBuilder, Operation, Horizon, Networks } = StellarSdk;

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org?addr=';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

// Omnibus account (testnet)
const OMNIBUS_SECRET = 'SB5TXIL6BY4UCCYYCQT3A2445HNYH3K2I4PZPPYCVUS6GU32A5BJYLD3';
const OMNIBUS_PUBLIC = 'GB53TDVUUUWEHWFXET4AXESQFMLWZCVJO6XV4WK4BDAH4YATYV7BUXH6';

const server = new Horizon.Server(HORIZON_URL);
const usdcAsset = new Asset('USDC', USDC_ISSUER);

async function fundAccount(publicKey) {
  console.log(`  Funding ${publicKey.substring(0, 8)}... via Friendbot`);
  const res = await fetch(`${FRIENDBOT_URL}${publicKey}`);
  if (!res.ok) {
    const body = await res.text();
    if (body.includes('createAccountAlreadyExist')) {
      console.log('  Already funded');
      return;
    }
    throw new Error(`Friendbot failed: ${body}`);
  }
  console.log('  Funded ✓');
}

async function addTrustline(keypair) {
  console.log(`  Adding USDC trustline for ${keypair.publicKey().substring(0, 8)}...`);
  const account = await server.loadAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset }))
    .setTimeout(30)
    .build();
  tx.sign(keypair);
  await server.submitTransaction(tx);
  console.log('  Trustline added ✓');
}

async function sendPayment(fromKeypair, toPublic, amount, memo = '') {
  console.log(`  Sending ${amount} USDC: ${fromKeypair.publicKey().substring(0, 8)}... → ${toPublic.substring(0, 8)}...`);
  const account = await server.loadAccount(fromKeypair.publicKey());
  const builder = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.payment({
      destination: toPublic,
      asset: usdcAsset,
      amount: amount,
    }))
    .setTimeout(30);

  if (memo) {
    builder.addMemo(StellarSdk.Memo.text(memo));
  }

  const tx = builder.build();
  tx.sign(fromKeypair);
  const result = await server.submitTransaction(tx);
  console.log(`  TX hash: ${result.hash}`);
  console.log(`  ✓ Success`);
  return result;
}

async function getBalance(publicKey) {
  try {
    const account = await server.loadAccount(publicKey);
    const usdcBalance = account.balances.find(
      b => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER
    );
    return usdcBalance ? usdcBalance.balance : '0';
  } catch {
    return '0';
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Korido/JoonaPay — Stellar Testnet Transactions');
  console.log('═══════════════════════════════════════════════\n');

  // Create 3 test "users"
  const users = [
    { name: 'Alice (CI → US remittance)', keypair: Keypair.random() },
    { name: 'Bob (merchant payment)', keypair: Keypair.random() },
    { name: 'Charlie (P2P transfer)', keypair: Keypair.random() },
  ];

  const omnibusKeypair = Keypair.fromSecret(OMNIBUS_SECRET);

  // Step 1: Fund all accounts via Friendbot
  console.log('Step 1: Fund accounts via Friendbot');
  for (const user of users) {
    await fundAccount(user.keypair.publicKey());
  }
  // Re-fund omnibus if needed
  await fundAccount(OMNIBUS_PUBLIC);
  console.log();

  // Step 2: Add USDC trustlines
  console.log('Step 2: Add USDC trustlines');
  for (const user of users) {
    try {
      await addTrustline(user.keypair);
    } catch (e) {
      console.log(`  Trustline may already exist: ${e.message?.substring(0, 60)}`);
    }
  }
  console.log();

  // Step 3: Issue test USDC from omnibus to users (simulating deposits)
  console.log('Step 3: Simulate deposits (omnibus → user wallets)');
  const deposits = [
    { user: users[0], amount: '250.00', memo: 'korido-deposit-001' },
    { user: users[1], amount: '500.00', memo: 'korido-deposit-002' },
    { user: users[2], amount: '100.00', memo: 'korido-deposit-003' },
  ];

  // First check omnibus USDC balance
  const omnibusBalance = await getBalance(OMNIBUS_PUBLIC);
  console.log(`  Omnibus USDC balance: ${omnibusBalance}`);

  if (parseFloat(omnibusBalance) < 850) {
    console.log('  ⚠️ Omnibus has insufficient USDC for deposits.');
    console.log('  Skipping deposit step — will do P2P with whatever users have.');
  } else {
    for (const d of deposits) {
      await sendPayment(omnibusKeypair, d.user.keypair.publicKey(), d.amount, d.memo);
    }
  }
  console.log();

  // Step 4: User-to-user transfers (simulating P2P)
  console.log('Step 4: P2P transfers between users');
  // Alice → Bob (remittance payout)
  const aliceBalance = await getBalance(users[0].keypair.publicKey());
  if (parseFloat(aliceBalance) > 50) {
    await sendPayment(users[0].keypair, users[1].keypair.publicKey(), '50.00', 'korido-p2p-alice-bob');
    // Bob → Charlie
    await sendPayment(users[1].keypair, users[2].keypair.publicKey(), '25.00', 'korido-p2p-bob-charlie');
    // Charlie → Omnibus (withdrawal)
    await sendPayment(users[2].keypair, OMNIBUS_PUBLIC, '10.00', 'korido-withdrawal-003');
  } else {
    console.log('  ⚠️ Alice has insufficient USDC for P2P test.');
  }
  console.log();

  // Step 5: Print summary
  console.log('═══ Transaction Summary ═══');
  console.log(`Omnibus: ${OMNIBUS_PUBLIC}`);
  console.log(`Omnibus USDC: ${await getBalance(OMNIBUS_PUBLIC)}`);
  console.log();
  for (const user of users) {
    const bal = await getBalance(user.keypair.publicKey());
    console.log(`${user.name}:`);
    console.log(`  Public: ${user.keypair.publicKey()}`);
    console.log(`  USDC: ${bal}`);
  }
  console.log();
  console.log('All transactions visible at:');
  console.log(`  https://stellar.expert/explorer/testnet/account/${OMNIBUS_PUBLIC}`);
  for (const user of users) {
    console.log(`  https://stellar.expert/explorer/testnet/account/${user.keypair.publicKey()}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
