# BiteSpeed Identity Reconciliation API

A backend service built with Node.js, Express, TypeScript, and Prisma (SQLite) that handles cross-device identity reconciliation.

## Features
- The `/identify` endpoint links disparate customer events (coming from different devices or channels) into a unified identity profile. 
- Creates a new `primary` contact when receiving unseen emails/phone numbers.
- Groups contacts carrying overlapping data into the same cluster.
- Converts newer `primary` contacts into `secondary` contacts if they share data with an older primary. 
- Connects new information via `secondary` contacts to the oldest `primary` user, returning a unified schema.

## Prerequisites
- Node.js (v16+)
- npm

## Setup & Run

1. **Install Dependencies**  
   Run this command to install required modules:
   ```bash
   npm install
   ```

2. **Initialize the Database**  
   This project uses a local SQLite database (`dev.db`). Run this command to apply the Prisma schema:
   ```bash
   npx prisma db push
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```
   *The server will start on `http://localhost:3001`.*

## Testing the API

**Endpoint**: `POST /identify`

**Payload Example**:
```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

**Response Example**:
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

## Running Automated Tests
A suite of integration tests covering various creation, merging, and secondary scenarios is included.
To run the automated test script (`test.ts`), keep the dev server running, open a new terminal, and execute:
```bash
npx ts-node test.ts
```
