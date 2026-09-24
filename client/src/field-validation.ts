import { createContext } from 'react';

export const FieldValidationContext = createContext<(id: string, invalid: boolean) => void>(() => {});
