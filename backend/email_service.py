import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_user = os.getenv('SMTP_USER')
        self.smtp_password = os.getenv('SMTP_PASSWORD')
        self.from_email = os.getenv('FROM_EMAIL', self.smtp_user)
        self.enabled = bool(self.smtp_user and self.smtp_password)
        
        if not self.enabled:
            print("Email service not configured (SMTP credentials not set)")
    
    def send_email(self, to_email, subject, html_content):
        """Send an email"""
        if not self.enabled:
            print(f"Email not sent (service disabled): {subject} to {to_email}")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            print(f"Email sent successfully to {to_email}")
            return True
        except Exception as e:
            print(f"Failed to send email: {str(e)}")
            return False
    
    def send_appeal_confirmation(self, to_email, appeal_id, claim_number):
        """Send appeal submission confirmation"""
        subject = f"Appeal Submitted - {claim_number}"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1e3a8a;">Appeal Submitted Successfully</h2>
                    <p>Your insurance appeal has been submitted and is being processed.</p>
                    
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Appeal ID:</strong> {appeal_id}</p>
                        <p style="margin: 5px 0;"><strong>Claim Number:</strong> {claim_number}</p>
                    </div>
                    
                    <p>Next steps:</p>
                    <ol>
                        <li>Complete payment ($10)</li>
                        <li>Download your appeal letter</li>
                        <li>Submit to your insurance provider</li>
                    </ol>
                    
                    <p style="margin-top: 30px; color: #666; font-size: 14px;">
                        Thank you for using Denial Appeal Pro
                    </p>
                </div>
            </body>
        </html>
        """
        return self.send_email(to_email, subject, html_content)
    
    def send_appeal_ready(self, to_email, appeal_id, claim_number, download_url):
        """Send notification when appeal is ready for download"""
        subject = f"Your Appeal Letter is Ready - {claim_number}"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1e3a8a;">Your Appeal Letter is Ready!</h2>
                    <p>Your professional appeal letter has been generated and is ready for download.</p>
                    
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Appeal ID:</strong> {appeal_id}</p>
                        <p style="margin: 5px 0;"><strong>Claim Number:</strong> {claim_number}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{download_url}" 
                           style="background: #1e3a8a; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Download Appeal Letter
                        </a>
                    </div>
                    
                    <p><strong>Next Steps:</strong></p>
                    <ol>
                        <li>Download and review your appeal letter</li>
                        <li>Sign the letter</li>
                        <li>Submit to your insurance provider via their portal, fax, or mail</li>
                    </ol>
                    
                    <p style="margin-top: 30px; color: #666; font-size: 14px;">
                        Thank you for using Denial Appeal Pro
                    </p>
                </div>
            </body>
        </html>
        """
        return self.send_email(to_email, subject, html_content)
