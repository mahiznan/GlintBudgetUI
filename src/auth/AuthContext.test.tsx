import { render, screen } from '@testing-library/react';
import { AuthContext, useAuth } from './AuthContext';

function Probe() {
  const auth = useAuth();
  return <span data-testid="status">{auth.status}</span>;
}

describe('AuthContext', () => {
  it('useAuth throws if called outside a provider', () => {
    // Suppress React's error boundary console noise for this test.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/useAuth must be used within an AuthProvider/);
    spy.mockRestore();
  });

  it('returns the provided context value', () => {
    render(
      <AuthContext.Provider value={{ status: 'anonymous', user: null }}>
        <Probe />
      </AuthContext.Provider>,
    );
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
  });
});
