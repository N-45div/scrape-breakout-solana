import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';

export function HeroSection() {
  return (
    <section className="w-full py-24 pb-16 lg:py-32 lg:pb-24 px-4 bg-white dark:bg-black relative overflow-hidden">
      {/* Geometric background elements - simplified */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Main large blurred circles */}
        <div className="absolute -top-40 left-1/4 w-[400px] h-[400px] bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-800 rounded-full opacity-50 transform -translate-x-1/2 blur-xl" />
        <div className="absolute bottom-[-200px] right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-purple-100 to-indigo-200 dark:from-purple-900 dark:to-indigo-800 rounded-full opacity-50 transform translate-x-1/2 blur-xl" />

        {/* Key accent circles */}
        <div className="absolute top-1/4 right-10 w-16 h-16 bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-700 dark:to-orange-600 rounded-full opacity-60 shadow-lg" />
        <div className="absolute bottom-1/4 left-10 w-12 h-12 bg-gradient-to-br from-emerald-200 to-green-300 dark:from-emerald-700 dark:to-green-600 rounded-full opacity-60 shadow-lg" />

        {/* Primary square */}
        <div className="absolute top-1/3 right-0 w-60 h-60 border-4 border-indigo-200 dark:border-indigo-800 rounded-md opacity-40 transform rotate-12" />

        {/* Main diagonal lines */}
        <div className="absolute top-1/2 left-1/2 w-[800px] h-[3px] bg-gradient-to-r from-transparent via-indigo-300 dark:via-indigo-700 to-transparent opacity-70 transform -rotate-45" />

        {/* Horizontal lines */}
        <div className="absolute top-1/4 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-300 dark:via-blue-700 to-transparent opacity-50" />
        <div className="absolute bottom-1/4 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-300 dark:via-purple-700 to-transparent opacity-50" />
      </div>

      <Container className="relative z-10">
        <div className="flex flex-col items-center max-w-4xl mx-auto">
          <div className="text-center">

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
              <span className="bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 dark:from-gray-300 dark:via-gray-200 dark:to-white bg-clip-text text-transparent">Scrape</span>
            </h1>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-800 dark:text-gray-200 mb-4">
              Power AI, Share the Rewards
            </h2>

            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-3xl mx-auto">
              A decentralized scraping hub solving data challenges for AI builders through innovative  scraping solutions and that leverages token incentives to create a decentralized proxy network of millions of user-provided IP addresses
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
