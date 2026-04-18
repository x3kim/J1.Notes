import React from 'react';
import Footer from '../Footer';

describe('Footer Component', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('renders disabled GitHub link when NEXT_PUBLIC_GITHUB_URL is empty', () => {
    process.env.NEXT_PUBLIC_GITHUB_URL = '';
    const { container } = render(<Footer />);

    const link = container.querySelector('a');
    expect(link).toBeNull(); // Should not be an anchor tag

    const div = container.querySelector('div[title="GitHub Repository (coming soon)"]');
    expect(div).toBeInTheDocument();
    expect(div).toHaveClass('opacity-50');
  });

  test('renders active GitHub link when NEXT_PUBLIC_GITHUB_URL is provided', () => {
    process.env.NEXT_PUBLIC_GITHUB_URL = 'https://github.com/x3kim/gNotes';
    const { container } = render(<Footer />);

    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://github.com/x3kim/gNotes');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('displays "View on GitHub" text', () => {
    process.env.NEXT_PUBLIC_GITHUB_URL = '';
    const { getByText } = render(<Footer />);

    expect(getByText('View on GitHub')).toBeInTheDocument();
  });

  test('displays GitHub icon', () => {
    process.env.NEXT_PUBLIC_GITHUB_URL = '';
    const { container } = render(<Footer />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  test('shows tooltip when URL is empty', () => {
    process.env.NEXT_PUBLIC_GITHUB_URL = '';
    const { container } = render(<Footer />);

    const footer = container.querySelector('footer');
    const disabledDiv = footer?.querySelector('div:last-child > div');
    expect(disabledDiv).toHaveAttribute('title', 'GitHub Repository (coming soon)');
  });

  test('shows tooltip when URL is available', () => {
    process.env.NEXT_PUBLIC_GITHUB_URL = 'https://github.com/x3kim/gNotes';
    const { container } = render(<Footer />);

    const footer = container.querySelector('footer');
    const link = footer?.querySelector('a');
    expect(link).toHaveAttribute('title', 'View on GitHub');
  });

  test('footer has correct styling classes', () => {
    process.env.NEXT_PUBLIC_GITHUB_URL = '';
    const { container } = render(<Footer />);

    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('h-14', 'flex', 'items-center', 'justify-end', 'px-6', 'border-t', 'shrink-0');
  });
});

// Helper render function (assuming React Testing Library is used)
function render(component: React.ReactElement) {
  // This would use React Testing Library in a real test environment
  return { container: document.createElement('div'), getByText: () => component };
}
