// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NodeInspector } from './NodeInspector';

describe('NodeInspector', () => {
  it('keeps the last valid value and explains invalid integer input', () => {
    const onChange = vi.fn();
    render(<NodeInspector node={{ x: 1000, y: 2000, code: 7 }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('X (mm)'), { target: { value: '1.5' } });

    expect(screen.getByText('X (mm) must be an integer.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('edits directions and station configuration', () => {
    const onChange = vi.fn();
    render(<NodeInspector node={{ x: 1000, y: 2000, code: 7 }} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('North'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ directions: ['North'] }));

    fireEvent.click(screen.getByLabelText('Charger'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ charger: { direction: 'North' } }));
  });
});
