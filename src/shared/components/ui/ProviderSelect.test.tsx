/**
 * Tests for ProviderSelect — single-select dropdown primitive used by
 * the Integrations page.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { ProviderSelect } from './ProviderSelect';

interface Opts {
  value: 'foo' | 'bar' | 'baz';
  label: string;
  hint?: string;
  recommended?: boolean;
}

const OPTIONS: Opts[] = [
  { value: 'foo', label: 'Foo', hint: 'fk-...', recommended: true },
  { value: 'bar', label: 'Bar', hint: 'bk-...' },
  { value: 'baz', label: 'Baz' },
];

describe('ProviderSelect', () => {
  it('renders the trigger with selected label', () => {
    render(<ProviderSelect value="foo" options={OPTIONS} onChange={() => {}} />);
    const trigger = screen.getByRole('button', { name: /Foo/ });
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain('推荐');
  });

  it('shows placeholder when value is undefined', () => {
    render(<ProviderSelect options={OPTIONS} onChange={() => {}} placeholder="选择" />);
    expect(screen.getByText('选择')).toBeInTheDocument();
  });

  it('opens the listbox on click and closes on Escape', () => {
    render(<ProviderSelect value="foo" options={OPTIONS} onChange={() => {}} />);
    const trigger = screen.getByRole('button', { name: /Foo/ });
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('selects an option on click and closes the listbox', () => {
    const onChange = vi.fn();
    render(<ProviderSelect value="foo" options={OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Foo/ }));
    const listbox = screen.getByRole('listbox');
    const barOption = within(listbox).getByRole('option', { name: /Bar/ });
    fireEvent.click(barOption);
    expect(onChange).toHaveBeenCalledWith('bar');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('navigates with ArrowDown / ArrowUp and selects with Enter', () => {
    const onChange = vi.fn();
    render(<ProviderSelect value="foo" options={OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Foo/ }));
    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    // ArrowDown from "foo" → "bar" → "baz", Enter selects "baz"
    expect(onChange).toHaveBeenCalledWith('baz');
  });

  it('navigates with ArrowUp wrapping', () => {
    const onChange = vi.fn();
    render(<ProviderSelect value="foo" options={OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Foo/ }));
    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('baz');
  });

  it('click outside closes the listbox', () => {
    render(
      <div>
        <span data-testid="outside">outside</span>
        <ProviderSelect value="foo" options={OPTIONS} onChange={() => {}} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Foo/ }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    act(() => {
      fireEvent.mouseDown(screen.getByTestId('outside'));
    });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('marks aria-selected on the current value', () => {
    render(<ProviderSelect value="bar" options={OPTIONS} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Bar/ }));
    const listbox = screen.getByRole('listbox');
    const selected = within(listbox).getAllByRole('option');
    const fooOption = selected.find((o) => o.textContent?.includes('Foo'));
    const barOption = selected.find((o) => o.textContent?.includes('Bar'));
    expect(fooOption?.getAttribute('aria-selected')).toBe('false');
    expect(barOption?.getAttribute('aria-selected')).toBe('true');
  });

  it('does not open listbox when disabled', () => {
    render(<ProviderSelect value="foo" options={OPTIONS} onChange={() => {}} disabled />);
    const trigger = screen.getByRole('button', { name: /Foo/ });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens listbox via keyboard (ArrowDown) on the trigger', () => {
    render(<ProviderSelect value="foo" options={OPTIONS} onChange={() => {}} />);
    fireEvent.keyDown(screen.getByRole('button', { name: /Foo/ }), { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows the recommended tag in the option row', () => {
    render(<ProviderSelect value="bar" options={OPTIONS} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Bar/ }));
    const listbox = screen.getByRole('listbox');
    const fooOption = within(listbox).getByRole('option', { name: /Foo/ });
    expect(fooOption.textContent).toContain('推荐');
    const barOption = within(listbox).getByRole('option', { name: /Bar/ });
    expect(barOption.textContent).not.toContain('推荐');
  });
});