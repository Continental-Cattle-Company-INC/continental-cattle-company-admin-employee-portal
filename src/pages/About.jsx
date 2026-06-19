import SectionHeader from '@/components/SectionHeader';

export default function About() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <SectionHeader
        title="ABOUT CONTINENTAL CATTLE CO"
        subtitle="Enterprise-grade cattle management and market intelligence platform"
      />

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h1 className="font-bebas text-3xl text-foreground mb-4">About Continental Cattle Company</h1>
        
        <p className="text-foreground leading-relaxed mb-4">
          Continental Cattle Company is a comprehensive cattle management and market intelligence platform designed for modern livestock operations. Our enterprise-grade software empowers ranchers, feedlot operators, traders, and agricultural professionals to make data-driven decisions with confidence.
        </p>

        <p className="text-foreground leading-relaxed mb-4">
          Built specifically for the cattle industry, our platform integrates real-time market data from CME and USDA sources with advanced analytics, financial modeling tools, and operational management features. Whether you're managing a calf ranch, operating a feedlot, trading cattle, or overseeing multiple entities, Continental Cattle Company provides the insights and tools you need to maximize profitability and efficiency.
        </p>

        <p className="text-foreground leading-relaxed mb-4">
          Our platform serves a diverse range of users including ranch operators, feedlot managers, commodity traders, trucking companies, financial institutions, and agricultural consultants. From individual cow-calf operations to large multi-entity corporations, our tools scale to meet your needs with features like live market inputs, ROI ladder analysis, cutout engine calculations, enterprise financial modeling, and comprehensive load board management.
        </p>

        <p className="text-foreground leading-relaxed mb-4">
          Continental Cattle Company is developed and maintained by a team of agricultural technology experts, livestock industry veterans, and software engineers who understand the unique challenges of modern cattle operations. Our mission is to provide the most advanced, reliable, and user-friendly platform for cattle management and market analysis, helping our users stay competitive in an ever-changing agricultural landscape.
        </p>

        <p className="text-foreground leading-relaxed">
          With features ranging from AI-powered feed planning and health protocols to real-time logistics tracking and offline-first resilience, Continental Cattle Company represents the cutting edge of agricultural technology. We are committed to continuous innovation, ensuring our platform evolves with the needs of the cattle industry while maintaining the highest standards of data accuracy, security, and performance.
        </p>
      </div>
    </div>
  );
}