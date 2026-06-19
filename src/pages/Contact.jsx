import SectionHeader from '@/components/SectionHeader';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function Contact() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <SectionHeader
        title="CONTACT US"
        subtitle="Get in touch with our team"
      />

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h1 className="font-bebas text-3xl text-foreground mb-6">Contact Continental Cattle Company</h1>
        
        <p className="text-foreground leading-relaxed mb-6">
          Have questions about our platform? Need support or want to learn more about how Continental Cattle Company can help your operation? We're here to help.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-primary" />
              <h3 className="font-bebas text-lg text-foreground">Email Us</h3>
            </div>
            <p className="text-muted-foreground mb-2">General Inquiries</p>
            <a href="mailto:info@continentalcattle.co" className="text-primary hover:underline text-sm">
              info@continentalcattle.co
            </a>
            <p className="text-muted-foreground mt-4 mb-2">Support</p>
            <a href="mailto:support@continentalcattle.co" className="text-primary hover:underline text-sm">
              support@continentalcattle.co
            </a>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Phone className="w-6 h-6 text-primary" />
              <h3 className="font-bebas text-lg text-foreground">Call Us</h3>
            </div>
            <p className="text-muted-foreground mb-2">Business Hours</p>
            <p className="text-foreground font-medium">Monday - Friday</p>
            <p className="text-muted-foreground text-sm">8:00 AM - 6:00 PM CST</p>
            <p className="text-muted-foreground mt-4 mb-2">Phone</p>
            <a href="tel:+15551234567" className="text-primary hover:underline text-sm">
              (555) 123-4567
            </a>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-primary" />
              <h3 className="font-bebas text-lg text-foreground">Visit Us</h3>
            </div>
            <p className="text-foreground text-sm">
              Continental Cattle Company<br />
              123 Livestock Drive<br />
              Shattuck, OK 73858<br />
              United States
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-primary" />
              <h3 className="font-bebas text-lg text-foreground">Response Time</h3>
            </div>
            <p className="text-foreground text-sm mb-2">
              We typically respond to all inquiries within:
            </p>
            <ul className="text-muted-foreground text-sm space-y-1">
              <li>• Email: Within 24 hours</li>
              <li>• Phone: Immediate during business hours</li>
              <li>• Support Tickets: Within 4 hours</li>
            </ul>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
          <h3 className="font-bebas text-lg text-primary mb-3">Platform Support</h3>
          <p className="text-muted-foreground text-sm mb-4">
            For technical support, feature requests, or bug reports, please contact our support team. We're committed to ensuring your experience with Continental Cattle Company is exceptional.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="mailto:support@continentalcattle.co" className="text-primary hover:underline flex items-center gap-2">
              <Mail className="w-4 h-4" />
              support@continentalcattle.co
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}