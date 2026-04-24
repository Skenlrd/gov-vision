import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KPICard } from '../../components/KPICard'

describe('KPICard Component', () => {
  it('renders with required props', () => {
    render(
      <KPICard 
        title="Total Decisions" 
        value={1500} 
        trend={5.2}
      />
    )
    
    expect(screen.getByText('Total Decisions')).toBeDefined()
    expect(screen.getByText('1500')).toBeDefined()
  })

  it('displays positive trend indicator', () => {
    render(
      <KPICard 
        title="Approved" 
        value={1200} 
        trend={10}
      />
    )
    
    // Positive trend should show up arrow
    expect(screen.getByText('+10%')).toBeDefined()
  })

  it('displays negative trend indicator', () => {
    render(
      <KPICard 
        title="Violations" 
        value={50} 
        trend={-5}
      />
    )
    
    // Negative trend should show down arrow
    expect(screen.getByText('-5%')).toBeDefined()
  })
})
