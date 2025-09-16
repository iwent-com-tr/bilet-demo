import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from './Input';

test('renders Input with label', () => {
  const { getByLabelText } = render(<Input label="Email" />);
  expect(getByLabelText(/email/i)).toBeInTheDocument();
});

