// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './App';
const fixture = { map: { maxNeighborDistance: 1500, nodes: [{x:1000,y:1000,code:1}, {x:1800,y:1000,code:2,name:'READY'}] } };
afterEach(() => vi.unstubAllGlobals());
async function start(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock);
  render(<App />);
  await screen.findByRole('heading', {name:'Waypoints'});
  fireEvent.click(screen.getByRole('option',{name:/READY/}));
}
it('preserves newer edits when an earlier save completes', async () => {
  let resolveSave!: (value: unknown) => void;
  let submitted: unknown;
  const fetchMock=vi.fn(async (_url, options) => {
    if(options?.method==='PUT') { submitted=JSON.parse(options.body); return new Promise(resolve=>{resolveSave=resolve;}); }
    return {ok:true,json:async()=>({document:fixture,issues:[]})};
  });
  await start(fetchMock);
  fireEvent.change(screen.getByLabelText('X (mm)'),{target:{value:'2000'}});
  fireEvent.click(screen.getByRole('button',{name:'Save map'}));
  fireEvent.change(screen.getByLabelText('X (mm)'),{target:{value:'2200'}});
  expect(screen.getByLabelText('X (mm)')).toHaveValue(2200);
  expect(screen.getByRole('button',{name:'Saving…'})).toBeDisabled();
  fireEvent.keyDown(window,{key:'s',ctrlKey:true});
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await act(async()=>resolveSave({ok:true,json:async()=>({document:submitted,issues:[]})}));
  expect(screen.getByLabelText('X (mm)')).toHaveValue(2200);
  expect(screen.getByText('● Unsaved')).toBeInTheDocument();
});
it('blocks saving invalid draft input including keyboard save', async () => {
  const fetchMock=vi.fn(async (_url,options)=>({ok:true,json:async()=>({document:options?.body?JSON.parse(options.body):fixture,issues:[]})}));
  await start(fetchMock);
  fireEvent.change(screen.getByLabelText('X (mm)'),{target:{value:'2000'}});
  fireEvent.change(screen.getByLabelText('X (mm)'),{target:{value:'1.5'}});
  fireEvent.click(screen.getByRole('button',{name:'Save map'}));
  await screen.findByText('Correct the invalid fields before saving.');
  fireEvent.keyDown(window,{key:'s',ctrlKey:true});
  expect(screen.getByLabelText(/X \(mm\)/)).toHaveValue(1.5);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByText('● Unsaved')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/X \(mm\)/),{target:{value:'2300'}});
  fireEvent.click(screen.getByRole('button',{name:'Save map'}));
  await screen.findByText('Map saved to the server.');
  expect(JSON.parse(fetchMock.mock.calls[1]![1].body).map.nodes[1].x).toBe(2300);
});
it('keeps diagnostic repair links visible after a blocked save', async () => {
  await start(vi.fn(async()=>({ok:true,json:async()=>({document:fixture,issues:[]})})));
  fireEvent.change(screen.getByLabelText('X (mm)'),{target:{value:'1000'}});
  expect(screen.getByRole('button',{name:/Multiple nodes use coordinate/})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Save map'}));
  expect(screen.getByRole('button',{name:/Multiple nodes use coordinate/})).toBeInTheDocument();
});

it('does not carry invalid drafts to a different selected node', async () => {
  await start(vi.fn(async()=>({ok:true,json:async()=>({document:fixture,issues:[]})})));
  fireEvent.change(screen.getByLabelText('Y (mm)'),{target:{value:'1.5'}});
  expect(screen.getByText('● Unsaved')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('option',{name:/QR 1 /}));
  expect(screen.getByLabelText('Y (mm)')).toHaveValue(1000);
  expect(screen.getByText('● Saved')).toBeInTheDocument();
});
