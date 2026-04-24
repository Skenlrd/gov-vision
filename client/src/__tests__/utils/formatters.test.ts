import { describe, it, expect } from 'vitest'

describe('Data Formatters', () => {
  it('formats percentage correctly', () => {
    const formatPercent = (value: number): string => {
      return `${(value * 100).toFixed(1)}%`
    }
    
    expect(formatPercent(0.956)).toBe('95.6%')
    expect(formatPercent(0)).toBe('0.0%')
    expect(formatPercent(1)).toBe('100.0%')
  })

  it('formats hours to readable duration', () => {
    const formatHours = (hours: number): string => {
      if (hours < 24) return `${hours.toFixed(1)}h`
      const days = hours / 24
      return `${days.toFixed(1)}d`
    }
    
    expect(formatHours(12)).toBe('12.0h')
    expect(formatHours(48)).toBe('2.0d')
    expect(formatHours(168)).toBe('7.0d')
  })

  it('formats large numbers with commas', () => {
    const formatNumber = (num: number): string => {
      return num.toLocaleString('en-US')
    }
    
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(31509)).toBe('31,509')
    expect(formatNumber(1000000)).toBe('1,000,000')
  })

  it('formats ISO date to readable format', () => {
    const formatDate = (isoString: string): string => {
      const date = new Date(isoString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }
    
    expect(formatDate('2026-04-22')).toBe('Apr 22, 2026')
  })
})

describe('Risk Level Utilities', () => {
  it('returns correct color for risk level', () => {
    const getRiskColor = (level: string): string => {
      const colors: Record<string, string> = {
        Low: '#57B877',
        Medium: '#FFC107',
        High: '#E08C3E',
        Critical: '#DE6D6D'
      }
      return colors[level] || '#999'
    }
    
    expect(getRiskColor('Low')).toBe('#57B877')
    expect(getRiskColor('Medium')).toBe('#FFC107')
    expect(getRiskColor('High')).toBe('#E08C3E')
    expect(getRiskColor('Critical')).toBe('#DE6D6D')
  })
})
