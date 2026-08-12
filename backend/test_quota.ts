import { QuotaGovernor } from './src/services/QuotaGovernor';

async function testQuota() {
  const gov = new QuotaGovernor();
  const provider = 'test_provider_' + Date.now();
  const limit = 5;

  let successCount = 0;
  let failCount = 0;

  const promises = [];
  for (let i = 0; i < 20; i++) {
    promises.push(
      gov.acquireToken(provider, limit).then(res => {
        if (res) successCount++;
        else failCount++;
      })
    );
  }

  await Promise.all(promises);

  console.log(`Success: ${successCount}, Fail: ${failCount}`);
  if (successCount === limit) {
    console.log("CONCURRENCY TEST PASSED");
  } else {
    console.log("CONCURRENCY TEST FAILED");
  }
  process.exit(0);
}

testQuota();
