import axios from 'axios';

const BASE_URL = 'http://localhost:3001/identify';

async function testIdentify(payload: any, stepName: string) {
    try {
        const response = await axios.post(BASE_URL, payload);
        console.log(`\n--- ${stepName} ---`);
        console.log('Payload:', payload);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error(`\n--- ${stepName} ERROR ---`);
        console.error(error.response?.data || error.message);
    }
}

async function runTests() {
    console.log('Starting integration tests...');

    // 1. Create first primary contact
    await testIdentify({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" }, "Test 1: Create First Primary");

    // 2. Create secondary contact (new email, same phone)
    await testIdentify({ email: "mcfly@hillvalley.edu", phoneNumber: "123456" }, "Test 2: Create Secondary (New Email)");

    // 3. New requests that should return the exact same cluster
    await testIdentify({ phoneNumber: "123456" }, "Test 3: Fetch By Phone Only");
    await testIdentify({ email: "lorraine@hillvalley.edu" }, "Test 4: Fetch By Old Email");
    await testIdentify({ email: "mcfly@hillvalley.edu" }, "Test 5: Fetch By New Email");

    // 4. Create another primary contact (different cluster)
    await testIdentify({ email: "george@hillvalley.edu", phoneNumber: "919191" }, "Test 6: Create Second Primary");

    // 5. Create a primary contact that will soon be merged
    await testIdentify({ email: "biffsucks@hillvalley.edu", phoneNumber: "717171" }, "Test 7: Create Third Primary");

    // 6. Merge the second and third clusters
    await testIdentify({ email: "george@hillvalley.edu", phoneNumber: "717171" }, "Test 8: Merge Clusters");

    console.log('\nAll tests executed.');
}

runTests();
