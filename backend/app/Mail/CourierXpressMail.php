
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CourierXpressMail extends Mailable
{
    use Queueable, SerializesModels;

    public $mailData;

    public function __construct($data)
    {
        $this->mailData = $data;
    }

    public function envelope(): Envelope
    {
        return new Envelope(

            subject: $this->mailData['subject'] ?? 'CourierXpress Notification',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.automated',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
