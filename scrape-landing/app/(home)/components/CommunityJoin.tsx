"use client"

import { Button } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { motion } from "framer-motion"
import { ArrowRight, Check, Loader2 } from "lucide-react"
import { useState } from "react"

export function CommunityJoin() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoinWaitlist = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const res = await fetch("/api/send", { method: "POST" })
      const data = await res.json()
      
      if (res.ok) {
        setIsSuccess(true)
      } else {
        setError(data.message || "Submission failed. Please try again later.")
      }
    } catch (err) {
      setError("An error occurred. Please try again later.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="w-full py-16 px-4 bg-white dark:bg-black relative overflow-hidden">
      {/* Background design elements - simplified */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Main large blurred circle */}
        <div className="absolute top-0 left-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-50 via-indigo-100 to-transparent dark:from-blue-950 dark:via-indigo-900 dark:to-transparent rounded-full opacity-40 transform -translate-x-1/2 -translate-y-1/2 blur-xl" />

        {/* Accent blurred circle */}
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-amber-50 via-orange-100 to-transparent dark:from-amber-950 dark:via-orange-900 dark:to-transparent rounded-full opacity-40 transform translate-x-1/3 translate-y-1/3 blur-xl" />

        {/* Horizontal line */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-300 dark:via-blue-700 to-transparent opacity-70" />

        {/* Diagonal lines */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-0 right-0 w-[300px] h-[3px] bg-gradient-to-l from-transparent to-purple-300 dark:to-purple-700 opacity-50 transform -rotate-45 origin-top-right" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[3px] bg-gradient-to-r from-transparent to-purple-300 dark:to-purple-700 opacity-50 transform -rotate-45 origin-bottom-left" />
        </div>

        {/* Accent shapes */}
        <div className="absolute top-1/4 left-1/4 w-12 h-12 border-4 border-indigo-200 dark:border-indigo-800 rounded-full opacity-50 transform rotate-45" />
        <div className="absolute bottom-1/4 right-1/4 w-16 h-16 bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900 dark:to-teal-800 opacity-40 transform rotate-12" />
      </div>

      <Container className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
            Join the Decentralized Scraping Network
          </h2>

          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Become part of a revolutionary platform that's solving data collection challenges for AI builders. 
            Share your bandwidth, earn SCRAPE tokens, and help create a more accessible, 
            cost-effective alternative to centralized proxy networks.
          </p>

          <div className="flex flex-col items-center justify-center mb-12">
            <Button
              onClick={handleJoinWaitlist}
              disabled={isLoading || isSuccess}
              size="lg"
              className={`${
                isSuccess 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800"
              } cursor-pointer text-white shadow-lg px-8`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                </>
              ) : isSuccess ? (
                <>
                  <Check className="mr-2 h-5 w-5" /> Joined Waitlist
                </>
              ) : (
                <>
                  Join the Waitlist <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            
            {error && (
              <p className="mt-4 text-red-500 text-sm">{error}</p>
            )}
            
            {isSuccess && (
              <p className="mt-4 text-green-500 text-sm">
                Thank you for joining! We'll be in touch soon.
              </p>
            )}
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
