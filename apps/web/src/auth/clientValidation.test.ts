import { isValidEmail, isValidPassword } from './clientValidation'

describe('clientValidation', () => {
  it.each(['sam.example.com', 'a@@b.com', 'a@b@c.com', 'sam@localhost', '@example.com'])('rejects email %s (AC12)', (e) =>
    expect(isValidEmail(e)).toBe(false),
  )
  it('accepts a plain email', () => expect(isValidEmail('sam@example.com')).toBe(true))
  it.each(['Pass1', 'password', '12345678'])('rejects password %s (AC10)', (p) => expect(isValidPassword(p)).toBe(false))
  it('accepts 8 chars with a letter and a digit (AC11)', () => expect(isValidPassword('Passw0rd')).toBe(true))
})
