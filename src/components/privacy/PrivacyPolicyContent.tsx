"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PrivacyPolicyContent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-4xl px-6 py-12">
        {/* Header with back button */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Home
          </Link>
        </div>

        {/* Title */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-muted-foreground">
            5argny - Your Outing Platform & Guidebook
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Introduction
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to 5argny, your trusted outing platform and guidebook for expertly chosen places. 
              We are committed to protecting your privacy and ensuring the security of your information. 
              This Privacy Policy explains how we collect, use, and safeguard your information when you use our 
              platform and services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Information We Collect
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-foreground mb-2">
                  Usage Information
                </h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                  <li>Places you search for and visit</li>
                  <li>Your interactions with our platform</li>
                  <li>Device information and browser type</li>
                  <li>IP address and general location information</li>
                  <li>Location data when you use our mapping features</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              How We Use Your Information
            </h2>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Provide and improve our outing platform services</li>
              <li>Personalize your experience with expertly chosen places</li>
              <li>Integrate with Google Maps to show location information</li>
              <li>Ensure platform security and prevent fraud</li>
              <li>Analyze usage patterns to enhance our services</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Google Maps Integration
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Our platform integrates with Google Maps to provide location services and navigation features. 
              When you use these features:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Your location data may be shared with Google Maps services</li>
              <li>Google&apos;s Privacy Policy also applies to map-related features</li>
              <li>You can control location sharing through your device settings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Data Sharing and Disclosure
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              We do not sell your personal information. We may share your information only in these circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>With your explicit consent</li>
              <li>With service providers who help us operate our platform</li>
              <li>When required by law or to protect our legal rights</li>
              <li>In connection with a business transfer or merger</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Data Security
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate security measures to protect your information against 
              unauthorized access, alteration, disclosure, or destruction. However, no internet 
              transmission is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Your Rights and Choices
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Control location sharing settings</li>
              <li>Opt out of promotional communications if we add them in the future</li>
              <li>Contact us about any privacy concerns</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Cookies and Tracking
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to enhance your experience, remember your preferences, 
              and analyze how our platform is used. You can control cookie settings through your browser, 
              though some features may not work properly if cookies are disabled.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Changes to This Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any significant 
              changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. 
              Your continued use of our platform after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Contact Us
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>5argny Privacy Team</strong><br />
                Email: 5argny.eg@gmail.com<br />
                Website: www.5argny.com
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            © 2025 5argny. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

