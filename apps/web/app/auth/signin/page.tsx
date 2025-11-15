'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, ArrowRight, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Get API URL from environment variable
      // In production, this MUST be set to the actual API service URL
      let apiUrl = process.env.NEXT_PUBLIC_API_URL
      
      if (!apiUrl) {
        // Fallback: try relative path (only works if proxied in development)
        apiUrl = ''
      } else if (apiUrl.endsWith('/')) {
        apiUrl = apiUrl.slice(0, -1)
      }

      // Construct the full API URL
      const url = apiUrl ? `${apiUrl}/api/auth/login` : '/api/auth/login'
      
      console.log('Signin request URL:', url) // Debug log
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      if (!response.ok) {
        let errorMessage = 'Invalid email or password'
        try {
          const data = await response.json()
          errorMessage = data.detail || data.message || errorMessage
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Store tokens
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)

      toast.success('Signed in successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Signin error:', error)
      const errorMessage = error.message || 'Failed to sign in. Please check your connection and try again.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="h-12 w-12 bg-gradient-to-br from-brand-blue-500 to-brand-purple-500 rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(59,130,246,0.45)]">
                <span className="text-white font-bold text-2xl">T</span>
              </div>
              <span className="text-white font-semibold text-2xl tracking-tight">Topcoin</span>
            </Link>
            
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-400/30 rounded-full text-emerald-200 text-xs font-medium">
                <Shield className="h-4 w-4 text-emerald-300/90" />
                <span>CMF Licensed</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-400/30 rounded-full text-sky-200 text-xs font-medium">
                <Shield className="h-4 w-4 text-sky-300/90" />
                <span>MSB Registered</span>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-white/60 text-sm">Sign in to access your trading dashboard</p>
          </div>

          {/* Sign In Form */}
          <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 shadow-[0_25px_80px_rgba(15,23,42,0.55)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-brand-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-brand-blue-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90 h-11"
              >
                {isLoading ? (
                  'Signing in...'
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-white/60 text-sm">
                Don't have an account?{' '}
                <Link href="/auth/signup" className="text-brand-blue-400 hover:text-brand-blue-300 font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </Card>

          <p className="text-xs text-white/50 text-center mt-6">
            ⚠️ Trading involves substantial risk of loss. Trade responsibly.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

