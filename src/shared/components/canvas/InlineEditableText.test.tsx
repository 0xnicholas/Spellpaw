import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineEditableText } from './InlineEditableText';

describe('InlineEditableText', () => {
  it('renders the value when not empty', () => {
    render(<InlineEditableText value="Hello world" onSave={() => {}} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders the placeholder when value is empty', () => {
    render(<InlineEditableText value="" placeholder="点击编辑…" onSave={() => {}} />);
    expect(screen.getByText('点击编辑…')).toBeInTheDocument();
  });

  it('renders the placeholder when value is whitespace-only', () => {
    render(<InlineEditableText value="   " onSave={() => {}} />);
    expect(screen.getByText('点击编辑…')).toBeInTheDocument();
  });

  it('focuses the textarea on click and shows current value', () => {
    const onSave = vi.fn();
    render(<InlineEditableText value="Initial" onSave={onSave} />);
    const display = screen.getByTestId('inline-text-display');
    fireEvent.click(display);
    const textarea = screen.getByTestId('inline-text-editor') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('Initial');
  });

  it('saves on Enter and exits edit mode', () => {
    const onSave = vi.fn();
    render(<InlineEditableText value="old" onSave={onSave} />);
    fireEvent.click(screen.getByTestId('inline-text-display'));
    const textarea = screen.getByTestId('inline-text-editor');
    fireEvent.change(textarea, { target: { value: 'new text' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith('new text');
    expect(screen.queryByTestId('inline-text-editor')).toBeNull();
  });

  it('does not save on Shift+Enter (allows newlines)', () => {
    const onSave = vi.fn();
    render(<InlineEditableText value="old" onSave={onSave} />);
    fireEvent.click(screen.getByTestId('inline-text-display'));
    const textarea = screen.getByTestId('inline-text-editor');
    fireEvent.change(textarea, { target: { value: 'new text' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('cancels on Escape and reverts to original', () => {
    const onSave = vi.fn();
    render(<InlineEditableText value="original" onSave={onSave} />);
    fireEvent.click(screen.getByTestId('inline-text-display'));
    const textarea = screen.getByTestId('inline-text-editor');
    fireEvent.change(textarea, { target: { value: 'changed' } });
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByTestId('inline-text-editor')).toBeNull();
    // Back to display mode with original value
    expect(screen.getByText('original')).toBeInTheDocument();
  });

  it('saves on blur', () => {
    const onSave = vi.fn();
    render(<InlineEditableText value="original" onSave={onSave} />);
    fireEvent.click(screen.getByTestId('inline-text-display'));
    const textarea = screen.getByTestId('inline-text-editor');
    fireEvent.change(textarea, { target: { value: 'blurred value' } });
    fireEvent.blur(textarea);
    expect(onSave).toHaveBeenCalledWith('blurred value');
  });

  it('trims the value before saving', () => {
    const onSave = vi.fn();
    render(<InlineEditableText value="x" onSave={onSave} />);
    fireEvent.click(screen.getByTestId('inline-text-display'));
    const textarea = screen.getByTestId('inline-text-editor');
    fireEvent.change(textarea, { target: { value: '  trimmed  ' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith('trimmed');
  });

  it('passes undefined / empty when value cleared and saved', () => {
    const onSave = vi.fn();
    render(<InlineEditableText value="some content" onSave={onSave} />);
    fireEvent.click(screen.getByTestId('inline-text-display'));
    const textarea = screen.getByTestId('inline-text-editor');
    fireEvent.change(textarea, { target: { value: '' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    // Empty string saved (consumer decides how to normalize)
    expect(onSave).toHaveBeenCalledWith('');
  });

  it('does not save when value is unchanged', () => {
    const onSave = vi.fn();
    render(<InlineEditableText value="same" onSave={onSave} />);
    fireEvent.click(screen.getByTestId('inline-text-display'));
    const textarea = screen.getByTestId('inline-text-editor');
    fireEvent.blur(textarea);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('stops click propagation so card-level handlers do not fire', () => {
    const cardClick = vi.fn();
    render(
      <div onClick={cardClick}>
        <InlineEditableText value="text" onSave={() => {}} />
      </div>
    );
    const display = screen.getByTestId('inline-text-display');
    fireEvent.click(display);
    expect(cardClick).not.toHaveBeenCalled();
  });

  it('stops mousedown propagation on the display', () => {
    const onMouseDown = vi.fn();
    render(
      <div onMouseDown={onMouseDown}>
        <InlineEditableText value="text" onSave={() => {}} />
      </div>
    );
    const display = screen.getByTestId('inline-text-display');
    fireEvent.mouseDown(display);
    expect(onMouseDown).not.toHaveBeenCalled();
  });
});
