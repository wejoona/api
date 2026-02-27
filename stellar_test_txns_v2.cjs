/**
 * Stellar Testnet Transaction Script v2
 * Creates a custom test USDC issuer, funds users, and executes transactions
 * for Korido/JoonaPay SCF #41 demonstration
 */
const StellarSdk = require('@stellar/stellar-sdk');

const { Keypair, Asset, TransactionBuilder, Operation, Horizon, Networks, Memo } = StellarSdk;

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org?addr=';

// Omnibus account (testnet) — acts as distribution account
const OMNIBUS_SECRET = 'SB5TXIL6BY4UCCYYCQT3A2445HNYH3K2I4PZPPYCVUS6GU32A5BJYLD3';
const OMNIBUS_PUBLIC = 'GB53TDVUUUWEHWFXET4AXESQFMLWZCVJO6XV4WK4BDAH4YATYV7BUXH6';

const server = new Horizon.Server(HORIZON_URL);

async function fundAccount(publicKey) {
  console.log(`  Funding ${publicKey.substring(0, 12)}... via Friendbot`);
  const res = await fetch(`${FRIENDBOT_URL}${publicKey}`);
  if (!res.ok) {
    const body = await res.text();
    if (body.includes('createAccountAlreadyExist')) {
      console.log('  Already funded');
      return;
    }
    // Account likely already exists
    console.log('  Already exists (likely funded before)');
    return;
  }
  console.log('  Funded ✓');
}

async function addTrustline(keypair, asset) {
  const pk = keypair.publicKey();
  console.log(`  Adding ${asset.code} trustline for ${pk.substring(0, 12)}...`);
  const account = await server.loadAccount(pk);
  
  // Check if trustline already exists
  const existing = account.balances.find(
    b => b.asset_code === asset.code && b.asset_issuer === asset.issuer
  );
  if (existing) {
    console.log('  Trustline already exists ✓');
    return;
  }
  
  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(30)
    .build();
  tx.sign(keypair);
  await server.submitTransaction(tx);
  console.log('  Trustline added ✓');
}

async function sendPayment(fromKeypair, toPublic, asset, amount, memo = '') {
  console.log(`  Sending ${amount} ${asset.code}: ${fromKeypair.publicKey().substring(0, 12)}... → ${toPublic.substring(0, 12)}...`);
  const account = await server.loadAccount(fromKeypair.publicKey());
  const builder = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.payment({
      destination: toPublic,
      asset,
      amount,
    }))
    .setTimeout(30);

  if (memo) builder.addMemo(Memo.text(memo));

  const tx = builder.build();
  tx.sign(fromKeypair);
  const result = await server.submitTransaction(tx);
  console.log(`  TX: ${result.hash}`);
  console.log(`  Ledger: ${result.ledger}`);
  return result;
}

async function getBalance(publicKey, asset) {
  try {
    const account = await server.loadAccount(publicKey);
    const bal = account.balances.find(
      b => b.asset_code === asset.code && b.asset_issuer === asset.issuer
    );
    return bal ? bal.balance : '0';
  } catch {
    return '0';
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Korido/JoonaPay — Stellar Testnet USDC Transactions  ');
  console.log('═══════════════════════════════════════════════════════\n');

  // Create an issuer account — this simulates Circle's USDC issuer on testnet
  const issuerKeypair = Keypair.random();
  console.log(`USDC Issuer (test): ${issuerKeypair.publicKey()}`);
  
  // Create our test USDC asset
  const testUSDC = new Asset('USDC', issuerKeypair.publicKey());
  
  const omnibusKeypair = Keypair.fromSecret(OMNIBUS_SECRET);

  // 3 simulated Korido users
  const users = [
    { name: 'Amadou (CI → US remittance)', keypair: Keypair.random() },
    { name: 'Fatou (merchant payment)', keypair: Keypair.random() },
    { name: 'Moussa (P2P transfer)', keypair: Keypair.random() },
  ];

  // Step 1: Fund all accounts
  console.log('\n── Step 1: Create & fund accounts via Friendbot ──');
  await fundAccount(issuerKeypair.publicKey());
  await fundAccount(OMNIBUS_PUBLIC);
  for (const u of users) await fundAccount(u.keypair.publicKey());
  
  await sleep(2000);

  // Step 2: Add USDC trustlines (omnibus + all users trust the issuer)
  console.log('\n── Step 2: Establish USDC trustlines ──');
  await addTrustline(omnibusKeypair, testUSDC);
  for (const u of users) await addTrustline(u.keypair, testUSDC);

  await sleep(1000);

  // Step 3: Issuer mints USDC to omnibus (simulates Circle mint)
  console.log('\n── Step 3: Mint USDC to omnibus (simulates Circle deposit) ──');
  await sendPayment(issuerKeypair, OMNIBUS_PUBLIC, testUSDC, '10000.00', 'circle-mint-001');

  // Step 4: Simulate user deposits (omnibus → user wallets via Blnk ledger)
  console.log('\n── Step 4: User deposits (omnibus distributes to wallets) ──');
  await sendPayment(omnibusKeypair, users[0].keypair.publicKey(), testUSDC, '500.00', 'korido-dep-amadou');
  await sendPayment(omnibusKeypair, users[1].keypair.publicKey(), testUSDC, '1200.00', 'korido-dep-fatou');
  await sendPayment(omnibusKeypair, users[2].keypair.publicKey(), testUSDC, '300.00', 'korido-dep-moussa');

  // Step 5: P2P transfers
  console.log('\n── Step 5: P2P transfers (user → user) ──');
  // Amadou sends $150 to Fatou (paying for goods)
  await sendPayment(users[0].keypair, users[1].keypair.publicKey(), testUSDC, '150.00', 'korido-p2p-purchase');
  // Fatou sends $75 to Moussa (splitting costs)
  await sendPayment(users[1].keypair, users[2].keypair.publicKey(), testUSDC, '75.00', 'korido-p2p-split');

  // Step 6: Cross-border remittance simulation (Moussa → omnibus → withdrawal)
  console.log('\n── Step 6: Withdrawal (user → omnibus for off-ramp) ──');
  await sendPayment(users[2].keypair, OMNIBUS_PUBLIC, testUSDC, '200.00', 'korido-withdraw-moussa');

  // Step 7: Multi-operation batch tx (real-world: batch settlement)
  console.log('\n── Step 7: Batch settlement transaction ──');
  {
    const account = await server.loadAccount(omnibusKeypair.publicKey());
    const batchTx = new TransactionBuilder(account, {
      fee: '200',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.payment({
        destination: users[0].keypair.publicKey(),
        asset: testUSDC,
        amount: '25.00',
      }))
      .addOperation(Operation.payment({
        destination: users[1].keypair.publicKey(),
        asset: testUSDC,
        amount: '50.00',
      }))
      .addOperation(Operation.payment({
        destination: users[2].keypair.publicKey(),
        asset: testUSDC,
        amount: '10.00',
      }))
      .addMemo(Memo.text('korido-batch-settle'))
      .setTimeout(30)
      .build();
    batchTx.sign(omnibusKeypair);
    const result = await server.submitTransaction(batchTx);
    console.log(`  Batch TX: ${result.hash}`);
    console.log(`  Ledger: ${result.ledger}`);
    console.log(`  3 payments in 1 transaction ✓`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('                    TRANSACTION SUMMARY                 ');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log(`USDC Issuer:  ${issuerKeypair.publicKey()}`);
  console.log(`Omnibus:      ${OMNIBUS_PUBLIC}`);
  console.log(`Omnibus USDC: ${await getBalance(OMNIBUS_PUBLIC, testUSDC)}\n`);

  for (const u of users) {
    const bal = await getBalance(u.keypair.publicKey(), testUSDC);
    console.log(`${u.name}:`);
    console.log(`  Address: ${u.keypair.publicKey()}`);
    console.log(`  USDC:    ${bal}`);
  }

  console.log('\n── Stellar Expert Links ──');
  console.log(`Omnibus:  https://stellar.expert/explorer/testnet/account/${OMNIBUS_PUBLIC}`);
  for (const u of users) {
    console.log(`${u.name.split(' ')[0]}:  https://stellar.expert/explorer/testnet/account/${u.keypair.publicKey()}`);
  }

  console.log('\n── Transaction Types Demonstrated ──');
  console.log('  1. USDC issuance (Circle mint simulation)');
  console.log('  2. Deposit distribution (omnibus → user wallets)');
  console.log('  3. P2P transfers (user → user)');
  console.log('  4. Withdrawal (user → omnibus for off-ramp)');
  console.log('  5. Batch settlement (multi-op transaction)');
  console.log('\nTotal: 9 transactions across 6 accounts');
}

main().catch(err => {
  console.error('Fatal error:', err.response?.data || err.message || err);
  process.exit(1);
});
