'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, MousePointer, Move, Zap, Shield, Target, Settings } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Home() {
  const [password, setPassword] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [passwordLength, setPasswordLength] = useState([32])
  const [customLength, setCustomLength] = useState('')
  const [useCustomLength, setUseCustomLength] = useState(false)
  const [includeUppercase, setIncludeUppercase] = useState(true)
  const [includeLowercase, setIncludeLowercase] = useState(true)
  const [includeNumbers, setIncludeNumbers] = useState(true)
  const [includeSymbols, setIncludeSymbols] = useState(true)
  const [includeExtendedASCII, setIncludeExtendedASCII] = useState(false)
  const [characterSet, setCharacterSet] = useState('standard')
  const [entropy, setEntropy] = useState(0)
  const [cursorData, setCursorData] = useState<{x: number, y: number, timestamp: number}[]>([])
  const [isTracking, setIsTracking] = useState(false)
  const [trackingProgress, setTrackingProgress] = useState(0)
  const [requiredMovements, setRequiredMovements] = useState([100])
  const [customRequiredMovements, setCustomRequiredMovements] = useState('')
  const [useCustomRequiredMovements, setUseCustomRequiredMovements] = useState(false)
  const trackingAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    const actualRequiredMovements = getActualRequiredMovements()
    if (isTracking && cursorData.length >= actualRequiredMovements) {
      setIsTracking(false)
      generatePassword()
    }
    if (isTracking) {
      setTrackingProgress((cursorData.length / actualRequiredMovements) * 100)
    }
  }, [cursorData, isTracking, requiredMovements, customRequiredMovements, useCustomRequiredMovements])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isTracking || !trackingAreaRef.current) return
    const rect = trackingAreaRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const timestamp = Date.now()
    setCursorData(prev => [...prev, { x, y, timestamp }])
  }

  const startTracking = () => {
    setCursorData([])
    setIsTracking(true)
    setTrackingProgress(0)
  }

  const getActualPasswordLength = () => {
    if (useCustomLength) {
      const length = parseInt(customLength)
      return Math.max(8, Math.min(256, length || 32))
    }
    return passwordLength[0]
  }

  const getActualRequiredMovements = () => {
    if (useCustomRequiredMovements) {
      const movements = parseInt(customRequiredMovements)
      return Math.max(10, Math.min(1000, movements || 100))
    }
    return requiredMovements[0]
  }

  const generatePassword = async () => {
    const actualRequiredMovements = getActualRequiredMovements()
    if (cursorData.length < actualRequiredMovements) {
      toast({
        title: "Not enough cursor data",
        description: `Move your cursor around the area to collect ${actualRequiredMovements} movements.`,
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const actualLength = getActualPasswordLength()
      const response = await fetch('/api/generate-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursorData,
          length: actualLength,
          includeUppercase,
          includeLowercase,
          includeNumbers,
          includeSymbols,
          includeExtendedASCII,
          characterSet,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate password')
      }

      const data = await response.json()
      setPassword(data.password)
      setEntropy(data.entropy)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      setCursorData([])
      setTrackingProgress(0)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password)
      toast({ title: "Copied!", description: "Password copied to clipboard." })
    } catch {
      toast({ title: "Error", description: "Failed to copy password.", variant: "destructive" })
    }
  }

  const getStrengthColor = (entropy: number) => {
    if (entropy >= 256) return 'bg-emerald-600'
    if (entropy >= 128) return 'bg-amber-500'
    return 'bg-rose-500'
  }

  const getStrengthText = (entropy: number) => {
    if (entropy >= 256) return 'Excellent'
    if (entropy >= 128) return 'Good'
    return 'Weak'
  }

  return (
    {/* ---- Minimal, logo-led header on white ---- */}
    <div className="min-h-screen bg-white text-slate-900">
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        {/* Brand row: logo + wordmark */}
        <div className="mb-8 flex items-center justify-center md:justify-start gap-3">
          <img
            src="/rdmpass-logo.png"
            alt="rdmpass logo"
            className="w-14 h-14 md:w-16 md:h-16 object-contain"
          />
          <h1 className="leading-none tracking-tight">
            <span className="text-3xl md:text-4xl font-extrabold">rdm</span>
            <span className="text-3xl md:text-4xl font-medium text-slate-600">pass</span>
          </h1>
        </div>

        {/* Subhead */}
        <p className="text-base md:text-lg text-slate-600 mb-10 max-w-2xl md:max-w-3xl md:pr-8">
          Generate cryptographically strong passwords from your unique cursor movement. Real user motion → real entropy.
        </p>

        {/* Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Password Generator */}
          <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Zap className="h-5 w-5 text-sky-600" />
                Cursor-movement password generator
              </CardTitle>
              <CardDescription className="text-slate-600">
                Move inside the box to collect randomness; then we derive your password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password display */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">Generated password</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    value={password}
                    readOnly
                    placeholder="Move your cursor to generate a password"
                    className="font-mono text-lg bg-white border-slate-300 text-slate-900"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    disabled={!password}
                    className="border-slate-300 hover:bg-slate-50"
                    aria-label="Copy password"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {password && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-700">Strength:</span>
                    <Badge variant="outline" className={`${getStrengthColor(entropy)} text-white border-0`}>
                      {getStrengthText(entropy)}
                    </Badge>
                    <span className="text-slate-600">{entropy} bits of entropy</span>
                  </div>
                )}
              </div>

              {/* Tracking area */}
              <div className="space-y-3">
                <Label className="text-slate-700">Move your cursor here to generate randomness</Label>
                <div
                  ref={trackingAreaRef}
                  onMouseMove={handleMouseMove}
                  className="relative w-full h-40 border-2 border-dashed border-slate-300 rounded-md bg-slate-50 cursor-crosshair overflow-hidden"
                >
                  {isTracking && (
                    <div className="absolute inset-0 bg-sky-100/40 flex items-center justify-center">
                      <div className="text-center">
                        <Move className="h-8 w-8 mx-auto mb-2 text-sky-600 animate-pulse" />
                        <p className="text-sm font-medium text-sky-700">
                          Keep moving… ({cursorData.length}/{getActualRequiredMovements()})
                        </p>
                      </div>
                    </div>
                  )}

                  {/* trail */}
                  {cursorData.slice(-30).map((point, index) => (
                    <div
                      key={index}
                      className="absolute w-2 h-2 bg-sky-500 rounded-full"
                      style={{
                        left: point.x - 4,
                        top: point.y - 4,
                        transform: `scale(${0.2 + (index / 30) * 0.8})`,
                        opacity: 0.2 + (index / 30) * 0.8,
                      }}
                    />
                  ))}
                </div>

                {isTracking && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-700">
                      <span>Collecting cursor movements…</span>
                      <span>{cursorData.length}/{getActualRequiredMovements()}</span>
                    </div>
                    <Progress value={trackingProgress} className="w-full" />
                  </div>
                )}

                {!isTracking && cursorData.length === 0 && (
                  <Button onClick={startTracking} className="w-full bg-sky-600 hover:bg-sky-700">
                    <MousePointer className="h-4 w-4 mr-2" />
                    Start cursor tracking
                  </Button>
                )}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="options" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100">
                  <TabsTrigger value="options" className="text-slate-700">Options</TabsTrigger>
                  <TabsTrigger value="advanced" className="text-slate-700">Advanced</TabsTrigger>
                  <TabsTrigger value="about" className="text-slate-700">About rdmpass</TabsTrigger>
                </TabsList>

                <TabsContent value="options" className="space-y-4 pt-4">
                  {/* Length */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch id="custom-length" checked={useCustomLength} onCheckedChange={setUseCustomLength} />
                      <Label htmlFor="custom-length" className="text-slate-700">Custom length</Label>
                    </div>

                    {useCustomLength ? (
                      <div className="space-y-2">
                        <Label htmlFor="custom-length-input" className="text-slate-700">
                          Custom length (8–256): {customLength || '32'}
                        </Label>
                        <Input
                          id="custom-length-input"
                          type="number"
                          min="8"
                          max="256"
                          value={customLength}
                          onChange={(e) => setCustomLength(e.target.value)}
                          className="bg-white border-slate-300 text-slate-900"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-slate-700">Password length: {passwordLength[0]} characters</Label>
                        <Slider value={passwordLength} onValueChange={setPasswordLength} max={128} min={8} step={1} />
                      </div>
                    )}
                  </div>

                  {/* Character toggles */}
                  <div className="grid grid-cols-2 gap-4">
                    <ToggleRow id="uppercase" label="Uppercase (A–Z)" checked={includeUppercase} onChange={setIncludeUppercase} />
                    <ToggleRow id="lowercase" label="Lowercase (a–z)" checked={includeLowercase} onChange={setIncludeLowercase} />
                    <ToggleRow id="numbers"   label="Numbers (0–9)"  checked={includeNumbers}  onChange={setIncludeNumbers} />
                    <ToggleRow id="symbols"   label="Symbols (!@#$%)" checked={includeSymbols}  onChange={setIncludeSymbols} />
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Character set</Label>
                    <Select value={characterSet} onValueChange={setCharacterSet}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="standard">Standard ASCII</SelectItem>
                        <SelectItem value="extended">Extended ASCII/Latin-1</SelectItem>
                        <SelectItem value="unicode">Unicode symbols</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <ToggleRow
                    id="extended-ascii"
                    label="Include Extended ASCII (128–255) for higher entropy"
                    checked={includeExtendedASCII}
                    onChange={setIncludeExtendedASCII}
                  />

                  {/* Movement sensitivity */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch id="custom-movements" checked={useCustomRequiredMovements} onCheckedChange={setUseCustomRequiredMovements} />
                      <Label htmlFor="custom-movements" className="text-slate-700">Custom required movements</Label>
                    </div>

                    {useCustomRequiredMovements ? (
                      <div className="space-y-2">
                        <Label htmlFor="custom-movements-input" className="text-slate-700">
                          Custom movements (10–1000): {customRequiredMovements || '100'}
                        </Label>
                        <Input
                          id="custom-movements-input"
                          type="number"
                          min="10"
                          max="1000"
                          value={customRequiredMovements}
                          onChange={(e) => setCustomRequiredMovements(e.target.value)}
                          className="bg-white border-slate-300 text-slate-900"
                        />
                        <p className="text-xs text-slate-500">Higher values increase entropy but take longer to collect.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-slate-700">Required movements: {requiredMovements[0]}</Label>
                        <Slider value={requiredMovements} onValueChange={setRequiredMovements} max={500} min={50} step={10} />
                        <p className="text-xs text-slate-500">More movements = higher entropy (but longer collection).</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="about" className="space-y-4 pt-4">
                  <div className="space-y-4 text-sm text-slate-700">
                    <InfoRow icon={<Target className="h-5 w-5 text-sky-600" />} title="Human randomness">
                      Your cursor movements include micro-jitter and timing noise, which are hard to model or replay.
                    </InfoRow>
                    <InfoRow icon={<Shield className="h-5 w-5 text-emerald-600" />} title="Cryptographic security">
                      We hash your movement data and derive keys using well-known, audited primitives.
                    </InfoRow>
                    <InfoRow icon={<Move className="h-5 w-5 text-indigo-600" />} title="Unique every time">
                      No two people move a cursor the same way, so each password is uniquely seeded.
                    </InfoRow>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Right column */}
          <div className="space-y-6">
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <MousePointer className="h-5 w-5 text-sky-600" />
                  Why cursor movement?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <p>PRNGs are deterministic; human motion isn’t. We harvest timing and position jitter from real movement.</p>
                <p>Micro-variations and path changes are difficult to predict or reproduce.</p>
                <p>Your motion becomes entropy that seeds a strong key.</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Zap className="h-5 w-5 text-sky-600" />
                  Entropy analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <div className="space-y-2">
                  <Row label="Movement patterns" value="Analyzed" />
                  <Row label="Timing variations" value="Measured" />
                  <Row label="Velocity changes" value="Calculated" />
                  <Row label="Direction changes" value="Tracked" />
                </div>
                <p className="text-xs text-slate-500">These combine to create high-entropy inputs for key derivation.</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Settings className="h-5 w-5 text-sky-600" />
                  Security features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <ul className="space-y-1 text-xs">
                  <li>• SHA-256 hashing</li>
                  <li>• Cursor-based entropy</li>
                  <li>• Extended ASCII support</li>
                  <li>• Custom length passwords (8–256)</li>
                  <li>• Real-time entropy meter</li>
                  <li>• Movement pattern analysis</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Small presentational helpers */
function ToggleRow({
  id, label, checked, onChange,
}: { id:string; label:string; checked:boolean; onChange:(v:boolean)=>void }) {
  return (
    <div className="flex items-center space-x-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-slate-700">{label}</Label>
    </div>
  )
}
function Row({label, value}:{label:string; value:string}) {
  return (
    <div className="flex justify-between">
      <span>{label}:</span>
      <Badge variant="outline" className="text-xs">{value}</Badge>
    </div>
  )
}
function InfoRow({icon, title, children}:{icon:React.ReactNode; title:string; children:React.ReactNode}) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="text-slate-600">{children}</p>
      </div>
    </div>
  )
}
