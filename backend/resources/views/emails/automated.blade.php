<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CourierXpress Notification</title>
    <style>
        /* Email client reset styles */
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
            background-color: #f4f7f9;
            color: #334155;
            -webkit-font-smoothing: antialiased;
        }

        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .header {
            background-color: #f97316;
            padding: 40px 20px;
            text-align: center;
        }

        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .content {
            padding: 40px 30px;
            line-height: 1.6;
        }

        .content h2 {
            color: #1e293b;
            margin-top: 0;
            font-size: 22px;
            font-weight: 700;
        }

        .otp-box {
            background-color: #fff7ed;
            border: 2px dashed #fdba74;
            color: #c2410c;
            font-size: 36px;
            font-weight: 800;
            text-align: center;
            padding: 20px;
            margin: 30px 0;
            letter-spacing: 6px;
            border-radius: 12px;
        }

        .button-container {
            text-align: center;
            margin: 35px 0;
        }

        .button {
            background-color: #f97316;
            color: #ffffff !important;
            padding: 16px 35px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            font-size: 16px;
            display: inline-block;
        }

        .footer {
            background-color: #f8fafc;
            padding: 25px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
        }

        /* Mobile Optimization */
        @media only screen and (max-width: 600px) {
            .container {
                margin: 0 !important;
                border-radius: 0 !important;
                width: 100% !important;
            }

            .content {
                padding: 30px 20px !important;
            }
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>CourierXpress</h1>
        </div>

        <div class="content">
            <h2>{{ $mailData['title'] ?? 'System Notification' }}</h2>
            <p>Hi <strong>{{ $mailData['name'] ?? 'Valued Customer' }}</strong>,</p>

            <div style="margin-bottom: 20px; color: #475569;">
                {!! nl2br(e($mailData['content'])) !!}
            </div>

            @if (!empty($mailData['otp']))
            <div class="otp-box">
                {{ $mailData['otp'] }}
            </div>
            <p style="font-size: 14px; color: #64748b; text-align: center;">
                This code is valid for 5 minutes. Please do not share this code with anyone.
            </p>
            @endif

            @if (!empty($mailData['action_url']))
            <div class="button-container">
                <a href="{{ $mailData['action_url'] }}" class="button">
                    {{ $mailData['action_text'] ?? 'Get Started' }}
                </a>
            </div>
            @endif

            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;">

            <p style="font-size: 14px;">If you did not request this email, please ignore it or contact our support team if you have concerns.</p>
            <p>Best regards,<br><strong>CourierXpress Team</strong></p>
        </div>

        <div class="footer">
            <p>© {{ date('Y') }} CourierXpress Logistics. All rights reserved.</p>
            <p>Address: 123 Shipping Lane, Ho Chi Minh City, Vietnam</p>
            <p style="margin-top: 10px;">
                You are receiving this email because of your activity on CourierXpress.
            </p>
        </div>
    </div>
</body>

</html>