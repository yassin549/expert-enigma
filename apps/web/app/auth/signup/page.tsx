'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, ArrowRight, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create account')
      }

      // Store tokens
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)

      toast.success('Account created successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account. Please try again.')
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

            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-white/60 text-sm">Start trading with Topcoin today</p>
          </div>

          {/* Sign Up Form */}
          <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 shadow-[0_25px_80px_rgba(15,23,42,0.55)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-white/80">
                  Display Name (Optional)
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-brand-blue-500"
                  />
                </div>
              </div>

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
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-brand-blue-500"
                  />
                </div>
                <p className="text-xs text-white/50">Must be at least 8 characters</p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90 h-11"
              >
                {isLoading ? (
                  'Creating account...'
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-white/60 text-sm">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-brand-blue-400 hover:text-brand-blue-300 font-medium">
                  Sign in
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

