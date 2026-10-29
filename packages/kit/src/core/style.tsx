import React, { createContext, useContext } from 'react';

/**
 * Render style. `diecut` = the original look (white die-cut borders, ink outlines). `diorama` = the
 * house style chosen on 2026-10-29: layered flat-colour paper, deep soft layer shadows, no outlines.
 */
export type Style = 'diecut' | 'diorama';

const StyleCtx = createContext<Style>('diecut');

export const StyleProvider: React.FC<{ style?: Style; children: React.ReactNode }> = ({ style = 'diecut', children }) => (
  <StyleCtx.Provider value={style}>{children}</StyleCtx.Provider>
);

export const useStyle = () => useContext(StyleCtx);
