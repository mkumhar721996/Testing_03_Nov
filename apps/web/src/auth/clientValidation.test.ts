import { isValidEmail, isValidPassword } from './clientValidation'

describe('clientValidation', () => {
  it.each(['Pass1', 'password', '12345678', 'Passw0r'])('rejects password %s (AC9)', (pw) => {
    expect(isValidPassword(pw)).toBe(false)
  })

  it('accepts exactly 8 characters with a letter and a digit', () => {
    expect(isValidPassword('Passw0rd')).toBe(true)
  })

  it('rejects a password over 128 characters', () => {
    expect(isValidPassword(`Pw1${'a'.repeat(125)}`)).toBe(true)
    expect(isValidPassword(`Pw1${'a'.repeat(126)}`)).toBe(false)
  })

  it.each(['sam.example.com', 'a@@b.com', 'a@b@c.com', 'sam@localhost', 'sam@example.', '@example.com'])(
    'rejects email %s (AC10)',
    (e) => expect(isValidEmail(e)).toBe(false),
  )

  it('accepts a normal email, ignoring surrounding spaces', () => {
    expect(isValidEmail(' sam@example.com ')).toBe(true)
  })
})
