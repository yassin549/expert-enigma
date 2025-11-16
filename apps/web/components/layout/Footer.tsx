'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 bg-gradient-to-br from-brand-blue-500 to-brand-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">T</span>
              </div>
              <span className="text-white font-semibold">Topcoin</span>
            </div>
            <p className="text-white/60 text-sm">
              The future of trading. CMF licensed and MSB registered.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>
                <Link href="/assets" className="hover:text-white transition-colors">
                  Assets
                </Link>
              </li>
              <li>
                <Link href="/trading" className="hover:text-white transition-colors">
                  Trading
                </Link>
              </li>
              <li>
                <Link href="/ai-plans" className="hover:text-white transition-colors">
                  AI Plans
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/compliance" className="hover:text-white transition-colors">
                  Compliance
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/risk-disclosure" className="hover:text-white transition-colors">
                  Risk Disclosure
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-8 text-center text-white/60 text-sm">
          <p>© 2025 Topcoin. All rights reserved. CMF-2024-001 | MSB-2024-TOPCOIN-001</p>
          <p className="mt-2">Trading involves substantial risk of loss. Trade responsibly.</p>
        </div>
      </div>
    </footer>
  )
}

