import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the invoice request form', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /invoice request/i });
  expect(heading).toBeInTheDocument();
});
