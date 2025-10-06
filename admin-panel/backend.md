# HuğLu Outdoor API Documentation

**Version:** 1.0  
**Base URL:** `http://[SERVER_IP]:3000/api`  
**Last Updated:** October 2025

---

## Table of Contents

- [Authentication](#authentication)
- [Core Endpoints](#core-endpoints)
- [User Management](#user-management)
- [Product Management](#product-management)
- [Cart Management](#cart-management)
- [Order Management](#order-management)
- [Wallet Management](#wallet-management)
- [Payment](#payment-iyzico)
- [Categories & Brands](#categories--brands)
- [Reviews](#reviews)
- [User Addresses](#user-addresses)
- [Custom Production](#custom-production)
- [Campaigns & Discounts](#campaigns--discounts)
- [User Level System](#user-level-system)
- [Referral System](#referral-system)
- [Chatbot](#chatbot)
- [Admin Endpoints](#admin-endpoints)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication

### API Key Authentication
All API requests require an API key in the header:

```http
X-API-Key: huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f
```

### Admin Authentication
Admin endpoints require a Bearer token:

```http
Authorization: Bearer huglu-admin-token-2025
```

---

## Core Endpoints

### Health Check
Check server status and database connectivity.

**Endpoint:** `GET /health`

**Headers:** None required

**Response:**
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2025-10-06T12:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640
  },
  "database": "connected"
}
```

---

## User Management

### Register User
Create a new user account.

**Endpoint:** `POST /users`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  "password": "securepass123",
  "phone": "05301234567",
  "birthDate": "1990-01-15",
  "address": "İstanbul, Türkiye",
  "gender": "male",
  "privacyAccepted": true,
  "termsAccepted": true,
  "marketingEmail": true,
  "marketingSms": false,
  "marketingPhone": false
}
```

**Validation:**
- `name`: Required, string
- `email`: Required, valid email format
- `password`: Required, minimum 6 characters
- `phone`: Required, string
- `birthDate`: Required, valid date
- `privacyAccepted`: Required, must be true
- `termsAccepted`: Required, must be true

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 123,
    "user_id": "12345678"
  },
  "message": "User created successfully"
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

---

### Login
Authenticate user and retrieve profile.

**Endpoint:** `POST /users/login`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "email": "ahmet@example.com",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "Ahmet Yılmaz",
    "email": "ahmet@example.com",
    "phone": "05301234567",
    "address": "İstanbul, Türkiye",
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "message": "Login successful"
}
```

---

### Google OAuth Login
Verify Google ID token and login/register user.

**Endpoint:** `POST /auth/google/verify`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "idToken": "google-id-token-here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 123,
    "tenantId": 1,
    "role": "user",
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    }
  }
}
```

---

### Get User Profile
Retrieve user information.

**Endpoint:** `GET /users/:id`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "Ahmet Yılmaz",
    "email": "ahmet@example.com",
    "phone": "05301234567",
    "birthDate": "1990-01-15",
    "address": "İstanbul, Türkiye",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### Update User Profile
Update user information.

**Endpoint:** `PUT /users/:userId/profile`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  "phone": "05301234567",
  "address": "İstanbul, Kadıköy"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profil başarıyla güncellendi"
}
```

---

### Change Password
Update user password.

**Endpoint:** `PUT /users/:userId/password`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "currentPassword": "oldpass",
  "newPassword": "newpass123"
}
```

**Validation:**
- `newPassword`: Minimum 6 characters

**Response:**
```json
{
  "success": true,
  "message": "Şifre başarıyla değiştirildi"
}
```

---

### Get Account Summary
Get user account overview with wallet and stats.

**Endpoint:** `GET /users/:userId/account-summary`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "name": "Ahmet Yılmaz",
      "email": "ahmet@example.com",
      "phone": "05301234567",
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    "wallet": {
      "balance": 150.00,
      "currency": "TRY"
    },
    "counts": {
      "orders": 5,
      "favorites": 12
    },
    "generatedAt": "2025-10-06T12:00:00.000Z"
  }
}
```

---

### Get Homepage Products
Get personalized homepage product recommendations.

**Endpoint:** `GET /users/:userId/homepage-products`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "popular": [
      {
        "id": 456,
        "name": "Kamp Çadırı",
        "price": 1299.90,
        "image": "https://...",
        "brand": "HuğLu",
        "category": "Kamp Malzemeleri",
        "rating": 4.5,
        "reviewCount": 23
      }
    ],
    "newProducts": [...],
    "polar": [...],
    "generatedAt": "2025-10-06T12:00:00.000Z"
  }
}
```

---

### Search Users (for Transfer)
Search users for wallet transfers.

**Endpoint:** `GET /users/search?query=ahmet&excludeUserId=123`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Query Parameters:**
- `query`: Search term (min 2 characters)
- `excludeUserId`: User ID to exclude from results

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "name": "Ahmet Veli",
      "email": "ahmet.veli@example.com",
      "user_id": "87654321"
    }
  ]
}
```

---

## Product Management

### Get Products (Paginated)
Retrieve products with pagination and caching.

**Endpoint:** `GET /products?page=1&limit=20`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 200)
- `language`: Language code (default: 'tr')

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 456,
        "name": "Kamp Çadırı",
        "price": 1299.90,
        "image": "https://cdn.example.com/cadır.jpg",
        "brand": "HuğLu",
        "category": "Kamp Malzemeleri",
        "lastUpdated": "2025-10-01T10:00:00.000Z",
        "rating": 4.5,
        "reviewCount": 23,
        "stock": 50,
        "sku": "CAMP-001"
      }
    ],
    "total": 150,
    "hasMore": true
  }
}
```

**Cache Headers:**
```http
Cache-Control: public, max-age=60
```

---

### Search Products
Search products by keyword with FULLTEXT support.

**Endpoint:** `GET /products/search?q=çadır&page=1&limit=20`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Query Parameters:**
- `q`: Search query (min 2 characters)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 200)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "name": "4 Kişilik Kamp Çadırı",
      "price": 1299.90,
      "image": "https://...",
      "brand": "HuğLu",
      "category": "Kamp Malzemeleri"
    }
  ],
  "page": 1,
  "limit": 20,
  "count": 5
}
```

**Note:** Search includes product name, description, brand, SKU, externalId, and variation SKUs.

---

### Get Product by ID
Get detailed product information.

**Endpoint:** `GET /products/:id`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 456,
    "name": "Kamp Çadırı",
    "description": "4 kişilik su geçirmez çadır. Alüminyum direkli, çift katlı.",
    "price": 1299.90,
    "taxRate": 20.00,
    "priceIncludesTax": true,
    "image": "https://...",
    "images": ["https://...", "https://..."],
    "brand": "HuğLu",
    "category": "Kamp Malzemeleri",
    "stock": 50,
    "sku": "CAMP-001",
    "rating": 4.5,
    "reviewCount": 23,
    "hasVariations": true,
    "lastUpdated": "2025-10-01T10:00:00.000Z"
  }
}
```

---

### Get Products by Category
Filter products by category.

**Endpoint:** `GET /products/category/:category?page=1&limit=40`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [...],
    "total": 75,
    "hasMore": true
  }
}
```

---

### Get Product Variations
Get available variations for a product.

**Endpoint:** `GET /products/:productId/variations`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "productId": 456,
      "name": "Beden",
      "displayOrder": 1,
      "options": [
        {
          "id": 10,
          "variationId": 1,
          "value": "4 Kişilik",
          "priceModifier": 0,
          "stock": 20,
          "sku": "CAMP-001-4P",
          "image": "https://...",
          "isActive": true
        },
        {
          "id": 11,
          "variationId": 1,
          "value": "6 Kişilik",
          "priceModifier": 300,
          "stock": 15,
          "sku": "CAMP-001-6P",
          "image": null,
          "isActive": true
        }
      ]
    },
    {
      "id": 2,
      "productId": 456,
      "name": "Renk",
      "displayOrder": 2,
      "options": [
        {
          "id": 20,
          "variationId": 2,
          "value": "Yeşil",
          "priceModifier": 0,
          "stock": 30,
          "isActive": true
        }
      ]
    }
  ]
}
```

---

### Filter Products
Advanced product filtering.

**Endpoint:** `POST /products/filter`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "category": "Kamp Malzemeleri",
  "minPrice": 100,
  "maxPrice": 2000,
  "brand": "HuğLu",
  "search": "çadır"
}
```

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

---

### Get Price Range
Get min/max price range for all products.

**Endpoint:** `GET /products/price-range`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "min": 49.90,
    "max": 5999.00
  }
}
```

**Cache Headers:**
```http
Cache-Control: public, max-age=120
```

---

## Cart Management

### Get Cart
Retrieve user's cart items with product details.

**Endpoint:** `GET /cart/user/:userId?deviceId=abc123`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Query Parameters:**
- `deviceId`: Device identifier for guest users (userId=1)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "productId": 456,
      "name": "Kamp Çadırı",
      "price": 1299.90,
      "quantity": 2,
      "image": "https://...",
      "stock": 50,
      "variationString": "Beden: 4 Kişilik, Renk: Yeşil",
      "selectedVariations": {
        "size": "4 Kişilik",
        "color": "Yeşil"
      },
      "createdAt": "2025-10-05T10:00:00.000Z"
    }
  ]
}
```

---

### Add to Cart
Add product to cart with variation support.

**Endpoint:** `POST /cart`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "userId": 123,
  "productId": 456,
  "quantity": 2,
  "variationString": "Beden: 4 Kişilik, Renk: Yeşil",
  "selectedVariations": {
    "size": "4 Kişilik",
    "color": "Yeşil"
  },
  "deviceId": "abc123"
}
```

**Validation:**
- `userId`: Required, integer
- `productId`: Required, integer
- `quantity`: Required, positive integer
- `deviceId`: Required for guest users (userId=1)

**Response:**
```json
{
  "success": true,
  "message": "Ürün sepete eklendi",
  "data": {
    "cartItemId": 789,
    "quantity": 2
  }
}
```

**Note:** If item with same product and variations exists, quantity is updated.

---

### Update Cart Item
Update item quantity in cart.

**Endpoint:** `PUT /cart/:cartItemId`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "quantity": 3
}
```

**Note:** Setting quantity to 0 removes the item from cart.

**Response:**
```json
{
  "success": true,
  "message": "Cart item updated"
}
```

---

### Remove from Cart
Remove item from cart.

**Endpoint:** `DELETE /cart/:cartItemId`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

---

### Clear Cart
Remove all items from cart.

**Endpoint:** `DELETE /cart/user/:userId?deviceId=abc123`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "message": "Cart cleared"
}
```

---

### Get Cart Total
Get cart subtotal (simple).

**Endpoint:** `GET /cart/user/:userId/total?deviceId=abc123`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": 2599.80
}
```

---

### Get Cart Total (Detailed)
Get cart total with campaign discounts and shipping costs.

**Endpoint:** `GET /cart/user/:userId/total-detailed?deviceId=abc123`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subtotal": 2599.80,
    "discount": 259.98,
    "shipping": 0,
    "total": 2339.82
  }
}
```

**Shipping Policy:**
- Free shipping for orders ≥ 500 TL
- 29.90 TL for orders < 500 TL

---

### Check Cart Before Logout
Check if user has items in cart for notification.

**Endpoint:** `POST /cart/check-before-logout`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "userId": 123,
  "deviceId": "abc123"
}
```

**Response:**
```json
{
  "success": true,
  "hasItems": true,
  "itemCount": 3,
  "totalPrice": 2599.80,
  "message": "Sepetinizde ürünler var, bildirim gönderildi"
}
```

---

## Order Management

### Create Order
Place a new order with EXP rewards.

**Endpoint:** `POST /orders`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "userId": 123,
  "totalAmount": 2599.80,
  "status": "pending",
  "shippingAddress": "Moda Cad. No:123, Kadıköy, İstanbul",
  "paymentMethod": "credit_card",
  "city": "İstanbul",
  "district": "Kadıköy",
  "fullAddress": "Moda Cad. No:123",
  "customerName": "Ahmet Yılmaz",
  "customerEmail": "ahmet@example.com",
  "customerPhone": "05301234567",
  "items": [
    {
      "productId": 456,
      "quantity": 2,
      "price": 1299.90,
      "productName": "Kamp Çadırı",
      "productDescription": "4 kişilik çadır",
      "productCategory": "Kamp Malzemeleri",
      "productBrand": "HuğLu",
      "productImage": "https://...",
      "variationString": "Beden: 4 Kişilik",
      "selectedVariations": {
        "size": "4 Kişilik"
      }
    }
  ]
}
```

**Payment Methods:**
- `credit_card`: Credit/debit card via İyzico
- `wallet`: HuğLu wallet balance
- `eft`: Bank transfer

**Validation:**
- Wallet payment: Checks sufficient balance
- Items: At least one item required
- Stock: Automatically decremented

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": 789,
    "expGained": 310
  }
}
```

**EXP Calculation:**
- Base: 50 EXP per order
- Additional: 10% of order total (260 EXP for 2599.80 TL)
- Total: 310 EXP

**Hpay+ Bonus:**
- Automatically adds 3% of order total to wallet
- Applied after successful payment

---

### Get User Orders
Retrieve user's order history with items.

**Endpoint:** `GET /orders/user/:userId`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 789,
      "totalAmount": 2599.80,
      "status": "delivered",
      "createdAt": "2025-10-01T10:00:00.000Z",
      "city": "İstanbul",
      "district": "Kadıköy",
      "fullAddress": "Moda Cad. No:123",
      "shippingAddress": "Moda Cad. No:123, Kadıköy, İstanbul",
      "paymentMethod": "credit_card",
      "items": [
        {
          "quantity": 2,
          "price": 1299.90,
          "productName": "Kamp Çadırı",
          "productImage": "https://..."
        }
      ]
    }
  ]
}
```

**Order Statuses:**
- `pending`: Awaiting payment
- `paid`: Payment completed
- `processing`: Being prepared
- `shipped`: In transit
- `delivered`: Completed
- `cancelled`: Cancelled
- `payment_failed`: Payment rejected

---

### Update Order Status
Change order status.

**Endpoint:** `PUT /orders/:id/status`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "status": "shipped"
}
```

---

### Cancel Order
Cancel an order.

**Endpoint:** `PUT /orders/:id/cancel`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled"
}
```

---

### Get Returnable Orders
Get orders eligible for return (delivered status).

**Endpoint:** `GET /orders/returnable?userId=123`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "orderId": 789,
      "orderDate": "2025-10-01T10:00:00.000Z",
      "orderStatus": "delivered",
      "items": [
        {
          "orderItemId": 1,
          "productName": "Kamp Çadırı",
          "productImage": "https://...",
          "price": 1299.90,
          "quantity": 2,
          "returnStatus": null,
          "canReturn": true
        }
      ]
    }
  ]
}
```

---

## Wallet Management

### Get Wallet Balance
Get user's wallet balance (cached).

**Endpoint:** `GET /wallet/balance/:userId`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 150.00
  }
}
```

**Cache:** 2 minutes (Redis + client-side)

---

### Get Wallet Details
Get wallet balance and recent transactions.

**Endpoint:** `GET /wallet/:userId`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 150.00,
    "currency": "TRY",
    "transactions": [
      {
        "id": 1,
        "type": "credit",
        "amount": 100.00,
        "description": "Para yükleme",
        "status": "completed",
        "date": "2025-10-01T10:00:00.000Z"
      },
      {
        "id": 2,
        "type": "debit",
        "amount": -50.00,
        "description": "Alışveriş ödemesi - Sipariş #789",
        "status": "completed",
        "date": "2025-10-02T15:30:00.000Z"
      }
    ]
  }
}
```

**Transaction Types:**
- `credit`: Money added
- `debit`: Money spent
- `transfer_in`: Received from user
- `transfer_out`: Sent to user
- `gift_card`: Gift card created
- `gift_card_used`: Gift card redeemed
- `hpay_plus`: Hpay+ bonus (3% of purchases)

---

### Add Money to Wallet
Add funds to wallet (simple method).

**Endpoint:** `POST /wallet/:userId/add-money`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "amount": 100.00,
  "paymentMethod": "credit_card",
  "description": "Para yükleme"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Para başarıyla yüklendi"
}
```

---

### Create Wallet Recharge Request
Request wallet recharge via bank transfer or card.

**Endpoint:** `POST /wallet/recharge-request`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "userId": 123,
  "amount": 500.00,
  "paymentMethod": "bank_transfer",
  "bankInfo": {
    "accountHolder": "Ahmet Yılmaz",
    "transactionId": "TXN123456",
    "bankName": "İş Bankası"
  }
}
```

**Payment Methods:**
- `card`: Instant via İyzico
- `bank_transfer`: Requires admin approval

**Response (Bank Transfer):**
```json
{
  "success": true,
  "data": {
    "requestId": "RCH-1696598400-A1B2C3",
    "status": "pending_approval",
    "message": "EFT/Havale bilgileri alındı. Onay bekleniyor.",
    "bankInfo": {
      "bankName": "Huglu Outdoor Bankası",
      "accountName": "Huglu Outdoor Ltd. Şti.",
      "iban": "TR12 0006 4000 0011 2345 6789 01"
    }
  }
}
```

**Response (Card):**
```json
{
  "success": true,
  "data": {
    "requestId": "RCH-1696598400-A1B2C3",
    "status": "completed",
    "newBalance": 650.00,
    "message": "Para yükleme başarılı!"
  }
}
```

---

### Get Wallet Transactions
Get transaction history with pagination.

**Endpoint:** `GET /wallet/transactions/:userId?page=1&limit=20`

**Headers:**
```http
X-API-Key: [your-api-key]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

---

### Transfer Money
Transfer money between users.

**Endpoint:** `POST /wallet/transfer`

**Headers:**
```http
Content-Type: application/json
X-API-Key: [your-api-key]
```

**Request Body:**
```json
{
  "fromUserId": 123,
  "toUserId": 456,
  "amount": 50.00,
  "description": "Arkadaşa para gönderme"
}
```

**Validation:**
- Both users must exist
- Sender must have sufficient balance
- Cannot transfer to self

**Response:**
```json
{
  "success": true,
  "message": "Transfer completed successfully",
  "data": {
    "transferId": "TRANSFER_1696598400000",
    "