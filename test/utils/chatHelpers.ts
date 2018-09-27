const script = ['hello', 'hi', 'bye', 'ok', 'no', 'yes', 'something', 'something else']

export function getRndLine(): string {
  const r = Math.floor(Math.random() * script.length)
  return script[r]
}
