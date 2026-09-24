// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { AgvMap } from '../../shared/map-schema';
import { NewNodeDialog } from './NewNodeDialog';
const document: AgvMap = { map: { maxNeighborDistance: 1500, nodes: [
  { x: 0, y: 0, code: 1, directions: ['North'] },
  { x: 1000, y: 0, code: 2, directions: ['South'] },
] } };
function setup(position = { x: 500, y: 0 }) {
  const onCreate = vi.fn(); const onCancel = vi.fn();
  render(<NewNodeDialog document={document} position={position} onCreate={onCreate} onCancel={onCancel} />);
  return { onCreate, onCancel };
}
it('requires an explicit integer QR and blocks duplicate coordinates', () => {
  const { onCreate } = setup({ x: 0, y: 0 });
  expect(screen.getByLabelText('QR code')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Create node' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('QR code'), { target: { value: '1.5' } });
  expect(screen.getByRole('button', { name: 'Create node' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('QR code'), { target: { value: '0' } });
  expect(screen.getByText(/Multiple nodes use coordinate/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create node' })).toBeDisabled();
  expect(onCreate).not.toHaveBeenCalled();
});
it('previews directed routes and changes to existing topology', () => {
  const { onCreate } = setup();
  fireEvent.change(screen.getByLabelText('QR code'), { target: { value: '3' } });
  expect(screen.getByText('2 incoming · 0 outgoing')).toBeInTheDocument();
  expect(screen.getByText(/replaces 2 existing route/)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('North'));
  expect(screen.getByText('2 incoming · 1 outgoing')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Create node' }));
  expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ x: 500, y: 0, code: 3, directions: ['North'] }));
});
it('allows disconnected points with warnings and preserves station configuration', () => {
  const { onCreate } = setup({ x: 5000, y: 5000 });
  fireEvent.change(screen.getByLabelText('QR code'), { target: { value: '0' } });
  fireEvent.click(screen.getByLabelText('Charger'));
  fireEvent.change(screen.getByLabelText('Charger direction'), { target: { value: 'West' } });
  expect(screen.getByText(/No incoming route:/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Create node' }));
  expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ code: 0, charger: { direction: 'West' } }));
});
it('cancels without committing any draft properties', () => {
  const { onCreate, onCancel } = setup();
  fireEvent.change(screen.getByLabelText('QR code'), { target: { value: '55' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCreate).not.toHaveBeenCalled();
  expect(onCancel).toHaveBeenCalledOnce();
});
