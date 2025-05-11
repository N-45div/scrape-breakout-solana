'use client';
import { Lightbulb, Search, HelpCircle, Users, Code, Palette, Building, PenTool } from 'lucide-react';
import { motion } from 'framer-motion';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';

export function TargetAudienceAndFAQ() {
  const audiences = [
    {
      icon: Code,
      name: "AI Builders",
      description: "AI developers and researchers who need diverse, high-quality datasets for training models, looking for cost-effective data collection solutions",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: PenTool,
      name: "Node Operators",
      description: "Individuals who want to monetize their unused bandwidth by sharing IP addresses and executing scraping tasks to earn SCRAPE tokens",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Building,
      name: "Data Partners",
      description: "Organizations and enterprises focused on data-driven AI solutions, seeking more efficient alternatives to traditional proxy networks",
      color: "from-amber-500 to-orange-500"
    }
  ];

  const faqs = [
    {
      question: "How does the Decentralized Scraping Hub work?",
      answer: "Our platform uses a Chrome extension to create a network of user-provided IP addresses. Node operators share their bandwidth and execute AI-optimized scraping tasks, earning SCRAPE tokens as rewards. The scraped data is delivered in model-ready formats via IPFS/Arweave."
    },
    {
      question: "What technical background is needed to participate?",
      answer: "For node operators, no special technical skills are required - just install our Chrome extension. For AI builders, basic knowledge of data formats (JSONL, TFRecords, Parquet) and API integration is helpful. We provide comprehensive documentation for all users."
    },
    {
      question: "How much can I earn as a node operator?",
      answer: "Earnings depend on your bandwidth contribution and task completion. Node operators typically earn 70-90% of the revenue generated from scraping tasks, significantly more than traditional proxy services that keep most of the profits."
    },
    {
      question: "Is this legal and secure?",
      answer: "Yes. Our platform is designed for ethical data collection with built-in compliance features. We don't access sensitive user data, and all scraping tasks are vetted to ensure they comply with website terms of service and data protection regulations."
    }
  ];
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <section className="w-full py-20 px-4 bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
      {/* Background design elements - simplified */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Main large blurred circle */}
        <div className="absolute -left-40 top-1/4 w-[450px] h-[450px] bg-gradient-to-br from-purple-50 via-indigo-100 to-transparent dark:from-purple-950 dark:via-indigo-900 dark:to-transparent rounded-full opacity-40 transform blur-xl" />
        
        {/* Core cross lines */}
        <div className="absolute top-0 left-1/3 right-1/3 h-[2px] bg-gradient-to-r from-transparent via-blue-300 dark:via-blue-700 to-transparent opacity-60" />
        <div className="absolute bottom-0 left-1/3 right-1/3 h-[2px] bg-gradient-to-r from-transparent via-blue-300 dark:via-blue-700 to-transparent opacity-60" />
        
        {/* Primary diagonal line */}
        <div className="absolute top-0 right-0 w-[300px] h-[3px] bg-gradient-to-l from-transparent to-amber-300 dark:to-amber-700 opacity-50 transform -rotate-45 origin-top-right" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[3px] bg-gradient-to-r from-transparent to-amber-300 dark:to-amber-700 opacity-50 transform -rotate-45 origin-bottom-left" />
        
        {/* Minimal geometric shapes */}
        <div className="absolute top-20 right-20 w-32 h-32 border-4 border-indigo-200 dark:border-indigo-700 rounded-full opacity-40" />
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 opacity-30 transform rotate-12" />
        
        {/* Small circle accents */}
        <div className="absolute top-1/4 left-1/4 w-6 h-6 bg-gradient-to-br from-teal-200 to-teal-300 dark:from-teal-700 dark:to-teal-600 rounded-full opacity-60 shadow-md" />
        <div className="absolute bottom-1/3 right-1/3 w-8 h-8 bg-gradient-to-br from-rose-200 to-rose-300 dark:from-rose-700 dark:to-rose-600 rounded-full opacity-60 shadow-md" />
      </div>
      
      <Container className="relative z-10">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="space-y-20"
        >
          {/* Target Audience Section */}
          <div>
            <motion.div variants={itemVariants} className="text-center mb-12">
              <div className="inline-flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 p-2 mb-4">
                <Users className="h-6 w-6 text-gray-900 dark:text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">Target Audience</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Recruiting <strong>Developers</strong>, <strong>Contributors</strong>, and <strong>Sponsors</strong> to jointly explore the future of AI+Web3
              </p>
            </motion.div>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto"
            >
              {audiences.map((audience, index) => (
                <motion.div key={audience.name} variants={itemVariants}>
                  <Card className="h-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                    <div className="p-6">
                      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-gray-100 dark:bg-gray-800 mb-4 mx-auto">
                        <span className="text-lg font-bold text-gray-800 dark:text-gray-200">{index + 1}</span>
                      </div>
                      <h3 className="font-semibold text-lg text-center text-gray-900 dark:text-white mb-2">{audience.name}</h3>
                      <p className="text-sm text-center text-gray-600 dark:text-gray-400">{audience.description}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* FAQ Section */}
          <div>
            <motion.div variants={itemVariants} className="text-center mb-12">
              <div className="inline-flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 p-2 mb-4">
                <HelpCircle className="h-6 w-6 text-gray-800 dark:text-gray-200" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">Who We Serve</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Connecting <strong>AI Builders</strong>, <strong>Node Operators</strong>, and <strong>Data Partners</strong> to revolutionize data collection for AI
              </p>
            </motion.div>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {faqs.map((faq) => (
                <motion.div key={faq.question} variants={itemVariants}>
                  <Card className="h-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                    <div className="p-6">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">{faq.question}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}