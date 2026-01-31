<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Class CourierXpressMail
 * * Sử dụng ShouldQueue để tự động đẩy mail vào hàng đợi (Queue), 
 * giúp tăng tốc độ phản hồi API/Web cực nhanh.
 */
class CourierXpressMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * Chứa toàn bộ dữ liệu truyền vào mail.
     * Khai báo public để View tự động nhận biến này.
     */
    public array $mailData;

    /**
     * Khởi tạo class với cơ chế Default Merging.
     * * @param array $data
     */
    public function __construct(array $data)
    {
        // Senior tip: Luôn có giá trị mặc định để tránh lỗi Undefined Index trong View
        $this->mailData = array_merge([
            'subject'     => 'CourierXpress Notification',
            'title'       => 'Thông báo từ hệ thống',
            'name'        => 'Quý khách',
            'content'     => '',
            'action_url'  => config('app.url'),
            'action_text' => 'Xem chi tiết',
        ], $data);
    }

    /**
     * Cấu hình Envelope (Tiêu đề, Người gửi).
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(
                config('mail.from.address', 'noreply@courierxpress.com'),
                config('mail.from.name', 'CourierXpress')
            ),
            subject: $this->mailData['subject'],
        );
    }

    /**
     * Cấu hình Content (View và Dữ liệu).
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.automated',
            // Không cần dùng 'with' vì biến public đã tự động được inject
        );
    }

    /**
     * Cấu hình tệp đính kèm.
     */
    public function attachments(): array
    {
        return [];
    }
}
