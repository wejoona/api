# GraphQL Quick Reference

Quick reference for common GraphQL operations in JoonaPay.

## Authentication

All GraphQL requests require JWT authentication:

```http
POST /graphql
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Common Queries

### Get Current User
```graphql
{ me { id displayName phone wallet { balance currency } } }
```

### Get My Wallet
```graphql
{ myWallet { id balance currency depositAddress } }
```

### Get My Transactions
```graphql
{ myTransactions(limit: 20) { id type amount status createdAt } }
```

### Get My Beneficiaries
```graphql
{ myBeneficiaries { id name accountType isFavorite } }
```

### Search User
```graphql
{ userByPhone(phone: "+225...") { id displayName } }
```

## Common Mutations

### Update Profile
```graphql
mutation {
  updateProfile(firstName: "John", lastName: "Doe") {
    id fullName
  }
}
```

### Set Username
```graphql
mutation {
  setUsername(username: "johndoe") {
    id username displayName
  }
}
```

### Toggle Favorite
```graphql
mutation {
  toggleBeneficiaryFavorite(beneficiaryId: "uuid") {
    id isFavorite
  }
}
```

## Field Selection

Only request fields you need:

```graphql
# Good - minimal fields
{ me { id displayName } }

# Bad - over-fetching
{ me { id phone username firstName lastName email countryCode ... } }
```

## Pagination

Always paginate large lists:

```graphql
{
  myTransactions(limit: 20, offset: 0) {
    id type amount
  }
}
```

## Nested Relations

Efficiently fetch related data:

```graphql
{
  me {
    id
    displayName
    wallet {
      balance
      transactions {
        id
        amount
        recipientWallet {
          user {
            displayName
          }
        }
      }
    }
  }
}
```

## Error Handling

GraphQL errors are returned in the `errors` array:

```json
{
  "data": null,
  "errors": [
    {
      "message": "Unauthorized",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

## Variables

Use variables for dynamic values:

```graphql
query GetUser($phone: String!) {
  userByPhone(phone: $phone) {
    id
    displayName
  }
}
```

```json
{
  "phone": "+2250123456789"
}
```

## Fragments

Reuse field selections:

```graphql
fragment UserBasic on UserModel {
  id
  displayName
  phone
}

query {
  me {
    ...UserBasic
  }
  userByPhone(phone: "+225...") {
    ...UserBasic
  }
}
```

## Aliases

Query same field with different arguments:

```graphql
{
  recent: myTransactions(limit: 10) { id amount }
  older: myTransactions(limit: 10, offset: 10) { id amount }
}
```

## Performance Tips

1. **Batch requests**: Combine multiple queries in one request
2. **Use fragments**: Reduce duplication
3. **Select only needed fields**: Avoid over-fetching
4. **Paginate**: Don't fetch all results at once
5. **Avoid deep nesting**: Limit query depth to 5-7 levels

## Debugging

### Enable detailed errors (development only)

GraphQL Playground shows detailed errors in development.

### Check DataLoader batching

Enable logging to verify DataLoader is batching:

```typescript
const loader = new DataLoader(batchFn, {
  cache: true,
  batchScheduleFn: (callback) => {
    console.log('Batching...');
    setTimeout(callback, 10);
  },
});
```

### Monitor queries

Use Apollo Studio or custom logging to monitor query performance.

## Mobile Integration

### Flutter Example

```dart
const String query = r'''
  query GetCurrentUser {
    me {
      id
      displayName
      wallet { balance }
    }
  }
''';

final result = await client.query(QueryOptions(
  document: gql(query),
));

final user = result.data?['me'];
```

### React Example

```typescript
const { data, loading, error } = useQuery(gql`
  query GetCurrentUser {
    me {
      id
      displayName
      wallet { balance }
    }
  }
`);
```

## Testing

### cURL Example

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ me { id displayName } }"}'
```

### Postman Example

```
POST http://localhost:3000/graphql
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body (GraphQL):
  query { me { id displayName } }
```

## Best Practices

1. ✅ Always use authentication
2. ✅ Request only needed fields
3. ✅ Use pagination for lists
4. ✅ Handle errors gracefully
5. ✅ Use variables instead of string concatenation
6. ✅ Implement proper loading states
7. ✅ Cache results when appropriate
8. ❌ Don't over-fetch data
9. ❌ Don't fetch deeply nested relations unnecessarily
10. ❌ Don't concatenate query strings (use variables)

## Common Error Codes

- `UNAUTHENTICATED`: Missing or invalid JWT token
- `FORBIDDEN`: User doesn't have permission
- `BAD_USER_INPUT`: Invalid input data
- `INTERNAL_SERVER_ERROR`: Server error
- `NOT_FOUND`: Resource not found

## Support

- GraphQL Playground: http://localhost:3000/graphql (dev only)
- Schema Documentation: Available in GraphQL Playground
- Example Queries: See EXAMPLE_QUERIES.graphql
- Integration Guide: See INTEGRATION_GUIDE.md

## Resources

- [Example Queries](./EXAMPLE_QUERIES.graphql)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [GraphQL Spec](https://spec.graphql.org/)
- [Apollo Client Docs](https://www.apollographql.com/docs/react/)
