import Link from 'next/link';
import Image from 'next/image';
import { Github } from 'lucide-react';
import { Container } from '@/components/ui/container';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-12 bg-gray-50 dark:bg-gray-950">
      <Container>
        <div className="flex justify-center items-center ">
            <p className="text-gray-600 dark:text-gray-400 text-center md:text-left">
              © {currentYear} Scrape Labs
            </p>
        </div>
      </Container>
    </footer>
  );
} 