<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7f9;
            color: #334155;
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
            letter-spacing: 1px;
        }

        .content {
            padding: 40px 30px;
            line-height: 1.6;
        }

        .content h2 {
            color: #1e293b;
            margin-top: 0;
            font-size: 20px;
        }

        .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
        }

        .button-container {
            text-align: center;
            margin: 35px 0;
        }

        .button {
            background-color: #f97316;
            color: #ffffff !important;
            padding: 14px 30px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            font-size: 16px;
            display: inline-block;
            transition: background-color 0.3s ease;
        }

        .otp-box {
            background-color: #fff7ed;
            border: 2px dashed #fdba74;
            color: #c2410c;
            font-size: 32px;
            font-weight: 800;
            text-align: center;
            padding: 15px;
            margin: 20px 0;
            letter-spacing: 5px;
            border-radius: 12px;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>CourierXpress</h1>
        </div>

        <div class="content">
            <h2>{{ $mailData['title'] }}</h2>
            <p>Xin chào <strong>{{ $mailData['name'] ?? 'Quý khách' }}</strong>,</p>

            <p>{!! nl2br(e($mailData['content'])) !!}</p>

            @if (isset($mailData['otp']))
                <div class="otp-box">
                    {{ $mailData['otp'] }}
                </div>
            @endif

            @if (isset($mailData['action_url']))
                <div class="button-container">
                    <a href="{{ $mailData['action_url'] }}" class="button">
                        {{ $mailData['action_text'] ?? 'Xem chi tiết' }}
                    </a>
                </div>
            @endif

            <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ bộ phận hỗ trợ của chúng tôi.</p>
            <p>Trân trọng,<br><strong>Đội ngũ CourierXpress</strong></p>
        </div>

        <div class="footer">
            <p>© 2026 CourierXpress Logistics. All rights reserved.</p>
            <p>Địa chỉ: 123 Đường Vận Chuyển, TP. Hồ Chí Minh, Việt Nam</p>
        </div>
    </div>
</body>

</html>
