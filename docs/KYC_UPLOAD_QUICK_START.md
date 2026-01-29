# KYC Document Upload - Quick Start Guide

## Overview
Upload identity documents for KYC verification using the JoonaPay API.

## Prerequisites
- Valid JWT token (from login/registration)
- Three image files: ID front, ID back, selfie
- Images must be JPEG, PNG, or WebP (max 5MB each)

## API Endpoint

### Upload Documents
```
POST /api/v1/kyc/documents
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

## Quick Test with cURL

```bash
# Set your token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Upload documents
curl -X POST http://localhost:3000/api/v1/kyc/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "idFront=@./id_front.jpg" \
  -F "idBack=@./id_back.jpg" \
  -F "selfie=@./selfie.jpg"
```

## Response Example

```json
{
  "message": "Documents uploaded successfully",
  "documents": {
    "idFront": {
      "key": "kyc/user-123/id_front-1706198400000.jpg",
      "url": "https://s3.amazonaws.com/...",
      "size": 245678
    },
    "idBack": {
      "key": "kyc/user-123/id_back-1706198400000.jpg",
      "url": "https://s3.amazonaws.com/...",
      "size": 234567
    },
    "selfie": {
      "key": "kyc/user-123/selfie-1706198400000.jpg",
      "url": "https://s3.amazonaws.com/...",
      "size": 123456
    }
  }
}
```

## Complete KYC Flow

### 1. Upload Documents
```bash
POST /api/v1/kyc/documents
# Returns: document keys
```

### 2. Submit KYC
```bash
POST /api/v1/kyc/submit
Body: {
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "country": "CI",
  "idType": "national_id",
  "idNumber": "CI123456789",
  "idExpiryDate": "2030-01-01",
  "idFrontKey": "kyc/user-123/id_front-1706198400000.jpg",
  "idBackKey": "kyc/user-123/id_back-1706198400000.jpg",
  "selfieKey": "kyc/user-123/selfie-1706198400000.jpg"
}
```

### 3. Check Status
```bash
GET /api/v1/kyc/status
# Returns: { status: "approved", score: 92, ... }
```

## Frontend Integration (React Example)

```typescript
import axios from 'axios';

const uploadKycDocuments = async (
  idFront: File,
  idBack: File,
  selfie: File,
  token: string
) => {
  const formData = new FormData();
  formData.append('idFront', idFront);
  formData.append('idBack', idBack);
  formData.append('selfie', selfie);

  try {
    const response = await axios.post(
      'http://localhost:3000/api/v1/kyc/documents',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};

// Usage in component
const handleUpload = async (files) => {
  const result = await uploadKycDocuments(
    files.idFront,
    files.idBack,
    files.selfie,
    userToken
  );

  console.log('Upload successful:', result);

  // Now submit KYC with the returned keys
  await submitKyc({
    ...personalInfo,
    idFrontKey: result.documents.idFront.key,
    idBackKey: result.documents.idBack.key,
    selfieKey: result.documents.selfie.key,
  });
};
```

## Error Handling

### 400 - Bad Request
```json
{
  "statusCode": 400,
  "message": "All documents required: idFront, idBack, selfie",
  "error": "Bad Request"
}
```

**Common Causes:**
- Missing one or more documents
- File too large (> 5MB)
- Invalid file type (not JPEG/PNG/WebP)

### 401 - Unauthorized
```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

**Solution:** Login again to get a new token

### 500 - Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

**Possible Causes:**
- S3 upload failure
- AWS credentials not configured
- Network issues

## Configuration

### Environment Variables
```bash
# Required for production
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=joonapay-kyc-documents
```

### Local Development
For local development without AWS:
1. Set up LocalStack or Minio for S3 emulation
2. Or configure AWS credentials for a sandbox account

## Testing

### Run Unit Tests
```bash
npm test -- kyc-upload.controller.spec.ts
```

### Manual Testing
```bash
# Create test files
convert -size 800x600 xc:white test_id_front.jpg
convert -size 800x600 xc:blue test_id_back.jpg
convert -size 800x600 xc:red test_selfie.jpg

# Upload
curl -X POST http://localhost:3000/api/v1/kyc/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "idFront=@test_id_front.jpg" \
  -F "idBack=@test_id_back.jpg" \
  -F "selfie=@test_selfie.jpg"
```

## Performance Tips

1. **Compress images before upload** - Reduces upload time
2. **Show upload progress** - Better UX for users
3. **Validate files client-side** - Catch errors early
4. **Retry failed uploads** - Handle network issues

## Security Notes

1. **Never store documents locally** - Delete after upload
2. **Use HTTPS in production** - Encrypt data in transit
3. **Validate JWT on every request** - Prevent unauthorized access
4. **Monitor for abuse** - Rate limiting applied

## Support

- **API Documentation**: http://localhost:3000/api/docs
- **Test Swagger UI**: http://localhost:3000/api/docs
- **GitHub Issues**: https://github.com/joonapay/issues

## Related Endpoints

- `POST /api/v1/kyc/submit` - Submit KYC for verification
- `GET /api/v1/kyc/status` - Check verification status
- `POST /api/v1/admin/kyc/{id}/review` - Admin review (admin only)
