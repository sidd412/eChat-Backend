export const landingPageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Talksy - Real-Time Video Matchmaking & Messaging</title>
    <style>
        :root {
            --primary: #5A45FF;
            --primary-dark: #4330E0;
            --bg: #0B0E14;
            --card-bg: #151922;
            --text-main: #FFFFFF;
            --text-muted: #94A3B8;
            --border: rgba(255, 255, 255, 0.1);
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        body {
            background-color: var(--bg);
            color: var(--text-main);
            line-height: 1.6;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 40px;
            border-bottom: 1px solid var(--border);
            max-width: 1200px;
            margin: 0 auto;
        }
        .logo {
            font-size: 28px;
            font-weight: 800;
            background: linear-gradient(135deg, #7E57FF, #22D3EE);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .nav-links a {
            color: var(--text-muted);
            text-decoration: none;
            margin-left: 24px;
            font-size: 15px;
            transition: color 0.2s;
        }
        .nav-links a:hover {
            color: var(--text-main);
        }
        .hero {
            text-align: center;
            padding: 80px 20px;
            max-width: 900px;
            margin: 0 auto;
        }
        .badge {
            display: inline-block;
            background: rgba(90, 69, 255, 0.15);
            color: #A594FF;
            border: 1px solid rgba(90, 69, 255, 0.3);
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 24px;
        }
        .hero h1 {
            font-size: 52px;
            font-weight: 800;
            line-height: 1.15;
            margin-bottom: 20px;
        }
        .hero h1 span {
            background: linear-gradient(135deg, #7E57FF, #38BDF8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .hero p {
            font-size: 18px;
            color: var(--text-muted);
            margin-bottom: 36px;
            max-width: 650px;
            margin-left: auto;
            margin-right: auto;
        }
        .btn-primary {
            display: inline-block;
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: #FFF;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            box-shadow: 0 10px 25px rgba(90, 69, 255, 0.3);
            transition: transform 0.2s;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
            max-width: 1200px;
            margin: 40px auto 80px;
            padding: 0 20px;
        }
        .feature-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            padding: 32px;
            border-radius: 16px;
        }
        .feature-card h3 {
            font-size: 20px;
            margin-bottom: 12px;
            color: #FFF;
        }
        .feature-card p {
            color: var(--text-muted);
            font-size: 14px;
        }
        .pricing-section {
            background: var(--card-bg);
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            padding: 60px 20px;
            text-align: center;
        }
        .pricing-section h2 {
            font-size: 32px;
            margin-bottom: 16px;
        }
        .pricing-grid {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
            margin-top: 40px;
            max-width: 1000px;
            margin-left: auto;
            margin-right: auto;
        }
        .pricing-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 24px;
            min-width: 200px;
        }
        .pricing-card h4 {
            font-size: 18px;
            margin-bottom: 8px;
        }
        .pricing-card .price {
            font-size: 28px;
            font-weight: 800;
            color: #38BDF8;
            margin-bottom: 8px;
        }
        .pricing-card .coins {
            font-size: 14px;
            color: var(--text-muted);
        }
        .footer {
            max-width: 1200px;
            margin: 0 auto;
            padding: 60px 20px 40px;
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 24px;
        }
        .footer-links a {
            color: var(--text-muted);
            text-decoration: none;
            margin-right: 20px;
            font-size: 14px;
        }
        .footer-links a:hover {
            color: #FFF;
        }
        .footer-copy {
            color: var(--text-muted);
            font-size: 13px;
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="logo">Talksy</div>
        <nav class="nav-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/refund">Refund Policy</a>
            <a href="/contact">Contact Us</a>
        </nav>
    </header>

    <main>
        <section class="hero">
            <div class="badge">🚀 Fast & Secure Real-Time Matching</div>
            <h1>Connect Instantly & Securely with <span>Talksy</span></h1>
            <p>Talksy brings high-definition video calling, instant matchmaking, and end-to-end secured messaging right to your fingertips.</p>
            <a href="https://play.google.com/store/apps/details?id=com.videoChatting.echat" class="btn-primary">Download on Google Play</a>
        </section>

        <section class="features">
            <div class="feature-card">
                <h3>📹 Ultra-HD Video Calls</h3>
                <p>Powered by global RTC infrastructure with crystal clear audio and zero latency.</p>
            </div>
            <div class="feature-card">
                <h3>🔒 Privacy & Safety First</h3>
                <p>Robust moderation, screenshot protection, zero-tolerance child safety standards, and end-to-end encrypted chats.</p>
            </div>
            <div class="feature-card">
                <h3>🪙 Coin Recharge & Wallet</h3>
                <p>Instant coin top-ups through safe and regulated payment methods powered by Razorpay.</p>
            </div>
        </section>

        <section class="pricing-section">
            <h2>Digital Coin Packs</h2>
            <p style="color: var(--text-muted);">Purchase in-app coins for premium video matchmaking minutes</p>
            <div class="pricing-grid">
                <div class="pricing-card">
                    <h4>Starter Pack</h4>
                    <div class="price">₹49</div>
                    <div class="coins">100 Coins</div>
                </div>
                <div class="pricing-card" style="border-color: #7E57FF;">
                    <h4>Popular Pack</h4>
                    <div class="price">₹149</div>
                    <div class="coins">350 Coins</div>
                </div>
                <div class="pricing-card">
                    <h4>Pro Value Pack</h4>
                    <div class="price">₹499</div>
                    <div class="coins">1,200 Coins</div>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="footer-copy">
            &copy; 2026 Talksy. Operated by Gulab Singh / Shriram Associates. All rights reserved.
        </div>
        <div class="footer-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/refund">Refund Policy</a>
            <a href="/contact">Contact Us</a>
            <a href="/delete-account">Account Deletion</a>
        </div>
    </footer>
</body>
</html>
`;

export const termsOfServiceHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Talksy - Terms of Service</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px 20px; background-color: #f9f9f9; }
        .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        h1 { color: #111; font-size: 2.2em; margin-bottom: 10px; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; }
        h2 { color: #2c3e50; font-size: 1.4em; margin-top: 30px; border-bottom: 1px solid #eaeaea; padding-bottom: 5px; }
        p, li { font-size: 1.05em; color: #555; }
        .date { color: #888; font-style: italic; margin-bottom: 20px; }
        a { color: #5A45FF; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Terms of Service</h1>
        <div class="date">Last Updated: August 15, 2026</div>
        <p>These Terms of Service ("Terms") govern your use of the Talksy mobile application and related web services operated by <strong>Gulab Singh (Shriram Associates)</strong>.</p>
        
        <h2>1. User Eligibility & Safety</h2>
        <p>You must be at least 18 years of age to use Talksy. Harassment, nudity, hate speech, spam, and non-consensual sharing of content are strictly prohibited and result in immediate permanent account termination.</p>

        <h2>2. Virtual Coins & Digital Goods</h2>
        <p>Talksy provides virtual coins that can be purchased within the app to unlock matchmaking minutes and direct features. Virtual coins have no monetary value outside of the Talksy application and cannot be exchanged for fiat currency.</p>

        <h2>3. Payments & Billing</h2>
        <p>All purchases are processed securely via certified payment gateways (Razorpay). By completing a purchase, you agree to pay the listed price and applicable taxes.</p>

        <h2>4. Contact Us</h2>
        <p>If you have any questions regarding these Terms, contact us at: <a href="mailto:shriramasociate17@gmail.com">shriramasociate17@gmail.com</a></p>
        <p><a href="/">&larr; Back to Home</a></p>
    </div>
</body>
</html>
`;

export const refundPolicyHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Talksy - Cancellation & Refund Policy</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px 20px; background-color: #f9f9f9; }
        .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        h1 { color: #111; font-size: 2.2em; margin-bottom: 10px; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; }
        h2 { color: #2c3e50; font-size: 1.4em; margin-top: 30px; border-bottom: 1px solid #eaeaea; padding-bottom: 5px; }
        p, li { font-size: 1.05em; color: #555; }
        .date { color: #888; font-style: italic; margin-bottom: 20px; }
        a { color: #5A45FF; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Cancellation & Refund Policy</h1>
        <div class="date">Last Updated: August 15, 2026</div>
        
        <h2>1. Digital Goods & Virtual Currency</h2>
        <p>Talksy provides digital goods in the form of virtual coins. Digital coins are credited instantaneously to your in-app wallet upon successful transaction confirmation from the payment gateway.</p>

        <h2>2. Refund Guidelines</h2>
        <p>Because coins are consumable digital items delivered immediately, purchases are generally non-refundable once the coins have been used. However, refunds are processed under the following conditions:</p>
        <ul>
            <li><strong>Technical Failure / Double Deduction:</strong> If your bank account was debited but coins were not credited to your wallet, the amount will be automatically refunded within 5-7 business days, or coins will be credited upon manual review.</li>
            <li><strong>Unauthorized Transactions:</strong> If an unauthorized purchase occurs, please notify us immediately with transaction receipt proof.</li>
        </ul>

        <h2>3. How to Request a Refund</h2>
        <p>Please contact our support team at <a href="mailto:shriramasociate17@gmail.com">shriramasociate17@gmail.com</a> with your Payment ID, registered email, and transaction screenshot. Verified claims are refunded to the original source within 5-7 business days.</p>
        <p><a href="/">&larr; Back to Home</a></p>
    </div>
</body>
</html>
`;

export const contactUsHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Talksy - Contact Us</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px 20px; background-color: #f9f9f9; }
        .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        h1 { color: #111; font-size: 2.2em; margin-bottom: 10px; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; }
        h2 { color: #2c3e50; font-size: 1.4em; margin-top: 30px; border-bottom: 1px solid #eaeaea; padding-bottom: 5px; }
        p, li { font-size: 1.05em; color: #555; }
        .contact-box { background: #f0f4f8; padding: 24px; border-radius: 8px; border-left: 4px solid #5A45FF; margin: 24px 0; }
        a { color: #5A45FF; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Contact Us & Support</h1>
        <p>Have questions, billing issues, feedback, or need assistance with your Talksy account? Our support team is here to help you.</p>

        <div class="contact-box">
            <h3>Merchant & Business Information</h3>
            <p><strong>Merchant Name:</strong> Gulab Singh</p>
            <p><strong>Business Name:</strong> Shriram Associates (Talksy App)</p>
            <p><strong>Support Email:</strong> <a href="mailto:shriramasociate17@gmail.com">shriramasociate17@gmail.com</a></p>
            <p><strong>Operating Address:</strong> New Delhi, Delhi, India</p>
            <p><strong>Support Hours:</strong> Monday - Saturday (9:00 AM - 7:00 PM IST)</p>
        </div>

        <h2>Report a User / Safety Issue</h2>
        <p>If you encounter inappropriate behavior or safety violations on Talksy, you can use the in-app <strong>Report User</strong> feature or email us directly at <a href="mailto:shriramasociate17@gmail.com">shriramasociate17@gmail.com</a> with the user ID.</p>
        <p><a href="/">&larr; Back to Home</a></p>
    </div>
</body>
</html>
`;
