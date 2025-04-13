import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const API_URL = 'http://localhost:8080';

/**
 * Mock client for testing the Education First API endpoints
 */
async function runTests() {
  console.log('🧪 Starting API Tests');
  
  // Track test results
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  async function testEndpoint(name: string, testFn: () => Promise<boolean>) {
    results.total++;
    console.log(`\n🔍 Testing: ${name}`);
    
    try {
      const passed = await testFn();
      if (passed) {
        results.passed++;
        console.log(`✅ ${name}: PASSED`);
      } else {
        results.failed++;
        console.log(`❌ ${name}: FAILED`);
      }
    } catch (error) {
      results.failed++;
      console.error(`❌ ${name}: ERROR - ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data: ${JSON.stringify(error.response.data)}`);
      }
    }
  }

  // ======= Username Endpoint Tests =======
  await testEndpoint('Username - Create New User', async () => {
    const testUsername = `test_user_${Date.now()}`;
    const response = await axios.post(`${API_URL}/username`, {
      username: testUsername
    });
    
    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response Data: ${JSON.stringify(response.data)}`);
    
    return response.status === 200 || response.status === 201;
  });

  // ======= Classroom Endpoints Tests =======
  let testUsername = `test_user_${Date.now()}`;
  let testClassroomId = Date.now();

  // Register test user first
  await axios.post(`${API_URL}/username`, {
    username: testUsername
  });

  await testEndpoint('Create Classroom - Text Only', async () => {
    const formData = new FormData();
    formData.append('classroom_id', testClassroomId.toString());
    formData.append('username', testUsername);
    
    const response = await axios.post(`${API_URL}/create_classroom`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response Data: ${JSON.stringify(response.data)}`);
    
    return response.status === 201;
  });

  // Create a classroom with a PDF for further testing
  let testClassroomWithPdf = testClassroomId + 1;
  await testEndpoint('Create Classroom - With PDF', async () => {
    const formData = new FormData();
    formData.append('classroom_id', testClassroomWithPdf.toString());
    formData.append('username', testUsername);
    
    // Create a test PDF if needed
    const testPdfPath = path.join(__dirname, 'test_upload.pdf');
    if (!fs.existsSync(testPdfPath)) {
      // Create empty test file
      fs.writeFileSync(testPdfPath, '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 22 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000059 00000 n\n0000000118 00000 n\n0000000217 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n269\n%%EOF');
    }
    
    formData.append('books', fs.createReadStream(testPdfPath));
    
    try {
      const response = await axios.post(`${API_URL}/create_classroom`, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      
      console.log(`   Response Status: ${response.status}`);
      console.log(`   Response Data: ${JSON.stringify(response.data, null, 2)}`);
      
      return response.status === 201;
    } catch (error) {
      console.error(`   Error creating classroom with PDF: ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  });

  await testEndpoint('Join Classroom', async () => {
    const response = await axios.post(`${API_URL}/join_classroom`, {
      username: testUsername,
      classroom_id: testClassroomId
    });
    
    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response Data: ${JSON.stringify(response.data)}`);
    
    return response.status === 200;
  });

  await testEndpoint('Get Classrooms', async () => {
    const response = await axios.get(`${API_URL}/get_classrooms`, {
      data: {
        username: testUsername
      }
    });
    
    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response Data: ${JSON.stringify(response.data)}`);
    
    // Verify that our test classroom is in the list
    const classrooms = response.data.classrooms;
    const hasTestClassroom = Array.isArray(classrooms) && 
                             classrooms.some(c => c.classroom_id === testClassroomId);
    
    console.log(`   Found test classroom: ${hasTestClassroom}`);
    
    return response.status === 200 && hasTestClassroom;
  });

  // ======= AI Endpoint Test =======
  await testEndpoint('Ask AI', async () => {
    // Use the classroom with PDF for a meaningful AI response
    const response = await axios.get(`${API_URL}/ask_ai`, {
      data: {
        classroom_id: testClassroomWithPdf,
        prompt: "What's the main topic of this document?"
      }
    });
    
    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response Data (truncated):`, 
      typeof response.data.response === 'string' 
        ? response.data.response.substring(0, 100) + '...' 
        : response.data.response);
    
    return response.status === 200 && !!response.data.response;
  });

  // Summary
  console.log('\n===== Test Summary =====');
  console.log(`✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  
  return results.failed === 0;
}

// Run the tests
runTests()
  .then(success => {
    console.log(`\n${success ? '✅ All tests passed!' : '❌ Some tests failed.'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test execution error:', error);
    process.exit(1);
  });