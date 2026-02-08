import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        'camera-controls'?: boolean;
        'auto-rotate'?: boolean;
        'camera-orbit'?: string;
        'camera-target'?: string;
        'field-of-view'?: string;
        autoplay?: boolean;
        'animation-loop'?: boolean;
        exposure?: string | number;
        'shadow-intensity'?: string | number;
      };
    }
  }
}

export {};
