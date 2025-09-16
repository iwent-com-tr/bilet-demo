import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from './button';

test('renders Button', () => {
  const { getByRole } = render(<Button>Click</Button>);
  expect(getByRole('button', { name: /click/i })).toBeInTheDocument();
});

