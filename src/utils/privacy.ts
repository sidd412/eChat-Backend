export const privacyPolicyHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eChat - Privacy Policy</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background-color: #f9f9f9;
        }
        .container {
            background-color: #ffffff;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        h1 {
            color: #111;
            font-size: 2.5em;
            margin-bottom: 10px;
            border-bottom: 2px solid #eaeaea;
            padding-bottom: 10px;
        }
        h2 {
            color: #2c3e50;
            font-size: 1.5em;
            margin-top: 30px;
            border-bottom: 1px solid #eaeaea;
            padding-bottom: 5px;
        }
        p, li {
            font-size: 1.1em;
            color: #555;
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin-bottom: 10px;
        }
        .date {
            color: #888;
            font-style: italic;
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Privacy Policy</h1>
        <div class="date">Last Updated: August 5, 2026</div>
        
        <p>Welcome to <strong>eChat</strong>. We are committed to protecting your privacy and ensuring you have a safe and secure experience using our application. This Privacy Policy outlines the types of information we collect, how we process and protect it, and your rights regarding your data in full compliance with the Google Play Console Developer Policies.</p>

        <h2>1. Information We Collect</h2>
        <p>To provide and improve our real-time video matching and communication services, we collect the following categories of data:</p>
        <ul>
            <li><strong>Account Profile Information</strong>: Authentication is handled securely via Google Sign-In or Guest session parameters. We receive and store your email address, full name, profile picture URL, and Google unique identifier. If you choose to upload a custom profile avatar, it is securely uploaded to Google Cloud Storage (GCS).</li>
            <li><strong>Video & Audio Streams</strong>: To support live matches, your camera and microphone streams are transmitted directly to your matchmaking partner using Agora RTC peer-to-peer and relayed nodes. We **never** record, intercept, monitor, or store video or audio calls on our databases. All real-time streams are private and ephemeral.</li>
            <li><strong>Coarse Location Data</strong>: The app processes geolocation parameters locally to match users by region/country. Precise coordinates (latitude/longitude) are processed locally on your device to calculate distance filters (e.g. within a selected radius) and are **never** persistently stored on our servers. Other users can only see your generalized country name.</li>
            <li><strong>Push Notification Tokens</strong>: We collect and upload Firebase Cloud Messaging (FCM) tokens to route call invites and chat notifications. You can disable notifications anytime in your Android system settings.</li>
            <li><strong>Financial and Transaction Info</strong>: Purchases of virtual coins are handled securely using our payment partner SDK (Razorpay). We do **not** collect or store credit/debit card numbers, bank details, or UPI credentials. We only record the transaction ID, payment status, coins balance, and transaction history on our databases to manage your wallet.</li>
            <li><strong>Customer Support Data</strong>: If you submit a support ticket via the Help & Support screen inside the app, we collect the support category, subject, description, and your contact email to resolve your query and contact you back.</li>
        </ul>

        <h2>2. How We Use Your Data</h2>
        <p>We process your information to fulfill our contractual and service agreements with you, specifically:</p>
        <ul>
            <li>To manage your account, authenticate sessions, and maintain your user profile.</li>
            <li>To match you with other active users according to your search and filter preferences.</li>
            <li>To facilitate Agora video and audio calls with dynamic RTC authentication tokens.</li>
            <li>To credit, deduct, and update your virtual coin wallet balance during active calls.</li>
            <li>To deliver push notifications when other users invite you to a call or chat.</li>
            <li>To reply to your queries and support tickets submitted through the in-app Help center.</li>
            <li>To monitor and prevent fraud, harassment, malicious activities, and violations of our Community Guidelines.</li>
        </ul>

        <h2>3. Data Sharing & Third-Party SDKs</h2>
        <p>We do not sell, trade, or rent your personal information to third parties. We share data only with verified services integrated to run the app:</p>
        <ul>
            <li><strong>Agora</strong>: Facilitates real-time video/audio transmission. Agora receives technical streaming parameters to establish the connection but does not record call media.</li>
            <li><strong>Razorpay</strong>: Processes payments securely. All payment details are processed under Razorpay's PCI-DSS compliant secure infrastructure.</li>
            <li><strong>Google Cloud & Firebase</strong>: Houses our backend databases and routes notifications using industry-standard security.</li>
        </ul>

        <h2>4. Data Retention & Account Deletion</h2>
        <p>Under Google Play Store guidelines, we provide a clear in-app mechanism to delete your account. You can request permanent account deletion via <strong>Settings -> Delete Account</strong> inside the app. Upon double-confirmation:</p>
        <ul>
            <li>Your email, full name, avatar images, and Google ID are immediately marked for erasure.</li>
            <li>Your coins balance, payment history, friend lists, block records, and AES-encrypted chats are permanently wiped from MongoDB within 14 days.</li>
            <li>Any uploaded custom avatar files are permanently deleted from our Google Cloud Storage bucket.</li>
        </ul>

        <h2>5. Children's Privacy (COPPA Compliance)</h2>
        <p>Our services are strictly restricted to individuals aged <strong>18 and over</strong>. We do not knowingly collect or solicit personal information from children under 13, nor do we target the app to minors. If we discover that a user under 18 has registered an account, we will terminate the account and delete their data immediately.</p>

        <h2>6. Security Measures</h2>
        <p>All communication between the mobile app and our servers is encrypted using Secure Sockets Layer (SSL) and Transport Layer Security (TLS/HTTPS). Databases are hosted behind secure firewalls with restricted IAM roles.</p>

        <h2>7. Contact Us</h2>
        <p>If you have questions regarding this Privacy Policy, data security, GDPR/CCPA compliance, or account deletion, please contact our Privacy Office at:</p>
        <p>Email: <a href="mailto:shriramasociate17@gmail.com">shriramasociate17@gmail.com</a></p>
    </div>
</body>
</html>
`;
