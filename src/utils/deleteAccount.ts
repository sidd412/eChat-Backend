export const deleteAccountHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Talksy - Account and Data Deletion</title>
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
        ol, ul {
            padding-left: 20px;
        }
        li {
            margin-bottom: 15px;
        }
        .button {
            display: inline-block;
            background-color: #e74c3c;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 20px;
        }
        .button:hover {
            background-color: #c0392b;
        }
        .info-box {
            background-color: #f0f3f4;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Account & Data Deletion Request</h1>
        <p>At <strong>Talksy</strong>, you have complete control over your data. Under Google Play Store User Data Policies, we provide options to delete your account and all associated data permanently.</p>

        <h2>Option 1: In-App Account Deletion (Instant & Automatic)</h2>
        <p>The fastest and most secure way to delete your account and wipe your records is directly inside the Talksy mobile application:</p>
        <ol>
            <li>Open the <strong>Talksy</strong> app on your Android device.</li>
            <li>Go to the <strong>Profile Screen</strong> (bottom navigation).</li>
            <li>Tap on the <strong>Settings Icon</strong> (top right corner).</li>
            <li>Select <strong>Delete Account</strong> from the menu options.</li>
            <li>Confirm your request on the double-confirmation dialog.</li>
        </ol>
        <div class="info-box">
            <strong>What gets deleted immediately?</strong><br>
            Once confirmed, you will be logged out immediately. Your profile name, email, avatar image, active friend lists, and blocking logs will be permanently erased. All remaining coins balance and AES-encrypted chats will be completely purged from our databases within 14 days.
        </div>

        <h2>Option 2: Web Deletion Request (Support Desk)</h2>
        <p>If you have uninstalled the app or cannot log in, you can submit a deletion request directly by emailing our privacy team.</p>
        <p>Please send an email to <a href="mailto:shriramasociate17@gmail.com">shriramasociate17@gmail.com</a> containing the following information:</p>
        <ul>
            <li>Your registered Google Sign-in email address, OR</li>
            <li>Your unique Talksy User ID (found in Profile -> Settings).</li>
        </ul>
        <p>Our support team will process your request, delete all associated database records, and email you a confirmation within <strong>48 hours</strong>.</p>
    </div>
</body>
</html>
`;
