"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { clientApi } from "@/lib/api-client";

export function ContactForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus("idle");

    try {
      await clientApi.contact.submit({
        name: name || "Anonymous",
        email,
        subject,
        message
      });

      setStatus("success");
      setSubject("");
      setMessage("");
      setEmail("");
      setName("");
    } catch (error) {
      console.error("Error sending message:", error);
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Home
          </Link>
        </div>
        
        <h1 className="mb-6 text-3xl font-bold text-foreground">
          Contact & Feedback
        </h1>
        
        <p className="mb-6 text-muted-foreground">
          Ask questions or request support. We&apos;ll respond within 24 hours.
        </p>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name (Optional)</Label>
            <Input 
              id="name"
              type="text"
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Your name" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Your Email *</Label>
            <Input 
              id="email"
              type="email"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="your.email@example.com" 
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input 
              id="subject"
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
              placeholder="What's this about?" 
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea 
              id="message"
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Tell us more about your question or feedback..." 
              rows={6} 
              required
            />
          </div>

          {/* Status Messages */}
          {status === "success" && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                ✅ Message sent successfully! We&apos;ll respond within 24 hours.
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <AlertDescription>
                ❌ Failed to send message. Please try again or contact us directly.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button 
              type="submit" 
              disabled={isLoading || !subject.trim() || !message.trim() || !email.trim()}
            >
              {isLoading ? "Sending..." : "Send Message"}
            </Button>
            
            <Button 
              variant="outline"
              asChild
            >
              <a href="mailto:5argny.eg@gmail.com">
                Open Mail Client
              </a>
            </Button>
          </div>
        </form>
        
        <div className="mt-8 rounded-lg bg-muted p-6">
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Alternative Contact Methods
          </h3>
          <p className="text-muted-foreground">
            You can also reach us directly at{" "}
            <a 
              href="mailto:5argny.eg@gmail.com" 
              className="text-primary hover:text-primary/80"
            >
              5argny.eg@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

