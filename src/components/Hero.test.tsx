import { render, screen } from '@testing-library/react';
import Hero from './Hero';

describe('Hero', () => {
  it('renders the tagline', () => {
    render(<Hero />);
    expect(
      screen.getByRole('heading', {
        name: /Track every dollar\.\s*Across every currency\./i,
      }),
    ).toBeInTheDocument();
  });

  it('renders the subhead', () => {
    render(<Hero />);
    expect(
      screen.getByText(/GlintBudget brings the simplicity of your iPhone expense tracker/i),
    ).toBeInTheDocument();
  });
});
