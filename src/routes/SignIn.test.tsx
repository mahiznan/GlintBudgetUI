import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SignIn from './SignIn';

describe('SignIn route', () => {
  it('redirects to / immediately', () => {
    render(
      <MemoryRouter initialEntries={['/signin']}>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/" element={<span>home</span>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('home')).toBeInTheDocument();
  });
});
