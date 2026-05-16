import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the GlintBudget wordmark', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /GlintBudget/i })).toBeInTheDocument();
  });
});
