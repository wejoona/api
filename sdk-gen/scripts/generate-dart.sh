#!/bin/bash

################################################################################
# Generate Dart SDK Script
#
# Generates Dart/Dio SDK from OpenAPI specification
# Output: output/dart/
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SDK_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$SDK_ROOT/output/dart"
CONFIG_FILE="$SDK_ROOT/configs/dart.yaml"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Dart SDK Generator${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Clean previous output
if [ -d "$OUTPUT_DIR" ]; then
    echo -e "${YELLOW}Cleaning previous output...${NC}"
    rm -rf "$OUTPUT_DIR"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}Generating Dart SDK...${NC}"
echo ""

# Generate SDK using OpenAPI Generator
npx @openapitools/openapi-generator-cli generate \
    -i http://localhost:3000/docs-json \
    -g dart-dio \
    -o "$OUTPUT_DIR" \
    -c "$CONFIG_FILE" \
    --additional-properties=pubName=joonapay_sdk,pubVersion=1.0.0,nullSafe=true,useEnumExtension=true

echo ""
echo -e "${GREEN}✓ Dart SDK generated${NC}"
echo ""

# Post-generation steps
echo -e "${YELLOW}Running post-generation steps...${NC}"

# Create enhanced README
cat > "$OUTPUT_DIR/README.md" <<EOF
# JoonaPay Dart SDK

Dart/Flutter client library for the JoonaPay USDC Wallet API.

## Installation

Add to your \`pubspec.yaml\`:

\`\`\`yaml
dependencies:
  joonapay_sdk: ^1.0.0
\`\`\`

Or for local development:

\`\`\`yaml
dependencies:
  joonapay_sdk:
    path: ../usdc-wallet/sdk-gen/output/dart
\`\`\`

Then run:

\`\`\`bash
flutter pub get
\`\`\`

## Quick Start

\`\`\`dart
import 'package:joonapay_sdk/joonapay_sdk.dart';
import 'package:dio/dio.dart';

void main() async {
  // Configure the API client
  final dio = Dio(BaseOptions(
    baseUrl: 'https://api.joonapay.com/api/v1',
  ));

  final joonapay = JoonapaySdk(dio: dio);

  // Example: Login
  final loginResponse = await joonapay.getAuthApi().login(
    LoginRequest(phoneNumber: '+2250701234567'),
  );

  print('OTP sent to: \${loginResponse.phoneNumber}');

  // Example: Verify OTP and get token
  final verifyResponse = await joonapay.getAuthApi().verifyOtp(
    VerifyOtpRequest(
      phoneNumber: '+2250701234567',
      otp: '123456',
    ),
  );

  final accessToken = verifyResponse.accessToken;

  // Configure authenticated client
  final authDio = Dio(BaseOptions(
    baseUrl: 'https://api.joonapay.com/api/v1',
    headers: {
      'Authorization': 'Bearer \$accessToken',
    },
  ));

  final authJoonapay = JoonapaySdk(dio: authDio);

  // Example: Get wallet balance
  final balance = await authJoonapay.getWalletApi().getWalletBalance();
  print('Balance: \${balance.balance} USD');
}
\`\`\`

## Authentication

Most endpoints require authentication via JWT Bearer token:

\`\`\`dart
import 'package:dio/dio.dart';
import 'package:joonapay_sdk/joonapay_sdk.dart';

class JoonaPay {
  late Dio _dio;
  late JoonapaySdk _sdk;
  String? _accessToken;

  JoonaPay({String baseUrl = 'https://api.joonapay.com/api/v1'}) {
    _dio = Dio(BaseOptions(baseUrl: baseUrl));
    _sdk = JoonapaySdk(dio: _dio);

    // Add interceptor to automatically add auth token
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_accessToken != null) {
            options.headers['Authorization'] = 'Bearer \$_accessToken';
          }
          return handler.next(options);
        },
      ),
    );
  }

  Future<void> login(String phoneNumber) async {
    final response = await _sdk.getAuthApi().login(
      LoginRequest(phoneNumber: phoneNumber),
    );
    // OTP sent
  }

  Future<void> verifyOtp(String phoneNumber, String otp) async {
    final response = await _sdk.getAuthApi().verifyOtp(
      VerifyOtpRequest(phoneNumber: phoneNumber, otp: otp),
    );
    _accessToken = response.accessToken;
  }

  Future<Wallet> getWallet() async {
    return await _sdk.getWalletApi().getWalletBalance();
  }
}
\`\`\`

## Available APIs

- \`AuthApi\` - Authentication and user registration
- \`UserApi\` - User profile management
- \`WalletApi\` - Wallet operations
- \`TransfersApi\` - Internal and external transfers
- \`TransactionsApi\` - Transaction history
- \`BeneficiariesApi\` - Saved beneficiaries
- \`KycApi\` - KYC verification
- \`SessionsApi\` - Session management
- \`DevicesApi\` - Device management
- \`FeatureFlagsApi\` - Feature flags
- \`BillPaymentsApi\` - Bill payments
- \`MerchantsApi\` - Merchant operations
- \`PaymentLinksApi\` - Payment links
- \`HealthApi\` - Health checks

## Error Handling

\`\`\`dart
import 'package:dio/dio.dart';

try {
  final balance = await joonapay.getWalletApi().getWalletBalance();
} on DioException catch (e) {
  if (e.response != null) {
    print('API Error: \${e.response?.data}');
    print('Status: \${e.response?.statusCode}');
  } else {
    print('Network Error: \${e.message}');
  }
} catch (e) {
  print('Unexpected error: \$e');
}
\`\`\`

## Request Interceptors

\`\`\`dart
import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

final dio = Dio(BaseOptions(
  baseUrl: 'https://api.joonapay.com/api/v1',
));

// Add request ID for tracking
dio.interceptors.add(
  InterceptorsWrapper(
    onRequest: (options, handler) {
      options.headers['X-Request-ID'] = Uuid().v4();
      return handler.next(options);
    },
    onResponse: (response, handler) {
      print('Response: \${response.statusCode}');
      return handler.next(response);
    },
    onError: (error, handler) {
      print('Error: \${error.message}');
      return handler.next(error);
    },
  ),
);
\`\`\`

## Retry Logic

\`\`\`dart
import 'package:dio/dio.dart';

// Add retry interceptor for failed requests
dio.interceptors.add(
  InterceptorsWrapper(
    onError: (error, handler) async {
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout) {
        // Retry the request
        try {
          final response = await dio.fetch(error.requestOptions);
          return handler.resolve(response);
        } catch (e) {
          return handler.next(error);
        }
      }
      return handler.next(error);
    },
  ),
);
\`\`\`

## Null Safety

This SDK is null-safe and requires Dart SDK >= 2.12.0:

\`\`\`dart
final wallet = await joonapay.getWalletApi().getWalletBalance();
print('Balance: \${wallet.balance}'); // Non-nullable
print('KYC Status: \${wallet.kycStatus ?? 'unknown'}'); // Nullable
\`\`\`

## Flutter Integration Example

\`\`\`dart
import 'package:flutter/material.dart';
import 'package:joonapay_sdk/joonapay_sdk.dart';
import 'package:dio/dio.dart';

class WalletScreen extends StatefulWidget {
  @override
  _WalletScreenState createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final JoonapaySdk _sdk = JoonapaySdk(
    dio: Dio(BaseOptions(
      baseUrl: 'https://api.joonapay.com/api/v1',
    )),
  );

  Wallet? _wallet;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadWallet();
  }

  Future<void> _loadWallet() async {
    try {
      final wallet = await _sdk.getWalletApi().getWalletBalance();
      setState(() {
        _wallet = wallet;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading wallet: \$e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Center(child: CircularProgressIndicator());
    }

    return Scaffold(
      appBar: AppBar(title: Text('Wallet')),
      body: Center(
        child: Text('Balance: \${_wallet?.balance ?? 0} USD'),
      ),
    );
  }
}
\`\`\`

## Documentation

- [API Documentation](https://docs.joonapay.com)
- [OpenAPI Spec](https://api.joonapay.com/docs)

## Support

Email: support@joonapay.com

## License

MIT
EOF

echo -e "${GREEN}✓ Post-generation steps completed${NC}"
echo ""

# Display summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Dart SDK Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Output: ${GREEN}$OUTPUT_DIR${NC}"
echo -e "Package: ${GREEN}joonapay_sdk${NC}"
echo -e "Version: ${GREEN}1.0.0${NC}"
echo ""
echo "Next steps:"
echo "  1. cd $OUTPUT_DIR"
echo "  2. flutter pub get"
echo "  3. flutter analyze"
echo "  4. flutter pub publish"
echo ""
