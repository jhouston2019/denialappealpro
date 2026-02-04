import React from 'react';

function TermsOfService() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <h1>Terms of Service</h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>
        <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
      </p>

      <section style={{ marginBottom: '30px' }}>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using Denial Appeal Pro ("Service"), you accept and agree to be bound by the terms 
          and provision of this agreement. If you do not agree to these Terms of Service, please do not use 
          the Service.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>2. Description of Service</h2>
        <p>
          Denial Appeal Pro is a software tool that generates template appeal letters for insurance claim denials. 
          The Service provides document templates and formatting assistance only.
        </p>
        <p style={{ background: '#fff3cd', padding: '15px', borderLeft: '4px solid #ffc107', marginTop: '15px' }}>
          <strong>IMPORTANT:</strong> This Service does NOT provide medical advice, legal advice, or professional 
          healthcare services. The templates generated are for informational purposes only and must be reviewed, 
          modified, and approved by qualified healthcare professionals before submission.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>3. User Responsibilities</h2>
        <p>You agree that:</p>
        <ul style={{ lineHeight: '1.8' }}>
          <li>You are a licensed healthcare provider or authorized representative with the legal right to submit 
          insurance appeals on behalf of patients.</li>
          <li>You will review all generated content for accuracy, completeness, and appropriateness before use.</li>
          <li>You are solely responsible for the content of any appeal letters submitted to insurance companies.</li>
          <li>You will modify and customize template content as necessary for each specific case.</li>
          <li>You will comply with all applicable federal, state, and local laws, including HIPAA.</li>
          <li>You will not use the Service for any unlawful purpose or in any way that could damage the Service.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>4. No Guarantee of Results</h2>
        <p>
          The Service does not guarantee that any appeal will be successful. Insurance claim determinations are 
          made by insurance companies based on their policies, medical necessity criteria, and other factors 
          beyond our control. We make no representations or warranties regarding the success rate of appeals 
          generated using this Service.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>5. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, DENIAL APPEAL PRO SHALL NOT BE LIABLE FOR ANY INDIRECT, 
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER 
          INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES 
          RESULTING FROM:
        </p>
        <ul style={{ lineHeight: '1.8' }}>
          <li>Your use or inability to use the Service;</li>
          <li>Any denial or rejection of insurance appeals;</li>
          <li>Any errors or omissions in generated content;</li>
          <li>Any unauthorized access to or use of our servers and/or any personal information stored therein;</li>
          <li>Any interruption or cessation of transmission to or from the Service.</li>
        </ul>
        <p>
          IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL DAMAGES EXCEED THE AMOUNT YOU PAID TO US IN THE 
          PAST SIX MONTHS, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS LESS.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>6. Indemnification</h2>
        <p>
          You agree to indemnify, defend, and hold harmless Denial Appeal Pro and its officers, directors, 
          employees, and agents from and against any claims, liabilities, damages, losses, and expenses, 
          including reasonable attorney's fees, arising out of or in any way connected with:
        </p>
        <ul style={{ lineHeight: '1.8' }}>
          <li>Your use of the Service;</li>
          <li>Your violation of these Terms of Service;</li>
          <li>Your violation of any rights of another party;</li>
          <li>Any appeal letters you submit to insurance companies.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>7. Payment Terms</h2>
        <p>
          The Service charges $10 per appeal letter generated. Payment is processed through Stripe. All sales 
          are final. Refunds may be issued at our sole discretion in cases of technical errors or service 
          failures.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>8. Intellectual Property</h2>
        <p>
          The Service and its original content, features, and functionality are owned by Denial Appeal Pro and 
          are protected by international copyright, trademark, patent, trade secret, and other intellectual 
          property laws.
        </p>
        <p>
          You retain ownership of any content you input into the Service. By using the Service, you grant us 
          a license to use, store, and process your content solely for the purpose of providing the Service.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>9. HIPAA Compliance</h2>
        <p>
          If you are a covered entity or business associate under HIPAA, you are responsible for ensuring that 
          your use of the Service complies with HIPAA requirements. A Business Associate Agreement (BAA) is 
          available upon request for healthcare providers who require one.
        </p>
        <p>
          You agree to de-identify or encrypt any Protected Health Information (PHI) as necessary and to use 
          the minimum necessary information when using the Service.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>10. Modifications to Service</h2>
        <p>
          We reserve the right to modify, suspend, or discontinue the Service at any time without notice. We 
          will not be liable to you or any third party for any modification, suspension, or discontinuance of 
          the Service.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>11. Changes to Terms</h2>
        <p>
          We reserve the right to update these Terms of Service at any time. We will notify users of any 
          material changes by posting the new Terms of Service on this page and updating the "Last Updated" 
          date. Your continued use of the Service after any changes constitutes acceptance of the new terms.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>12. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the United States, 
          without regard to its conflict of law provisions.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>13. Severability</h2>
        <p>
          If any provision of these Terms is found to be unenforceable or invalid, that provision will be 
          limited or eliminated to the minimum extent necessary so that these Terms will otherwise remain in 
          full force and effect.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>14. Contact Information</h2>
        <p>
          If you have any questions about these Terms of Service, please contact us through the information 
          provided on our website.
        </p>
      </section>

      <div style={{ 
        marginTop: '60px', 
        padding: '20px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, color: '#666' }}>
          By using Denial Appeal Pro, you acknowledge that you have read, understood, and agree to be bound by 
          these Terms of Service.
        </p>
      </div>
    </div>
  );
}

export default TermsOfService;
