import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

interface CursorPoint {
  x: number
  y: number
  timestamp: number
}

interface GeneratePasswordRequest {
  cursorData: CursorPoint[]
  length: number
  includeUppercase: boolean
  includeLowercase: boolean
  includeNumbers: boolean
  includeSymbols: boolean
  includeExtendedASCII: boolean
  characterSet: string
}

interface GeneratePasswordResponse {
  password: string
  entropy: number
}

// Character sets for password generation
const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?~`',
  extendedASCII: '' // Will be generated dynamically
}

// Generate Extended ASCII characters (128-255) excluding control characters
function generateExtendedASCII(): string {
  let extended = ''
  for (let i = 128; i <= 255; i++) {
    // Skip control characters (128-159) and include only printable characters
    if (i >= 160 || i === 173) { // 173 is the soft hyphen, include it
      extended += String.fromCharCode(i)
    }
  }
  return extended
}

// Unicode symbols for additional entropy
const UNICODE_SYMBOLS = '¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ'

function extractCursorEntropy(cursorData: CursorPoint[]): string {
  if (cursorData.length < 2) {
    // Fallback to random bytes if insufficient data
    return crypto.randomBytes(64).toString('hex')
  }

  let entropyData = ''
  
  // Extract various entropy sources from cursor movement
  for (let i = 1; i < cursorData.length; i++) {
    const prev = cursorData[i - 1]
    const curr = cursorData[i]
    
    // Calculate movement vectors with high precision
    const deltaX = curr.x - prev.x
    const deltaY = curr.y - prev.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    // Calculate timing differences with microsecond precision
    const deltaTime = curr.timestamp - prev.timestamp
    const velocity = deltaTime > 0 ? distance / deltaTime : 0
    
    // Calculate angles and direction changes
    const angle = Math.atan2(deltaY, deltaX)
    
    // Extract micro-movements and patterns
    const acceleration = i > 1 ? 
      velocity - (Math.sqrt(
        Math.pow(cursorData[i-1].x - cursorData[i-2].x, 2) + 
        Math.pow(cursorData[i-1].y - cursorData[i-2].y, 2)
      ) / (cursorData[i-1].timestamp - cursorData[i-2].timestamp)) : 0
    
    // Calculate jerk (rate of change of acceleration)
    const jerk = i > 2 ? 
      acceleration - (velocity - (Math.sqrt(
        Math.pow(cursorData[i-2].x - cursorData[i-3].x, 2) + 
        Math.pow(cursorData[i-2].y - cursorData[i-3].y, 2)
      ) / (cursorData[i-2].timestamp - cursorData[i-3].timestamp))) : 0
    
    // Combine all entropy sources with high precision
    entropyData += [
      deltaX.toFixed(6),
      deltaY.toFixed(6),
      distance.toFixed(6),
      deltaTime.toString(),
      velocity.toFixed(8),
      angle.toFixed(8),
      acceleration.toFixed(10),
      jerk.toFixed(12),
      curr.x.toString(),
      curr.y.toString(),
      curr.timestamp.toString(),
      crypto.randomBytes(4).toString('hex') // Additional randomness
    ].join('|') + ','
  }
  
  // Add overall movement statistics
  const totalDistance = cursorData.reduce((sum, point, i) => {
    if (i === 0) return 0
    const prev = cursorData[i-1]
    return sum + Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2))
  }, 0)
  
  const totalTime = cursorData[cursorData.length - 1].timestamp - cursorData[0].timestamp
  const avgVelocity = totalTime > 0 ? totalDistance / totalTime : 0
  
  // Calculate movement complexity (how unpredictable the movement is)
  let directionChanges = 0
  let totalAngleChange = 0
  
  for (let i = 2; i < cursorData.length; i++) {
    const angle1 = Math.atan2(
      cursorData[i-1].y - cursorData[i-2].y,
      cursorData[i-1].x - cursorData[i-2].x
    )
    const angle2 = Math.atan2(
      cursorData[i].y - cursorData[i-1].y,
      cursorData[i].x - cursorData[i-1].x
    )
    let angleDiff = Math.abs(angle2 - angle1)
    
    // Normalize angle difference to [0, π]
    if (angleDiff > Math.PI) {
      angleDiff = 2 * Math.PI - angleDiff
    }
    
    totalAngleChange += angleDiff
    
    if (angleDiff > Math.PI / 6) { // 30 degree threshold for significant direction change
      directionChanges++
    }
  }
  
  // Calculate velocity variance
  const velocities = []
  for (let i = 1; i < cursorData.length; i++) {
    const prev = cursorData[i - 1]
    const curr = cursorData[i]
    const deltaTime = curr.timestamp - prev.timestamp
    if (deltaTime > 0) {
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      )
      velocities.push(distance / deltaTime)
    }
  }
  
  const avgVel = velocities.reduce((sum, v) => sum + v, 0) / velocities.length
  const velocityVariance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVel, 2), 0) / velocities.length
  
  // Calculate spatial entropy (how spread out the movements are)
  const xCoords = cursorData.map(p => p.x)
  const yCoords = cursorData.map(p => p.y)
  const xRange = Math.max(...xCoords) - Math.min(...xCoords)
  const yRange = Math.max(...yCoords) - Math.min(...yCoords)
  const spatialEntropy = xRange * yRange
  
  entropyData += `total:${totalDistance.toFixed(6)},time:${totalTime},avgVel:${avgVelocity.toFixed(8)},dirChanges:${directionChanges},totalAngleChange:${totalAngleChange.toFixed(6)},velocityVariance:${velocityVariance.toFixed(10)},spatialEntropy:${spatialEntropy.toFixed(6)},movementCount:${cursorData.length}`
  
  // Add system entropy for additional randomness
  entropyData += `,system:${Date.now()},random:${crypto.randomBytes(32).toString('hex')},pid:${process.pid},memory:${Math.random().toString(36)}`
  
  return entropyData
}

function generatePasswordFromEntropy(
  entropyData: string,
  options: GeneratePasswordRequest
): { password: string; entropyBits: number } {
  // Build character set based on options
  let charset = ''
  
  if (options.includeLowercase) charset += CHAR_SETS.lowercase
  if (options.includeUppercase) charset += CHAR_SETS.uppercase
  if (options.includeNumbers) charset += CHAR_SETS.numbers
  if (options.includeSymbols) charset += CHAR_SETS.symbols
  
  // Add extended ASCII if enabled
  if (options.includeExtendedASCII) {
    charset += generateExtendedASCII()
  }
  
  // Add Unicode symbols if selected
  if (options.characterSet === 'unicode') {
    charset += UNICODE_SYMBOLS
  }
  
  if (charset === '') {
    // Default to mixed characters if nothing selected
    charset = CHAR_SETS.lowercase + CHAR_SETS.uppercase + CHAR_SETS.numbers
  }

  // Remove duplicate characters and ensure charset is not empty
  charset = [...new Set(charset)].join('')
  if (charset.length === 0) {
    charset = CHAR_SETS.lowercase // Ultimate fallback
  }

  // Generate a unique seed for each character position to prevent repetition
  const password = []
  const baseSeed = crypto.createHash('sha512').update(entropyData).digest('hex')
  
  for (let i = 0; i < options.length; i++) {
    // Create a unique hash for each position using the index
    const positionSeed = crypto.createHash('sha256').update(baseSeed + i.toString()).digest('hex')
    
    // Use different parts of the hash for better distribution
    const hashChunk1 = positionSeed.substring(0, 8)
    const hashChunk2 = positionSeed.substring(8, 16)
    const hashChunk3 = positionSeed.substring(16, 24)
    
    // Combine hash chunks for maximum randomness
    const combinedHash = (parseInt(hashChunk1, 16) ^ parseInt(hashChunk2, 16) ^ parseInt(hashChunk3, 16)).toString()
    
    // Use the combined hash to select character
    const index = parseInt(combinedHash.substring(0, 8), 16) % charset.length
    password.push(charset[index])
  }

  const finalPassword = password.join('')

  // Calculate entropy bits
  const charsetSize = charset.length
  const entropyBits = Math.floor(options.length * Math.log2(charsetSize))

  return { password: finalPassword, entropyBits }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GeneratePasswordRequest
    
    // Validate input
    if (!body.cursorData || !Array.isArray(body.cursorData) || body.cursorData.length < 10) {
      return NextResponse.json(
        { error: 'Insufficient cursor movement data. Please move your cursor more.' },
        { status: 400 }
      )
    }

    if (!body.length || body.length < 8 || body.length > 256) {
      return NextResponse.json(
        { error: 'Password length must be between 8 and 256 characters' },
        { status: 400 }
      )
    }

    // Extract entropy from cursor movement data
    const cursorEntropy = extractCursorEntropy(body.cursorData)
    
    // Generate password from cursor entropy
    const { password, entropyBits } = generatePasswordFromEntropy(cursorEntropy, body)
    
    const response: GeneratePasswordResponse = {
      password,
      entropy: entropyBits
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Password generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate password' },
      { status: 500 }
    )
  }
}