import { fireEvent, render, screen } from '@testing-library/react'
import { PatientSummaryCard } from './PatientSummaryCard'
import type { PatientSummary } from './patientSummary'

const full: PatientSummary = {
  name: 'Jordan Davies',
  consultancy: 'Northside Heart Clinic',
  condition: 'Hypertension',
}

const loaded = (summary: PatientSummary) => (
  <PatientSummaryCard state={{ status: 'loaded', summary }} onRetry={() => {}} />
)

describe('PatientSummaryCard', () => {
  it('shows name, consultancy and condition (AC1)', () => {
    render(loaded(full))
    expect(screen.getByText('Jordan Davies')).toBeInTheDocument()
    expect(screen.getByText('Northside Heart Clinic')).toBeInTheDocument()
    expect(screen.getByText('Hypertension')).toBeInTheDocument()
  })

  it('shows a loading indicator and no profile fields (AC5)', () => {
    render(<PatientSummaryCard state={{ status: 'loading' }} onRetry={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading your details')
    expect(screen.queryByText('Condition')).not.toBeInTheDocument()
  })

  it('shows an inline error with Retry (AC6)', () => {
    const onRetry = vi.fn()
    render(<PatientSummaryCard state={{ status: 'error' }} onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load your details")
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  describe('missing fields (AC8)', () => {
    const cases: Array<[keyof PatientSummary, string, string | null | undefined]> = [
      ['name', 'Jordan Davies', null],
      ['consultancy', 'Consultancy', null],
      ['condition', 'Condition', null],
    ]
    it.each(cases)('hides %s, with its label, when null', (field, text) => {
      render(loaded({ ...full, [field]: null }))
      expect(screen.queryByText(text)).not.toBeInTheDocument()
      expect(screen.queryByText('Not set')).not.toBeInTheDocument()
    })

    it.each([[undefined], [''], ['   ']])('hides consultancy and its label when %j', (value) => {
      render(loaded({ ...full, consultancy: value }))
      expect(screen.queryByText('Consultancy')).not.toBeInTheDocument()
      expect(screen.getByText('Condition')).toBeInTheDocument()
    })

    it('hides the avatar when the name is missing', () => {
      const { container } = render(loaded({ ...full, name: undefined }))
      expect(container.querySelector('[data-testid="avatar"]')).toBeNull()
    })

    it('shows initials in the avatar when the name exists', () => {
      render(loaded(full))
      expect(screen.getByTestId('avatar')).toHaveTextContent('JD')
    })
  })
})
