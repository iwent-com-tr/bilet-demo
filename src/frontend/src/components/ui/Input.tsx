import React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => (
  <label className="flex w-full flex-col gap-1">
    {label && <span className="text-sm text-gray-700">{label}</span>}
    <input
      className={[
        'w-full rounded-md border px-3 py-2 text-sm outline-none',
        error ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-primary-300',
        className,
      ].join(' ')}
      {...props}
    />
    {error && <span className="text-xs text-red-600">{error}</span>}
  </label>
);

export default Input;

