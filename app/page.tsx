'use client';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-white-pattern">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-between pb-10 md:pb-20">
        <Link href="/">
          <div className="container mx-auto px-4 md:px-16 pt-20 md:pt-32">
            <Image
              className="cursor-pointer"
              src="/assets/logos/logo.svg"
              width={150}
              height={150}
              alt="Randamu Logo"
            />
          </div>
        </Link>
        <div className="container mx-auto px-4 md:px-16">
          <div className="pt-10 md:pt-20">
            {/* Main Content */}
            <div className="space-y-4 md:space-y-6 mb-10 md:mb-16">
              <h1 className="font-funnel-display text-3xl md:text-5xl lg:text-7xl font-bold text-black max-w-4xl">
                Soccer Penalty Shootout
              </h1>
              <p className="font-funnel-sans text-lg md:text-xl text-gray-500">
                Experience verifiable randomness through an interactive penalty game — powered by RandamusThreshold Cryptography.
              </p>
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <div className="container mx-auto px-4 md:px-16">
          <div className="flex flex-col md:flex-row items-center justify-between border-t border-gray-200 pt-6 md:pt-8 gap-4 md:gap-0">
            <div className="flex items-center gap-2">
              <span className="font-funnel-sans text-gray-900">Ready to Play?</span>
            </div>
            <div className="w-full md:w-auto">
              <Link href="/penalty" className="w-full md:w-[200px]">
                <div className="w-full md:w-[300px] py-4 font-funnel-sans text-white bg-red-500 hover:bg-red-600 transition-colors text-center text-lg font-semibold rounded-lg shadow-lg">
                  ⚽ Start Penalty Shootout
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black-pattern text-white py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-0">
            <div className="text-center md:text-left">
              <Image
                className="cursor-pointer"
                src="/assets/logos/lightLogo.svg"
                width={150}
                height={150}
                alt="Randamu Logo"
              />
              <p className="font-funnel-sans text-gray-400 mt-2">Verifiable Randomness for Web3</p>
            </div>
            <div className="flex space-x-6">
              <a href="https://docs.randa.mu/" target="_blank" className="text-gray-400 hover:text-white transition-colors duration-300">
                Documentation
              </a>
              <a href="https://github.com/randa-mu" target="_blank" className="text-gray-400 hover:text-white transition-colors duration-300">
                GitHub
              </a>
              <a href="https://x.com/RandamuInc/" target="_blank" className="text-gray-400 hover:text-white transition-colors duration-300">
                Twitter
              </a>
            </div>
          </div>
          <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-800 text-center">
            <p className="font-funnel-sans text-gray-400">
              Task #2 - Threshold Cryptography Bootcamp by Randamu
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
