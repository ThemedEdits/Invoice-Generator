# Firebase Setup Instructions

Your InvoiceForge application is connected to Firebase, but the Firestore database security rules need to be configured for it to work.

## Step 1: Go to Firebase Console
1. Open: https://console.firebase.google.com
2. Select your project: **invoice-generator-12**

## Step 2: Create/Enable Firestore Database
1. Click **Firestore Database** in the left menu
2. If it says "Create Database":
   - Click **Create Database**
   - Choose **Start in production mode** (or test mode for development)
   - Select region: **us-central1** (or your preferred region)
   - Click **Create**

## Step 3: Set Security Rules
1. Click the **Rules** tab in Firestore
2. Replace all existing rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own templates
    match /templates/{document=**} {
      allow read, write: if request.auth.uid != null && 
        (resource.data.userId == request.auth.uid || request.auth == null && resource == null);
    }
    
    // Allow authenticated users to read/write their own customers
    match /customers/{document=**} {
      allow read, write: if request.auth.uid != null && 
        (resource.data.userId == request.auth.uid || request.auth == null && resource == null);
    }
    
    // Allow authenticated users to read/write their own invoices
    match /invoices/{document=**} {
      allow read, write: if request.auth.uid != null && 
        (resource.data.userId == request.auth.uid || request.auth == null && resource == null);
    }
  }
}
```

3. Click **Publish**

## Step 4: Verify Authentication is Enabled
1. Go to **Authentication** in the left menu
2. Click **Get Started**
3. Enable **Email/Password** provider:
   - Click **Email/Password**
   - Toggle the switch to **Enabled**
   - Click **Save**

## Step 5: Reload Your App
After completing the above steps, reload your InvoiceForge app in the browser. The templates page should now display properly and you'll be able to save and view templates.

---

**Note:** If you're still seeing errors after these steps, the Firestore collection might not exist yet. This is normal—it will be created automatically when you save your first template.
