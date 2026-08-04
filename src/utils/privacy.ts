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
        
        <p>Welcome to <strong>eChat</strong>. We are committed to protecting your privacy and ensuring you have a safe and secure experience using our application. This Privacy Policy explains how we collect, use, process, and protect your information when you use the eChat mobile application and its associated services.</p>

        <h2>1. Information We Collect</h2>
        <p>To provide and improve our real-time communication services, we collect the following types of information:</p>
        <ul>
            <li><strong>Account Information</strong>: When you sign in (via Google or Guest login), we receive your Google ID, name, email address, and profile picture url. If you upload a custom profile avatar, it is securely stored on Google Cloud Storage.</li>
            <li><strong>Coarse Location Data</strong>: We process approximate location parameters (country and region) locally on your device to match you with nearby users. Precise latitude and longitude coordinates are only used locally to compute distance filters and are never stored on our database.</li>
            <li><strong>Transaction & Purchase Info</strong>: Purchases of virtual coins are handled securely using our payment partner SDK (Razorpay). We only store transaction status, coins balance, and receipt tokens on our servers. We never collect or store your credit/debit card numbers or UPI banking secrets.</li>
            <li><strong>FCM Notification Tokens</strong>: We upload Firebase Cloud Messaging tokens to route call invites and chat notifications. You may opt out of notifications anytime via your system settings.</li>
        </ul>

        <h2>2. How We Use Your Data</h2>
        <p>We use the collected information for the following purposes:</p>
        <ul>
            <li>To match users in real-time video/audio chats.</li>
            <li>To manage your wallet balance and process coin deductions.</li>
            <li>To deliver push notifications for incoming call invites.</li>
            <li>To prevent fraud, abuse, and violation of our Safety Guidelines.</li>
        </ul>

        <h2>3. Real-Time Video & Audio Streams</h2>
        <p>All video and audio calls are powered securely by the Agora RTC Network. We do <strong>not</strong> record, intercept, monitor, or store any of your video or audio communications. All call streams are peer-to-peer or routed through secure Agora nodes in real-time, ensuring absolute privacy.</p>

        <h2>4. Data Security</h2>
        <p>All communications between the eChat app and our servers are encrypted using Transport Layer Security (TLS/HTTPS). User profiles and metadata are saved on MongoDB databases protected by strict Identity and Access Management (IAM) firewalls.</p>

        <h2>5. User Rights & Data Deletion</h2>
        <p>You have full control over your data. You can delete your account permanently via the Settings screen in the app. Upon double-confirmation, your email, name, avatar, coins, friend lists, and AES-encrypted chats will be permanently wiped from our databases within 14 days.</p>

        <h2>6. Contact Us</h2>
        <p>If you have any questions or concerns regarding this Privacy Policy, please contact us at:</p>
        <p>Email: <a href="mailto:support@echat.com">support@echat.com</a></p>
    </div>
</body>
</html>
`;
