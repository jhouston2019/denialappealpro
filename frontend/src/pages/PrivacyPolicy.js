import React from 'react';

function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <h1>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>
        <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
      </p>

      <section style={{ marginBottom: '30px' }}>
        <h2>1. Introduction</h2>
        <p>
          Denial Appeal Pro ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
          explains how we collect, use, disclose, and safeguard your information when you use our Service.
        </p>
        <p>
          Please read this Privacy Policy carefully. By using the Service, you agree to the collection and use 
          of information in accordance with this policy.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>2. Information We Collect</h2>
        
        <h3>2.1 Information You Provide</h3>
        <p>We collect information that you voluntarily provide when using our Service, including:</p>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>Provider Information:</strong> Provider name, NPI number, contact information</li>
          <li><strong>Patient Information:</strong> Patient ID (de-identified), date of service</li>
          <li><strong>Claim Information:</strong> Payer name, claim number, denial reason, denial code, CPT codes</li>
          <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store credit card numbers)</li>
          <li><strong>Uploaded Documents:</strong> Denial letters or supporting documentation you choose to upload</li>
        </ul>

        <h3>2.2 Automatically Collected Information</h3>
        <p>We automatically collect certain information when you use our Service:</p>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>Usage Data:</strong> Pages visited, time spent, features used</li>
          <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
          <li><strong>Cookies:</strong> We use cookies to maintain your session and improve user experience</li>
        </ul>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>3. How We Use Your Information</h2>
        <p>We use the collected information for the following purposes:</p>
        <ul style={{ lineHeight: '1.8' }}>
          <li>To provide and maintain our Service</li>
          <li>To generate appeal letters based on your input</li>
          <li>To process payments</li>
          <li>To send you appeal confirmations and download links</li>
          <li>To improve and optimize our Service</li>
          <li>To detect, prevent, and address technical issues or fraud</li>
          <li>To comply with legal obligations</li>
          <li>To provide customer support</li>
        </ul>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>4. HIPAA Compliance</h2>
        <p style={{ background: '#e7f3ff', padding: '15px', borderLeft: '4px solid #2196F3' }}>
          <strong>Protected Health Information (PHI):</strong> We understand that some information you provide 
          may constitute PHI under HIPAA. We implement appropriate safeguards to protect this information.
        </p>
        <p>
          If you are a covered entity under HIPAA, we can execute a Business Associate Agreement (BAA) with you. 
          Please contact us to request a BAA.
        </p>
        <p>
          <strong>Your Responsibilities:</strong> You are responsible for de-identifying PHI where appropriate 
          and using minimum necessary information when using our Service.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>5. Data Security</h2>
        <p>
          We implement appropriate technical and organizational security measures to protect your information:
        </p>
        <ul style={{ lineHeight: '1.8' }}>
          <li>Encryption of data in transit (SSL/TLS)</li>
          <li>Encryption of sensitive data at rest</li>
          <li>Secure authentication and access controls</li>
          <li>Regular security assessments</li>
          <li>Limited employee access to data</li>
          <li>Secure payment processing through Stripe (PCI DSS compliant)</li>
        </ul>
        <p>
          However, no method of transmission over the Internet or electronic storage is 100% secure. While we 
          strive to use commercially acceptable means to protect your information, we cannot guarantee absolute 
          security.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>6. Data Retention</h2>
        <p>
          We retain your information for as long as necessary to provide the Service and comply with legal 
          obligations:
        </p>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>Appeal Data:</strong> Retained for 7 years to comply with healthcare record retention requirements</li>
          <li><strong>Payment Records:</strong> Retained for 7 years for tax and accounting purposes</li>
          <li><strong>Uploaded Documents:</strong> Deleted after 90 days unless otherwise specified</li>
          <li><strong>Usage Data:</strong> Retained for 2 years for analytics and service improvement</li>
        </ul>
        <p>
          You may request deletion of your data at any time, subject to legal retention requirements.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>7. Information Sharing and Disclosure</h2>
        <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
        
        <h3>7.1 Service Providers</h3>
        <p>We share information with third-party service providers who perform services on our behalf:</p>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>Stripe:</strong> Payment processing</li>
          <li><strong>Hosting Providers:</strong> Data storage and application hosting</li>
          <li><strong>Analytics Services:</strong> Service improvement and usage analysis</li>
        </ul>
        <p>These providers are contractually obligated to protect your information and use it only for the specified purposes.</p>

        <h3>7.2 Legal Requirements</h3>
        <p>We may disclose your information if required to do so by law or in response to:</p>
        <ul style={{ lineHeight: '1.8' }}>
          <li>Valid legal process (subpoena, court order)</li>
          <li>Government requests</li>
          <li>Protection of our rights and safety</li>
          <li>Investigation of fraud or security issues</li>
        </ul>

        <h3>7.3 Business Transfers</h3>
        <p>
          If we are involved in a merger, acquisition, or sale of assets, your information may be transferred. 
          We will provide notice before your information is transferred and becomes subject to a different 
          Privacy Policy.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>8. Your Privacy Rights</h2>
        <p>Depending on your location, you may have the following rights:</p>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>Access:</strong> Request a copy of your personal information</li>
          <li><strong>Correction:</strong> Request correction of inaccurate information</li>
          <li><strong>Deletion:</strong> Request deletion of your information (subject to legal requirements)</li>
          <li><strong>Portability:</strong> Request transfer of your data to another service</li>
          <li><strong>Opt-Out:</strong> Opt out of marketing communications</li>
          <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
        </ul>
        <p>
          To exercise these rights, please contact us using the information provided below. We will respond to 
          your request within 30 days.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>9. Cookies and Tracking</h2>
        <p>
          We use cookies and similar tracking technologies to track activity on our Service and hold certain 
          information. You can instruct your browser to refuse all cookies or to indicate when a cookie is 
          being sent.
        </p>
        <p>Types of cookies we use:</p>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>Essential Cookies:</strong> Required for the Service to function</li>
          <li><strong>Analytics Cookies:</strong> Help us understand how you use the Service</li>
          <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
        </ul>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>10. Third-Party Links</h2>
        <p>
          Our Service may contain links to third-party websites. We are not responsible for the privacy practices 
          of these websites. We encourage you to read the privacy policies of any third-party sites you visit.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>11. Children's Privacy</h2>
        <p>
          Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal 
          information from children. If you become aware that a child has provided us with personal information, 
          please contact us so we can delete such information.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>12. California Privacy Rights</h2>
        <p>
          If you are a California resident, you have specific rights under the California Consumer Privacy Act 
          (CCPA):
        </p>
        <ul style={{ lineHeight: '1.8' }}>
          <li>Right to know what personal information is collected</li>
          <li>Right to know if personal information is sold or disclosed</li>
          <li>Right to opt-out of the sale of personal information (we do not sell personal information)</li>
          <li>Right to deletion of personal information</li>
          <li>Right to non-discrimination for exercising CCPA rights</li>
        </ul>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>13. International Data Transfers</h2>
        <p>
          Your information may be transferred to and maintained on servers located outside of your state, 
          province, country, or other governmental jurisdiction where data protection laws may differ. By using 
          the Service, you consent to such transfers.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>14. Changes to This Privacy Policy</h2>
        <p>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the 
          new Privacy Policy on this page and updating the "Last Updated" date.
        </p>
        <p>
          You are advised to review this Privacy Policy periodically for any changes. Changes are effective when 
          posted on this page.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>15. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or wish to exercise your privacy rights, please contact us:
        </p>
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginTop: '15px' }}>
          <p style={{ margin: '5px 0' }}><strong>Email:</strong> privacy@denialappealpro.com</p>
          <p style={{ margin: '5px 0' }}><strong>Response Time:</strong> Within 30 days</p>
        </div>
      </section>

      <div style={{ 
        marginTop: '60px', 
        padding: '20px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, color: '#666' }}>
          By using Denial Appeal Pro, you acknowledge that you have read and understood this Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
