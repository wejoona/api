import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import encoding from 'k6/encoding';

// Custom metrics
const kycSubmissionSuccessRate = new Rate('kyc_submission_success');
const kycSubmissionDuration = new Trend('kyc_submission_duration');
const documentUploadSuccessRate = new Rate('document_upload_success');
const documentUploadDuration = new Trend('document_upload_duration');
const kycStatusCheckSuccessRate = new Rate('kyc_status_check_success');
const kycErrors = new Counter('kyc_errors');
const uploadSizeBytes = new Trend('upload_size_bytes');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api-dev.joonapay.com';

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    // KYC operations are heavier, so we allow more time
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.02'],

    kyc_submission_success: ['rate>0.98'],
    kyc_submission_duration: ['p(95)<1500'],
    document_upload_success: ['rate>0.95'], // Lower threshold due to file size/network
    document_upload_duration: ['p(95)<5000', 'p(99)<10000'],
    kyc_status_check_success: ['rate>0.99'],
  },
};

// Mock document data (base64 encoded small images)
const MOCK_DOCUMENT_FRONT = generateMockImage(800, 600); // ~100KB
const MOCK_DOCUMENT_BACK = generateMockImage(800, 600);
const MOCK_SELFIE = generateMockImage(640, 480); // ~80KB

function generateMockImage(width, height) {
  // Generate a simple base64 encoded PNG-like data
  // In production, this would be actual image data
  const dataSize = Math.floor(width * height * 0.15); // Approximate compressed size
  const randomData = new Array(dataSize)
    .fill(0)
    .map(() => String.fromCharCode(Math.floor(Math.random() * 256)))
    .join('');

  return encoding.b64encode(randomData);
}

// Setup: Create authenticated users
export function setup() {
  const users = [];
  const numUsers = 100;

  console.log(`Setting up ${numUsers} users for KYC testing...`);

  const firstNames = ['Amadou', 'Fatou', 'Moussa', 'Aissata', 'Ibrahim', 'Mariama', 'Ousmane', 'Fatoumata'];
  const lastNames = ['Diallo', 'Traore', 'Kone', 'Coulibaly', 'Toure', 'Diop', 'Sow', 'Kane'];

  for (let i = 0; i < numUsers; i++) {
    const phone = `+225${String(30000000 + i).padStart(8, '0')}`;
    const tokens = authenticateUser(phone);

    if (tokens) {
      users.push({
        phone: phone,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[i % lastNames.length],
      });
    }

    sleep(0.1);
  }

  console.log(`Setup complete: ${users.length} users ready for KYC`);
  return { users };
}

function authenticateUser(phone) {
  const registerPayload = JSON.stringify({
    phone: phone,
    countryCode: 'CI',
  });

  const registerResponse = http.post(
    `${BASE_URL}/auth/register`,
    registerPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (registerResponse.status !== 200 && registerResponse.status !== 201) {
    return null;
  }

  const verifyPayload = JSON.stringify({
    phone: phone,
    otp: '123456',
  });

  const verifyResponse = http.post(
    `${BASE_URL}/auth/verify-otp`,
    verifyPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (verifyResponse.status === 200) {
    try {
      const body = JSON.parse(verifyResponse.body);
      return {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      };
    } catch (e) {
      return null;
    }
  }

  return null;
}

export default function (data) {
  if (!data.users || data.users.length === 0) {
    console.error('No users available for testing');
    return;
  }

  const user = data.users[__VU % data.users.length];
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.accessToken}`,
    },
  };

  // KYC Flow
  group('KYC Verification Flow', () => {
    // Step 1: Check current KYC status
    group('01. Check KYC Status', () => {
      const response = http.get(`${BASE_URL}/kyc/status`, {
        ...params,
        tags: { name: 'CheckKYCStatus' },
      });

      const success = check(response, {
        'status check is 200': (r) => r.status === 200,
        'status has required fields': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.status !== undefined && body.tier !== undefined;
          } catch (e) {
            return false;
          }
        },
      });

      kycStatusCheckSuccessRate.add(success);

      if (!success) {
        kycErrors.add(1);
      }
    });

    sleep(1);

    // Step 2: Submit KYC information
    let kycId = null;
    group('02. Submit KYC Information', () => {
      const documentTypes = ['national_id', 'passport', 'driver_license'];
      const documentType = documentTypes[Math.floor(Math.random() * documentTypes.length)];

      const payload = JSON.stringify({
        firstName: user.firstName,
        lastName: user.lastName,
        dateOfBirth: `19${80 + Math.floor(Math.random() * 20)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        documentType: documentType,
        documentNumber: `${documentType.toUpperCase()}${Math.floor(Math.random() * 1000000)}`,
        nationality: 'CI',
        address: {
          street: 'Rue de la République',
          city: 'Abidjan',
          postalCode: '00225',
          country: 'CI',
        },
      });

      const startTime = new Date().getTime();
      const response = http.post(`${BASE_URL}/kyc/submit`, payload, {
        ...params,
        tags: { name: 'SubmitKYC' },
      });
      const duration = new Date().getTime() - startTime;

      kycSubmissionDuration.add(duration);

      const success = check(response, {
        'submission status is 200 or 201': (r) => [200, 201].includes(r.status),
        'submission has kycId': (r) => {
          try {
            return JSON.parse(r.body).kycId !== undefined;
          } catch (e) {
            return false;
          }
        },
        'submission response time < 1500ms': () => duration < 1500,
      });

      kycSubmissionSuccessRate.add(success);

      if (!success) {
        kycErrors.add(1);
        console.error(`KYC submission failed: ${response.status} - ${response.body}`);
      } else {
        try {
          kycId = JSON.parse(response.body).kycId;
        } catch (e) {
          kycErrors.add(1);
        }
      }
    });

    sleep(2);

    // Step 3: Upload documents
    if (kycId) {
      group('03. Upload KYC Documents', () => {
        // Create multipart form data
        const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;

        const documents = [
          { name: 'idFront', data: MOCK_DOCUMENT_FRONT },
          { name: 'idBack', data: MOCK_DOCUMENT_BACK },
          { name: 'selfie', data: MOCK_SELFIE },
        ];

        let formData = '';
        let totalSize = 0;

        documents.forEach(doc => {
          const fileSize = doc.data.length;
          totalSize += fileSize;

          formData += `--${boundary}\r\n`;
          formData += `Content-Disposition: form-data; name="${doc.name}"; filename="${doc.name}.jpg"\r\n`;
          formData += `Content-Type: image/jpeg\r\n\r\n`;
          formData += `${doc.data}\r\n`;
        });

        formData += `--${boundary}--\r\n`;

        uploadSizeBytes.add(totalSize);

        const uploadParams = {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Authorization': `Bearer ${user.accessToken}`,
          },
          tags: { name: 'UploadKYCDocuments' },
        };

        const startTime = new Date().getTime();
        const response = http.post(
          `${BASE_URL}/kyc/documents`,
          formData,
          uploadParams
        );
        const duration = new Date().getTime() - startTime;

        documentUploadDuration.add(duration);

        const success = check(response, {
          'upload status is 200 or 201': (r) => [200, 201].includes(r.status),
          'upload confirmed': (r) => {
            try {
              return JSON.parse(r.body).uploaded === true;
            } catch (e) {
              return false;
            }
          },
          'upload completed within timeout': () => duration < 10000,
        });

        documentUploadSuccessRate.add(success);

        if (!success) {
          kycErrors.add(1);
          console.error(`Document upload failed: ${response.status}`);
        }
      });

      sleep(3);
    }

    // Step 4: Poll KYC status (simulate checking for approval)
    group('04. Poll KYC Status', () => {
      const maxPolls = 3;
      let pollCount = 0;

      while (pollCount < maxPolls) {
        const response = http.get(`${BASE_URL}/kyc/status`, {
          ...params,
          tags: { name: 'PollKYCStatus' },
        });

        check(response, {
          'poll status is 200': (r) => r.status === 200,
        });

        try {
          const body = JSON.parse(response.body);
          if (body.status === 'approved' || body.status === 'rejected') {
            break; // Exit polling if final status reached
          }
        } catch (e) {
          // Continue polling
        }

        pollCount++;
        sleep(2);
      }
    });
  });

  // Random think time before next iteration
  sleep(Math.random() * 10 + 5); // 5-15s
}

export function handleSummary(data) {
  const metrics = data.metrics;

  console.log('\n=== KYC Load Test Summary ===');
  console.log(`KYC Submission Success: ${(metrics.kyc_submission_success?.values.rate * 100).toFixed(2)}%`);
  console.log(`KYC Submission P95: ${metrics.kyc_submission_duration?.values['p(95)'].toFixed(2)}ms`);
  console.log(`Document Upload Success: ${(metrics.document_upload_success?.values.rate * 100).toFixed(2)}%`);
  console.log(`Document Upload P95: ${metrics.document_upload_duration?.values['p(95)'].toFixed(2)}ms`);
  console.log(`Average Upload Size: ${(metrics.upload_size_bytes?.values.avg / 1024).toFixed(2)} KB`);
  console.log(`Status Check Success: ${(metrics.kyc_status_check_success?.values.rate * 100).toFixed(2)}%`);
  console.log(`Total KYC Errors: ${metrics.kyc_errors?.values.count}`);

  return {
    'load-tests/reports/kyc-load-test.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'load-tests/reports/kyc-load-test.json': JSON.stringify(data),
  };
}
